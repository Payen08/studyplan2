import type { AppData, MigrationReport, Note, StudyTask, Subject } from '../types'
import { id, nowIso } from './defaults'

type LegacyYear = { done?: string[]; notes?: Record<string,string>; customTasks?: Record<string, Array<{id?:string;text:string;type?:string;period?:StudyTask['period']}>>; notebookEntries?: Record<string, {id?:string;subjectType?:string;folderId?:string;dateKey?:string;linkedDateKeys?:string[];title?:string;html?:string;content?:string;pinned?:boolean;createdAt?:string;updatedAt?:string}>; notebookFolders?: Record<string,{id?:string;subjectType?:string;name?:string;createdAt?:string;updatedAt?:string}> }
type LegacyState = Record<string, unknown> & { settings?: { categories?: Array<{name:string;type:string;color?:string}>; targetDate?:string; targetName?:string; aiBuddy?:Record<string,unknown> }; '2025'?:LegacyYear; '2026'?:LegacyYear }

export const normalDate = (key: string, year: string = '2026'): string => {
  if (!key) return `${year}-01-01`
  const trimmed = key.trim()
  if (trimmed.startsWith('d')) {
    const day = trimmed.slice(1).padStart(2, '0')
    return `${year}-12-${day}`
  }
  const parts = trimmed.split('-')
  if (parts.length === 3) {
    const y = parts[0]
    const m = parts[1].padStart(2, '0')
    const d = parts[2].padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (parts.length === 2) {
    const m = parts[0].padStart(2, '0')
    const d = parts[1].padStart(2, '0')
    return `${year}-${m}-${d}`
  }
  return trimmed
}

const textFromHtml = (html: string) => {
  if (!html) return ''
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent?.trim() ?? ''
}

export function migrateLegacy(raw: LegacyState, empty: AppData, userId: string): { data: AppData; report: MigrationReport } {
  const data = structuredClone(empty)
  const report: MigrationReport = { subjects: 0, tasks: 0, folders: 0, notes: 0, sessions: 0, skipped: 0 }
  const timestamp = nowIso()
  if (!raw || typeof raw !== 'object') return { data, report }

  const categories = Array.isArray(raw.settings?.categories) && raw.settings!.categories.length 
    ? raw.settings!.categories 
    : [{ name: '英语', type: 'cat-2' }, { name: '政治', type: 'cat-1' }, { name: '数学', type: 'math' }, { name: '专业课', type: 'cat-3' }]
  data.subjects = categories.map((cat, index): Subject => ({
    id: id(),
    user_id: userId,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
    legacy_id: cat?.type || `sub-${index}`,
    name: cat?.name || `科目 ${index + 1}`,
    color: cat?.color ?? ['#006fee', '#7828c8', '#17c964', '#f5a524'][index % 4],
    sort_order: index,
    status: 'active'
  }))
  report.subjects = data.subjects.length
  const subjectByLegacy = new Map(data.subjects.map((subject) => [subject.legacy_id, subject.id]))
  const folderByLegacy = new Map<string, string>()
  data.notebook_folders = []

  // Ensure baseline default notebook folder exists
  const defaultFolderId = id()
  const defaultFolder = {
    id: defaultFolderId,
    user_id: userId,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
    legacy_id: 'default_notebook_folder',
    name: '默认笔记本',
    subject_id: null,
    sort_order: 0
  }
  data.notebook_folders.push(defaultFolder)
  folderByLegacy.set('default_notebook_folder', defaultFolderId)
  report.folders = 1

  // Determine year buckets to process: either raw['2025'], raw['2026'] or flat raw
  const buckets: Array<{ year: string; bucket: LegacyYear }> = []
  if (raw['2025'] && typeof raw['2025'] === 'object') buckets.push({ year: '2025', bucket: raw['2025'] })
  if (raw['2026'] && typeof raw['2026'] === 'object') buckets.push({ year: '2026', bucket: raw['2026'] })

  // If no year buckets exist, check if raw itself has notes/customTasks/notebookEntries at root
  if (buckets.length === 0) {
    const maybeRootYear = raw as unknown as LegacyYear
    if (maybeRootYear.notes || maybeRootYear.customTasks || maybeRootYear.notebookEntries || maybeRootYear.done) {
      buckets.push({ year: '2026', bucket: maybeRootYear })
    }
  }

  for (const { year, bucket } of buckets) {
    if (!bucket || typeof bucket !== 'object') continue

    // 1. Process custom notebook folders
    if (bucket.notebookFolders && typeof bucket.notebookFolders === 'object') {
      for (const folder of Object.values(bucket.notebookFolders)) {
        if (!folder || typeof folder !== 'object') continue
        const legacyKey = folder.id || folder.name || ''
        if (folderByLegacy.has(legacyKey)) continue

        const targetSubjectId = subjectByLegacy.get(folder.subjectType) ?? null
        const isDefault = !folder.name || folder.name === '默认文件夹' || folder.name === '默认笔记' || folder.name === '默认笔记本'
        
        // If an identical or default folder already exists for this subject, map to it instead of duplicating
        const existingFolder = data.notebook_folders.find(
          (f) =>
            f.subject_id === targetSubjectId &&
            (isDefault
              ? !f.name || f.name === '默认笔记' || f.name === '默认笔记本' || f.name === '默认文件夹'
              : f.name === folder.name)
        )
        if (existingFolder) {
          folderByLegacy.set(legacyKey, existingFolder.id)
          continue
        }

        const folderId = id()
        folderByLegacy.set(legacyKey, folderId)
        data.notebook_folders.push({
          id: folderId,
          user_id: userId,
          created_at: folder.createdAt ?? timestamp,
          updated_at: folder.updatedAt ?? timestamp,
          deleted_at: null,
          legacy_id: folder.id,
          subject_id: targetSubjectId,
          name: isDefault ? '默认笔记' : (folder.name ?? '我的笔记本'),
          sort_order: data.notebook_folders.length
        })
        report.folders++
      }
    }

    const done = new Set(Array.isArray(bucket.done) ? bucket.done : [])

    // 2. Process tasks
    if (bucket.customTasks && typeof bucket.customTasks === 'object') {
      for (const [dateKey, tasks] of Object.entries(bucket.customTasks)) {
        if (!Array.isArray(tasks)) continue
        const fullDate = normalDate(dateKey, year)
        for (const task of tasks) {
          if (!task || !task.text) continue
          const taskId = id()
          data.tasks.push({
            id: taskId,
            user_id: userId,
            created_at: timestamp,
            updated_at: timestamp,
            deleted_at: null,
            legacy_id: task.id ?? `${dateKey}:${task.text}`,
            plan_id: null,
            subject_id: subjectByLegacy.get(task.type) ?? null,
            syllabus_node_id: null,
            title: task.text,
            task_date: fullDate,
            period: task.period ?? '全天',
            estimate_minutes: 0,
            actual_minutes: 0,
            status: done.has(task.id ?? '') ? 'done' : 'todo',
            sort_order: data.tasks.length,
            completed_at: done.has(task.id ?? '') ? timestamp : null
          })
          report.tasks++
        }
      }
    }

    // 3. Process calendar notes (daily notes)
    if (bucket.notes && typeof bucket.notes === 'object') {
      for (const [dateKey, html] of Object.entries(bucket.notes)) {
        if (typeof html !== 'string' || !html.trim()) continue
        const plain = textFromHtml(html) || '日历随手记'
        const fullDate = normalDate(dateKey, year)
        data.notes.push({
          id: id(),
          user_id: userId,
          created_at: timestamp,
          updated_at: timestamp,
          deleted_at: null,
          legacy_id: `daily:${dateKey}`,
          folder_id: '',
          subject_id: null,
          title: `${fullDate} 日历笔记`,
          html,
          plain_text: plain,
          pinned: false,
          source: 'daily_note',
          linked_dates: [fullDate],
          conflict_of: null
        })
        report.notes++
      }
    }

    // 4. Process notebook entries (multidimensional notebook)
    if (bucket.notebookEntries && typeof bucket.notebookEntries === 'object') {
      for (const entry of Object.values(bucket.notebookEntries)) {
        if (!entry || typeof entry !== 'object') continue
        let folderId = entry.folderId ? folderByLegacy.get(entry.folderId) : null
        if (!folderId) {
          const subId = subjectByLegacy.get(entry.subjectType)
          const matchingFolder = data.notebook_folders.find((f) => f.subject_id === subId)
          folderId = matchingFolder ? matchingFolder.id : defaultFolderId
        }
        const html = entry.html ?? entry.content ?? ''
        const dateKey = entry.dateKey ? normalDate(entry.dateKey, year) : null
        const linkedDateKeys = Array.isArray(entry.linkedDateKeys) && entry.linkedDateKeys.length
          ? entry.linkedDateKeys.map((k) => normalDate(k, year))
          : dateKey ? [dateKey] : []

        data.notes.push({
          id: id(),
          user_id: userId,
          created_at: entry.createdAt ?? timestamp,
          updated_at: entry.updatedAt ?? timestamp,
          deleted_at: null,
          legacy_id: entry.id,
          folder_id: folderId,
          subject_id: subjectByLegacy.get(entry.subjectType) ?? null,
          title: entry.title || (dateKey ? `${dateKey} 笔记` : '未命名笔记'),
          html: html || '<p></p>',
          plain_text: entry.content ?? textFromHtml(html),
          pinned: Boolean(entry.pinned),
          source: 'web',
          linked_dates: linkedDateKeys,
          conflict_of: null
        })
        report.notes++
      }
    }
  }

  if (data.user_settings?.[0]) {
    data.user_settings[0].user_id = userId
    data.user_settings[0].exam_date = raw.settings?.targetDate ?? data.user_settings[0].exam_date
    data.user_settings[0].exam_name = raw.settings?.targetName ?? data.user_settings[0].exam_name
    data.user_settings[0].ai_settings = raw.settings?.aiBuddy
  }

  return { data, report }
}

export function readLegacyStorage(): LegacyState | null {
  const primary = localStorage.getItem('study_v2')
  if (primary) {
    try {
      const parsed = JSON.parse(primary)
      if (parsed && typeof parsed === 'object') return parsed as LegacyState
    } catch {}
  }
  const backup = localStorage.getItem('study_v2_backup')
  if (backup) {
    try {
      const parsed = JSON.parse(backup)
      if (parsed && typeof parsed === 'object') return parsed as LegacyState
    } catch {}
  }
  return null
}
