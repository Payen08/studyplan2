import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, AppEntity, EntityKind, MigrationReport, NotebookFolder, Subject } from '../types'
import { createDefaultData, id, LOCAL_USER_ID, nowIso } from './defaults'
import { getMeta, loadAllData, persistRecord, replaceAllData, setMeta } from './db'
import { applyCloudRecords, cloudConfigured, pullCloud, pullStudyProgress, pushOutbox, pushStudyProgress, supabase } from './supabase'
import { migrateLegacy, readLegacyStorage } from './migrateLegacy'
import { BUNDLED_337_PAPERS, LEGACY_BUNDLED_337_IDS } from './bundled337Papers'
import { ENGLISH_PAPERS_DATA } from './englishPapersData'

type SyncState = 'local' | 'syncing' | 'synced' | 'error'

interface DataValue {
  data: AppData
  ready: boolean
  userId: string
  syncId: string
  setSyncId: (id: string) => Promise<void>
  generateNewSyncId: () => string
  syncState: SyncState
  syncError: string | null
  lastSyncTime: string | null
  cloudConfigured: boolean
  upsert: <K extends EntityKind>(kind: K, record: AppData[K][number]) => Promise<void>
  remove: <K extends EntityKind>(kind: K, id: string) => Promise<void>
  sync: (explicitSyncId?: string) => Promise<void>
  importLegacy: () => Promise<MigrationReport | null>
  refresh: () => Promise<void>
}

const DataContext = createContext<DataValue | null>(null)

export const cleanupDuplicateSubjects = (appData: AppData): AppData => {
  try {
    if (!appData?.subjects || !Array.isArray(appData.subjects) || appData.subjects.length <= 1) {
      return appData
    }

    const seenNames = new Map<string, Subject>()
    const idReplacementMap = new Map<string, string>()
    const uniqueSubjects: Subject[] = []

    for (const sub of appData.subjects) {
      if (!sub) continue
      if (sub.deleted_at) {
        uniqueSubjects.push(sub)
        continue
      }
      const rawName = String(sub.name || '').trim()
      if (!rawName) {
        uniqueSubjects.push(sub)
        continue
      }
      const existing = seenNames.get(rawName)
      if (!existing) {
        seenNames.set(rawName, sub)
        uniqueSubjects.push(sub)
      } else if (sub.id && existing.id && sub.id !== existing.id) {
        idReplacementMap.set(sub.id, existing.id)
      }
    }

    if (idReplacementMap.size === 0) return appData

    return {
      ...appData,
      subjects: uniqueSubjects,
      tasks: Array.isArray(appData.tasks)
        ? appData.tasks.map((t) =>
            t && t.subject_id && idReplacementMap.has(t.subject_id)
              ? { ...t, subject_id: idReplacementMap.get(t.subject_id)! }
              : t
          )
        : [],
      notes: Array.isArray(appData.notes)
        ? appData.notes.map((n) =>
            n && n.subject_id && idReplacementMap.has(n.subject_id)
              ? { ...n, subject_id: idReplacementMap.get(n.subject_id)! }
              : n
          )
        : [],
      syllabus_nodes: Array.isArray(appData.syllabus_nodes)
        ? appData.syllabus_nodes.map((sn) =>
            sn && sn.subject_id && idReplacementMap.has(sn.subject_id)
              ? { ...sn, subject_id: idReplacementMap.get(sn.subject_id)! }
              : sn
          )
        : [],
      notebook_folders: Array.isArray(appData.notebook_folders)
        ? appData.notebook_folders.map((f) =>
            f && f.subject_id && idReplacementMap.has(f.subject_id)
              ? { ...f, subject_id: idReplacementMap.get(f.subject_id)! }
              : f
          )
        : [],
      papers: Array.isArray(appData.papers)
        ? appData.papers.map((paper) =>
            paper && paper.subject_id && idReplacementMap.has(paper.subject_id)
              ? { ...paper, subject_id: idReplacementMap.get(paper.subject_id)! }
              : paper
          )
        : [],
    } as AppData
  } catch (err) {
    console.warn('[cleanupDuplicateSubjects skipped on error]', err)
    return appData
  }
}

export const cleanupDuplicateFolders = (appData: AppData): AppData => {
  try {
    if (!appData?.notebook_folders || !Array.isArray(appData.notebook_folders) || appData.notebook_folders.length <= 1) {
      return appData
    }

    const notes = Array.isArray(appData.notes) ? appData.notes.filter(Boolean) : []
    const noteCountByFolder = new Map<string, number>()
    for (const note of notes) {
      if (!note.deleted_at && note.folder_id) {
        noteCountByFolder.set(note.folder_id, (noteCountByFolder.get(note.folder_id) || 0) + 1)
      }
    }

    const isDefaultFolderName = (name: string) => {
      const n = (name || '').trim()
      return n === '默认文件夹' || n === '默认笔记' || n === '默认笔记本' || n === '我的笔记本'
    }

    const folderGroups = new Map<string, NotebookFolder[]>()
    for (const f of appData.notebook_folders) {
      if (!f || f.deleted_at) continue
      const subKey = f.subject_id || 'none'
      const nameKey = isDefaultFolderName(f.name) ? '__DEFAULT_NOTEBOOK__' : f.name.trim()
      const groupKey = `${subKey}:::${nameKey}`
      if (!folderGroups.has(groupKey)) {
        folderGroups.set(groupKey, [])
      }
      folderGroups.get(groupKey)!.push(f)
    }

    const folderReplacementMap = new Map<string, string>()
    const survivingFolders: NotebookFolder[] = []
    const duplicateFolderIds = new Set<string>()

    for (const [_key, group] of folderGroups.entries()) {
      if (group.length === 1) {
        survivingFolders.push(group[0])
        continue
      }

      // Sort: keep folder with the most notes, or oldest created_at
      group.sort((a, b) => {
        const countA = noteCountByFolder.get(a.id) || 0
        const countB = noteCountByFolder.get(b.id) || 0
        if (countB !== countA) return countB - countA
        return (a.created_at || '').localeCompare(b.created_at || '')
      })

      const survivor = group[0]
      if (isDefaultFolderName(survivor.name)) {
        survivor.name = '默认笔记'
      }
      survivingFolders.push(survivor)

      for (let i = 1; i < group.length; i++) {
        const dup = group[i]
        folderReplacementMap.set(dup.id, survivor.id)
        duplicateFolderIds.add(dup.id)
      }
    }

    const deletedFolders = appData.notebook_folders.filter((f) => f && f.deleted_at)

    if (folderReplacementMap.size === 0) {
      return appData
    }

    const updatedNotes = notes.map((n) => {
      if (n.folder_id && folderReplacementMap.has(n.folder_id)) {
        return { ...n, folder_id: folderReplacementMap.get(n.folder_id)! }
      }
      return n
    })

    return {
      ...appData,
      notebook_folders: [...survivingFolders, ...deletedFolders],
      notes: updatedNotes,
    } as AppData
  } catch (err) {
    console.warn('[cleanupDuplicateFolders error]', err)
    return appData
  }
}

export const cleanupDataSanity = (appData: AppData): AppData => {
  return cleanupDuplicateFolders(cleanupDuplicateSubjects(appData))
}

const mergeData = (current: AppData, incoming: Partial<AppData>): AppData => {
  try {
    const next = { ...current }
    for (const kind of Object.keys(incoming) as EntityKind[]) {
      const currentList = Array.isArray(next[kind]) ? (next[kind] as AppEntity[]) : []
      const idMap = new Map(currentList.filter(Boolean).map((r) => [r.id, r]))
      const legacyMap = new Map(
        currentList
          .filter((r) => r && (r as any).legacy_id)
          .map((r) => [(r as any).legacy_id, r])
      )
      const nameMap =
        kind === 'subjects'
          ? new Map(currentList.filter(Boolean).map((r) => [String((r as any).name || '').trim(), r]))
          : kind === 'notebook_folders'
          ? new Map(
              currentList.filter(Boolean).map((r) => [
                `${(r as any).subject_id || 'none'}:::${String((r as any).name || '').trim()}`,
                r,
              ])
            )
          : null

      for (const rawRecord of incoming[kind] ?? []) {
        const record = rawRecord as AppEntity
        if (!record) continue
        const recLegacyId = (record as any).legacy_id
        const recName = String((record as any).name || '').trim()
        const folderKey = kind === 'notebook_folders' ? `${(record as any).subject_id || 'none'}:::${recName}` : null
        const existing =
          idMap.get(record.id) ||
          (recLegacyId ? legacyMap.get(recLegacyId) : undefined) ||
          (folderKey && nameMap ? nameMap.get(folderKey) : undefined) ||
          (nameMap && recName && kind === 'subjects' ? nameMap.get(recName) : undefined)

        if (!existing) {
          idMap.set(record.id, record)
          if (recLegacyId) legacyMap.set(recLegacyId, record)
          if (folderKey && nameMap) nameMap.set(folderKey, record)
          if (nameMap && recName && kind === 'subjects') nameMap.set(recName, record)
        } else if (record.updated_at >= existing.updated_at) {
          idMap.set(existing.id, { ...existing, ...record, id: existing.id } as AppEntity)
        }
      }
      ;(next as unknown as Record<string, AppEntity[]>)[kind] = [...idMap.values()]
    }
    return cleanupDataSanity(next as AppData)
  } catch (err) {
    console.warn('[mergeData error]', err)
    return current
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(createDefaultData)
  const [ready, setReady] = useState(false)
  const [syncId, setSyncIdState] = useState<string>(() => localStorage.getItem('study_sync_id') || '')
  const [userId, setUserId] = useState(() => localStorage.getItem('study_sync_id') || LOCAL_USER_ID)
  const [syncState, setSyncState] = useState<SyncState>('local')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => localStorage.getItem('study_last_sync_time'))
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        let initial = await loadAllData(createDefaultData())

        // Auto-recovery: if IndexedDB has no tasks and no notes, check localStorage for legacy data
        const storedSync = localStorage.getItem('study_sync_id') || ''
        const effectiveUser = storedSync || LOCAL_USER_ID
        const legacyRaw = readLegacyStorage()
        if ((!initial.tasks.length && !initial.notes.length) && legacyRaw) {
          try {
            const migrated = migrateLegacy(legacyRaw, createDefaultData(), effectiveUser)
            if (migrated.data.tasks.length || migrated.data.notes.length || migrated.data.subjects.length) {
              initial = migrated.data
              await replaceAllData(initial)
            }
          } catch (migErr) {
            console.warn('[Auto-migration on start failed]', migErr)
          }
        }

        const sanitized = cleanupDataSanity(initial)
        if (
          sanitized.subjects.length !== initial.subjects.length ||
          sanitized.notebook_folders.length !== initial.notebook_folders.length
        ) {
          initial = sanitized
          replaceAllData(initial).catch((err) => console.warn('[Failed to persist sanitized initial data]', err))
        } else {
          initial = sanitized
        }

        const legacyBundledPapers = initial.papers.filter(
          (paper) => LEGACY_BUNDLED_337_IDS.has(paper.id) || LEGACY_BUNDLED_337_IDS.has(paper.legacy_id || '')
        )
        if (legacyBundledPapers.length) {
          const deletedAt = nowIso()
          const retiredPapers = legacyBundledPapers.map((paper) => ({ ...paper, deleted_at: deletedAt, updated_at: deletedAt }))
          const retiredIds = new Set(retiredPapers.map((paper) => paper.id))
          initial = {
            ...initial,
            papers: [...initial.papers.filter((paper) => !retiredIds.has(paper.id)), ...retiredPapers],
          }
          await Promise.all(retiredPapers.map((paper) => persistRecord('papers', paper, false)))
        }

        let gdut337Subject = initial.subjects.find(
          (subject) => !subject.deleted_at && subject.name.trim() === '337'
        )
        if (!gdut337Subject) {
          const timestamp = nowIso()
          gdut337Subject = {
            id: id(),
            legacy_id: 'subject-gdut-337',
            user_id: effectiveUser,
            created_at: timestamp,
            updated_at: timestamp,
            deleted_at: null,
            name: '337',
            color: '#f97316',
            sort_order: Math.max(-1, ...initial.subjects.map((subject) => subject.sort_order)) + 1,
            status: 'active',
          }
          initial = { ...initial, subjects: [...initial.subjects, gdut337Subject] }
          await persistRecord('subjects', gdut337Subject, false)
        }

        const englishSubject = initial.subjects.find(
          (subject) => !subject.deleted_at && subject.name.trim().includes('英语')
        )
        const englishPaperKeys = new Set(
          ENGLISH_PAPERS_DATA.flatMap((paper) => [paper.id, paper.legacy_id])
        )
        const gdut337PaperKeys = new Set(
          BUNDLED_337_PAPERS.flatMap((paper) => [paper.id, paper.legacy_id])
        )
        const reassignedAt = nowIso()
        const reassignedPapers = initial.papers.map((paper) => {
          const keys = [paper.id, paper.legacy_id || '']
          const targetSubject = keys.some((key) => englishPaperKeys.has(key))
            ? englishSubject
            : keys.some((key) => gdut337PaperKeys.has(key))
              ? gdut337Subject
              : undefined
          if (!targetSubject || paper.subject_id === targetSubject.id) return paper
          return { ...paper, subject_id: targetSubject.id, updated_at: reassignedAt }
        })
        const changedPapers = reassignedPapers.filter((paper, index) => paper !== initial.papers[index])
        if (changedPapers.length) {
          initial = { ...initial, papers: reassignedPapers }
          await Promise.all(changedPapers.map((paper) => persistRecord('papers', paper, false)))
        }

        const existingPaperKeys = new Set(initial.papers.flatMap((paper) => [paper.id, paper.legacy_id].filter(Boolean)))
        if (gdut337Subject) {
          const timestamp = nowIso()
          const missingPapers = BUNDLED_337_PAPERS.filter(
            (paper) => !existingPaperKeys.has(paper.id) && !existingPaperKeys.has(paper.legacy_id)
          ).map((paper) => ({
            id: paper.id,
            legacy_id: paper.legacy_id,
            user_id: effectiveUser,
            created_at: timestamp,
            updated_at: timestamp,
            deleted_at: null,
            subject_id: gdut337Subject.id,
            year: paper.year,
            title: paper.title,
            total_score: paper.total_score,
          }))
          if (missingPapers.length) {
            initial = { ...initial, papers: [...initial.papers, ...missingPapers] }
            await Promise.all(missingPapers.map((paper) => persistRecord('papers', paper, false)))
          }
        }

        if (alive) {
          setData(initial)
          setReady(true)
        }
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user.id) {
            setUserId(session.user.id)
          }
          supabase.auth.onAuthStateChange((_e, s) => {
            const syncStored = localStorage.getItem('study_sync_id')
            setUserId(s?.user.id ?? (syncStored || LOCAL_USER_ID))
          })
        }
      } catch (e) {
        console.error('[DataProvider init error]', e)
        if (alive) setReady(true)
      }
    })()
    return () => { alive = false }
  }, [])

  const generateNewSyncId = useCallback(() => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    let res = 'sp'
    for (let i = 0; i < 4; i++) {
      res += chars[Math.floor(Math.random() * chars.length)]
    }
    return res
  }, [])

  const sync = useCallback(async (explicitSyncId?: string) => {
    const targetSyncId = (explicitSyncId !== undefined ? explicitSyncId : syncId).trim()
    const isAuthUser = userId !== LOCAL_USER_ID && userId !== targetSyncId

    if (!targetSyncId && !isAuthUser) {
      setSyncState('local')
      setSyncError(null)
      return
    }

    setSyncState('syncing')
    setSyncError(null)
    try {
      if (targetSyncId) {
        // 1. Pull from study_progress
        const remoteRecord = await pullStudyProgress(targetSyncId)
        let mergedState = structuredClone(data)

        // Merge legacy rawData if available (ensuring 2025/2026 notes & notebookEntries are preserved)
        if (remoteRecord?.rawData) {
          const migrated = migrateLegacy(remoteRecord.rawData, createDefaultData(), targetSyncId)
          mergedState = mergeData(mergedState, migrated.data)
        }

        // Merge appData if available
        if (remoteRecord?.appData) {
          mergedState = mergeData(mergedState, remoteRecord.appData)
        }

        // Merge any Obsidian knowledge base notes
        if (remoteRecord?.obsidianNotes && remoteRecord.obsidianNotes.length > 0) {
          const existingIds = new Set(mergedState.notes.map((n) => n.id))
          const existingLegacy = new Set(mergedState.notes.map((n) => n.legacy_id).filter(Boolean))
          const targetFolderId = mergedState.notebook_folders[0]?.id ?? null

          for (const ob of remoteRecord.obsidianNotes) {
            const obId = ob.noteId || `ob-${crypto.randomUUID().slice(0, 8)}`
            if (!existingIds.has(obId) && !existingLegacy.has(ob.noteId)) {
              mergedState.notes.push({
                id: obId,
                user_id: targetSyncId,
                created_at: ob.updatedAt || nowIso(),
                updated_at: ob.updatedAt || nowIso(),
                deleted_at: null,
                legacy_id: ob.noteId,
                folder_id: targetFolderId,
                subject_id: null,
                title: ob.title || 'Obsidian 学习总结',
                html: `<p>${ob.markdown || ''}</p>`,
                plain_text: ob.markdown || '',
                pinned: false,
                source: 'web',
                linked_dates: [],
                conflict_of: null
              })
            }
          }
        }

        // Also check if local storage has legacy notes that aren't merged yet
        const localLegacy = readLegacyStorage()
        if (localLegacy) {
          const localMigrated = migrateLegacy(localLegacy, createDefaultData(), targetSyncId)
          mergedState = mergeData(mergedState, localMigrated.data)
        }

        setData(mergedState)
        await replaceAllData(mergedState)

        // 2. Push current state to study_progress
        await pushStudyProgress(targetSyncId, mergedState)
      }

      // 3. If signed into Supabase auth, also sync normalized tables
      if (isAuthUser) {
        try {
          await pushOutbox(userId)
          const since = await getMeta<string>('last-sync')
          const remote = await pullCloud(userId, since)
          await applyCloudRecords(remote)
          setData((prev) => mergeData(prev, remote))
          await setMeta('last-sync', nowIso())
        } catch (authErr) {
          console.warn('[Normalized tables sync skipped]', authErr)
        }
      }

      const nowTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      setLastSyncTime(nowTime)
      localStorage.setItem('study_last_sync_time', nowTime)
      setSyncState('synced')
      setSyncError(null)
    } catch (error: any) {
      console.error('[Sync error]', error)
      const errReason = error?.message || error?.details || error?.hint || String(error)
      setSyncError(errReason)
      setSyncState('error')
    }
  }, [data, syncId, userId])

  const setSyncId = useCallback(async (newId: string) => {
    const trimmed = newId.trim()
    setSyncIdState(trimmed)
    if (trimmed) {
      localStorage.setItem('study_sync_id', trimmed)
      setUserId((current) => (current === LOCAL_USER_ID || current === syncId ? trimmed : current))
      await sync(trimmed)
    } else {
      localStorage.removeItem('study_sync_id')
      setUserId(LOCAL_USER_ID)
      setSyncState('local')
    }
  }, [sync, syncId])

  const upsert = useCallback(async <K extends EntityKind>(kind: K, record: AppData[K][number]) => {
    const currentId = syncId || userId
    const next = { ...record, user_id: currentId, updated_at: nowIso() } as AppData[K][number]
    setData((prev) => {
      const rows = prev[kind] as AppEntity[]
      const updated = { ...prev, [kind]: [...rows.filter((item) => item.id !== next.id), next] } as AppData
      
      // Auto-debounce cloud sync if syncId is active
      if (syncId) {
        if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
        saveDebounceRef.current = setTimeout(() => {
          void pushStudyProgress(syncId, updated).catch(() => {})
        }, 1200)
      }
      return updated
    })
    await persistRecord(kind, next as AppEntity)
  }, [syncId, userId])

  const remove = useCallback(async <K extends EntityKind>(kind: K, recordId: string) => {
    const record = (data[kind] as AppEntity[]).find((item) => item.id === recordId)
    if (record) {
      await upsert(kind, { ...record, deleted_at: nowIso() } as AppData[K][number])
    }
  }, [data, upsert])

  const refresh = useCallback(async () => {
    setData(await loadAllData(createDefaultData()))
  }, [])

  // Auto sync on initial ready if syncId is configured
  useEffect(() => {
    if (ready && syncId) {
      void sync(syncId)
    }
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto sync on visibility change and network online
  useEffect(() => {
    const handler = () => {
      if (syncId || userId !== LOCAL_USER_ID) void sync()
    }
    window.addEventListener('online', handler)
    document.addEventListener('visibilitychange', handler)
    return () => {
      window.removeEventListener('online', handler)
      document.removeEventListener('visibilitychange', handler)
    }
  }, [sync, syncId, userId])

  const importLegacy = useCallback(async () => {
    const raw = readLegacyStorage()
    if (!raw) return null
    const effectiveUser = syncId || userId
    const result = migrateLegacy(raw, createDefaultData(), effectiveUser)
    await setMeta('legacy-backup', raw)
    await replaceAllData(result.data)
    setData(result.data)
    for (const kind of Object.keys(result.data) as EntityKind[]) {
      for (const record of result.data[kind]) {
        await persistRecord(kind, record)
      }
    }
    if (syncId) {
      await pushStudyProgress(syncId, result.data).catch(console.error)
    }
    return result.report
  }, [syncId, userId])

  const value = useMemo(
    () => ({
      data,
      ready,
      userId,
      syncId,
      setSyncId,
      generateNewSyncId,
      syncState,
      syncError,
      lastSyncTime,
      cloudConfigured,
      upsert,
      remove,
      sync,
      importLegacy,
      refresh
    }),
    [data, ready, userId, syncId, setSyncId, generateNewSyncId, syncState, syncError, lastSyncTime, cloudConfigured, upsert, remove, sync, importLegacy, refresh]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const value = useContext(DataContext)
  if (!value) throw new Error('useData must be used inside DataProvider')
  return value
}
