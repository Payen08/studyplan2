import { useState, useEffect, useMemo } from 'react'
import {
  CheckCircle2,
  FolderOpen,
  Sparkles,
  FileText,
  Loader2,
  Eye,
  Code2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './ui'
import type { Paper } from '../types'
import {
  getEnglishPaperMeta,
  loadPaperMarkdown,
  type EnglishPaperMeta,
} from '../data/englishPapersData'
import { buildEnglishPrompt } from '../data/englishKnowledge'
import { EnglishPaperViewer } from './EnglishPaperViewer'

interface EnglishPaperReaderModalProps {
  paper: Paper
  onClose: () => void
  onOpenExam?: () => void
}

type SectionTab =
  | 'full'
  | 'cloze'
  | 'reading-1'
  | 'reading-2'
  | 'reading-3'
  | 'reading-4'
  | 'new-question'
  | 'translation'
  | 'writing'

const FILE_MAP: Record<SectionTab, string> = {
  full: 'paper.md',
  cloze: 'cloze.md',
  'reading-1': 'reading-text-1.md',
  'reading-2': 'reading-text-2.md',
  'reading-3': 'reading-text-3.md',
  'reading-4': 'reading-text-4.md',
  'new-question': 'new-question-type.md',
  translation: 'translation.md',
  writing: 'writing.md',
}

export function EnglishPaperReaderModal({
  paper,
  onClose,
  onOpenExam,
}: EnglishPaperReaderModalProps) {
  const navigate = useNavigate()
  const meta: EnglishPaperMeta | undefined = useMemo(() => {
    return (
      getEnglishPaperMeta(paper.legacy_id || '') ||
      getEnglishPaperMeta(paper.id) ||
      getEnglishPaperMeta(`paper-${paper.legacy_id || ''}`)
    )
  }, [paper])

  const [activeTab, setActiveTab] = useState<SectionTab>('full')
  const [autoLoadedText, setAutoLoadedText] = useState<string | null>(null)
  const [loadingText, setLoadingText] = useState(false)
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted')
  const [fontSize, setFontSize] = useState<number>(15)
  const [localDocs, setLocalDocs] = useState<{ path: string; text: string }[]>(() => {
    try {
      const stored = sessionStorage.getItem('echo_loaded_papers_cache')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Auto-load markdown for this exam, year, and section
  useEffect(() => {
    if (!meta) return
    let isCurrent = true
    setLoadingText(true)
    const targetFile = FILE_MAP[activeTab] || 'paper.md'

    loadPaperMarkdown(meta.exam, meta.year, targetFile).then((text) => {
      if (!isCurrent) return
      setAutoLoadedText(text)
      setLoadingText(false)
    })

    return () => {
      isCurrent = false
    }
  }, [meta, activeTab])

  // Folder importer fallback
  const handleImportFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) =>
      /\.(md|json|txt)$/i.test(f.name)
    )
    if (!files.length) return
    const loaded = await Promise.all(
      files.map(async (file) => ({
        path:
          (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
          file.name,
        text: await file.text(),
      }))
    )
    setLocalDocs(loaded)
    try {
      const subset = loaded.slice(0, 100)
      sessionStorage.setItem('echo_loaded_papers_cache', JSON.stringify(subset))
    } catch (err) {
      console.warn('Cache too large for sessionStorage', err)
    }
  }

  // Find text: prefer autoLoadedText, then fallback to localDocs
  const currentPaperText = useMemo(() => {
    if (autoLoadedText) return autoLoadedText
    if (!meta || !localDocs.length) return null
    const yearStr = String(meta.year)
    const examStr = meta.exam

    const matchedDocs = localDocs.filter(
      (d) =>
        d.path.toLowerCase().includes(examStr) &&
        d.path.includes(`/${yearStr}/`)
    )
    if (!matchedDocs.length) return null

    const targetFile = FILE_MAP[activeTab] || 'paper.md'
    const found = matchedDocs.find((d) => d.path.endsWith(targetFile))
    return found ? found.text : null
  }, [autoLoadedText, meta, localDocs, activeTab])

  const askAiSection = () => {
    if (!meta) return
    const tabToSection: Record<SectionTab, any> = {
      full: 'reading',
      cloze: 'cloze',
      'reading-1': 'reading',
      'reading-2': 'reading',
      'reading-3': 'reading',
      'reading-4': 'reading',
      'new-question': 'new-question-type',
      translation: 'translation',
      writing: 'writing',
    }
    const textNum = activeTab.startsWith('reading-')
      ? Number(activeTab.replace('reading-', ''))
      : undefined

    const prompt = buildEnglishPrompt(
      {
        exam: meta.exam,
        year: meta.year,
        section: tabToSection[activeTab] || 'reading',
        text: textNum,
      },
      currentPaperText
        ? `针对该部分真题原文进行核心考点梳理、长难句结构剖析与重点生词提炼：\n\n${currentPaperText.slice(0, 1000)}...`
        : '请对该年份考研英语专项出题风格与重难点进行深度复盘。'
    )
    sessionStorage.setItem('study_ai_seed_prompt', prompt)
    onClose()
    navigate('/ai')
  }

  if (!meta) {
    return (
      <Modal title={paper.title} onClose={onClose}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p>暂无该试卷的详细信息。</p>
          <button className="primary-btn" onClick={onClose} style={{ marginTop: '16px' }}>
            关闭
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title={`${meta.year} ${meta.examLabel} · 试卷原文阅读`}
      onClose={onClose}
      wide={true}
      className="english-reader-modal-wide"
    >
      <div className="english-reader-container">
        {/* Top Control Bar */}
        <div className="reader-toolbar panel">
          <div className="reader-meta-tags">
            <span className="exam-tag">{meta.examLabel}</span>
            <strong>{meta.year} 考研英语真题卷</strong>
            <span className="exam-total-score">满分 100 分</span>
          </div>

          <div className="reader-actions">
            {/* View Mode Switch */}
            <div className="reader-mode-toggle">
              <button
                type="button"
                className={`mode-btn ${viewMode === 'formatted' ? 'active' : ''}`}
                onClick={() => setViewMode('formatted')}
                title="精排阅读模式：格式化标题、段落与题型卡片"
              >
                <Eye size={13} />
                <span>精排阅读</span>
              </button>
              <button
                type="button"
                className={`mode-btn ${viewMode === 'raw' ? 'active' : ''}`}
                onClick={() => setViewMode('raw')}
                title="原始文本模式：查看 Markdown 原文件"
              >
                <Code2 size={13} />
                <span>原卷文本</span>
              </button>
            </div>

            {/* Font Size Adjusters */}
            <div className="reader-font-controls">
              <button
                type="button"
                className="icon-tool-btn"
                onClick={() => setFontSize((f) => Math.max(13, f - 1))}
                title="缩小字号"
              >
                <ZoomOut size={14} />
              </button>
              <span className="font-size-indicator">{fontSize}px</span>
              <button
                type="button"
                className="icon-tool-btn"
                onClick={() => setFontSize((f) => Math.min(20, f + 1))}
                title="放大字号"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            <button className="secondary-btn sm" onClick={askAiSection}>
              <Sparkles size={14} />
              AI 考点解析
            </button>

            {onOpenExam && (
              <button className="primary-btn sm" onClick={onOpenExam}>
                <CheckCircle2 size={14} />
                进入答题 / 核对
              </button>
            )}

            {/* Subtle Import fallback */}
            <label className="icon-tool-btn file-picker-inline" title="重新从本地目录载入试卷 Markdown">
              <FolderOpen size={14} />
              <input
                type="file"
                multiple
                {...({ webkitdirectory: '' } as Record<string, string>)}
                onChange={handleImportFolder}
              />
            </label>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="reader-section-tabs">
          {[
            { key: 'full', label: '整卷完整版' },
            { key: 'cloze', label: '完形填空 (1-20)' },
            { key: 'reading-1', label: '阅读 Text 1 (21-25)' },
            { key: 'reading-2', label: '阅读 Text 2 (26-30)' },
            { key: 'reading-3', label: '阅读 Text 3 (31-35)' },
            { key: 'reading-4', label: '阅读 Text 4 (36-40)' },
            { key: 'new-question', label: '新题型 (41-45)' },
            { key: 'translation', label: '英译汉 (翻译)' },
            { key: 'writing', label: '写作 (大小作文)' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key as SectionTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Reader Content Body */}
        <div className="reader-content-body panel">
          {loadingText ? (
            <div className="reader-loading-state">
              <Loader2 size={24} className="spin" />
              <span>正在载入真题卷面与排版...</span>
            </div>
          ) : currentPaperText ? (
            viewMode === 'formatted' ? (
              <EnglishPaperViewer
                rawText={currentPaperText}
                fontSize={fontSize}
                onOpenExam={onOpenExam}
              />
            ) : (
              <div className="markdown-paper-view">
                <pre className="paper-text-render" style={{ fontSize: `${fontSize}px` }}>
                  {currentPaperText}
                </pre>
              </div>
            )
          ) : (
            <div className="reader-placeholder">
              <div className="placeholder-icon">
                <FileText size={42} />
              </div>
              <h3>{meta.year} {meta.examLabel} · 试题概要</h3>
              <p>
                已内置 45 道客观题官方标准答案与分值大纲。
                点击右上角<strong>「载入试卷文本」</strong>选择 <code>echo-kaoyan-english-skill</code> 目录即可即时在浏览器内渲染该套真题 Markdown 原文。
              </p>

              <div className="paper-structure-grid">
                <div className="structure-card">
                  <strong>Section I: 完形填空</strong>
                  <span>20 题 · 每题 0.5 分 · 共 10 分</span>
                  <div className="answers-preview-row">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                      <span key={n} className="ans-tag">
                        {n}.<strong>{meta.answers[n]}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="structure-card">
                  <strong>Section II: 阅读理解 Part A (4篇)</strong>
                  <span>20 题 · 每题 2 分 · 共 40 分</span>
                  <div className="answers-preview-row">
                    {Array.from({ length: 20 }, (_, i) => i + 21).map((n) => (
                      <span key={n} className="ans-tag">
                        {n}.<strong>{meta.answers[n]}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="structure-card">
                  <strong>Section II: 新题型 Part B</strong>
                  <span>5 题 · 每题 2 分 · 共 10 分</span>
                  <div className="answers-preview-row">
                    {Array.from({ length: 5 }, (_, i) => i + 41).map((n) => (
                      <span key={n} className="ans-tag">
                        {n}.<strong>{meta.answers[n]}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="structure-card">
                  <strong>Section II: 英译汉 Part C & Section III: 写作</strong>
                  <span>
                    翻译 {meta.exam === 'english-i' ? '10' : '15'} 分 + 大小作文{' '}
                    {meta.exam === 'english-i' ? '30' : '25'} 分 · 共 40 分
                  </span>
                  <small>主观表达由标准分档与句式赋分，可在答题核对界面统一折算总分。</small>
                </div>
              </div>

              <div className="placeholder-actions">
                <label className="primary-btn file-picker-inline">
                  <FolderOpen size={16} />
                  <span>载入本地试卷 Markdown 文本</span>
                  <input
                    type="file"
                    multiple
                    {...({ webkitdirectory: '' } as Record<string, string>)}
                    onChange={handleImportFolder}
                  />
                </label>
                {onOpenExam && (
                  <button className="secondary-btn" onClick={onOpenExam}>
                    <CheckCircle2 size={16} />
                    直接进入在线作答与答案核对
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
