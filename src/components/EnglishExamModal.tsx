import { useState, useEffect, useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Save,
  BookOpen,
  Brain,
  Check,
  RotateCcw,
  ClipboardPaste,
  ArrowRight,
  ArrowLeft,
  Layers,
  FileText,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './ui'
import { useData } from '../data/DataContext'
import { active, baseRecord } from '../data/helpers'
import { localDate } from '../data/defaults'
import type { Mistake, Paper, PaperAttempt, StudyTask, KnowledgePoint } from '../types'
import {
  getEnglishPaperMeta,
  getQuestionMeta,
  loadPaperMarkdown,
  parseSectionQuestions,
  type EnglishPaperMeta,
  type ParsedSection,
} from '../data/englishPapersData'
import { buildEnglishPrompt } from '../data/englishKnowledge'

interface EnglishExamModalProps {
  paper: Paper
  onClose: () => void
  onSavedAttempt?: () => void
  onOpenReader?: () => void
}

type ExamSectionKey =
  | 'overview'
  | 'cloze'
  | 'reading-1'
  | 'reading-2'
  | 'reading-3'
  | 'reading-4'
  | 'new-question'

interface SectionTabConfig {
  key: ExamSectionKey
  label: string
  file: string
  startQ: number
  endQ: number
}

const SECTION_TABS: SectionTabConfig[] = [
  { key: 'overview', label: '答题卡总览', file: '', startQ: 1, endQ: 45 },
  { key: 'cloze', label: 'Section I 完形填空', file: 'cloze.md', startQ: 1, endQ: 20 },
  { key: 'reading-1', label: '阅读 Text 1', file: 'reading-text-1.md', startQ: 21, endQ: 25 },
  { key: 'reading-2', label: '阅读 Text 2', file: 'reading-text-2.md', startQ: 26, endQ: 30 },
  { key: 'reading-3', label: '阅读 Text 3', file: 'reading-text-3.md', startQ: 31, endQ: 35 },
  { key: 'reading-4', label: '阅读 Text 4', file: 'reading-text-4.md', startQ: 36, endQ: 40 },
  { key: 'new-question', label: '新题型 Part B', file: 'new-question-type.md', startQ: 41, endQ: 45 },
]

function renderExamPassage(rawText: string) {
  if (!rawText) return null
  const cleaned = rawText.replace(/(\b[A-Za-z]+)-\r?\n\s*([A-Za-z]+\b)/g, '$1$2')
  const paragraphs = cleaned.split('\n\n').filter((p) => p.trim())

  return (
    <div className="exam-passage-typography">
      {paragraphs.map((para, pIdx) => {
        const pTrim = para.trim()
        if (pTrim.startsWith('#')) {
          return (
            <div key={pIdx} className="passage-inline-title">
              {pTrim.replace(/^#+\s*/, '')}
            </div>
          )
        }
        if (/^Directions:/i.test(pTrim)) {
          return (
            <div key={pIdx} className="passage-directions-callout">
              <strong>Directions:</strong>
              <p>{pTrim.replace(/^Directions:\s*/i, '')}</p>
            </div>
          )
        }
        if (/^Text\s+[1-4]\b/i.test(pTrim)) {
          return (
            <div key={pIdx} className="passage-text-badge">
              {pTrim}
            </div>
          )
        }

        const parts = pTrim.split(/(\s\d{1,2}\s|\(\d{2}\))/g)
        return (
          <p key={pIdx} className="passage-para">
            {parts.map((part, idx) => {
              const blankMatch = part.match(/^\s(\d{1,2})\s$/)
              if (blankMatch) {
                return (
                  <span key={idx} className="cloze-blank-tag">
                    [ {blankMatch[1]} ]
                  </span>
                )
              }
              const transMatch = part.match(/^\((\d{2})\)$/)
              if (transMatch) {
                return (
                  <span key={idx} className="trans-marker-tag">
                    ({transMatch[1]})
                  </span>
                )
              }
              return part
            })}
          </p>
        )
      })}
    </div>
  )
}

export function EnglishExamModal({
  paper,
  onClose,
  onSavedAttempt,
  onOpenReader,
}: EnglishExamModalProps) {
  const navigate = useNavigate()
  const { data, userId, upsert } = useData()
  const meta: EnglishPaperMeta | undefined = useMemo(() => {
    return (
      getEnglishPaperMeta(paper.legacy_id || '') ||
      getEnglishPaperMeta(paper.id) ||
      getEnglishPaperMeta(`paper-${paper.legacy_id || ''}`)
    )
  }, [paper])

  const [activeTab, setActiveTab] = useState<ExamSectionKey>('cloze')
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [isChecked, setIsChecked] = useState(false)
  const [translationScore, setTranslationScore] = useState<number>(0)
  const [writingScore, setWritingScore] = useState<number>(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(true)
  const [quickPasteText, setQuickPasteText] = useState('')
  const [showQuickPaste, setShowQuickPaste] = useState(false)
  const [savedAttemptDone, setSavedAttemptDone] = useState(false)
  const [mistakesSaved, setMistakesSaved] = useState(false)

  // Loaded sections content
  const [sectionsCache, setSectionsCache] = useState<Record<string, ParsedSection>>({})
  const [loadingSection, setLoadingSection] = useState(false)

  // Timer
  useEffect(() => {
    if (!isTimerRunning || isChecked) return
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isTimerRunning, isChecked])

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Load section text when active tab changes
  useEffect(() => {
    if (!meta || activeTab === 'overview') return
    const currentCfg = SECTION_TABS.find((t) => t.key === activeTab)
    if (!currentCfg || !currentCfg.file) return

    if (sectionsCache[activeTab]) return

    let isCurrent = true
    setLoadingSection(true)
    loadPaperMarkdown(meta.exam, meta.year, currentCfg.file).then((raw) => {
      if (!isCurrent) return
      if (raw) {
        const parsed = parseSectionQuestions(raw)
        setSectionsCache((prev) => ({ ...prev, [activeTab]: parsed }))
      }
      setLoadingSection(false)
    })

    return () => {
      isCurrent = false
    }
  }, [meta, activeTab, sectionsCache])

  // Quick paste parser
  const handleQuickPaste = () => {
    if (!quickPasteText.trim()) return
    const raw = quickPasteText.toUpperCase()
    const nextAnswers = { ...userAnswers }

    const pairMatches = Array.from(raw.matchAll(/(\d{1,2})\s*[:.、\-]?\s*([A-G]|T|F)/g))
    if (pairMatches.length >= 3) {
      pairMatches.forEach((m) => {
        const qNum = Number(m[1])
        const opt = m[2]
        if (qNum >= 1 && qNum <= 45) {
          nextAnswers[qNum] = opt
        }
      })
    } else {
      const letters = raw.replace(/[^A-G|T|F]/g, '').split('')
      letters.slice(0, 45).forEach((letter, idx) => {
        nextAnswers[idx + 1] = letter
      })
    }

    setUserAnswers(nextAnswers)
    setShowQuickPaste(false)
    setQuickPasteText('')
  }

  // Score calculations
  const { objectiveScore, questionResults, wrongQuestions } = useMemo(() => {
    if (!meta) return { objectiveScore: 0, questionResults: [], wrongQuestions: [] }
    let score = 0
    const results: {
      qNum: number
      userAns: string
      correctAns: string
      isCorrect: boolean
      itemScore: number
      sectionName: string
    }[] = []
    const wrongs: number[] = []

    for (let i = 1; i <= 45; i++) {
      const qMeta = getQuestionMeta(i, meta.exam, meta.year)
      const correct = meta.answers[i] || ''
      const user = userAnswers[i] || ''
      const isCorrect = user === correct
      const earned = isCorrect ? qMeta.score : 0
      score += earned

      results.push({
        qNum: i,
        userAns: user,
        correctAns: correct,
        isCorrect,
        itemScore: earned,
        sectionName: qMeta.sectionName,
      })

      if (!isCorrect) {
        wrongs.push(i)
      }
    }

    return {
      objectiveScore: Math.round(score * 10) / 10,
      questionResults: results,
      wrongQuestions: wrongs,
    }
  }, [meta, userAnswers])

  const totalCalculatedScore = Math.min(
    100,
    Math.round(
      (objectiveScore + Number(translationScore || 0) + Number(writingScore || 0)) * 10
    ) / 10
  )

  const handleSelectOption = (qNum: number, opt: string) => {
    if (isChecked) return
    setUserAnswers((prev) => ({
      ...prev,
      [qNum]: prev[qNum] === opt ? '' : opt,
    }))
  }

  // Save attempt to paper_attempts
  const saveAttempt = async () => {
    const own = active(data.paper_attempts).filter((a) => a.paper_id === paper.id)
    const durationMins = Math.max(1, Math.round(elapsedSeconds / 60))
    const attempt: PaperAttempt = {
      ...baseRecord(userId),
      paper_id: paper.id,
      attempt_no: own.length + 1,
      status: 'done',
      score: totalCalculatedScore,
      duration_minutes: durationMins,
      completed_date: localDate(),
    }
    await upsert('paper_attempts', attempt)
    setSavedAttemptDone(true)
    onSavedAttempt?.()
  }

  // Batch import mistakes into mistakes bank
  const saveAllMistakes = async () => {
    if (!meta) return
    const englishSubject =
      active(data.subjects).find((s) => s.name.includes('英语')) || active(data.subjects)[0]
    if (!englishSubject) return

    for (const qNum of wrongQuestions) {
      const qMeta = getQuestionMeta(qNum, meta.exam, meta.year)
      const pointTitle = `${qMeta.sectionName} · 考点证据定位`

      let point = active(data.knowledge_points).find(
        (kp) => kp.subject_id === englishSubject.id && kp.title === pointTitle
      )
      if (!point) {
        point = {
          ...baseRecord(userId),
          subject_id: englishSubject.id,
          title: pointTitle,
        } as KnowledgePoint
        await upsert('knowledge_points', point)
      }

      const ref = `${meta.year} ${meta.examLabel} · ${qMeta.sectionName} 第 ${qNum} 题`
      const user = userAnswers[qNum] || '未作答'
      const correct = meta.answers[qNum] || ''

      const mistake: Mistake = {
        ...baseRecord(userId),
        legacy_id: `mistake:${meta.id}:q${qNum}`,
        subject_id: englishSubject.id,
        knowledge_point_id: point.id,
        source_type: 'paper',
        source_id: paper.id,
        question_ref: ref,
        error_reason: '真题客观题作答偏差，待结合原文与解析复盘陷阱。',
        weakness: 4,
        next_review_date: localDate(),
        mastered: false,
        user_answer: user,
        correct_answer: correct,
        evidence: `标准答案: [${correct}]，我的作答: [${user}]`,
        trap_type:
          qNum <= 20
            ? '词义辨析/固定搭配'
            : qNum <= 40
            ? '偷换概念/无中生有'
            : '逻辑衔接',
      }
      await upsert('mistakes', mistake)

      const task: StudyTask = {
        ...baseRecord(userId),
        legacy_id: `review-task:${mistake.id}:${localDate()}`,
        plan_id: null,
        subject_id: englishSubject.id,
        syllabus_node_id: null,
        title: `复盘错题：${ref}`,
        task_date: localDate(),
        period: '晚上',
        estimate_minutes: 15,
        actual_minutes: 0,
        status: 'todo',
        sort_order: active(data.tasks).length,
        completed_at: null,
        source: 'review',
      }
      await upsert('tasks', task)
    }

    setMistakesSaved(true)
  }

  // Ask AI for a specific question
  const askAiForQuestion = (qNum: number) => {
    if (!meta) return
    const qMeta = getQuestionMeta(qNum, meta.exam, meta.year)
    const sectionMap: Record<string, any> = {
      cloze: 'cloze',
      'reading-text-1': 'reading',
      'reading-text-2': 'reading',
      'reading-text-3': 'reading',
      'reading-text-4': 'reading',
      'new-question-type': 'new-question-type',
    }
    const textNum = qMeta.sectionKey.startsWith('reading-text-')
      ? Number(qMeta.sectionKey.replace('reading-text-', ''))
      : undefined

    const prompt = buildEnglishPrompt(
      {
        exam: meta.exam,
        year: meta.year,
        section: sectionMap[qMeta.sectionKey] || 'reading',
        text: textNum,
        question: qNum,
      },
      `我的选择是 [${userAnswers[qNum] || '未作答'}]，官方标准答案是 [${
        meta.answers[qNum] || ''
      }]。请帮我分析该题定位句、逻辑关系与干扰项陷阱。`
    )
    sessionStorage.setItem('study_ai_seed_prompt', prompt)
    onClose()
    navigate('/ai')
  }

  if (!meta) {
    return (
      <Modal title={paper.title} onClose={onClose}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p>未找到该套英语试卷的官方答案数据。</p>
          <button className="primary-btn" onClick={onClose} style={{ marginTop: '16px' }}>
            关闭
          </button>
        </div>
      </Modal>
    )
  }

  const answeredCount = Object.values(userAnswers).filter(Boolean).length
  const currentTabConfig = SECTION_TABS.find((t) => t.key === activeTab) || SECTION_TABS[0]
  const currentSectionData = sectionsCache[activeTab]

  return (
    <Modal
      title={`${meta.year} ${meta.examLabel} · 答题与智能核对`}
      onClose={onClose}
      wide={true}
      className="english-exam-modal-wide"
    >
      <div className="english-exam-container">
        {/* Top Control Bar */}
        <div className="english-exam-header panel">
          <div className="exam-status-info">
            <span className="exam-tag">{meta.examLabel}</span>
            <span className="exam-year-badge">{meta.year} 年</span>
            <div className="exam-timer">
              <Clock size={15} />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>
            <span className="answered-stat">
              已填：<strong>{answeredCount}</strong> / 45 题
            </span>
          </div>

          <div className="exam-header-actions">
            {onOpenReader && (
              <button className="secondary-btn" onClick={onOpenReader} title="查看完整卷面">
                <BookOpen size={15} />
                试卷全文
              </button>
            )}

            {!isChecked && (
              <button
                className="secondary-btn"
                onClick={() => setShowQuickPaste(!showQuickPaste)}
              >
                <ClipboardPaste size={15} />
                快速连填
              </button>
            )}

            {!isChecked ? (
              <button
                className="primary-btn"
                onClick={() => {
                  setIsChecked(true)
                  setIsTimerRunning(false)
                  setActiveTab('overview')
                }}
              >
                <CheckCircle2 size={16} />
                提交并核对答案
              </button>
            ) : (
              <button
                className="secondary-btn"
                onClick={() => {
                  setIsChecked(false)
                  setIsTimerRunning(true)
                  setSavedAttemptDone(false)
                  setMistakesSaved(false)
                }}
              >
                <RotateCcw size={15} />
                重新作答
              </button>
            )}
          </div>
        </div>

        {/* Quick Paste Card */}
        {showQuickPaste && !isChecked && (
          <div className="panel quick-paste-box">
            <label>
              <strong>快捷连填答案</strong>
              <small>
                支持粘贴例如：<code>ABCD...</code> 或 <code>1.A 2.B 3.C...</code>
              </small>
            </label>
            <div className="quick-paste-row">
              <input
                type="text"
                placeholder="粘贴 45 道题答案字母串..."
                value={quickPasteText}
                onChange={(e) => setQuickPasteText(e.target.value)}
                autoFocus
              />
              <button className="primary-btn" onClick={handleQuickPaste}>
                应用填充
              </button>
              <button className="secondary-btn" onClick={() => setShowQuickPaste(false)}>
                取消
              </button>
            </div>
          </div>
        )}

        {/* Score & Settlement Header when Checked */}
        {isChecked && (
          <div className="panel exam-result-hero">
            <div className="result-score-main">
              <div className="score-block">
                <span>客观题自评 (45题)</span>
                <strong>
                  {objectiveScore} <small>/ 60 分</small>
                </strong>
                <span className="sub-stat">
                  正确 {45 - wrongQuestions.length} 题 / 错误 {wrongQuestions.length} 题
                </span>
              </div>

              <div className="score-block-inputs">
                <label>
                  <span>翻译 (Part C)</span>
                  <input
                    type="number"
                    min="0"
                    max={meta.exam === 'english-i' ? 10 : 15}
                    value={translationScore}
                    onChange={(e) => setTranslationScore(Number(e.target.value))}
                  />
                  <small>/ {meta.exam === 'english-i' ? 10 : 15} 分</small>
                </label>

                <label>
                  <span>大小写作 (Part III)</span>
                  <input
                    type="number"
                    min="0"
                    max={meta.exam === 'english-i' ? 30 : 25}
                    value={writingScore}
                    onChange={(e) => setWritingScore(Number(e.target.value))}
                  />
                  <small>/ {meta.exam === 'english-i' ? 30 : 25} 分</small>
                </label>
              </div>

              <div className="score-block total">
                <span>汇总估分</span>
                <strong>
                  {totalCalculatedScore} <small>/ 100 分</small>
                </strong>
              </div>
            </div>

            <div className="result-actions-row">
              <button
                className="primary-btn"
                disabled={savedAttemptDone}
                onClick={saveAttempt}
              >
                {savedAttemptDone ? (
                  <>
                    <Check size={16} /> 已保存为刷题记录
                  </>
                ) : (
                  <>
                    <Save size={16} /> 保存刷题记录 (总分 {totalCalculatedScore})
                  </>
                )}
              </button>

              {wrongQuestions.length > 0 && (
                <button
                  className="secondary-btn"
                  disabled={mistakesSaved}
                  onClick={saveAllMistakes}
                >
                  {mistakesSaved ? (
                    <>
                      <Check size={16} /> 已将 {wrongQuestions.length} 道错题加入错题本
                    </>
                  ) : (
                    <>
                      <Brain size={16} /> 一键入库 {wrongQuestions.length} 道错题
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section Navigation Tabs */}
        <div className="exam-mode-tabs">
          {SECTION_TABS.map((tab) => {
            const answeredInSection = Array.from(
              { length: tab.endQ - tab.startQ + 1 },
              (_, i) => tab.startQ + i
            ).filter((q) => userAnswers[q]).length
            const isTabActive = activeTab === tab.key

            return (
              <button
                key={tab.key}
                type="button"
                className={`exam-tab-btn ${isTabActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                {tab.key !== 'overview' && (
                  <small>
                    {answeredInSection}/{tab.endQ - tab.startQ + 1}
                  </small>
                )}
              </button>
            )
          })}
        </div>

        {/* Content View: Split View vs Overview Grid */}
        {activeTab !== 'overview' ? (
          <div className="exam-split-workbench">
            {/* Left: Reading Passage Pane */}
            <div className="exam-passage-pane panel">
              <div className="pane-header">
                <h4>{currentTabConfig.label} · 原文材料</h4>
              </div>
              <div className="pane-content">
                {currentSectionData?.passage ? (
                  renderExamPassage(currentSectionData.passage)
                ) : loadingSection ? (
                  <div className="loading-state">
                    <Clock size={20} className="spin" />
                    <span>正在加载考卷材料...</span>
                  </div>
                ) : (
                  <p className="no-passage-tip">
                    请在右侧直接作答，或点击上方「试卷全文」查看。
                  </p>
                )}
              </div>
            </div>

            {/* Right: Interactive Question Prompts */}
            <div className="exam-questions-pane panel">
              <div className="pane-header">
                <h4>题目与选项 (第 {currentTabConfig.startQ} ~ {currentTabConfig.endQ} 题)</h4>
              </div>
              <div className="pane-content questions-flow">
                {Array.from(
                  { length: currentTabConfig.endQ - currentTabConfig.startQ + 1 },
                  (_, i) => currentTabConfig.startQ + i
                ).map((qNum) => {
                  const qRes = questionResults[qNum - 1]
                  const parsedQ = currentSectionData?.questions.find((q) => q.qNum === qNum)
                  return renderDetailedQuestionItem(qNum, qRes, parsedQ)
                })}
              </div>

              {/* Next section button */}
              <div className="pane-footer-nav">
                {activeTab !== 'cloze' && (
                  <button
                    className="secondary-btn"
                    onClick={() => {
                      const idx = SECTION_TABS.findIndex((t) => t.key === activeTab)
                      if (idx > 1) setActiveTab(SECTION_TABS[idx - 1].key)
                    }}
                  >
                    <ArrowLeft size={14} /> 上一部分
                  </button>
                )}
                {activeTab !== 'new-question' ? (
                  <button
                    className="primary-btn"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => {
                      const idx = SECTION_TABS.findIndex((t) => t.key === activeTab)
                      if (idx < SECTION_TABS.length - 1) setActiveTab(SECTION_TABS[idx + 1].key)
                    }}
                  >
                    下一部分 <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    className="primary-btn"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setActiveTab('overview')}
                  >
                    前往答题卡总览 <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Overview Grid View */
          <div className="exam-sections-list">
            <div className="exam-section-card panel">
              <div className="section-title-line">
                <h4>Section I 完形填空 (1 ~ 20 题，每题 0.5 分)</h4>
                <span className="section-badge">共 10 分</span>
              </div>
              <div className="questions-grid">
                {questionResults.slice(0, 20).map((q) => renderCompactQuestionItem(q))}
              </div>
            </div>

            <div className="exam-section-card panel">
              <div className="section-title-line">
                <h4>Section II 阅读理解 Part A (21 ~ 40 题，每题 2 分)</h4>
                <span className="section-badge">共 40 分</span>
              </div>
              <div className="reading-texts-wrapper">
                {[
                  { title: 'Text 1', start: 20, end: 25 },
                  { title: 'Text 2', start: 25, end: 30 },
                  { title: 'Text 3', start: 30, end: 35 },
                  { title: 'Text 4', start: 35, end: 40 },
                ].map((sub) => (
                  <div key={sub.title} className="reading-subtext-group">
                    <div className="subtext-header">{sub.title}</div>
                    <div className="questions-grid">
                      {questionResults.slice(sub.start, sub.end).map((q) =>
                        renderCompactQuestionItem(q)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="exam-section-card panel">
              <div className="section-title-line">
                <h4>Section II 新题型 Part B (41 ~ 45 题，每题 2 分)</h4>
                <span className="section-badge">共 10 分</span>
              </div>
              <div className="questions-grid">
                {questionResults.slice(40, 45).map((q) => renderCompactQuestionItem(q))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )

  // Render Detailed Question with Stem and Options Text
  function renderDetailedQuestionItem(
    qNum: number,
    qRes: {
      userAns: string
      correctAns: string
      isCorrect: boolean
      itemScore: number
      sectionName: string
    },
    parsedQ?: { stem: string; options: Record<string, string> }
  ) {
    const qMeta = getQuestionMeta(qNum, meta!.exam, meta!.year)
    const currentChoice = userAnswers[qNum] || ''
    const isAnswered = Boolean(currentChoice)

    return (
      <article
        key={qNum}
        className={`detailed-q-item ${
          isChecked
            ? qRes.isCorrect
              ? 'is-correct'
              : 'is-wrong'
            : isAnswered
            ? 'is-selected'
            : ''
        }`}
      >
        <div className="detailed-q-header">
          <div className="detailed-q-stem">
            <strong>{qNum}.</strong>{' '}
            <span>{parsedQ?.stem || `第 ${qNum} 题`}</span>
          </div>

          <div className="detailed-q-status">
            {isChecked ? (
              qRes.isCorrect ? (
                <span className="tag-correct">
                  <CheckCircle2 size={14} /> 正确 (+{qMeta.score})
                </span>
              ) : (
                <span className="tag-wrong">
                  <XCircle size={14} /> 标准答案: <strong>{qRes.correctAns}</strong>
                </span>
              )
            ) : isAnswered ? (
              <span className="tag-selected">已选: {currentChoice}</span>
            ) : (
              <span className="tag-unanswered">未选</span>
            )}
          </div>
        </div>

        {/* Options List */}
        <div className="detailed-options-list">
          {qMeta.validOptions.map((opt) => {
            const isUserChoice = currentChoice === opt
            const isStandardAnswer = isChecked && qRes.correctAns === opt
            let optStatusClass = ''
            if (isChecked) {
              if (isStandardAnswer) optStatusClass = 'opt-standard'
              else if (isUserChoice) optStatusClass = 'opt-user-wrong'
            } else if (isUserChoice) {
              optStatusClass = 'opt-user-selected'
            }

            const optionDesc = parsedQ?.options[opt]

            return (
              <button
                key={opt}
                type="button"
                className={`detailed-opt-btn ${optStatusClass}`}
                onClick={() => handleSelectOption(qNum, opt)}
              >
                <span className="opt-circle">{opt}</span>
                <span className="opt-desc">{optionDesc || opt}</span>
              </button>
            )
          })}
        </div>

        {isChecked && !qRes.isCorrect && (
          <div className="detailed-q-footer">
            <button
              type="button"
              className="link-btn-ai"
              onClick={() => askAiForQuestion(qNum)}
            >
              <Sparkles size={13} />
              AI 专项深度解析（选项陷阱与定位）
            </button>
          </div>
        )}
      </article>
    )
  }

  // Render Compact Question for Overview
  function renderCompactQuestionItem(q: {
    qNum: number
    userAns: string
    correctAns: string
    isCorrect: boolean
    itemScore: number
    sectionName: string
  }) {
    const qMeta = getQuestionMeta(q.qNum, meta!.exam, meta!.year)
    return (
      <div
        key={q.qNum}
        className={`q-item-card ${
          isChecked
            ? q.isCorrect
              ? 'is-correct'
              : 'is-wrong'
            : q.userAns
            ? 'is-selected'
            : ''
        }`}
      >
        <div className="q-item-top">
          <span className="q-number">{q.qNum}.</span>
          {isChecked && (
            <div className="q-status-tag">
              {q.isCorrect ? (
                <span className="tag-correct">
                  <CheckCircle2 size={13} /> +{qMeta.score}
                </span>
              ) : (
                <span className="tag-wrong">
                  <XCircle size={13} /> <strong>{q.correctAns}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="q-options-row">
          {qMeta.validOptions.map((opt) => {
            const isUserChoice = q.userAns === opt
            const isCorrectAnswer = isChecked && q.correctAns === opt
            let btnClass = ''
            if (isChecked) {
              if (isCorrectAnswer) btnClass = 'opt-correct'
              else if (isUserChoice) btnClass = 'opt-wrong'
            } else if (isUserChoice) {
              btnClass = 'opt-selected'
            }

            return (
              <button
                key={opt}
                type="button"
                className={`opt-btn ${btnClass}`}
                onClick={() => handleSelectOption(q.qNum, opt)}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {isChecked && !q.isCorrect && (
          <div className="q-ai-shortcut">
            <button
              type="button"
              className="link-btn-ai"
              onClick={() => askAiForQuestion(q.qNum)}
            >
              <Sparkles size={12} />
              AI 解析
            </button>
          </div>
        )}
      </div>
    )
  }
}
