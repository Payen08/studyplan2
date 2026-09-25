import { createClient } from '@supabase/supabase-js'
import type { AppData, AppEntity, EntityKind } from '../types'
import { getOutbox, markOutboxAttempt, persistRecord, removeOutbox } from './db'

export const DEFAULT_SUPABASE_URL = "https://atpywxgykzhgtzhdpqbe.supabase.co"
export const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0cHl3eGd5a3poZ3R6aGRwcWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTAxNzYsImV4cCI6MjA4MDMyNjE3Nn0.UCd3qH2xpR7BpDFkCHUBkEgHXkj3uG1hUW-qMZ7Ys7s"

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_SUPABASE_URL
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_SUPABASE_KEY
export const cloudConfigured = Boolean(url && key)
export const supabase = cloudConfigured ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null
export const syncTables: EntityKind[] = ['profiles','user_settings','subjects','syllabus_nodes','plans','tasks','study_sessions','notebook_folders','notes','papers','paper_attempts','knowledge_points','mistakes','review_records','mock_exams','mock_scores','resources','entity_links']

async function getNamespace(id: string): Promise<string | null> {
  try {
    const b = new TextEncoder().encode('study_plan_ns:' + id.trim())
    const h = await crypto.subtle.digest('SHA-256', b)
    return Array.from(new Uint8Array(h).slice(0, 10)).map((x) => x.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

export function formatLegacyPayload(data: AppData, syncId: string, existingRaw?: any) {
  const currentYear = '2026'
  const tasks = Array.isArray(data?.tasks) ? data.tasks : []
  const notesList = Array.isArray(data?.notes) ? data.notes : []
  const subjects = Array.isArray(data?.subjects) ? data.subjects : []
  const folders = Array.isArray(data?.notebook_folders) ? data.notebook_folders : []
  const settingsList = Array.isArray(data?.user_settings) ? data.user_settings : []

  const doneSet = new Set(tasks.filter((t) => t?.status === 'done').map((t) => t.legacy_id || t.id))
  const customTasks: Record<string, Array<{ id: string; text: string; type?: string; period?: string }>> = {}
  for (const t of tasks) {
    if (!t || t.deleted_at || !t.task_date) continue
    const key = t.task_date.startsWith('2026-') ? t.task_date.slice(5).replace(/^0/, '').replace(/-0/, '-') : t.task_date
    if (!customTasks[key]) customTasks[key] = []
    const sub = subjects.find((s) => s?.id === t.subject_id)
    customTasks[key].push({
      id: t.legacy_id || t.id,
      text: t.title || '未命名任务',
      type: sub?.legacy_id || sub?.name || 'default',
      period: t.period
    })
  }

  // Preserve existing 2026 custom tasks if local is empty
  if (Object.keys(customTasks).length === 0 && existingRaw?.[currentYear]?.customTasks) {
    Object.assign(customTasks, existingRaw[currentYear].customTasks)
  }

  // 1. Daily notes (calendar notes)
  const notes: Record<string, string> = {}
  for (const n of notesList) {
    if (!n || n.deleted_at) continue
    const isDaily = n.source === 'daily_note' || n.legacy_id?.startsWith('daily:')
    if (isDaily) {
      for (const d of n.linked_dates || []) {
        const key = d.startsWith('2026-') ? d.slice(5).replace(/^0/, '').replace(/-0/, '-') : d
        notes[key] = n.html || ''
      }
    }
  }
  if (Object.keys(notes).length === 0 && existingRaw?.[currentYear]?.notes) {
    Object.assign(notes, existingRaw[currentYear].notes)
  }

  // 2. Notebook Folders
  const notebookFolders: Record<string, any> = {}
  for (const f of folders) {
    if (!f || f.deleted_at) continue
    const sub = subjects.find((s) => s?.id === f.subject_id)
    const fid = f.legacy_id || f.id
    notebookFolders[fid] = {
      id: fid,
      name: f.name,
      subjectType: sub?.legacy_id || sub?.name || 'default',
      createdAt: f.created_at,
      updatedAt: f.updated_at
    }
  }
  if (Object.keys(notebookFolders).length === 0 && existingRaw?.[currentYear]?.notebookFolders) {
    Object.assign(notebookFolders, existingRaw[currentYear].notebookFolders)
  }

  // 3. Notebook Entries (multidimensional notebook)
  const notebookEntries: Record<string, any> = {}
  for (const n of notesList) {
    if (!n || n.deleted_at) continue
    const isDaily = n.source === 'daily_note' || n.legacy_id?.startsWith('daily:')
    if (isDaily) continue // Daily notes are NOT notebook entries
    const sub = subjects.find((s) => s?.id === n.subject_id)
    const folder = folders.find((f) => f?.id === n.folder_id)
    const nid = n.legacy_id || n.id
    notebookEntries[nid] = {
      id: nid,
      title: n.title || '未命名笔记',
      html: n.html || '',
      content: n.plain_text || '',
      folderId: folder?.legacy_id || folder?.id || '',
      subjectType: sub?.legacy_id || sub?.name || 'default',
      dateKey: n.linked_dates?.[0] || '',
      linkedDateKeys: n.linked_dates || [],
      pinned: Boolean(n.pinned),
      createdAt: n.created_at,
      updatedAt: n.updated_at
    }
  }
  if (Object.keys(notebookEntries).length === 0 && existingRaw?.[currentYear]?.notebookEntries) {
    Object.assign(notebookEntries, existingRaw[currentYear].notebookEntries)
  }

  const payload: Record<string, any> = {
    appData: data,
    settings: {
      targetDate: settingsList[0]?.exam_date || existingRaw?.settings?.targetDate || '2026-12-19',
      targetName: settingsList[0]?.exam_name || existingRaw?.settings?.targetName || '冲刺目标',
      categories: subjects.length
        ? subjects.map((s, idx) => ({ name: s?.name || `科目${idx + 1}`, type: s?.legacy_id || s?.id, color: s?.color }))
        : (existingRaw?.settings?.categories || [])
    },
    [currentYear]: {
      done: Array.from(doneSet),
      customTasks,
      notes,
      notebookEntries,
      notebookFolders
    },
    _cloudMeta: {
      syncId,
      updatedAt: new Date().toISOString(),
      client: 'study-workbench-v3'
    }
  }

  // Preserve 2025 historic data if it existed
  if (existingRaw?.['2025']) {
    payload['2025'] = existingRaw['2025']
  }

  return payload
}

export async function pushStudyProgress(syncId: string, data: AppData): Promise<boolean> {
  if (!supabase || !syncId || syncId === 'local-user') return false

  // First fetch current record to preserve history and avoid empty overwrite
  let existingRaw: any = null
  try {
    const { data: cur } = await supabase
      .from('study_progress')
      .select('data')
      .eq('id', syncId)
      .maybeSingle()
    if (cur?.data) {
      existingRaw = typeof cur.data === 'string' ? JSON.parse(cur.data) : cur.data
    }
  } catch {}

  // Safety protection: do not overwrite a rich cloud record with completely empty local state
  const hasLocalContent = (data?.notes?.length ?? 0) > 0 || (data?.tasks?.length ?? 0) > 0 || (data?.subjects?.length ?? 0) > 0
  const cloudHasNotes = existingRaw && (
    (existingRaw['2026']?.notes && Object.keys(existingRaw['2026'].notes).length > 0) ||
    (existingRaw['2026']?.notebookEntries && Object.keys(existingRaw['2026'].notebookEntries).length > 0) ||
    (existingRaw['2025']?.notes && Object.keys(existingRaw['2025'].notes).length > 0) ||
    (existingRaw.appData?.notes && existingRaw.appData.notes.length > 0)
  )

  if (!hasLocalContent && cloudHasNotes) {
    console.warn('[pushStudyProgress] Aborted overwrite: local data is empty but cloud has existing notes!')
    return false
  }

  const payload = formatLegacyPayload(data, syncId, existingRaw)
  const { error } = await supabase
    .from('study_progress')
    .upsert({ id: syncId, data: payload }, { onConflict: 'id' })
    .select('id')
    .maybeSingle()
  if (error) {
    console.error('[study_progress push error]', error)
    if (error.message?.includes('JWT') || error.code === 'PGRST301') {
      await supabase.auth.signOut().catch(() => {})
    }
    throw error
  }
  return true
}

export async function pullStudyProgress(syncId: string): Promise<{ appData?: AppData; rawData?: any; obsidianNotes?: any[] } | null> {
  if (!supabase || !syncId || syncId === 'local-user') return null
  const { data, error } = await supabase
    .from('study_progress')
    .select('id, data')
    .eq('id', syncId)
    .maybeSingle()
  if (error) {
    console.error('[study_progress pull error]', error)
    if (error.message?.includes('JWT') || error.code === 'PGRST301') {
      await supabase.auth.signOut().catch(() => {})
    }
    throw error
  }

  // Also pull any obsidian notes for this sync ID namespace
  let obsidianNotes: any[] = []
  try {
    const p = await getNamespace(syncId)
    if (p) {
      const { data: obData } = await supabase
        .from('study_progress')
        .select('id, data')
        .like('id', `${p}-n-%`)
      if (Array.isArray(obData)) {
        obsidianNotes = obData.map((r) => r.data).filter((d) => d && typeof d === 'object')
      }
    }
  } catch (obErr) {
    console.warn('[Obsidian notes pull skipped]', obErr)
  }

  if (!data?.data) {
    return obsidianNotes.length ? { obsidianNotes } : null
  }

  const payload = typeof data.data === 'string' ? JSON.parse(data.data) : data.data
  return {
    appData: payload.appData,
    rawData: payload,
    obsidianNotes
  }
}

export async function pushOutbox(userId: string) {
  if (!supabase || userId === 'local-user') return { sent: 0, failed: 0 }
  let sent = 0; let failed = 0
  for (const mutation of await getOutbox()) {
    const record = { ...mutation.record, user_id: userId }
    const { error } = await supabase.from(mutation.kind).upsert(record as never)
    if (error) { failed++; await markOutboxAttempt(mutation) } else { sent++; await removeOutbox(mutation.id) }
  }
  return { sent, failed }
}

export async function pullCloud(userId: string, since?: string): Promise<Partial<AppData>> {
  if (!supabase || userId === 'local-user') return {}
  const result: Partial<AppData> = {}
  for (const kind of syncTables) {
    let query = supabase.from(kind).select('*').eq('user_id', userId)
    if (since) query = query.gt('updated_at', since)
    const { data, error } = await query
    if (error) throw error
    ;(result as Record<string, AppEntity[]>)[kind] = (data ?? []) as AppEntity[]
  }
  return result
}

export async function applyCloudRecords(data: Partial<AppData>) {
  for (const kind of Object.keys(data) as EntityKind[]) for (const record of data[kind] ?? []) await persistRecord(kind, record, false)
}

