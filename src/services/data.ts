import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '../../firebase'
import { getPendingRecords, getProjectRecords, markRecordSynced, saveOfflineRecord, type LocalRecord } from '../database/db'

export type RecordKind = LocalRecord['collection']
export type ProjectMember = { displayName: string; email: string }
export type Project = { id: string; name: string; description: string; adminId: string; memberIds: string[]; memberProfiles?: Record<string, ProjectMember> }
export type WorkspaceItem = { id: string; name: string; createdAt: number; [key: string]: unknown }

const memberProfile = (user: User): ProjectMember => ({ displayName: user.displayName || 'Membro', email: user.email || '' })

function createProjectCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const randomValues = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(randomValues, value => alphabet[value % alphabet.length]).join('')
}

export async function listProjects(userId: string): Promise<Project[]> {
  const snapshot = await getDocs(query(collection(db, 'projects'), where('memberIds', 'array-contains', userId)))
  return snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }) as Project)
}

export async function ensureProject(user: User): Promise<Project> {
  try { const projects = await listProjects(user.uid); if (projects.length) return projects[0] } catch { /* Continua com projeto pessoal offline. */ }
  const id = createProjectCode()
  const project: Project = { id, name: 'Projeto principal', description: 'Monitoramento ecológico', adminId: user.uid, memberIds: [user.uid], memberProfiles: { [user.uid]: memberProfile(user) } }
  try { await setDoc(doc(db, 'projects', id), { ...project, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }) } catch { /* Projeto disponível localmente. */ }
  return project
}

export async function createProject(user: User, name: string, description: string): Promise<Project> {
  const id = createProjectCode()
  const project: Project = { id, name: name.trim(), description: description.trim(), adminId: user.uid, memberIds: [user.uid], memberProfiles: { [user.uid]: memberProfile(user) } }
  await setDoc(doc(db, 'projects', id), { ...project, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return project
}

export async function joinProject(user: User, rawCode: string): Promise<Project> {
  const typedCode = rawCode.trim()
  const code = typedCode.length === 8 ? typedCode.toUpperCase() : typedCode
  if (!code) throw new Error('Informe o código do projeto.')
  const reference = doc(db, 'projects', code)
  const snapshot = await getDoc(reference)
  if (!snapshot.exists()) throw new Error('Projeto não encontrado. Confira o código.')
  const project = { id: snapshot.id, ...snapshot.data() } as Project
  if (!project.memberIds.includes(user.uid)) {
    await updateDoc(reference, { memberIds: arrayUnion(user.uid), [`memberProfiles.${user.uid}`]: memberProfile(user), updatedAt: serverTimestamp() })
    project.memberIds = [...project.memberIds, user.uid]
    project.memberProfiles = { ...project.memberProfiles, [user.uid]: memberProfile(user) }
  }
  return project
}

export async function loadRecords(projectId: string): Promise<Record<RecordKind, WorkspaceItem[]>> {
  const result: Record<RecordKind, WorkspaceItem[]> = { areas: [], quadrats: [], collections: [] }
  const local = await getProjectRecords(projectId)
  const deletedIds = new Set(local.filter(record => record.deleted).map(record => record.id))
  for (const record of local) if (!record.deleted) result[record.collection].push(record.payload as WorkspaceItem)
  if (navigator.onLine) for (const kind of Object.keys(result) as RecordKind[]) {
    try {
      const snapshot = await getDocs(collection(db, 'projects', projectId, kind))
      for (const entry of snapshot.docs) {
        if (deletedIds.has(`${kind}:${entry.id}`)) continue
        const item = { id: entry.id, ...entry.data() } as WorkspaceItem
        result[kind] = [...result[kind].filter(value => value.id !== item.id), item]
        await saveOfflineRecord({ id: `${kind}:${item.id}`, collection: kind, projectId, payload: item, synced: true })
      }
    } catch { /* Mantém dados locais. */ }
  }
  return result
}

export async function saveRecord(projectId: string, kind: RecordKind, item: WorkspaceItem) {
  const localId = `${kind}:${item.id}`
  await saveOfflineRecord({ id: localId, collection: kind, projectId, payload: item, synced: false })
  if (!navigator.onLine) return false
  try { await setDoc(doc(db, 'projects', projectId, kind, item.id), { ...item, updatedAt: serverTimestamp() }, { merge: true }); await markRecordSynced(localId); return true } catch { return false }
}

export async function syncPendingRecords() {
  if (!navigator.onLine) return 0
  let synced = 0
  for (const record of await getPendingRecords()) try {
    const reference = doc(db, 'projects', record.projectId, record.collection, String(record.payload.id))
    if (record.deleted) await deleteDoc(reference); else await setDoc(reference, { ...record.payload, updatedAt: serverTimestamp() }, { merge: true })
    await markRecordSynced(record.id); synced++
  } catch { /* Mantém pendente. */ }
  return synced
}

export async function deleteRecord(projectId: string, kind: RecordKind, itemId: string) {
  const localId = `${kind}:${itemId}`
  await saveOfflineRecord({ id: localId, collection: kind, projectId, payload: { id: itemId }, synced: false, deleted: true })
  if (!navigator.onLine) return false
  try { await deleteDoc(doc(db, 'projects', projectId, kind, itemId)); await markRecordSynced(localId); return true } catch { return false }
}

export function exportCollectionsCsv(items: WorkspaceItem[]) {
  const headers = ['id', 'nome', 'data', 'temperatura_c', 'umidade_percentual', 'observacoes']
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const rows = items.map(item => [item.id, item.name, item.createdAt, item.temperature, item.humidity, item.notes].map(escape).join(','))
  const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `coletas-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href)
}
