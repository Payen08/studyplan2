import { useEffect, useMemo, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Archive,
  Bold,
  BookOpen,
  CirclePlus,
  Download,
  ExternalLink,
  File,
  Folder,
  FolderOpen,
  Italic,
  Link2,
  List,
  NotebookPen,
  Plus,
  RefreshCw,
  Save,
  Search,
  Star,
  Trash2,
  Upload,
  WandSparkles,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { active, baseRecord, subjectFor } from '../data/helpers'
import type { EntityLink, Note, NotebookFolder, Resource, ResourceKind, StudyTask } from '../types'
import { Chip, Empty, Modal, SubjectDot } from '../components/ui'
import { supabase } from '../data/supabase'
import { buildNovaForgeNote, type NovaForgeMode } from '../domain/novaforge'

const tabs: [string, ResourceKind | null, typeof NotebookPen][] = [
  ['多维笔记本', null, NotebookPen],
  ['课程', 'course', BookOpen],
  ['PDF', 'pdf', File],
  ['题库', 'question_bank', List],
  ['链接', 'link', Link2],
]

export function Library() {
  const { data, userId, upsert, remove, importLegacy, sync } = useData()
  const [tab, setTab] = useState<ResourceKind | null>(null)
  const folders = active(data.notebook_folders)
  const allNotes = active(data.notes)
  const notebookNotes = useMemo(() => {
    return allNotes.filter(
      (n) => n.source !== 'daily_note' && !n.legacy_id?.startsWith('daily:')
    )
  }, [allNotes])
  const subjects = active(data.subjects).filter((s) => s.status === 'active')
  const resources = active(data.resources).filter((r) => r.status === 'active')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')
  const [folderId, setFolderId] = useState<string>('all')
  const [noteId, setNoteId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [folderModal, setFolderModal] = useState(false)
  const [resourceModal, setResourceModal] = useState(false)
  const [novaModal, setNovaModal] = useState(false)
  const [searchParams] = useSearchParams()

  const getFolderTitle = (folder: NotebookFolder | undefined | null) => {
    if (!folder) return '文件夹'
    const isDefault =
      !folder.name ||
      folder.name === '默认文件夹' ||
      folder.name === '默认笔记' ||
      folder.name === '默认笔记本' ||
      folder.name === '我的笔记本'
    if (isDefault) {
      const sub = subjectFor(subjects, folder.subject_id)
      return sub ? `${sub.name}笔记本` : '综合笔记本'
    }
    return folder.name
  }

  const cleanFolders = useMemo(() => {
    const isDefault = (name: string) => {
      const n = (name || '').trim()
      return !n || n === '默认文件夹' || n === '默认笔记' || n === '默认笔记本' || n === '我的笔记本'
    }
    const map = new Map<string, NotebookFolder>()
    for (const f of folders) {
      if (!f || f.deleted_at) continue
      const subKey = f.subject_id || 'none'
      const nameKey = isDefault(f.name) ? '__DEFAULT__' : f.name.trim()
      const groupKey = `${subKey}:::${nameKey}`
      const existing = map.get(groupKey)
      if (!existing) {
        map.set(groupKey, f)
      } else {
        const countExisting = notebookNotes.filter((n) => n.folder_id === existing.id).length
        const countIncoming = notebookNotes.filter((n) => n.folder_id === f.id).length
        if (countIncoming > countExisting) {
          map.set(groupKey, f)
        }
      }
    }
    return Array.from(map.values())
  }, [folders, notebookNotes])

  const filteredFolders = useMemo(() => {
    let list = cleanFolders
    if (selectedSubjectId !== 'all') {
      list = list.filter((f) => f.subject_id === selectedSubjectId)
    } else {
      const isDefault = (name: string) => {
        const n = (name || '').trim()
        return !n || n === '默认文件夹' || n === '默认笔记' || n === '默认笔记本' || n === '我的笔记本'
      }
      list = list.filter((f) => {
        const count = notebookNotes.filter((n) => n.folder_id === f.id).length
        if (count > 0) return true
        return !isDefault(f.name)
      })
    }
    return list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }, [cleanFolders, notebookNotes, selectedSubjectId])

  const handleDeleteFolder = async (folder: NotebookFolder) => {
    const notesInFolder = notebookNotes.filter((n) => n.folder_id === folder.id)
    if (notesInFolder.length > 0) {
      const ok = window.confirm(
        `文件夹「${getFolderTitle(folder)}」内包含 ${notesInFolder.length} 篇笔记。删除文件夹后，笔记将保留在全部笔记中。是否确定删除？`
      )
      if (!ok) return
      for (const n of notesInFolder) {
        await upsert('notes', { ...n, folder_id: null })
      }
    }
    await remove('notebook_folders', folder.id)
    if (folderId === folder.id) {
      setFolderId('all')
    }
  }

  const displayedNotes = useMemo(() => {
    let list = notebookNotes
    if (selectedSubjectId !== 'all') {
      list = list.filter((n) => n.subject_id === selectedSubjectId)
    }
    if (folderId !== 'all') {
      list = list.filter((n) => n.folder_id === folderId)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (n) => (n.title || '').toLowerCase().includes(q) || (n.plain_text || '').toLowerCase().includes(q)
      )
    }
    return list.sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at)
    )
  }, [folderId, notebookNotes, searchQuery, selectedSubjectId])

  const current = notebookNotes.find((n) => n.id === noteId) || displayedNotes[0] || null

  const editor = useEditor({
    extensions: [StarterKit],
    content: current?.html ?? '<p></p>',
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const nextHtml = current?.html ?? '<p></p>'
    if (editor.getHTML() !== nextHtml) {
      editor.commands.setContent(nextHtml)
    }
  }, [current?.id, editor])

  useEffect(() => {
    if (displayedNotes.length > 0 && (!noteId || !notebookNotes.some((n) => n.id === noteId))) {
      setNoteId(displayedNotes[0].id)
    }
  }, [displayedNotes, noteId, notebookNotes])

  useEffect(() => {
    const taskId = searchParams.get('task')
    const directNoteId = searchParams.get('note')
    if (directNoteId && notebookNotes.some((note) => note.id === directNoteId)) { setNoteId(directNoteId); return }
    if (taskId) {
      const link = active(data.entity_links).find((item) => item.source_type === 'tasks' && item.source_id === taskId && item.target_type === 'notes')
      if (link && notebookNotes.some((note) => note.id === link.target_id)) setNoteId(link.target_id)
    }
  }, [data.entity_links, notebookNotes, searchParams])

  const newNote = async () => {
    let targetFolder = folders.find((f) => f.id === folderId)
    if (!targetFolder && filteredFolders.length > 0) {
      targetFolder = filteredFolders[0]
    }
    const targetSubjectId = selectedSubjectId !== 'all' ? selectedSubjectId : (targetFolder?.subject_id ?? subjects[0]?.id ?? null)

    if (!targetFolder) {
      targetFolder = {
        ...baseRecord(userId),
        subject_id: targetSubjectId,
        name: '默认笔记',
        sort_order: folders.length,
      } as NotebookFolder
      await upsert('notebook_folders', targetFolder)
    }
    const note: Note = {
      ...baseRecord(userId),
      folder_id: targetFolder.id,
      subject_id: targetFolder.subject_id || targetSubjectId,
      title: '未命名笔记',
      html: '<p></p>',
      plain_text: '',
      pinned: false,
      source: 'web',
      linked_dates: [],
      conflict_of: null,
    }
    await upsert('notes', note)
    setFolderId(targetFolder.id)
    setNoteId(note.id)
  }

  const saveNote = async () => {
    if (!current || !editor || editor.isDestroyed) return
    await upsert('notes', {
      ...current,
      html: editor.getHTML(),
      plain_text: editor.getText(),
    })
  }

  const exportMarkdown = () => {
    if (!current || !editor || editor.isDestroyed) return
    const markdown = editor.getHTML()
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${current.title || '学习笔记'}.md`; anchor.click(); URL.revokeObjectURL(url)
  }

  const splitIntoReviewTasks = async () => {
    if (!current) return
    const sections = Array.from(current.html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)).map((match) => match[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean)
    for (const [index, section] of sections.entries()) {
      const legacyId = `note-review:${current.id}:${index}`
      if (active(data.tasks).some((task) => task.legacy_id === legacyId)) continue
      const date = new Date(); date.setDate(date.getDate() + index)
      const task: StudyTask = { ...baseRecord(userId), legacy_id: legacyId, plan_id: null, subject_id: current.subject_id, syllabus_node_id: null, title: `复习：${current.title} · ${section}`, task_date: new Intl.DateTimeFormat('en-CA').format(date), period: '晚上', estimate_minutes: 20, actual_minutes: 0, status: 'todo', sort_order: active(data.tasks).length + index, completed_at: null, source: 'review' }
      await upsert('tasks', task)
      const link: EntityLink = { ...baseRecord(userId), source_type: 'notes', source_id: current.id, target_type: 'tasks', target_id: task.id }
      await upsert('entity_links', link)
    }
  }

  const addFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const folder: NotebookFolder = {
      ...baseRecord(userId),
      name: String(f.get('name')),
      subject_id: String(f.get('subject')) || null,
      sort_order: folders.length,
    }
    await upsert('notebook_folders', folder)
    setFolderId(folder.id)
    setFolderModal(false)
  }

  const addResource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const file = f.get('file') as File
    let storagePath: string | null = null
    let url = String(f.get('url') ?? '')
    if (file?.size && supabase && userId !== 'local-user') {
      storagePath = `${userId}/${crypto.randomUUID()}-${file.name}`
      const { error } = await supabase.storage
        .from('study-resources')
        .upload(storagePath, file)
      if (error) throw error
      url = ''
    }
    const resource: Resource = {
      ...baseRecord(userId),
      title: String(f.get('title')),
      kind: tab!,
      subject_id: String(f.get('subject')) || null,
      url,
      storage_path: storagePath,
      status: 'active',
    }
    await upsert('resources', resource)
    setResourceModal(false)
  }

  const createStructuredNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const mode = String(form.get('mode')) as NovaForgeMode
    const title = String(form.get('title')).trim()
    const sourceText = String(form.get('source')).trim()
    const generated = buildNovaForgeNote(mode, title, sourceText)
    const note: Note = {
      ...baseRecord(userId),
      folder_id: current?.folder_id || null,
      subject_id: current?.subject_id || (selectedSubjectId === 'all' ? null : selectedSubjectId),
      title: title || '结构化学习笔记',
      html: generated.html,
      plain_text: `${title}\n${sourceText}\n${generated.sections.join('\n')}`.trim(),
      pinned: false,
      source: 'novaforge',
      linked_dates: [],
      conflict_of: null,
    }
    await upsert('notes', note)
    if (current) {
      const link: EntityLink = { ...baseRecord(userId), source_type: 'notes', source_id: current.id, target_type: 'notes', target_id: note.id }
      await upsert('entity_links', link)
    }
    setNoteId(note.id)
    setNovaModal(false)
  }

  return (
    <div className="library-layout">
      <div className="library-tabs">
        {tabs.map(([label, value, Icon]) => (
          <button
            key={label}
            className={tab === value ? 'active' : ''}
            onClick={() => setTab(value)}
          >
            <Icon size={16} />
            {label}
            <span>
              {value === null
                ? notebookNotes.length
                : resources.filter((r) => r.kind === value).length}
            </span>
          </button>
        ))}
      </div>

      {tab === null ? (
        <div className="notebook-layout">
          <aside className="folder-column">
            <div className="folder-column-header">
              <div className="section-head" style={{ marginBottom: 10 }}>
                <span className="eyebrow">FOLDERS</span>
                <button
                  className="icon-btn"
                  onClick={() => setFolderModal(true)}
                  aria-label="新建文件夹"
                  title="新建文件夹"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="hero-subject-filter-bar" style={{ marginBottom: 10 }}>
                <button
                  type="button"
                  className={`hero-subject-chip ${selectedSubjectId === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedSubjectId('all')
                    setFolderId('all')
                  }}
                >
                  全部
                </button>
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`hero-subject-chip ${selectedSubjectId === s.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedSubjectId(s.id)
                      setFolderId('all')
                    }}
                  >
                    <span className="hero-subject-dot" style={{ background: s.color }} />
                    {s.name}
                  </button>
                ))}
              </div>

              <button
                className={`folder-row-main all-notes-btn ${folderId === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setFolderId('all')
                  setNoteId('')
                }}
              >
                <FolderOpen size={16} />
                <span>
                  <strong>全部笔记</strong>
                  <small>
                    共 {selectedSubjectId === 'all'
                      ? notebookNotes.length
                      : notebookNotes.filter((n) => n.subject_id === selectedSubjectId).length} 篇
                  </small>
                </span>
              </button>
            </div>

            <div className="folder-list">
              {filteredFolders.map((folder) => {
                const folderNotesCount = notebookNotes.filter((n) => n.folder_id === folder.id).length
                return (
                  <div
                    className={`folder-row ${folder.id === folderId ? 'active' : ''}`}
                    key={folder.id}
                  >
                    <button
                      className="folder-row-main"
                      onClick={() => {
                        setFolderId(folder.id)
                        setNoteId('')
                      }}
                    >
                      <Folder size={16} />
                      <span>
                        <strong>{getFolderTitle(folder)}</strong>
                        <small>
                          {subjectFor(subjects, folder.subject_id)?.name ?? '综合'} ·{' '}
                          {folderNotesCount} 篇
                        </small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="folder-delete-btn"
                      title="删除文件夹"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteFolder(folder)
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          </aside>

          <aside className="note-column">
            <div className="note-column-header">
              <div className="section-head" style={{ marginBottom: 10 }}>
                <div>
                  <span className="eyebrow">NOTES</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginTop: 2 }}>
                    {folderId === 'all'
                      ? (selectedSubjectId === 'all' ? '全部笔记' : `${subjectFor(subjects, selectedSubjectId)?.name || ''} 笔记`)
                      : getFolderTitle(folders.find((f) => f.id === folderId))} ({displayedNotes.length})
                  </span>
                </div>
                <button className="icon-btn" onClick={newNote} aria-label="新建笔记" title="新建笔记">
                  <Plus size={16} />
                </button>
              </div>

              <div className="note-search-wrapper">
                <Search size={14} className="note-search-icon" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索笔记标题或内容..."
                  className="note-search-input"
                />
              </div>
            </div>

            <div className="note-list">
              {displayedNotes.map((note) => (
                <button
                  className={`note-row-btn ${note.id === (current?.id ?? '') ? 'active' : ''}`}
                  key={note.id}
                  onClick={() => setNoteId(note.id)}
                >
                  {note.pinned && <Star size={13} fill="currentColor" />}
                  <strong>{note.title || '未命名笔记'}</strong>
                  <p>{note.plain_text || '暂无内容'}</p>
                  <small>{new Date(note.updated_at).toLocaleDateString('zh-CN')}</small>
                </button>
              ))}

              {!displayedNotes.length && (
                <div style={{ padding: '12px 8px' }}>
                  <Empty
                    title={searchQuery ? '未找到匹配笔记' : (notebookNotes.length === 0 ? '暂无笔记' : '暂无笔记')}
                    body={
                      notebookNotes.length === 0
                        ? '可从本机缓存或云端恢复历史数据：'
                        : undefined
                    }
                    action={
                      notebookNotes.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 8 }}>
                          <button
                            className="primary-btn"
                            disabled={restoring}
                            onClick={async () => {
                              setRestoring(true)
                              try {
                                await importLegacy()
                              } finally {
                                setRestoring(false)
                              }
                            }}
                          >
                            <RefreshCw size={14} className={restoring ? 'animate-spin' : ''} />
                            {restoring ? '正在恢复...' : '从本机缓存一键恢复'}
                          </button>
                          <button
                            className="secondary-btn"
                            disabled={restoring}
                            onClick={async () => {
                              setRestoring(true)
                              try {
                                await sync()
                              } finally {
                                setRestoring(false)
                              }
                            }}
                          >
                            从云端重新拉取
                          </button>
                        </div>
                      ) : (
                        <button className="primary-btn" onClick={newNote}>
                          <Plus size={16} /> 新建笔记
                        </button>
                      )
                    }
                  />
                </div>
              )}
            </div>
          </aside>

          <section className="editor-column">
            {current && editor && !editor.isDestroyed ? (
              <>
                <div className="editor-top-bar">
                  <div className="editor-meta-left">
                    <span className="editor-notebook-tag">
                      <span
                        className="editor-subject-dot"
                        style={{
                          background:
                            subjectFor(subjects, current.subject_id)?.color ??
                            'var(--accent)',
                        }}
                      />
                      {subjectFor(subjects, current.subject_id)?.name ?? '综合笔记本'}
                    </span>
                    <span className="editor-source-tag">
                      {current.source === 'obsidian' ? 'Obsidian 同步' : '多维笔记本'}
                    </span>
                    <span className="editor-updated-time">
                      更新于{' '}
                      {new Date(current.updated_at).toLocaleDateString('zh-CN', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="editor-actions-right">
                    <button type="button" className="secondary-btn" onClick={() => setNovaModal(true)} title="按 NovaForge 结构生成可编辑笔记">
                      <WandSparkles size={14} />
                      <span>结构化笔记</span>
                    </button>
                    {current.source === 'novaforge' && <button type="button" className="secondary-btn" onClick={splitIntoReviewTasks} title="按章节生成复习任务"><CirclePlus size={14}/><span>拆成任务</span></button>}
                    <button type="button" className="icon-btn" onClick={exportMarkdown} title="导出 Markdown" aria-label="导出 Markdown"><Download size={15}/></button>
                    <div className="editor-format-toolbar">
                      <button
                        type="button"
                        className={`editor-format-btn ${
                          editor.isActive('bold') ? 'active' : ''
                        }`}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        title="加粗"
                      >
                        <Bold size={15} />
                      </button>
                      <button
                        type="button"
                        className={`editor-format-btn ${
                          editor.isActive('italic') ? 'active' : ''
                        }`}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        title="斜体"
                      >
                        <Italic size={15} />
                      </button>
                      <button
                        type="button"
                        className={`editor-format-btn ${
                          editor.isActive('bulletList') ? 'active' : ''
                        }`}
                        onClick={() =>
                          editor.chain().focus().toggleBulletList().run()
                        }
                        title="无序列表"
                      >
                        <List size={15} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className={`editor-star-btn ${current.pinned ? 'active' : ''}`}
                      onClick={() =>
                        upsert('notes', { ...current, pinned: !current.pinned })
                      }
                      title={current.pinned ? '取消置顶' : '置顶笔记'}
                    >
                      <Star
                        size={15}
                        fill={current.pinned ? 'currentColor' : 'none'}
                      />
                    </button>

                    <button
                      type="button"
                      className="save-btn"
                      onClick={saveNote}
                    >
                      <Save size={14} />
                      <span>保存</span>
                    </button>
                  </div>
                </div>

                <div className="editor-body-wrap">
                  <div className="editor-title-row">
                    <input
                      className="editor-title-input"
                      value={current.title}
                      onChange={(e) =>
                        upsert('notes', { ...current, title: e.target.value })
                      }
                      placeholder="输入笔记标题..."
                    />
                  </div>
                  <EditorContent editor={editor} />
                </div>
              </>
            ) : (
              <div className="editor-empty-state">
                <Empty
                  title="选择一篇笔记"
                  action={
                    <button className="primary-btn" onClick={newNote}>
                      <CirclePlus size={16} />
                      新建笔记
                    </button>
                  }
                />
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="resource-panel">
          <div className="toolbar">
            <h3>{tabs.find((t) => t[1] === tab)?.[0]}</h3>
            <button className="primary-btn" onClick={() => setResourceModal(true)}>
              <Upload size={16} />
              添加资料
            </button>
          </div>

          {resources.filter((r) => r.kind === tab).length ? (
            <div className="resource-grid">
              {resources
                .filter((r) => r.kind === tab)
                .map((resource) => (
                  <article key={resource.id}>
                    <span className="file-mark">
                      {resource.kind === 'pdf'
                        ? 'PDF'
                        : resource.kind === 'link'
                        ? 'URL'
                        : 'DOC'}
                    </span>
                    <div>
                      <span>
                        {subjectFor(subjects, resource.subject_id)?.name ?? '未分类'}
                      </span>
                      <h3>{resource.title}</h3>
                      <small>
                        {resource.storage_path ? '已安全上传' : '外部链接'}
                      </small>
                    </div>
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        title="打开外部链接"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <button
                      onClick={() =>
                        upsert('resources', { ...resource, status: 'archived' })
                      }
                      title="归档此资料"
                    >
                      <Archive size={16} />
                    </button>
                  </article>
                ))}
            </div>
          ) : (
            <Empty
              title={`暂无${tabs.find((t) => t[1] === tab)?.[0]}`}
            />
          )}
        </section>
      )}

      {folderModal && (
        <Modal title="新建笔记文件夹" onClose={() => setFolderModal(false)}>
          <form className="form-grid" onSubmit={addFolder}>
            <label className="full">
              文件夹名称
              <input name="name" required autoFocus placeholder="例如：核心词汇与难点精炼" />
            </label>
            <label className="full">
              所属科目
              <select name="subject">
                <option value="">综合</option>
                {subjects.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-btn full" type="submit">
              创建
            </button>
          </form>
        </Modal>
      )}

      {resourceModal && (
        <Modal title="添加资料" onClose={() => setResourceModal(false)}>
          <form className="form-grid" onSubmit={addResource}>
            <label className="full">
              资料名称
              <input name="title" required placeholder="例如：历年真题核心考点清单" autoFocus />
            </label>
            <label className="full">
              所属科目
              <select name="subject">
                <option value="">未分类</option>
                {subjects.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="full">
              外部链接
              <input name="url" type="url" placeholder="https://" />
            </label>
            {tab !== 'link' && (
              <label className="full">
                或上传文件
                <input name="file" type="file" accept={tab === 'pdf' ? '.pdf' : '*'} />
              </label>
            )}
            <button className="primary-btn full" type="submit">
              保存资料
            </button>
          </form>
        </Modal>
      )}

      {novaModal && (
        <Modal title="生成结构化笔记" onClose={() => setNovaModal(false)}>
          <form className="form-grid" onSubmit={createStructuredNote}>
            <p className="full form-hint">基于 NovaForge 的知识组织原则生成可编辑骨架，并自动关联当前来源笔记。</p>
            <label>
              笔记模式
              <select name="mode" defaultValue="kaoyan">
                <option value="chapter">章节笔记</option>
                <option value="kaoyan">考研笔记</option>
                <option value="mistakes">错题专题</option>
              </select>
            </label>
            <label>
              标题
              <input name="title" defaultValue={current ? `${current.title} · 结构化整理` : ''} required />
            </label>
            <label className="full">
              来源摘要
              <textarea name="source" rows={5} defaultValue={current?.plain_text || ''} placeholder="粘贴章节、真题解析、错题组或已有笔记的核心内容" />
            </label>
            <button type="submit" className="primary-btn full"><WandSparkles size={15}/>生成并打开</button>
          </form>
        </Modal>
      )}
    </div>
  )
}
