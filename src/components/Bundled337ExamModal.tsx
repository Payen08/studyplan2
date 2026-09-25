import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Clock3, FileCheck2, Loader2, RotateCcw, XCircle } from 'lucide-react'
import type { Paper } from '../types'
import {
  getBundled337Paper,
  loadParsed337Paper,
  type Bundled337SubjectiveQuestion,
  type Parsed337Paper,
} from '../data/bundled337Papers'
import { Modal } from './ui'

interface Bundled337ExamModalProps {
  paper: Paper
  onClose: () => void
}

type ExamTab = 'choices' | 'terms' | 'short' | 'essays' | 'review'

interface SavedDraft {
  choices: Record<number, string>
  written: Record<string, string>
  submitted: boolean
}

const EMPTY_DRAFT: SavedDraft = { choices: {}, written: {}, submitted: false }

function readDraft(key: string): SavedDraft {
  try {
    return { ...EMPTY_DRAFT, ...JSON.parse(localStorage.getItem(key) || '{}') }
  } catch {
    return EMPTY_DRAFT
  }
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return [hours, minutes, rest].map((value) => String(value).padStart(2, '0')).join(':')
}

export function Bundled337ExamModal({ paper, onClose }: Bundled337ExamModalProps) {
  const meta = getBundled337Paper(paper.legacy_id || paper.id)
  const storageKey = `study-337-exam:${paper.id}`
  const initialDraft = useMemo(() => readDraft(storageKey), [storageKey])
  const [parsed, setParsed] = useState<Parsed337Paper | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<ExamTab>('choices')
  const [choices, setChoices] = useState<Record<number, string>>(initialDraft.choices)
  const [written, setWritten] = useState<Record<string, string>>(initialDraft.written)
  const [submitted, setSubmitted] = useState(initialDraft.submitted)
  const [remainingSeconds, setRemainingSeconds] = useState(180 * 60)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true
    if (!meta) {
      setError('未找到这套试卷。')
      setLoading(false)
      return
    }
    loadParsed337Paper(meta).then((result) => {
      if (!active) return
      setParsed(result)
      setLoading(false)
    }).catch(() => {
      if (!active) return
      setError('试卷载入失败，请稍后重试。')
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [meta])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ choices, written, submitted }))
  }, [choices, written, submitted, storageKey])

  useEffect(() => {
    if (submitted) return
    timerRef.current = setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [submitted])

  const correctCount = parsed?.choices.filter((question) => choices[question.number] === question.answer).length || 0
  const choiceScore = correctCount * 2
  const choiceTotal = (parsed?.choices.length || 0) * 2
  const writtenCount = Object.values(written).filter((answer) => answer.trim()).length
  const writtenTotal = (parsed?.terms.length || 0) + (parsed?.shortAnswers.length || 0) + (parsed?.essays.length || 0)

  const submit = () => {
    if (!parsed) return
    const unanswered = parsed.choices.length - Object.keys(choices).length
    if (unanswered > 0 && !window.confirm(`还有 ${unanswered} 道选择题未作答，确定交卷吗？`)) return
    setSubmitted(true)
    setActiveTab('review')
  }

  const restart = () => {
    if (!window.confirm('确定清空本套试卷的全部作答并重新开始吗？')) return
    setChoices({})
    setWritten({})
    setSubmitted(false)
    setRemainingSeconds(180 * 60)
    setActiveTab('choices')
  }

  const renderWrittenSection = (
    section: 'terms' | 'short' | 'essays',
    questions: Bundled337SubjectiveQuestion[],
    label: string,
    score: number
  ) => (
    <div className="gdut-written-list">
      <div className="gdut-section-intro">{label} · 每题 {score} 分 · 支持自动保存草稿</div>
      {questions.map((question) => {
        const key = `${section}-${question.number}`
        return (
          <article className="gdut-written-card" key={key}>
            <div className="gdut-question-heading">
              <span>{question.number}</span>
              <strong>{question.prompt}</strong>
            </div>
            <textarea
              value={written[key] || ''}
              disabled={submitted}
              onChange={(event) => setWritten((current) => ({ ...current, [key]: event.target.value }))}
              placeholder="在这里整理答题要点……"
              rows={section === 'essays' ? 10 : section === 'short' ? 7 : 4}
            />
          </article>
        )
      })}
    </div>
  )

  return (
    <Modal title={paper.title} onClose={onClose} wide className="english-reader-modal-wide gdut-exam-modal">
      {loading ? (
        <div className="gdut-exam-loading"><Loader2 size={22} className="spin" /> 正在拆分并载入本套试卷…</div>
      ) : error || !parsed ? (
        <div className="empty-state">{error || '试卷内容为空。'}</div>
      ) : (
        <div className="gdut-exam-shell">
          <header className="gdut-exam-header">
            <div>
              <span className="exam-tag">广工 337 · 第 {parsed.setNumber} 套</span>
              <h3>{parsed.title}</h3>
              <p>选择题 {parsed.choices.length} 道 · 名词解释 {parsed.terms.length} 道 · 简答题 {parsed.shortAnswers.length} 道 · 论述题 {parsed.essays.length} 道</p>
            </div>
            <div className="gdut-exam-header-actions">
              {!submitted && <span className="exam-hall-timer"><Clock3 size={14} />{formatTime(remainingSeconds)}</span>}
              {submitted ? (
                <button className="secondary-btn" onClick={restart}><RotateCcw size={14} />重新作答</button>
              ) : (
                <button className="primary-btn" onClick={submit}><FileCheck2 size={14} />交卷并判分</button>
              )}
            </div>
          </header>

          <nav className="gdut-exam-tabs" aria-label="试卷题型">
            {([
              ['choices', `选择题 ${Object.keys(choices).length}/${parsed.choices.length}`],
              ['terms', `名词解释 ${parsed.terms.length}`],
              ['short', `简答题 ${parsed.shortAnswers.length}`],
              ['essays', `论述题 ${parsed.essays.length}`],
              ...(submitted ? [['review', `判卷 ${choiceScore}/${choiceTotal}`]] : []),
            ] as [ExamTab, string][]).map(([key, label]) => (
              <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>{label}</button>
            ))}
          </nav>

          <main className="gdut-exam-content">
            {activeTab === 'choices' && (
              <div className="gdut-choice-list">
                {parsed.choices.map((question) => (
                  <article className="gdut-choice-card" key={question.number}>
                    <div className="gdut-question-heading">
                      <span>{question.number}</span>
                      <strong>{question.stem}</strong>
                    </div>
                    <div className="gdut-options-grid">
                      {(['A', 'B', 'C', 'D'] as const).map((key) => {
                        const selected = choices[question.number] === key
                        const correct = submitted && question.answer === key
                        const wrong = submitted && selected && !correct
                        return (
                          <button
                            type="button"
                            key={key}
                            disabled={submitted}
                            className={`${selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${wrong ? 'incorrect' : ''}`}
                            onClick={() => setChoices((current) => ({ ...current, [question.number]: key }))}
                          >
                            <b>{key}</b><span>{question.options[key]}</span>
                          </button>
                        )
                      })}
                    </div>
                    {submitted && (
                      <div className={`gdut-choice-result ${choices[question.number] === question.answer ? 'correct' : 'incorrect'}`}>
                        {choices[question.number] === question.answer ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                        正确答案：{question.answer}　你的答案：{choices[question.number] || '未作答'}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
            {activeTab === 'terms' && renderWrittenSection('terms', parsed.terms, '名词解释', 5)}
            {activeTab === 'short' && renderWrittenSection('short', parsed.shortAnswers, '简答题', 10)}
            {activeTab === 'essays' && renderWrittenSection('essays', parsed.essays, '论述题', 25)}
            {activeTab === 'review' && (
              <div className="gdut-review-panel">
                <section className="gdut-score-card">
                  <small>客观题成绩</small>
                  <strong>{choiceScore}<span> / {choiceTotal}</span></strong>
                  <p>答对 {correctCount} / {parsed.choices.length} 题 · 主观题已作答 {writtenCount} / {writtenTotal} 题</p>
                </section>
                {parsed.referenceAnswer ? (
                  <section className="gdut-reference-answer">
                    <h4>参考答案与答题要点</h4>
                    <pre>{parsed.referenceAnswer}</pre>
                  </section>
                ) : (
                  <div className="gdut-section-intro">原题文件仅提供选择题答案；主观题作答草稿已保留，可用于自行复盘。</div>
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </Modal>
  )
}
