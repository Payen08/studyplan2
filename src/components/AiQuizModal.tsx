import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  Zap,
  Flame,
  FileCheck2,
} from 'lucide-react'
import { useData } from '../data/DataContext'
import { active, baseRecord } from '../data/helpers'
import { localDate } from '../data/defaults'
import { Modal } from './ui'
import type { KnowledgePoint, Mistake, MockExam, MockScore, StudyTask, Subject } from '../types'

export interface QuizQuestion {
  id: string
  question: string
  options: {
    A: string
    B: string
    C: string
    D: string
  }
  answer: 'A' | 'B' | 'C' | 'D'
  explanation: string
  score: number
}

interface AiQuizModalProps {
  onClose: () => void
  defaultSubjectId?: string
  onSynced?: (mockId: string) => void
}

const BUILTIN_SAMPLE_BANKS: Record<string, QuizQuestion[]> = {
  default: [
    {
      id: 'q-default-1',
      question: '【考研公共课·辨析】在唯物辩证法体系中，关于事物发展的源泉和动力，下列阐述最准确的是：',
      options: {
        A: '事物的质变与量变相互转化',
        B: '事物内部矛盾双方的对立统一',
        C: '外部环境对事物施加的反作用力',
        D: '否定之否定规律揭示的前进性与曲折性',
      },
      answer: 'B',
      explanation: '【考点解析】矛盾是事物发展的源泉和动力。对立统一规律揭示了事物普遍联系的根本内容和变化发展的内在动力。量变质变揭示发展形式，否定之否定揭示发展方向。',
      score: 10,
    },
    {
      id: 'q-default-2',
      question: '【考研英语·长难句理解】In the sentence "Scarcely had the researcher published his findings when a fierce debate erupted among scholars", what does it mean?',
      options: {
        A: '学者们激烈争论之后，研究员才发布了研究成果',
        B: '研究员一发布其研究发现，学者之间就爆发了激烈辩论',
        C: '尽管辩论十分激烈，研究员依然坚持公布了数据',
        D: '学者们对该研究员发布成果的时机表示普遍怀疑',
      },
      answer: 'B',
      explanation: '【考点解析】Scarcely... when... 为典型考研常考长难句倒装句型，意为“刚一……就……”，表示两个动作紧接着发生。',
      score: 10,
    },
    {
      id: 'q-default-3',
      question: '【考研备考·方法论】在复习中后期进入强化冲刺阶段时，对于高频错题的最优闭环策略是：',
      options: {
        A: '机械抄录错题至笔记本并背诵标准答案',
        B: '直接略过低分题目，集中所有精力攻克极难压轴大题',
        C: '回归知识点定位本质缺口，隔周重做同源变式题巩固',
        D: '只刷全新试卷，以刷题总量替代错题复盘',
      },
      answer: 'C',
      explanation: '【考点解析】科学备考遵循“查漏-辨析-变式闭环”原则，不仅记录错误现象，更需回归知识点并重做同类变式题验证掌握度。',
      score: 10,
    },
    {
      id: 'q-default-4',
      question: '【综合逻辑·考查】下列关于目标管理与阶段性复习节奏的推断中，合乎理性备战规律的是：',
      options: {
        A: '每天分配给单科的时间越长越好，不宜跨科目穿插',
        B: '模考成绩一旦出现单次波动，应立刻全盘推翻原定进度',
        C: '文科背诵适合利用早晚高效时段分散记忆，理科计算宜留整块专注攻坚',
        D: '冲刺阶段只需关注公共课，专业课到考前一周突击即可',
      },
      answer: 'C',
      explanation: '【考点解析】大脑认知心理学表明，分散间隔重复适合记忆型科目，整块深度沉浸更适合逻辑计算类科目。',
      score: 10,
    },
    {
      id: 'q-default-5',
      question: '【考研模拟·应试心态】在考场模拟实战测试中，如果遇到未曾练习过的新型陌生大题，最佳策略是：',
      options: {
        A: '停下所有答题节奏，誓要攻克该题后再继续',
        B: '快速标注跳过，先稳拿基础题与中档题分值，最后回看破题',
        C: '立刻放弃本科目后续答题，调整心情准备下一门',
        D: '凭空编造大量无关术语填满卷面以期获取同情分',
      },
      answer: 'B',
      explanation: '【考点解析】考场得分原则是“保底率第一”，先确保会做的中基础题全部拿到，再在剩余充裕时间内集中思考攻坚突破。',
      score: 10,
    },
  ],
}

export function AiQuizModal({ onClose, defaultSubjectId, onSynced }: AiQuizModalProps) {
  const { data, userId, upsert } = useData()
  const subjects = active(data.subjects).filter((s) => s.status === 'active')

  const [stage, setStage] = useState<'config' | 'testing' | 'result'>('config')
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    () => defaultSubjectId || subjects[0]?.id || ''
  )
  const [questionCount, setQuestionCount] = useState<number>(5)
  const [focusArea, setFocusArea] = useState<string>('high_frequency')
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [userAnswers, setUserAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({})
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [syncedToMock, setSyncedToMock] = useState(false)
  const [newMockExamId, setNewMockExamId] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start timer on test start
  useEffect(() => {
    if (stage === 'testing') {
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [stage])

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0]

  // Start Quiz & Generate Questions
  const handleStartQuiz = async () => {
    setGenerating(true)
    const apiKey = localStorage.getItem('study_ai_api_key') || ''
    const endpoint = localStorage.getItem('study_ai_api_endpoint') || 'https://api.deepseek.com'
    const model = localStorage.getItem('study_ai_model') || 'deepseek-chat'

    let generated: QuizQuestion[] = []

    if (apiKey.trim()) {
      try {
        const cleanBase = endpoint.trim().replace(/\/$/, '')
        const endpointUrl = cleanBase.endsWith('/chat/completions')
          ? cleanBase
          : `${cleanBase}/chat/completions`

        const prompt = `请为考研学生生成一套【${currentSubject?.name || '综合'}】科目的模拟小测题。
要求：
1. 题量：严格生成 ${questionCount} 道单选题。
2. 考查方向：${focusArea === 'weakness' ? '紧扣高频易错点与概念辨析' : '高频真题重点考点'}。
3. 返回格式必须为严谨的 JSON 数组，每项包含：
   - "question": 题干字符串
   - "options": 对象，包含 "A", "B", "C", "D" 四个选项
   - "answer": 正确答案大写字母（"A"|"B"|"C"|"D"）
   - "explanation": 详细考点解析
   - "score": 每题分值（固定 10）
请直接返回 JSON 数组，严禁其他客套文字。`

        const res = await fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          }),
        })

        if (res.ok) {
          const jsonRes = await res.json()
          const text = jsonRes?.choices?.[0]?.message?.content || ''
          const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/)
          if (match) {
            const parsed = JSON.parse(match[0])
            if (Array.isArray(parsed) && parsed.length > 0) {
              generated = parsed.map((item: any, idx: number) => ({
                id: `ai-q-${idx + 1}`,
                question: item.question || `第 ${idx + 1} 题`,
                options: item.options || { A: '选项A', B: '选项B', C: '选项C', D: '选项D' },
                answer: ['A', 'B', 'C', 'D'].includes(item.answer) ? item.answer : 'A',
                explanation: item.explanation || '考点解析。',
                score: 10,
              }))
            }
          }
        }
      } catch {
        // Fall back to sample bank
      }
    }

    if (!generated.length) {
      // Fallback: Use curated sample questions
      const baseBank = BUILTIN_SAMPLE_BANKS.default
      generated = baseBank.slice(0, questionCount).map((q, idx) => ({
        ...q,
        id: `q-${idx + 1}`,
        question: `【${currentSubject?.name || '考研'}】${q.question}`,
      }))
    }

    setQuestions(generated)
    setUserAnswers({})
    setGenerating(false)
    setStage('testing')
  }

  // Answer selection
  const handleSelectOption = (qIdx: number, optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (stage !== 'testing') return
    setUserAnswers((prev) => ({ ...prev, [qIdx]: optionKey }))
  }

  // Calculate scores
  const fullScore = questions.reduce((acc, q) => acc + q.score, 0)
  const earnedScore = questions.reduce((acc, q, idx) => {
    return acc + (userAnswers[idx] === q.answer ? q.score : 0)
  }, 0)
  const correctCount = questions.reduce((acc, q, idx) => {
    return acc + (userAnswers[idx] === q.answer ? 1 : 0)
  }, 0)

  // Format time
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Submit test
  const handleSubmitTest = () => {
    const answeredCount = Object.keys(userAnswers).length
    if (answeredCount < questions.length) {
      if (!window.confirm(`还有 ${questions.length - answeredCount} 道题未作答，确定交卷吗？`)) {
        return
      }
    }
    setStage('result')
  }

  // Sync to Mock Exam Database
  const handleSyncToMock = async () => {
    if (syncedToMock) return

    const mockTitle = `AI 测验 · ${currentSubject?.name || '综合'} (${questionCount}题速测)`
    const newMock: MockExam = {
      ...baseRecord(userId),
      title: mockTitle,
      exam_date: localDate(),
      total_score: earnedScore,
      target_score: fullScore,
      rank: null,
    }

    await upsert('mock_exams', newMock)

    if (currentSubject) {
      const newMockScore: MockScore = {
        ...baseRecord(userId),
        mock_exam_id: newMock.id,
        subject_id: currentSubject.id,
        score: earnedScore,
        total_score: fullScore,
      }
      await upsert('mock_scores', newMockScore)

      const wrongQuestions = questions.filter((question, index) => userAnswers[index] !== question.answer)
      for (const question of wrongQuestions) {
        const index = questions.indexOf(question)
        const legacyId = `ai-quiz-mistake:${newMock.id}:${question.id}`
        if (active(data.mistakes).some((item) => item.legacy_id === legacyId)) continue
        const pointTitle = focusArea === 'weakness' ? '高频易错点' : 'AI 测验待巩固考点'
        let point = active(data.knowledge_points).find((item) => item.subject_id === currentSubject.id && item.title === pointTitle)
        if (!point) {
          point = { ...baseRecord(userId), subject_id: currentSubject.id, title: pointTitle } as KnowledgePoint
          await upsert('knowledge_points', point)
        }
        const mistake: Mistake = {
          ...baseRecord(userId),
          legacy_id: legacyId,
          subject_id: currentSubject.id,
          knowledge_point_id: point.id,
          source_type: 'mock',
          source_id: newMock.id,
          question_ref: `${mockTitle} · 第 ${index + 1} 题`,
          error_reason: 'AI 测验作答错误，需结合解析复测。',
          weakness: 4,
          next_review_date: localDate(),
          mastered: false,
          user_answer: userAnswers[index] || '未作答',
          correct_answer: question.answer,
          evidence: question.explanation,
          trap_type: '待复盘',
        }
        await upsert('mistakes', mistake)
        const task: StudyTask = {
          ...baseRecord(userId),
          legacy_id: `review-task:${mistake.id}:${localDate()}`,
          plan_id: null,
          subject_id: currentSubject.id,
          syllabus_node_id: null,
          title: `复习：${pointTitle} · 第 ${index + 1} 题`,
          task_date: localDate(),
          period: '晚上',
          estimate_minutes: 20,
          actual_minutes: 0,
          status: 'todo',
          sort_order: active(data.tasks).length,
          completed_at: null,
          source: 'review',
        }
        await upsert('tasks', task)
      }
    }

    setSyncedToMock(true)
    setNewMockExamId(newMock.id)
    if (onSynced) {
      onSynced(newMock.id)
    }
  }

  return (
    <Modal
      title={
        stage === 'config'
          ? 'AI 智能测验组卷'
          : stage === 'testing'
          ? `模拟测验 · ${currentSubject?.name || '综合'}`
          : '测验战报与评分'
      }
      onClose={onClose}
    >
      <div className="quiz-modal-box">
        {/* Stage 1: Configuration */}
        {stage === 'config' && (
          <div className="quiz-config-card">
            <div className="quiz-config-row">
              <label className="quiz-config-label">
                <span>测验科目</span>
                <select
                  className="quiz-config-select"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="quiz-config-label">
                <span>题量与分值</span>
                <select
                  className="quiz-config-select"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                >
                  <option value={5}>5 题专项速测 (满分 50 分)</option>
                  <option value={10}>10 题全真模拟 (满分 100 分)</option>
                </select>
              </label>
            </div>

            <label className="quiz-config-label">
              <span>出题考查侧重</span>
              <select
                className="quiz-config-select"
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
              >
                <option value="high_frequency">高频核心重点 · 考研真题常考题型</option>
                <option value="weakness">薄弱环节突破 · 易混淆概念与难点辨析</option>
                <option value="sprint">全真压轴冲刺 · 拔高题型与知识网络串联</option>
              </select>
            </label>

            <div
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                lineHeight: 1.5,
                background: 'var(--surface)',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px dashed var(--line)',
              }}
            >
              测验完成后支持<strong>一键将成绩同步至【模考记录】</strong>，自动计入总分趋势折线图。
            </div>

            <button
              type="button"
              className="primary-btn"
              style={{ minHeight: 44, fontSize: 14 }}
              disabled={generating}
              onClick={handleStartQuiz}
            >
              <Zap size={16} />
              <span>{generating ? 'AI 正在组卷中...' : '启动 AI 智能组卷并开始作答'}</span>
            </button>
          </div>
        )}

        {/* Stage 2: Answering Test */}
        {stage === 'testing' && (
          <>
            <div className="quiz-header-status">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="quiz-q-num">
                  科目：{currentSubject?.name || '综合'}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                  已答 {Object.keys(userAnswers).length} / {questions.length} 题
                </span>
              </div>
              <div className="quiz-timer-badge">
                <Clock size={13} className="text-accent" />
                <span>{formatTime(elapsedSeconds)}</span>
              </div>
            </div>

            <div className="quiz-question-list">
              {questions.map((q, idx) => {
                const selectedKey = userAnswers[idx]
                return (
                  <div className="quiz-question-item" key={q.id || idx}>
                    <div className="quiz-question-head">
                      <span className="quiz-q-num">第 {idx + 1} 题</span>
                      <span className="quiz-q-score">{q.score} 分</span>
                    </div>

                    <p className="quiz-q-text">{q.question}</p>

                    <div className="quiz-options-group">
                      {(['A', 'B', 'C', 'D'] as const).map((key) => {
                        const optText = q.options[key]
                        if (!optText) return null
                        const isSelected = selectedKey === key
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`quiz-option-btn ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectOption(idx, key)}
                          >
                            <span className="quiz-option-key">{key}</span>
                            <span>{optText}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  if (window.confirm('确定放弃当前测验返回吗？')) {
                    setStage('config')
                  }
                }}
              >
                放弃测验
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSubmitTest}
              >
                <FileCheck2 size={16} />
                <span>交卷并查看评分解析</span>
              </button>
            </div>
          </>
        )}

        {/* Stage 3: Results & One-Click Mock Sync */}
        {stage === 'result' && (
          <>
            <div className="quiz-result-hero">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Award size={20} className="text-warning" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                  测验批改战报
                </span>
              </div>

              <div className="quiz-score-display">
                {earnedScore} <span style={{ fontSize: 20, color: 'var(--muted)' }}>/ {fullScore}</span>
              </div>

              <div className="quiz-score-sub">
                正确率 <strong>{Math.round((correctCount / questions.length) * 100)}%</strong> ·
                答对 <strong>{correctCount}/{questions.length}</strong> 题 ·
                用时 <strong>{formatTime(elapsedSeconds)}</strong>
              </div>
            </div>

            {/* ONE-CLICK SYNC TO MOCK EXAM */}
            <div className="quiz-mock-sync-card">
              <div className="quiz-sync-info">
                <h4>
                  <Sparkles size={16} className="text-accent" />
                  一键生成并同步至模考记录
                </h4>
                <p>
                  将本次 {currentSubject?.name} 得分 ({earnedScore}/{fullScore}) 自动录入模考档案，更新总分折线趋势图。
                </p>
              </div>

              <button
                type="button"
                className={`quiz-sync-btn ${syncedToMock ? 'synced' : ''}`}
                disabled={syncedToMock}
                onClick={handleSyncToMock}
              >
                {syncedToMock ? (
                  <>
                    <Check size={15} /> 已同步至模考
                  </>
                ) : (
                  <>
                    <Award size={15} /> 一键加入模考
                  </>
                )}
              </button>
            </div>

            {syncedToMock && (
              <div style={{ textAlign: 'center', margin: '-4px 0 6px' }}>
                <a
                  href="#/mocks"
                  onClick={onClose}
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--accent)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>已保存！点击前往【模考记录】查看总分趋势</span>
                  <ArrowRight size={13} />
                </a>
              </div>
            )}

            {/* Review Detailed Explanations */}
            <div className="quiz-question-list">
              <h4 style={{ fontSize: 13, fontWeight: 700, margin: '8px 0 0', color: 'var(--ink)' }}>
                逐题考点解析与核对：
              </h4>
              {questions.map((q, idx) => {
                const userChoice = userAnswers[idx]
                const isCorrect = userChoice === q.answer

                return (
                  <div className="quiz-question-item" key={q.id || idx}>
                    <div className="quiz-question-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="quiz-q-num">第 {idx + 1} 题</span>
                        {isCorrect ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontSize: 12, fontWeight: 600 }}>
                            <CheckCircle2 size={14} /> 回答正确 (+{q.score}分)
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>
                            <XCircle size={14} /> 回答错误 (你的选择: {userChoice || '未选'})
                          </span>
                        )}
                      </div>
                      <span className="quiz-q-score">标准答案：{q.answer}</span>
                    </div>

                    <p className="quiz-q-text">{q.question}</p>

                    <div className="quiz-options-group">
                      {(['A', 'B', 'C', 'D'] as const).map((key) => {
                        const optText = q.options[key]
                        if (!optText) return null
                        const isChosen = userChoice === key
                        const isRightAnswer = q.answer === key

                        let stateClass = ''
                        if (isRightAnswer) stateClass = 'correct'
                        else if (isChosen && !isRightAnswer) stateClass = 'incorrect'

                        return (
                          <div
                            key={key}
                            className={`quiz-option-btn ${stateClass}`}
                            style={{ cursor: 'default' }}
                          >
                            <span className="quiz-option-key">{key}</span>
                            <span>{optText}</span>
                          </div>
                        )
                      })}
                    </div>

                    <div className="quiz-explanation-box">
                      <strong>【考点精解】</strong> {q.explanation}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setStage('config')}
              >
                <RotateCcw size={14} />
                <span>再来一套</span>
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={onClose}
              >
                完成
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
