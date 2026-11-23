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

class QuadratsDatabase extends Dexie {
  records!: Table<LocalRecord, string>
  photos!: Table<LocalPhotoRecord, string>

  constructor() {
    super('quadrats-inteligentes')
    this.version(1).stores({ records: 'id, collection, projectId, synced, createdAt' })
    this.version(2).stores({
      records: 'id, collection, projectId, synced, createdAt',
      photos: 'id, collectionId, projectId, syncStatus, createdAt',
    })
  }
}

export const localDb = new QuadratsDatabase()

export async function saveOfflineRecord(record: Omit<LocalRecord, 'createdAt'>) {
  await localDb.records.put({ ...record, createdAt: Date.now() })
}

export async function getPendingRecords() {
  return localDb.records.where('synced').equals(0).toArray()
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
