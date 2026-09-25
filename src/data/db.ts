import { openDB, type DBSchema } from 'idb'
import type { AppData, AppEntity, EntityKind } from '../types'

interface StudyDB extends DBSchema {
  records: { key: string; value: { key: string; kind: EntityKind; record: AppEntity }; indexes: { kind: EntityKind } }
  outbox: { key: string; value: OutboxMutation; indexes: { created_at: string } }
  meta: { key: string; value: { key: string; value: unknown } }
}
export interface OutboxMutation { id: string; kind: EntityKind; operation: 'upsert'; record: AppEntity; created_at: string; attempts: number }

const dbPromise = openDB<StudyDB>('study-workbench-v3', 1, {
  upgrade(db) {
    const records = db.createObjectStore('records', { keyPath: 'key' }); records.createIndex('kind', 'kind')
    const outbox = db.createObjectStore('outbox', { keyPath: 'id' }); outbox.createIndex('created_at', 'created_at')
    db.createObjectStore('meta', { keyPath: 'key' })
  },
})

export async function loadAllData(seed: AppData): Promise<AppData> {
  const db = await dbPromise; const rows = await db.getAll('records')
  if (!rows.length) { await replaceAllData(seed); return seed }
  const data = Object.fromEntries(Object.keys(seed).map((key) => [key, []])) as unknown as AppData
  rows.forEach(({ kind, record }) => { (data[kind] as AppEntity[]).push(record) })
  return data
}

export async function replaceAllData(data: AppData) {
  const db = await dbPromise; const tx = db.transaction(['records'], 'readwrite'); await tx.objectStore('records').clear()
  for (const kind of Object.keys(data) as EntityKind[]) for (const record of data[kind]) await tx.objectStore('records').put({ key: `${kind}:${record.id}`, kind, record })
  await tx.done
}

export async function persistRecord(kind: EntityKind, record: AppEntity, queue = true) {
  const db = await dbPromise; const tx = db.transaction(['records', 'outbox'], 'readwrite')
  await tx.objectStore('records').put({ key: `${kind}:${record.id}`, kind, record })
  if (queue) await tx.objectStore('outbox').put({ id: crypto.randomUUID(), kind, operation: 'upsert', record, created_at: new Date().toISOString(), attempts: 0 })
  await tx.done
}
export const getOutbox = async () => (await dbPromise).getAllFromIndex('outbox', 'created_at')
export const removeOutbox = async (id: string) => (await dbPromise).delete('outbox', id)
export const markOutboxAttempt = async (mutation: OutboxMutation) => (await dbPromise).put('outbox', { ...mutation, attempts: mutation.attempts + 1 })
export const setMeta = async (key: string, value: unknown) => (await dbPromise).put('meta', { key, value })
export const getMeta = async <T>(key: string) => (await dbPromise).get('meta', key).then((row) => row?.value as T | undefined)
