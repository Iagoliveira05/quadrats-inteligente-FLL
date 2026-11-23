import Dexie, { type Table } from 'dexie'
import type { PhotoSyncStatus } from '../types/collection'

export type LocalRecord = {
  id: string
  collection: 'areas' | 'quadrats' | 'collections'
  projectId: string
  payload: Record<string, unknown>
  synced: boolean
  deleted?: boolean
  createdAt: number
}

export type LocalPhotoRecord = {
  id: string
  collectionId: string
  projectId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  originalSizeBytes: number
  width: number
  height: number
  tag: string
  caption: string
  capturedAt: string
  syncStatus: PhotoSyncStatus
  blob: Blob
  createdAt: number
}

export type CachedProjectRecord = {
  id: string
  ownerKey: string
  payload: Record<string, unknown>
  updatedAt: number
}

export type CachedMapTileRecord = {
  key: string
  style: string
  blob: Blob
  savedAt: number
}

class QuadratsDatabase extends Dexie {
  records!: Table<LocalRecord, string>
  photos!: Table<LocalPhotoRecord, string>
  projects!: Table<CachedProjectRecord, string>
  mapTiles!: Table<CachedMapTileRecord, string>

  constructor() {
    super('quadrats-inteligentes-mobile')
    this.version(1).stores({ records: 'id, collection, projectId, synced, createdAt' })
    this.version(2).stores({
      records: 'id, collection, projectId, synced, createdAt',
      photos: 'id, collectionId, projectId, syncStatus, createdAt',
    })
    this.version(3).stores({
      records: 'id, collection, projectId, synced, createdAt',
      photos: 'id, collectionId, projectId, syncStatus, createdAt',
      projects: 'id, ownerKey, updatedAt',
      mapTiles: 'key, style, savedAt',
    })
  }
}

export const localDb = new QuadratsDatabase()

export async function saveOfflineRecord(record: Omit<LocalRecord, 'createdAt'>) {
  await localDb.records.put({ ...record, createdAt: Date.now() })
}

export async function getPendingRecords() {
  return localDb.records.filter((record) => !record.synced).toArray()
}

export async function countPendingRecords() {
  return localDb.records.filter((record) => !record.synced).count()
}

export async function markRecordSynced(id: string) {
  await localDb.records.update(id, { synced: true })
}

export async function getProjectRecords(projectId: string) {
  return localDb.records.where('projectId').equals(projectId).toArray()
}

export async function saveOfflinePhotos(photos: LocalPhotoRecord[]) {
  if (!photos.length) return
  await localDb.photos.bulkPut(photos)
}

export async function getCollectionPhotos(collectionId: string) {
  return localDb.photos.where('collectionId').equals(collectionId).toArray()
}

export async function deleteCollectionPhotos(collectionId: string) {
  await localDb.photos.where('collectionId').equals(collectionId).delete()
}

export async function deletePhotosByIds(ids: string[]) {
  if (!ids.length) return
  await localDb.photos.bulkDelete(ids)
}

export async function saveCachedProjects(ownerKey: string, items: Array<{ id: string } & Record<string, unknown>>) {
  if (!items.length) return
  const now = Date.now()
  await localDb.projects.bulkPut(
    items.map((item) => ({
      id: item.id,
      ownerKey,
      payload: item,
      updatedAt: now,
    })),
  )
}

export async function getCachedProjects(ownerKey: string) {
  const rows = await localDb.projects.where('ownerKey').equals(ownerKey).toArray()
  return rows.map((row) => row.payload)
}

export async function removeCachedProject(projectId: string) {
  await localDb.projects.delete(projectId)
}

export async function saveMapTile(key: string, style: string, blob: Blob) {
  await localDb.mapTiles.put({ key, style, blob, savedAt: Date.now() })
}

export async function getMapTile(key: string) {
  return localDb.mapTiles.get(key)
}

export async function countMapTiles() {
  return localDb.mapTiles.count()
}

export async function clearMapTiles() {
  await localDb.mapTiles.clear()
}
