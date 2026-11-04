import Dexie, { type Table } from 'dexie'

export type LocalRecord = {
  id: string
  collection: 'areas' | 'quadrats' | 'collections'
  projectId: string
  payload: Record<string, unknown>
  synced: boolean
  createdAt: number
}

class QuadratsDatabase extends Dexie {
  records!: Table<LocalRecord, string>

  constructor() {
    super('quadrats-inteligentes')
    this.version(1).stores({ records: 'id, collection, projectId, synced, createdAt' })
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
