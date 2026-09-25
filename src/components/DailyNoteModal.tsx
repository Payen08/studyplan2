import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  BookOpen,
  Check,
  Code,
  ExternalLink,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Pencil,
  Quote,
  Redo,
  Strikethrough,
  Undo,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { active, baseRecord, subjectFor } from '../data/helpers'
import type { Note } from '../types'

interface DailyNoteModalProps {
  date: string // format: YYYY-MM-DD
  onClose: () => void
}

export function normalizeDailyNoteContent(html?: string, plain?: string): string {
  let content = (html || '').trim()
  if (!content && plain) {
    content = plain.trim()
  }
  if (!content) return '<p></p>'

  // 1. Strip leading <hr> or <hr/> and any empty paragraphs preceding it
  content = content
    .replace(/^(\s*<p>\s*(<br\s*\/?>)?\s*<\/p>\s*)*\s*<hr\s*\/?>\s*/gi, '')
    .trim()

  // Strip standalone leading <hr> wrapped in <p>
  content = content.replace(/^<p>\s*<hr\s*\/?>\s*<\/p>/gi, '').trim()

  // If content contains escaped literal \n, unescape to actual newline
  if (content.includes('\\n') && !content.includes('\n')) {
    content = content.replace(/\\n/g, '\n')
  }

  // 2. Format paragraphs & line breaks properly:
  // If the content is wrapped in a single <p>...</p> or is plain text with newlines
  const hasNoComplexTags = !/<(h[1-6]|div|ul|ol|table|blockquote|section)[\s>]/i.test(content)
  const isSingleP = /^<p>[\s\S]*<\/p>$/i.test(content) && (content.match(/<p>/gi) || []).length === 1

  if (hasNoComplexTags) {
    const rawText = isSingleP
      ? content.replace(/^<p>/i, '').replace(/<\/p>$/i, '')
      : content

    if (rawText.includes('\n')) {
      const lines = rawText.split(/\r?\n/)
      return lines
        .map((line) => {
          const t = line.trim()
          return t ? `<p>${t}</p>` : '<p><br></p>'
        })
        .join('')
    } else if (!isSingleP) {
      return `<p>${rawText}</p>`
    }
  }

  // If there are raw newlines in remaining HTML, ensure <br> is used so browser won't collapse them
  if (content.includes('\n') && !content.includes('<br')) {
    content = content.replace(/\r?\n/g, '<br>')
  }

  return content || '<p></p>'
}

export function DailyNoteModal({ date, onClose }: DailyNoteModalProps) {
  const { data, userId, upsert } = useData()
  const notes = active(data.notes)
  const subjects = active(data.subjects)

  // Find daily note for this date
  const existingDailyNote = notes.find(
    (n) =>
      (n.source === 'daily_note' || n.legacy_id?.startsWith('daily:')) &&
      n.linked_dates?.includes(date)
  )

  // Find multidimensional notebook entries linked to this date
  const projectedEntries = notes.filter(
    (n) =>
      n.source !== 'daily_note' &&
      !n.legacy_id?.startsWith('daily:') &&
      n.linked_dates?.includes(date)
  )

  const hasExistingContent = Boolean(
    existingDailyNote?.html?.trim() || existingDailyNote?.plain_text?.trim()
  )

  // In legacy: if existing content, starts in View mode; if empty, starts in Edit mode
  const [isEditMode, setIsEditMode] = useState(!hasExistingContent)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const initialContent = normalizeDailyNoteContent(
    existingDailyNote?.html,
    existingDailyNote?.plain_text
  )

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editable: isEditMode,
    immediatelyRender: false,
  })

  // Synchronize editable state when isEditMode changes
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(isEditMode)
  }, [isEditMode, editor])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const nextHtml = normalizeDailyNoteContent(
      existingDailyNote?.html,
      existingDailyNote?.plain_text
    )
    if (editor.getHTML() !== nextHtml && !editor.isFocused) {
      editor.commands.setContent(nextHtml)
    }
  }, [existingDailyNote?.id, existingDailyNote?.html, existingDailyNote?.plain_text, editor])

  // Format header date: e.g. 9月1日
  const dateParts = date.split('-')
  const dateDisplay =
    dateParts.length === 3
      ? `${Number(dateParts[1])}月${Number(dateParts[2])}日`
      : date

  const wordCount = editor ? editor.getText().replace(/\s/g, '').length : 0

  const saveCurrentNote = async () => {
    if (!editor || editor.isDestroyed) return
    setBusy(true)
    try {
      const rawHtml = editor.getHTML()
      const htmlContent = rawHtml
        .replace(/^(\s*<p>\s*(<br\s*\/?>)?\s*<\/p>\s*)*\s*<hr\s*\/?>\s*/gi, '')
        .trim()
      const plainText = editor.getText()
      const hasContent = plainText.trim().length > 0

      if (hasContent) {
        const noteToSave: Note = existingDailyNote
          ? {
              ...existingDailyNote,
              html: htmlContent,
              plain_text: plainText,
              updated_at: new Date().toISOString(),
            }
          : {
              ...baseRecord(userId),
              folder_id: '',
              subject_id: null,
              title: `${dateDisplay} 日历笔记`,
              html: htmlContent,
              plain_text: plainText,
              pinned: false,
              source: 'daily_note',
              linked_dates: [date],
              conflict_of: null,
            }

        await upsert('notes', noteToSave)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else if (existingDailyNote) {
        await upsert('notes', {
          ...existingDailyNote,
          html: '<p></p>',
          plain_text: '',
          updated_at: new Date().toISOString(),
        })
      }
    } finally {
      setBusy(false)
    }
  }

  const handleFinish = async () => {
    await saveCurrentNote()
    setIsEditMode(false)
  }

  const handleClose = async () => {
    if (isEditMode) {
      await saveCurrentNote()
    }
    onClose()
  }

  // Keyboard shortcut Ctrl/Cmd + S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void saveCurrentNote()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editor, existingDailyNote])

  const handleScrollerClick = () => {
    if (!isEditMode) {
      setIsEditMode(true)
      setTimeout(() => {
        editor?.commands.focus()
      }, 50)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) void handleClose()
      }}
    >
      <section
        className="modal-card legacy-note-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={`${dateDisplay} 日历笔记`}
      >
        {/* Legacy Header: Accent Bar + Title + Mode Badge + Word Count + Close Button */}
        <div className="legacy-modal-header">
          <div className="legacy-header-left">
            <span className="legacy-title-bar" />
            <h3 className="legacy-modal-title">
              <FileText size={18} className="legacy-note-icon" />
              <span>{dateDisplay} · 日历笔记</span>
            </h3>
            <span className={`legacy-mode-badge ${isEditMode ? 'editing' : 'viewing'}`}>
              {isEditMode ? '编辑中' : '查看模式'}
            </span>
            <span className="legacy-count-badge">{wordCount} 字</span>
            {saved && (
              <span className="legacy-saved-badge">
                <Check size={12} /> 已保存
              </span>
            )}
          </div>

          <button
            className="legacy-close-btn"
            onClick={handleClose}
            aria-label="关闭弹窗"
          >
            <X size={18} />
          </button>
        </div>

        {/* Legacy Body: Full-Bleed Editor Scroller */}
        <div
          className={`editor-scroller ${isEditMode ? 'editing' : 'viewing'}`}
          onClick={handleScrollerClick}
        >
          <div id="note-editor" className={isEditMode ? 'is-editing' : 'is-viewing'}>
            <EditorContent editor={editor} />
          </div>

          {/* Multidimensional Notebook Projections Section */}
          {projectedEntries.length > 0 && (
            <div
              className="legacy-projection-section"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="legacy-projection-header">
                <span className="legacy-projection-pill">
                  <BookOpen size={13} /> 来自多维笔记本的关联条目 ({projectedEntries.length})
                </span>
                <Link to="/library" onClick={onClose} className="legacy-link-subtle">
                  在多维笔记本中管理 <ExternalLink size={12} />
                </Link>
              </div>

              <div className="legacy-projection-list">
                {projectedEntries.map((entry) => {
                  const subject = subjectFor(subjects, entry.subject_id)
                  return (
                    <article key={entry.id} className="legacy-projection-card">
                      <div className="legacy-projection-meta">
                        <strong>{entry.title || '未命名笔记'}</strong>
                        {subject && (
                          <span
                            className="legacy-subject-tag"
                            style={{
                              backgroundColor: `${subject.color}18`,
                              color: subject.color,
                            }}
                          >
                            {subject.name}
                          </span>
                        )}
                      </div>
                      <p>{entry.plain_text || '暂无内容概要'}</p>
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Legacy Footer: Tools on Left (visible in edit mode) + Action Button on Right */}
        <div className="legacy-modal-footer">
          <div className={`legacy-editor-tools ${isEditMode ? 'visible' : 'hidden'}`}>
            <button
              type="button"
              className={`toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              title="加粗 (Ctrl+B)"
            >
              <Bold size={15} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              title="斜体 (Ctrl+I)"
            >
              <Italic size={15} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor?.isActive('strike') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              title="删除线"
            >
              <Strikethrough size={15} />
            </button>

            <span className="toolbar-divider" />

            <button
              type="button"
              className={`toolbar-btn ${editor?.isActive('heading', { level: 1 }) ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              title="一级标题 H1"
            >
              <Heading1 size={15} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor?.isActive('heading', { level: 2 }) ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              title="二级标题 H2"
            >
              <Heading2 size={15} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor?.isActive('heading', { level: 3 }) ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              title="三级标题 H3"
            >
              <Heading3 size={15} />
            </button>

            <span className="toolbar-divider" />

            <button
              type="button"
              className={`toolbar-btn ${editor?.isActive('bulletList') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              title="无序列表"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor?.isActive('orderedList') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              title="有序列表"
            >
              <ListOrdered size={15} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor?.isActive('blockquote') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              title="引用块"
            >
              <Quote size={15} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor?.isActive('codeBlock') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              title="代码块"
            >
              <Code size={15} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              title="分割线"
            >
              <Minus size={15} />
            </button>

            <span className="toolbar-divider" />

            <button
              type="button"
              className="toolbar-btn"
              disabled={!editor?.can().undo()}
              onClick={() => editor?.chain().focus().undo().run()}
              title="撤回 (Ctrl+Z)"
            >
              <Undo size={14} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              disabled={!editor?.can().redo()}
              onClick={() => editor?.chain().focus().redo().run()}
              title="重做 (Ctrl+Y)"
            >
              <Redo size={14} />
            </button>
          </div>

          <div className="legacy-footer-actions">
            {!isEditMode ? (
              <button
                type="button"
                className="legacy-edit-btn"
                onClick={() => {
                  setIsEditMode(true)
                  setTimeout(() => editor?.commands.focus(), 50)
                }}
              >
                <Pencil size={14} /> 编辑
              </button>
            ) : (
              <button
                type="button"
                className="legacy-save-btn"
                disabled={busy}
                onClick={handleFinish}
              >
                <Check size={15} /> {busy ? '保存中...' : '完成'}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
