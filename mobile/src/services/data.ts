import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../../firebase'
import type { AppUser } from '../auth/AuthContext'
import {
  countPendingRecords,
  getCachedProjects,
  getPendingRecords,
  getProjectRecords,
  markRecordSynced,
  removeCachedProject,
  saveCachedProjects,
  saveOfflineRecord,
  type LocalRecord,
} from '../database/db'
import { exportCsvFile, isDeviceOnline } from './nativeDevice'

export type RecordKind = LocalRecord['collection']
export type ProjectMember = { displayName: string; email: string }
export type Project = {
  id: string
  name: string
  description: string
  adminId: string
  memberIds: string[]
  memberProfiles?: Record<string, ProjectMember>
}
export type WorkspaceItem = { id: string; name: string; createdAt: number; [key: string]: unknown }

const memberProfile = (user: AppUser): ProjectMember => ({
  displayName: user.displayName || 'Membro',
  email: user.email || '',
})

function createProjectCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const randomValues = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(randomValues, (value) => alphabet[value % alphabet.length]).join('')
}

export async function listProjects(userId: string, isOfflineGuest = false): Promise<Project[]> {
  const cached = (await getCachedProjects(userId)) as Project[]
  if (isOfflineGuest) return cached

  const online = await isDeviceOnline()
  if (!online) return cached

  try {
    const snapshot = await getDocs(
      query(collection(db, 'projects'), where('memberIds', 'array-contains', userId)),
    )
    const remote = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as Project)
    if (remote.length > 0) {
      await saveCachedProjects(userId, remote)
      return remote
    }
    return cached
  } catch {
    return cached
  }
}

export async function ensureProject(user: AppUser): Promise<Project> {
  const existing = await listProjects(user.uid, Boolean(user.isOfflineGuest))
  if (existing.length > 0) return existing[0]

  const id = user.isOfflineGuest ? 'OFFLINE1' : createProjectCode()
  const project: Project = {
    id,
    name: user.isOfflineGuest ? 'Projeto Offline Local' : 'Projeto principal',
    description: user.isOfflineGuest
      ? 'Coletas armazenadas localmente neste dispositivo'
      : 'Monitoramento ecológico',
    adminId: user.uid,
    memberIds: [user.uid],
    memberProfiles: { [user.uid]: memberProfile(user) },
  }
  await saveCachedProjects(user.uid, [project])

  if (!user.isOfflineGuest && (await isDeviceOnline())) {
    try {
      await setDoc(
        doc(db, 'projects', id),
        { ...project, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true },
      )
    } catch {
      /* Projeto disponível localmente. */
    }
  }
  return project
}

export async function createProject(
  user: AppUser,
  name: string,
  description: string,
): Promise<Project> {
  const id = createProjectCode()
  const project: Project = {
    id,
    name: name.trim(),
    description: description.trim(),
    adminId: user.uid,
    memberIds: [user.uid],
    memberProfiles: { [user.uid]: memberProfile(user) },
  }
  await saveCachedProjects(user.uid, [project])
  if (!user.isOfflineGuest && (await isDeviceOnline())) {
    await setDoc(doc(db, 'projects', id), {
      ...project,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
  return project
}

export async function joinProject(user: AppUser, rawCode: string): Promise<Project> {
  if (user.isOfflineGuest) {
    throw new Error('Entre com uma conta conectada à internet para participar de equipes.')
  }
  const typedCode = rawCode.trim()
  const code = typedCode.length === 8 ? typedCode.toUpperCase() : typedCode
  if (!code) throw new Error('Informe o código do projeto.')
  const reference = doc(db, 'projects', code)
  const snapshot = await getDoc(reference)
  if (!snapshot.exists()) throw new Error('Projeto não encontrado. Confira o código.')
  const project = { id: snapshot.id, ...snapshot.data() } as Project
  if (!project.memberIds.includes(user.uid)) {
    await updateDoc(reference, {
      memberIds: arrayUnion(user.uid),
      [`memberProfiles.${user.uid}`]: memberProfile(user),
      updatedAt: serverTimestamp(),
    })
    project.memberIds = [...project.memberIds, user.uid]
    project.memberProfiles = { ...project.memberProfiles, [user.uid]: memberProfile(user) }
  }
  await saveCachedProjects(user.uid, [project])
  return project
}

export async function renameProject(
  projectId: string,
  name: string,
  isOfflineGuest = false,
  userId?: string,
) {
  const normalizedName = name.trim()
  if (!normalizedName) throw new Error('Informe o nome do projeto.')
  if (!isOfflineGuest && (await isDeviceOnline())) {
    await updateDoc(doc(db, 'projects', projectId), {
      name: normalizedName,
      updatedAt: serverTimestamp(),
    })
  }
  if (userId) {
    const cached = (await getCachedProjects(userId)) as Project[]
    const updated = cached.map((item) =>
      item.id === projectId ? { ...item, name: normalizedName } : item,
    )
    await saveCachedProjects(userId, updated)
  }
}

export async function leaveProject(projectId: string, userId: string, isOfflineGuest = false) {
  await removeCachedProject(projectId)
  if (isOfflineGuest) return
  await updateDoc(doc(db, 'projects', projectId), {
    memberIds: arrayRemove(userId),
    [`memberProfiles.${userId}`]: deleteField(),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteProject(projectId: string, isOfflineGuest = false) {
  await removeCachedProject(projectId)
  if (isOfflineGuest) return
  for (const kind of ['areas', 'quadrats', 'collections']) {
    const snapshot = await getDocs(collection(db, 'projects', projectId, kind))
    await Promise.all(snapshot.docs.map((entry) => deleteDoc(entry.ref)))
  }
  await deleteDoc(doc(db, 'projects', projectId))
}

export async function loadRecords(
  projectId: string,
  isOfflineGuest = false,
): Promise<Record<RecordKind, WorkspaceItem[]>> {
  const result: Record<RecordKind, WorkspaceItem[]> = { areas: [], quadrats: [], collections: [] }
  const local = await getProjectRecords(projectId)
  const deletedIds = new Set(local.filter((record) => record.deleted).map((record) => record.id))
  const unsyncedIds = new Set(local.filter((record) => !record.synced).map((record) => record.id))

  for (const record of local) {
    if (!record.deleted) result[record.collection].push(record.payload as WorkspaceItem)
  }

  if (!isOfflineGuest && (await isDeviceOnline())) {
    for (const kind of Object.keys(result) as RecordKind[]) {
      try {
        const snapshot = await getDocs(collection(db, 'projects', projectId, kind))
        for (const entry of snapshot.docs) {
          const localKey = `${kind}:${entry.id}`
          if (deletedIds.has(localKey) || unsyncedIds.has(localKey)) continue
          const item = { id: entry.id, ...entry.data() } as WorkspaceItem
          result[kind] = [...result[kind].filter((value) => value.id !== item.id), item]
          await saveOfflineRecord({
            id: localKey,
            collection: kind,
            projectId,
            payload: item,
            synced: true,
          })
        }
      } catch {
        /* Mantém dados locais. */
      }
    }
  }
  return result
}

export async function saveRecord(
  projectId: string,
  kind: RecordKind,
  item: WorkspaceItem,
  isOfflineGuest = false,
) {
  const localId = `${kind}:${item.id}`
  await saveOfflineRecord({
    id: localId,
    collection: kind,
    projectId,
    payload: item,
    synced: isOfflineGuest,
  })
  if (isOfflineGuest || !(await isDeviceOnline())) return false
  try {
    await setDoc(
      doc(db, 'projects', projectId, kind, item.id),
      { ...item, updatedAt: serverTimestamp() },
      { merge: true },
    )
    await markRecordSynced(localId)
    return true
  } catch {
    return false
  }
}

export async function syncPendingRecords(isOfflineGuest = false) {
  if (isOfflineGuest || !(await isDeviceOnline())) return 0
  let synced = 0
  for (const record of await getPendingRecords()) {
    try {
      const reference = doc(
        db,
        'projects',
        record.projectId,
        record.collection,
        String(record.payload.id),
      )
      if (record.deleted) await deleteDoc(reference)
      else await setDoc(reference, { ...record.payload, updatedAt: serverTimestamp() }, { merge: true })
      await markRecordSynced(record.id)
      synced++
    } catch {
      /* Mantém pendente até reconectar. */
    }
  }
  return synced
}

export async function getPendingSyncCount(isOfflineGuest = false) {
  if (isOfflineGuest) return 0
  return countPendingRecords()
}

export async function deleteRecord(
  projectId: string,
  kind: RecordKind,
  itemId: string,
  isOfflineGuest = false,
) {
  const localId = `${kind}:${itemId}`
  await saveOfflineRecord({
    id: localId,
    collection: kind,
    projectId,
    payload: { id: itemId },
    synced: isOfflineGuest,
    deleted: true,
  })
  if (isOfflineGuest || !(await isDeviceOnline())) return false
  try {
    await deleteDoc(doc(db, 'projects', projectId, kind, itemId))
    await markRecordSynced(localId)
    return true
  } catch {
    return false
  }
}

export function exportCollectionsCsv(items: WorkspaceItem[]) {
  const headers = [
    'id',
    'nome',
    'data_coleta',
    'area',
    'quadrat',
    'quadrante',
    'quadrante_numero',
    'orientacao_quadrat',
    'dimensao_quadrat',
    'metodo_amostragem',
    'transecto',
    'latitude',
    'longitude',
    'altitude_m',
    'temperatura_ar_c',
    'umidade_ar_percentual',
    'temperatura_solo_c',
    'umidade_solo_percentual',
    'luminosidade_lux',
    'clima',
    'insolacao',
    'vento',
    'ph_solo',
    'declividade_graus',
    'exposicao_terreno',
    'substrato',
    'estrato_vegetacao',
    'cobertura_vegetal_percentual',
    'solo_exposto_percentual',
    'serapilheira_percentual',
    'rochas_percentual',
    'agua_percentual',
    'profundidade_serapilheira_cm',
    'cobertura_dossel_percentual',
    'altura_media_cm',
    'altura_maxima_cm',
    'riqueza_especies',
    'total_individuos',
    'densidade_ind_m2',
    'indice_shannon',
    'especies',
    'quantidade_fotos',
    'fotos_registradas',
    'perturbacoes',
    'evidencias_fauna',
    'observacoes',
    'equipamento',
    'autor',
  ]
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const formatSpeciesCell = (item: WorkspaceItem) => {
    if (Array.isArray(item.speciesEntries) && item.speciesEntries.length > 0) {
      return item.speciesEntries
        .map((entry) => {
          const record = entry as Record<string, unknown>
          const label = [
            record.commonName,
            record.scientificName ? `(${record.scientificName})` : '',
          ]
            .filter(Boolean)
            .join(' ')
          const meta = [
            typeof record.count === 'number' ? `n=${record.count}` : '',
            typeof record.coverPercent === 'number' ? `cob=${record.coverPercent}%` : '',
            record.braunBlanquet ? `BB=${record.braunBlanquet}` : '',
            record.invasive ? 'invasora' : '',
          ].filter(Boolean)
          return meta.length ? `${label} [${meta.join('; ')}]` : label
        })
        .join(' | ')
    }
    return Array.isArray(item.species) ? item.species.join('; ') : ''
  }
  const rows = items.map((item) =>
    [
      item.id,
      item.name,
      typeof item.collectedAt === 'string'
        ? item.collectedAt
        : new Date(Number(item.createdAt)).toISOString(),
      item.areaName,
      item.quadratName,
      item.quadrant,
      item.quadrantNumber,
      item.quadratOrientation,
      item.quadratSize,
      item.samplingMethod,
      item.transect,
      item.latitude,
      item.longitude,
      item.altitude,
      item.temperature,
      item.humidity,
      item.soilTemperature,
      item.soilMoisturePercent ??
        (item.soilMoisture === true ? 100 : item.soilMoisture === false ? 0 : ''),
      item.lightLux,
      item.weather,
      item.sunExposure,
      item.windCondition,
      item.soilPh,
      item.slopeDegrees,
      item.aspect,
      item.substrateType,
      item.vegetationStratum,
      item.vegetationCoverPercent,
      item.bareSoilPercent,
      item.litterCoverPercent,
      item.rockCoverPercent,
      item.waterCoverPercent,
      item.litterDepthCm,
      item.canopyCoverPercent,
      item.avgVegetationHeightCm,
      item.maxVegetationHeightCm,
      item.speciesRichness,
      item.totalIndividuals,
      item.estimatedDensityPerM2,
      item.shannonIndex,
      formatSpeciesCell(item),
      Array.isArray(item.photos)
        ? item.photos.length
        : typeof item.photoCount === 'number'
          ? item.photoCount
          : 0,
      Array.isArray(item.photos)
        ? item.photos
            .map((entry) => {
              const record = entry as Record<string, unknown>
              const meta = [record.tag, record.caption].filter(Boolean).join(' - ')
              return meta
                ? `${String(record.fileName ?? '')} [${meta}]`
                : String(record.fileName ?? '')
            })
            .join(' | ')
        : '',
      Array.isArray(item.disturbances) ? item.disturbances.join('; ') : '',
      item.faunaEvidence,
      item.notes,
      item.deviceId,
      item.createdByName,
    ]
      .map(escape)
      .join(','),
  )

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n')
  const fileName = `coletas-${new Date().toISOString().slice(0, 10)}.csv`
  void exportCsvFile(fileName, csvContent)
}
