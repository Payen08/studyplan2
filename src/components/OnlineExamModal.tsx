import React, { useState, useEffect, useRef } from 'react'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  ArrowLeft,
  ArrowRight,
  FileCheck2,
  RotateCcw,
  Sparkles,
  Check,
} from 'lucide-react'
import { useData } from '../data/DataContext'
import { active, baseRecord } from '../data/helpers'
import { localDate } from '../data/defaults'
import { Modal } from './ui'
import { saveAiMockPaper, type AiMockPaper } from '../data/mockPaperStore'
import type { KnowledgePoint, Mistake, MockExam, MockScore, StudyTask } from '../types'

interface OnlineExamModalProps {
  paper: AiMockPaper
  onClose: () => void
  onFinish?: (updatedPaper: AiMockPaper) => void
}

export function OnlineExamModal({ paper, onClose, onFinish }: OnlineExamModalProps) {
  const { data, userId, upsert } = useData()
  const subjects = active(data.subjects)

  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string | string[]>>(
    () => paper.user_answers || {}
  )
  const [isFinished, setIsFinished] = useState(paper.status === 'completed')
  const [synced, setSynced] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(
    () => (paper.duration_minutes || 50) * 60
  )

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isFinished) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isFinished])

  const formatTimer = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60)
    const s = totalSecs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const currentQ = paper.questions[currentIdx] || paper.questions[0]
  const isMulti = currentQ.type === 'multi'
  const currentAnswer = answers[currentIdx]

  // Answer selection handler
  const handleSelectOption = (key: 'A' | 'B' | 'C' | 'D') => {
    if (isFinished) return

    if (!isMulti) {
      setAnswers((prev) => ({ ...prev, [currentIdx]: key }))
    } else {
      const existing = Array.isArray(currentAnswer) ? [...currentAnswer] : []
      let next: string[]
      if (existing.includes(key)) {
        next = existing.filter((k) => k !== key)
      } else {
        next = [...existing, key].sort()
      }
      setAnswers((prev) => ({ ...prev, [currentIdx]: next }))
    }
  }

  // Calculate score
  const calculateResult = () => {
    let earned = 0
    paper.questions.forEach((q, idx) => {
      const userAns = answers[idx]
      if (q.type === 'multi') {
        const correctArray = Array.isArray(q.answer) ? q.answer : [q.answer]
        const userArray = Array.isArray(userAns) ? userAns : []
        if (
          correctArray.length === userArray.length &&
          correctArray.every((k, i) => k === userArray[i])
        ) {
          earned += q.score
        }
      } else {
        if (userAns === q.answer) {
          earned += q.score
        }
      }
    })
    return earned
  }

  const handleSubmit = () => {
    const answeredCount = Object.keys(answers).length
    if (answeredCount < paper.questions.length) {
      if (
        !window.confirm(
          `还有 ${paper.questions.length - answeredCount} 道题未作答，确定现在交卷吗？`
        )
      ) {
        return
      }
    }

    const earned = calculateResult()
    const updated: AiMockPaper = {
      ...paper,
      status: 'completed',
      completed_at: new Date().toISOString(),
      earned_score: earned,
      user_answers: answers,
    }

    saveAiMockPaper(updated)
    setIsFinished(true)
    if (onFinish) {
      onFinish(updated)
    }
  }

  // One-click sync to Mock Exams
  const handleSyncToMock = async () => {
    if (synced) return

    const earned = paper.earned_score ?? calculateResult()
    const matchedSubject = subjects.find(
      (s) =>
        s.name.includes(paper.subject_name) ||
        paper.subject_name.includes(s.name) ||
        s.name.includes('政治')
    )

    const newMock: MockExam = {
      ...baseRecord(userId),
      title: paper.title,
      exam_date: localDate(),
      total_score: earned,
      target_score: paper.total_score,
      rank: null,
    }
    await upsert('mock_exams', newMock)

    if (matchedSubject) {
      const newScore: MockScore = {
        ...baseRecord(userId),
        mock_exam_id: newMock.id,
        subject_id: matchedSubject.id,
        score: earned,
        total_score: paper.total_score,
      }
      await upsert('mock_scores', newScore)

      const wrongQuestions = paper.questions.filter((question, index) => {
        const user = answers[index]
        if (Array.isArray(question.answer)) return JSON.stringify([...(Array.isArray(user) ? user : [])].sort()) !== JSON.stringify([...question.answer].sort())
        return user !== question.answer
      })
      for (const question of wrongQuestions) {
        const legacyId = `mock-mistake:${newMock.id}:${question.id}`
        if (active(data.mistakes).some((item) => item.legacy_id === legacyId)) continue
        const pointTitle = question.question.match(/【([^】]+)】/)?.[1]?.split('·').at(-1) || paper.subject_name
        let point = active(data.knowledge_points).find((item) => item.subject_id === matchedSubject.id && item.title === pointTitle)
        if (!point) { point = { ...baseRecord(userId), subject_id: matchedSubject.id, title: pointTitle } as KnowledgePoint; await upsert('knowledge_points', point) }
        const userAnswer = answers[paper.questions.indexOf(question)]
        const mistake: Mistake = { ...baseRecord(userId), legacy_id: legacyId, subject_id: matchedSubject.id, knowledge_point_id: point.id, source_type: 'mock', source_id: newMock.id, question_ref: `${paper.title} · 第 ${question.id} 题`, error_reason: '作答错误，请根据解析重建证据链。', weakness: 4, next_review_date: localDate(), mastered: false, user_answer: Array.isArray(userAnswer) ? userAnswer.join('') : String(userAnswer || '未作答'), correct_answer: Array.isArray(question.answer) ? question.answer.join('') : question.answer, evidence: question.explanation, trap_type: '待复盘' }
        await upsert('mistakes', mistake)
        const task: StudyTask = { ...baseRecord(userId), legacy_id: `review-task:${mistake.id}:${localDate()}`, plan_id: null, subject_id: matchedSubject.id, syllabus_node_id: null, title: `复习：${pointTitle} · 第 ${question.id} 题`, task_date: localDate(), period: '晚上', estimate_minutes: 20, actual_minutes: 0, status: 'todo', sort_order: active(data.tasks).length, completed_at: null, source: 'review' }
        await upsert('tasks', task)
      }
    }

    setSynced(true)
  }

  const answeredCount = Object.keys(answers).length
  const earnedScore = paper.earned_score ?? calculateResult()

  return (
    <Modal
      title={isFinished ? `考后战报与试卷解析 · ${paper.title}` : `全真考场 · ${paper.title}`}
      onClose={onClose}
    >
      <div className="exam-hall-card">
        {/* Top Sticky Header */}
        <header className="exam-hall-header">
          <div className="exam-hall-title-box">
            <h3>{paper.title}</h3>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {isFinished ? '考试已交卷' : `进度：已作答 ${answeredCount} / ${paper.questions.length} 题`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isFinished && (
              <div
                className={`exam-hall-timer ${remainingSeconds < 300 ? 'warning' : ''}`}
                title="剩余考试时间"
              >
                <Clock size={14} />
                <span>{formatTimer(remainingSeconds)}</span>
              </div>
            )}

            {!isFinished ? (
              <button
                type="button"
                className="primary-btn"
                style={{ minHeight: 34, padding: '0 14px', fontSize: 12.5 }}
                onClick={handleSubmit}
              >
                <FileCheck2 size={14} />
                <span>交卷并查看成绩</span>
              </button>
            ) : (
              <button
                type="button"
                className="secondary-btn"
                style={{ minHeight: 34, padding: '0 14px', fontSize: 12.5 }}
                onClick={() => {
                  if (window.confirm('确定重新作答本套试卷吗？')) {
                    setAnswers({})
                    setIsFinished(false)
                    setSynced(false)
                    setRemainingSeconds((paper.duration_minutes || 50) * 60)
                  }
                }}
              >
                <RotateCcw size={14} />
                <span>重考一次</span>
              </button>
            )}
          </div>
        </header>

        {/* Result Banner (when finished) */}
        {isFinished && (
          <div style={{ padding: '14px 20px', background: 'var(--surface-secondary)', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Award size={28} className="text-warning" />
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                    得分：<span style={{ color: 'var(--accent-text)' }}>{earnedScore}</span> / {paper.total_score} 分
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    答对率 {Math.round((earnedScore / paper.total_score) * 100)}% · 题量 {paper.total_questions} 题
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className={`quiz-sync-btn ${synced ? 'synced' : ''}`}
                  disabled={synced}
                  onClick={handleSyncToMock}
                >
                  {synced ? (
                    <>
                      <Check size={14} /> 已同步至模考记录
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> 一键录入模考成绩
                    </>
                  )}
                </button>
                {synced && (
                  <a
                    href="#/mocks"
                    onClick={onClose}
                    style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'underline' }}
                  >
                    去模考看趋势
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Exam Body (Sidebar Grid + Question Canvas) */}
        <div className="exam-hall-body">
          {/* Answer Sheet Grid Sidebar */}
          <aside className="exam-sheet-sidebar">
            <div className="exam-sheet-title">
              <span>答题卡 ({paper.questions.length}题)</span>
              <span>{Math.round((answeredCount / paper.questions.length) * 100)}%</span>
            </div>

            <div className="exam-sheet-grid">
              {paper.questions.map((q, idx) => {
                const isAnswered = Boolean(answers[idx])
                const isCurrent = currentIdx === idx

                let stateClass = ''
                if (isFinished) {
                  const userAns = answers[idx]
                  let correct = false
                  if (q.type === 'multi') {
                    const cArr = Array.isArray(q.answer) ? q.answer : [q.answer]
                    const uArr = Array.isArray(userAns) ? userAns : []
                    correct = cArr.length === uArr.length && cArr.every((k, i) => k === uArr[i])
                  } else {
                    correct = userAns === q.answer
                  }
                  stateClass = correct ? 'correct' : 'incorrect'
                } else if (isAnswered) {
                  stateClass = 'answered'
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    className={`exam-sheet-dot ${stateClass} ${isCurrent ? 'current' : ''}`}
                    onClick={() => setCurrentIdx(idx)}
                    title={`第 ${idx + 1} 题 (${q.type === 'multi' ? '多选' : '单选'})`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Active Question Canvas */}
          <main className="exam-question-area">
            <div className="exam-q-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="exam-type-pill">
                  第 {currentIdx + 1} 题 · {isMulti ? '多项选择题 (选2-4项)' : '单项选择题'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  分值：{currentQ.score} 分
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                题号 {currentIdx + 1} / {paper.questions.length}
              </span>
            </div>

            <h4 className="exam-q-title">{currentQ.question}</h4>

            {/* Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(['A', 'B', 'C', 'D'] as const).map((key) => {
                const optText = currentQ.options[key]
                if (!optText) return null

                const isSelected = isMulti
                  ? Array.isArray(currentAnswer) && currentAnswer.includes(key)
                  : currentAnswer === key

                let stateClass = ''
                if (isFinished) {
                  const correctArr = Array.isArray(currentQ.answer) ? currentQ.answer : [currentQ.answer]
                  const isRight = correctArr.includes(key)
                  if (isRight) stateClass = 'correct'
                  else if (isSelected && !isRight) stateClass = 'incorrect'
                } else if (isSelected) {
                  stateClass = 'selected'
                }

                return (
                  <div
                    key={key}
                    className={`exam-opt-row ${stateClass}`}
                    onClick={() => handleSelectOption(key)}
                  >
                    <span className="exam-opt-key">{key}</span>
                    <span style={{ flex: 1 }}>{optText}</span>
                  </div>
                )
              })}
            </div>

            {/* In-depth Explanation (When Finished) */}
            {isFinished && (
              <div className="quiz-explanation-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>【标准答案】{Array.isArray(currentQ.answer) ? currentQ.answer.join('') : currentQ.answer}</strong>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    你的作答：{Array.isArray(currentAnswer) ? currentAnswer.join('') || '未选' : currentAnswer || '未选'}
                  </span>
                </div>
                <div>{currentQ.explanation}</div>
              </div>
            )}

            {/* Navigation Footer */}
            <footer className="exam-actions-footer">
              <button
                type="button"
                className="secondary-btn"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              >
                <ArrowLeft size={14} />
                <span>上一题</span>
              </button>

              <button
                type="button"
                className="primary-btn"
                disabled={currentIdx === paper.questions.length - 1}
                onClick={() => setCurrentIdx((prev) => Math.min(paper.questions.length - 1, prev + 1))}
              >
                <span>下一题</span>
                <ArrowRight size={14} />
              </button>
            </footer>
          </main>
        </div>
      </div>
    </Modal>
  )
}
