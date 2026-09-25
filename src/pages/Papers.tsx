import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Brain,
  CheckCircle2,
  CirclePlus,
  Clock3,
  FileText,
  RotateCcw,
  Sparkles,
  BookOpen,
  Download,
  Check,
  LineChart,
  BotMessageSquare,
  PenTool,
  Target,
} from 'lucide-react'
import { useData } from '../data/DataContext'
import { active, baseRecord, subjectFor } from '../data/helpers'
import type { KnowledgePoint, Mistake, Paper, PaperAttempt, StudyTask, MockExam, MockScore } from '../types'
import { Chip, Empty, Modal } from '../components/ui'
import { EnglishExamModal } from '../components/EnglishExamModal'
import { EnglishPaperReaderModal } from '../components/EnglishPaperReaderModal'
import { Bundled337ExamModal } from '../components/Bundled337ExamModal'
import { AiQuizModal } from '../components/AiQuizModal'
import { OnlineExamModal } from '../components/OnlineExamModal'
import { getAiMockPapers, type AiMockPaper } from '../data/mockPaperStore'
import {
  ENGLISH_PAPERS_DATA,
  isEnglishPaper,
  getEnglishPaperMeta,
} from '../data/englishPapersData'
import { getBundled337Paper } from '../data/bundled337Papers'

export function Papers() {
  const { data, userId, upsert } = useData()
  const [searchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') === 'mocks' ? 'mocks' : 'papers'

  const papers = active(data.papers).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    const bundledA = getBundled337Paper(a.legacy_id || a.id)
    const bundledB = getBundled337Paper(b.legacy_id || b.id)
    if (bundledA && bundledB) {
      if (bundledA.collection !== bundledB.collection) return bundledA.collection === 'practice' ? -1 : 1
      return bundledA.setNumber - bundledB.setNumber
    }
    if (bundledA) return -1
    if (bundledB) return 1
    return a.title.localeCompare(b.title, 'zh-CN')
  })
  const attempts = active(data.paper_attempts)
  const subjects = active(data.subjects).filter((s) => s.status === 'active')

  // Mocks data & state
  const mocks = active(data.mock_exams).sort((a, b) => a.exam_date.localeCompare(b.exam_date))
  const mockScores = active(data.mock_scores)
  const [mockModal, setMockModal] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [aiPapers, setAiPapers] = useState<AiMockPaper[]>(() => getAiMockPapers())
  const [activeExamPaper, setActiveExamPaper] = useState<AiMockPaper | null>(null)

  const [modal, setModal] = useState(false)
  const [attemptPaper, setAttemptPaper] = useState<Paper | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [englishSubFilter, setEnglishSubFilter] = useState<'all' | 'english-i' | 'english-ii'>('all')
  const [mistakeAttempt, setMistakeAttempt] = useState<{ paper: Paper; attempt: PaperAttempt } | null>(null)
  const [examPaper, setExamPaper] = useState<Paper | null>(null)
  const [readerPaper, setReaderPaper] = useState<Paper | null>(null)
  const [bundledExamPaper, setBundledExamPaper] = useState<Paper | null>(null)
  const [syncedEnglishNotice, setSyncedEnglishNotice] = useState(false)

  // Count existing English papers in DB
  const englishPapersInDb = papers.filter((p) => isEnglishPaper(p))
  const englishSubject = subjects.find((s) => s.name.includes('英语')) || subjects[0]
  const gdut337Subject = subjects.find((s) => s.name.trim() === '337')
  const effectiveSubjectId = (paper: Paper) => {
    if (getBundled337Paper(paper.legacy_id || paper.id)) return gdut337Subject?.id || paper.subject_id
    if (isEnglishPaper(paper)) return englishSubject?.id || paper.subject_id
    return paper.subject_id
  }

  // One-click sync 34 English papers for existing users
  const syncEnglishPapers = async () => {
    if (!englishSubject) return
    const existingKeys = new Set(
      papers.map((p) => p.legacy_id || p.title)
    )

    for (const ep of ENGLISH_PAPERS_DATA) {
      if (!existingKeys.has(ep.legacy_id) && !existingKeys.has(ep.title)) {
        const newPaper: Paper = {
          ...baseRecord(userId),
          id: ep.id,
          legacy_id: ep.legacy_id,
          subject_id: englishSubject.id,
          year: ep.year,
          title: ep.title,
          total_score: ep.total_score,
        }
        await upsert('papers', newPaper)
      }
    }
    setSyncedEnglishNotice(true)
    setTimeout(() => setSyncedEnglishNotice(false), 3000)
  }

  const isCurrentSubjectEnglish =
    subjects.find((s) => s.id === selectedSubject)?.name.includes('英语')
  const filteredPapers = papers.filter((p) => {
    if (selectedSubject !== 'all' && effectiveSubjectId(p) !== selectedSubject) {
      return false
    }
    if (englishSubFilter !== 'all' && isEnglishPaper(p)) {
      const meta = getEnglishPaperMeta(p.legacy_id || p.id)
      if (meta && meta.exam !== englishSubFilter) return false
      if (!meta) {
        if (englishSubFilter === 'english-i' && !p.title.includes('（一）') && !p.title.includes('英语一')) return false
        if (englishSubFilter === 'english-ii' && !p.title.includes('（二）') && !p.title.includes('英语二')) return false
      }
    }
    return true
  })

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    await upsert('papers', {
      ...baseRecord(userId),
      subject_id: String(f.get('subject')),
      year: Number(f.get('year')),
      title: String(f.get('title')),
      total_score: Number(f.get('total')) || 100,
    } as Paper)
    setModal(false)
  }

  const saveAttempt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const own = attempts.filter((a) => a.paper_id === attemptPaper!.id)
    const attempt: PaperAttempt = {
      ...baseRecord(userId),
      paper_id: attemptPaper!.id,
      attempt_no: own.length + 1,
      status: 'done',
      score: Number(f.get('score')),
      duration_minutes: Number(f.get('duration')),
      completed_date: String(f.get('date')),
    }
    await upsert('paper_attempts', attempt)
    setMistakeAttempt({ paper: attemptPaper!, attempt })
    setAttemptPaper(null)
  }

  const saveMistake = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!mistakeAttempt) return
    const form = new FormData(event.currentTarget)
    const pointTitle = String(form.get('point')).trim()
    let point = active(data.knowledge_points).find((item) => item.subject_id === mistakeAttempt.paper.subject_id && item.title === pointTitle)
    if (!point) {
      point = { ...baseRecord(userId), subject_id: mistakeAttempt.paper.subject_id, title: pointTitle } as KnowledgePoint
      await upsert('knowledge_points', point)
    }
    const mistake: Mistake = {
      ...baseRecord(userId),
      legacy_id: `paper-mistake:${mistakeAttempt.attempt.id}:${String(form.get('question')).trim()}`,
      subject_id: mistakeAttempt.paper.subject_id,
      knowledge_point_id: point.id,
      source_type: 'paper',
      source_id: mistakeAttempt.attempt.id,
      question_ref: `${mistakeAttempt.paper.title} · ${String(form.get('question')).trim()}`,
      error_reason: String(form.get('reason')).trim(),
      weakness: Number(form.get('weakness')) as Mistake['weakness'],
      next_review_date: new Intl.DateTimeFormat('en-CA').format(new Date()),
      mastered: false,
      user_answer: String(form.get('user_answer')).trim(),
      correct_answer: String(form.get('correct_answer')).trim(),
      evidence: String(form.get('evidence')).trim(),
      trap_type: String(form.get('trap_type')).trim(),
    }
    await upsert('mistakes', mistake)
    const task: StudyTask = { ...baseRecord(userId), legacy_id: `review-task:${mistake.id}:${mistake.next_review_date}`, plan_id: null, subject_id: mistake.subject_id, syllabus_node_id: null, title: `复习：${pointTitle}`, task_date: mistake.next_review_date!, period: '晚上', estimate_minutes: 25, actual_minutes: 0, status: 'todo', sort_order: active(data.tasks).length, completed_at: null, source: 'review' }
    await upsert('tasks', task)
    setMistakeAttempt(null)
  }

  const maxMockScore = Math.max(1, ...mocks.map((m) => m.total_score))
  const mockPoints = mocks
    .map(
      (m, i) =>
        `${mocks.length === 1 ? 50 : (i / (mocks.length - 1)) * 100},${
          100 - (m.total_score / maxMockScore) * 84
        }`
    )
    .join(' ')

  const saveMock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const mock: MockExam = {
      ...baseRecord(userId),
      title: String(f.get('title')),
      exam_date: String(f.get('date')),
      total_score: Number(f.get('total')),
      target_score: Number(f.get('target')),
      rank: Number(f.get('rank')) || null,
    }
    await upsert('mock_exams', mock)
    for (const subject of subjects) {
      const value = Number(f.get(`score-${subject.id}`))
      const total = Number(f.get(`full-${subject.id}`))
      if (total > 0)
        await upsert('mock_scores', {
          ...baseRecord(userId),
          mock_exam_id: mock.id,
          subject_id: subject.id,
          score: value,
          total_score: total,
        } as MockScore)
    }
    setMockModal(false)
  }

  const latestMock = mocks.at(-1)
  const mockDelta = latestMock ? latestMock.total_score - latestMock.target_score : 0

  return (
    <div className="stack">
      {/* Paper actions. Mock records remain directly addressable without adding a second primary tab. */}
      <div className="papers-tab-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        {currentTab === 'papers' ? (
          <>
            <div className="filter-line">
              <button
                className={selectedSubject === 'all' ? 'active' : ''}
                onClick={() => {
                  setSelectedSubject('all')
                  setEnglishSubFilter('all')
                }}
              >
                全部试卷
              </button>
              {subjects.map((s) => (
                <button
                  key={s.id}
                  className={selectedSubject === s.id ? 'active' : ''}
                  onClick={() => {
                    setSelectedSubject(s.id)
                    setEnglishSubFilter('all')
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>

            <div className="toolbar-actions" style={{ marginLeft: 'auto' }}>
              {englishPapersInDb.length < 34 && (
                <button
                  className="secondary-btn"
                  onClick={syncEnglishPapers}
                  title="一键载入 2010-2026 英语一与英语二共 34 套试卷"
                >
                  <Download size={15} />
                  {syncedEnglishNotice ? (
                    <>
                      <Check size={15} /> 已载入 34 套试卷
                    </>
                  ) : (
                    '载入考研英语试卷 (34套)'
                  )}
                </button>
              )}

              <button className="primary-btn" onClick={() => setModal(true)}>
                <CirclePlus size={16} />
                录入试卷
              </button>
            </div>
          </>
        ) : (
          <div className="toolbar-actions" style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              className="secondary-btn"
              style={{
                color: 'var(--accent-text)',
                borderColor: 'rgba(0,111,238,0.25)',
                background: 'var(--accent-soft)',
              }}
              onClick={() => setQuizOpen(true)}
              title="启动 AI 智能出卷测验并可一键录入模考"
            >
              <Sparkles size={16} />
              AI 测验出卷
            </button>
            <button className="primary-btn" onClick={() => setMockModal(true)}>
              <CirclePlus size={16} />
              录入模考
            </button>
          </div>
        )}
      </div>

      {currentTab === 'papers' ? (
        <>
      {/* English Track Sub-filter Pills */}
      {isCurrentSubjectEnglish && (
        <div className="english-subfilter-bar">
          <span className="subfilter-label">英语试卷分类：</span>
          <div className="pill-group">
            <button
              className={`pill-btn ${englishSubFilter === 'all' ? 'active' : ''}`}
              onClick={() => setEnglishSubFilter('all')}
            >
              全部英语试卷
            </button>
            <button
              className={`pill-btn ${englishSubFilter === 'english-i' ? 'active' : ''}`}
              onClick={() => setEnglishSubFilter('english-i')}
            >
              英语（一）
            </button>
            <button
              className={`pill-btn ${englishSubFilter === 'english-ii' ? 'active' : ''}`}
              onClick={() => setEnglishSubFilter('english-ii')}
            >
              英语（二）
            </button>
          </div>
        </div>
      )}

      {/* Paper List */}
      {filteredPapers.length ? (
        <div className="paper-list">
          {filteredPapers.map((paper) => {
            const own = attempts
              .filter((a) => a.paper_id === paper.id)
              .sort((a, b) => a.attempt_no - b.attempt_no)
            const latest = own.at(-1)
            const subject = subjectFor(subjects, effectiveSubjectId(paper))
            const isEnglish = isEnglishPaper(paper)
            const bundled337 = getBundled337Paper(paper.legacy_id || paper.id)
            const isBundled337 = Boolean(bundled337)
            const displayTitle = bundled337
              ? paper.title.replace(/^广工 337 (?:全真预测练习|模拟预测卷) · /, '')
              : paper.title
            const isEnglishI =
              paper.legacy_id?.startsWith('english-i') ||
              paper.title.includes('（一）') ||
              paper.title.includes('英语一')

            return (
              <article className="paper-row" key={paper.id}>
                <div className="paper-year">
                  <strong>{paper.year}</strong>
                  <span>YEAR</span>
                </div>

                <div className="paper-info">
                  <div className="paper-badges-row">
                    <span className="paper-subject-label">
                      {subject?.name ?? '未分类'}
                    </span>
                    {isEnglish && (
                      <span className={`exam-track-pill ${isEnglishI ? 'track-i' : 'track-ii'}`}>
                        {isEnglishI ? '英语一' : '英语二'}
                      </span>
                    )}
                    {bundled337 && (
                      <span className={`exam-track-pill ${bundled337.collection === 'practice' ? 'track-i' : 'track-ii'}`}>
                        {bundled337.collection === 'practice' ? '全真预测练习' : '模拟预测卷'}
                      </span>
                    )}
                  </div>

                  <h3>{displayTitle}</h3>

                  <div className="attempt-dots">
                    {[1, 2, 3].map((n) => (
                      <i key={n} className={own.some((a) => a.attempt_no === n) ? 'done' : ''}>
                        {n}
                      </i>
                    ))}
                    <small>
                      {own.length ? `已完成 ${own.length} 刷` : '尚未作答'}
                    </small>
                  </div>
                </div>

                <div className="paper-score">
                  {latest ? (
                    <>
                      <strong>
                        {latest.score}
                        <small> / {paper.total_score}</small>
                      </strong>
                      <span>
                        <Clock3 size={13} />
                        {latest.duration_minutes} 分钟
                      </span>
                    </>
                  ) : (
                    <span>等待第一次记录</span>
                  )}
                </div>

                <div className="paper-row-actions">
                  {isEnglish && (
                    <>
                      <button
                        className="primary-btn sm action-btn-online"
                        onClick={() => setExamPaper(paper)}
                        title="在线答题、自动判分与一键入库错题"
                      >
                        <Sparkles size={14} />
                        在线刷题 / 核对
                      </button>

                      <button
                        className="secondary-btn sm"
                        onClick={() => setReaderPaper(paper)}
                        title="查看试卷原文与题型解析"
                      >
                        <BookOpen size={14} />
                        查看试卷
                      </button>
                    </>
                  )}

                  {isBundled337 && (
                    <button
                      className="primary-btn sm"
                      onClick={() => setBundledExamPaper(paper)}
                      title="进入本套 337 试卷在线作答"
                    >
                      <Sparkles size={14} />
                      在线答题
                    </button>
                  )}

                  <button
                    className="secondary-btn sm"
                    onClick={() => setAttemptPaper(paper)}
                    title={own.length ? `记录第 ${own.length + 1} 刷成绩` : '记录离线成绩'}
                  >
                    {own.length ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                    {own.length ? `记录 ${own.length + 1} 刷` : '记录成绩'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <Empty
          title="暂无试卷"
          body={
            englishPapersInDb.length < 34
              ? '可点击上方「载入考研英语试卷」一键载入 34 套英语试卷。'
              : undefined
          }
          action={
            <div className="button-row">
              {englishPapersInDb.length < 34 && (
                <button className="primary-btn" onClick={syncEnglishPapers}>
                  <Download size={16} />
                  一键载入 34 套英语试卷
                </button>
              )}
              <button className="secondary-btn" onClick={() => setModal(true)}>
                <FileText size={16} />
                手动录入试卷
              </button>
            </div>
          }
        />
      )}
        </>
      ) : (
        /* MOCKS TAB */
        <>
          <section className="trend-panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">SCORE TREND</span>
                <h2>模考总分趋势</h2>
              </div>
              <LineChart size={20} color="var(--accent)" />
            </div>

            {mocks.length ? (
              <>
                <svg className="trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline points={mockPoints} />
                  {mocks.map((m, i) => (
                    <circle
                      key={m.id}
                      cx={mocks.length === 1 ? 50 : (i / (mocks.length - 1)) * 100}
                      cy={100 - (m.total_score / maxMockScore) * 84}
                      r="2"
                    />
                  ))}
                </svg>
                <div className="trend-labels">
                  {mocks.map((m) => (
                    <span key={m.id}>{m.exam_date.slice(5)}</span>
                  ))}
                </div>
              </>
            ) : (
              <Empty title="暂无模考趋势数据" body="参加模拟考试或录入模考成绩后即可在此展现走势" />
            )}
          </section>

          {/* AI Full Mock Exam Shelf */}
          <section className="mocks-ai-shelf">
            <div className="mocks-ai-shelf-head">
              <h3>
                <Sparkles size={16} className="text-accent" />
                AI 智能考场（全真模拟试卷库）
              </h3>
              <a
                href="#/ai"
                className="secondary-btn"
                style={{ minHeight: 28, padding: '0 10px', fontSize: 11.5 }}
              >
                <BotMessageSquare size={13} />
                <span>呼叫 AI 生成新试卷</span>
              </a>
            </div>

            <div className="mocks-paper-list">
              {aiPapers.map((paper) => {
                const isDone = paper.status === 'completed'
                return (
                  <div key={paper.id} className="mocks-paper-card">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                        <span className="exam-type-pill">{paper.subject_name}</span>
                        <span style={{ fontSize: 11, color: isDone ? 'var(--success)' : 'var(--accent-text)', fontWeight: 600 }}>
                          {isDone ? `已交卷 (${paper.earned_score}/${paper.total_score}分)` : '待开考'}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 4px', fontSize: 13.5, color: 'var(--ink)' }}>{paper.title}</h4>
                      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)' }}>
                        {paper.total_questions} 题 · 满分 {paper.total_score} 分 · 考试时长 {paper.duration_minutes} 分钟
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        className="primary-btn"
                        style={{ minHeight: 32, fontSize: 12, padding: '0 14px' }}
                        onClick={() => setActiveExamPaper(paper)}
                      >
                        {isDone ? (
                          '查看解析 / 重考'
                        ) : (
                          <>
                            <PenTool size={13} />
                            <span>进入考试</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="toolbar">
            <div className="inline-stats">
              <span>
                <Target size={16} />
                {latestMock
                  ? `${mockDelta >= 0 ? '+' : ''}${mockDelta} 目标差值`
                  : '等待第一次模考'}
              </span>
            </div>
          </div>

          <div className="mock-list">
            {[...mocks].reverse().map((mock) => {
              const diff = mock.total_score - mock.target_score
              return (
                <article key={mock.id}>
                  <time>{mock.exam_date}</time>
                  <div>
                    <h3>{mock.title}</h3>
                    <p>
                      {subjects.map((subject) => {
                        const score = mockScores.find(
                          (s) => s.mock_exam_id === mock.id && s.subject_id === subject.id
                        )
                        return score ? (
                          <span key={subject.id}>
                            {subject.name} {score.score}/{score.total_score}
                          </span>
                        ) : null
                      })}
                    </p>
                  </div>

                  <strong>
                    {mock.total_score}
                    <small> 总分</small>
                  </strong>

                  <Chip
                    size="sm"
                    variant="flat"
                    color={diff >= 0 ? 'success' : 'danger'}
                  >
                    {diff >= 0 ? `+${diff}` : diff}
                  </Chip>
                </article>
              )
            })}
          </div>

          {!mocks.length && (
            <Empty title="暂无模考记录" body="可点击上方「录入模考」或直接点击 AI 全真试卷进入考试" />
          )}
        </>
      )}

      {/* Online Exam / Check Modal */}
      {examPaper && (
        <EnglishExamModal
          paper={examPaper}
          onClose={() => setExamPaper(null)}
          onOpenReader={() => {
            const p = examPaper
            setExamPaper(null)
            setReaderPaper(p)
          }}
        />
      )}

      {/* Paper Reader Modal */}
      {readerPaper && (
        <EnglishPaperReaderModal
          paper={readerPaper}
          onClose={() => setReaderPaper(null)}
          onOpenExam={() => {
            const p = readerPaper
            setReaderPaper(null)
            setExamPaper(p)
          }}
        />
      )}

      {bundledExamPaper && (
        <Bundled337ExamModal
          paper={bundledExamPaper}
          onClose={() => setBundledExamPaper(null)}
        />
      )}

      {/* Manual Add Paper Modal */}
      {modal && (
        <Modal title="录入试卷" onClose={() => setModal(false)}>
          <form className="form-grid" onSubmit={save}>
            <label>
              年份
              <input
                name="year"
                type="number"
                defaultValue={new Date().getFullYear() - 1}
                required
              />
            </label>
            <label>
              满分
              <input name="total" type="number" defaultValue="100" required />
            </label>
            <label className="full">
              套卷名称
              <input name="title" placeholder="例如：2024 精选试卷" required autoFocus />
            </label>
            <label className="full">
              所属科目
              <select name="subject" required>
                {subjects.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-btn full" type="submit">
              保存
            </button>
          </form>
        </Modal>
      )}

      {/* Manual Attempt Modal */}
      {attemptPaper && (
        <Modal
          title={`${attemptPaper.title} · 第 ${
            attempts.filter((a) => a.paper_id === attemptPaper.id).length + 1
          } 刷`}
          onClose={() => setAttemptPaper(null)}
        >
          <form className="form-grid" onSubmit={saveAttempt}>
            <label>
              得分
              <input
                name="score"
                type="number"
                min="0"
                max={attemptPaper.total_score}
                required
                autoFocus
              />
            </label>
            <label>
              用时（分钟）
              <input name="duration" type="number" min="1" defaultValue="120" required />
            </label>
            <label className="full">
              完成日期
              <input
                name="date"
                type="date"
                defaultValue={new Intl.DateTimeFormat('en-CA').format(new Date())}
                required
              />
            </label>
            <button className="primary-btn full" type="submit">
              保存这次作答
            </button>
          </form>
        </Modal>
      )}

      {/* Manual Mistake Modal */}
      {mistakeAttempt && (
        <Modal title="记录本次错题" onClose={() => setMistakeAttempt(null)}>
          <form className="form-grid" onSubmit={saveMistake}>
            <p className="full form-hint"><Brain size={15}/>成绩已保存。可选填一条错题，来源会自动关联到这次作答。</p>
            <label>题号<input name="question" required placeholder="例如：阅读 Text 2 · 27" autoFocus /></label>
            <label>薄弱程度<select name="weakness" defaultValue="4">{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} / 5</option>)}</select></label>
            <label className="full">知识点<input name="point" required placeholder="例如：主旨题证据定位" /></label>
            <label>我的答案<input name="user_answer" /></label>
            <label>正确答案<input name="correct_answer" /></label>
            <label>陷阱类型<input name="trap_type" placeholder="偷换概念 / 过度推断" /></label>
            <label className="full">错误原因<textarea name="reason" rows={2} /></label>
            <label className="full">原文证据 / 正确方法<textarea name="evidence" rows={3} /></label>
            <div className="button-row full"><button type="button" className="secondary-btn" onClick={() => setMistakeAttempt(null)}>暂不录入</button><button type="submit" className="primary-btn">保存并加入复习</button></div>
          </form>
        </Modal>
      )}

      {/* Manual Add Mock Exam Modal */}
      {mockModal && (
        <Modal title="录入模考" onClose={() => setMockModal(false)} wide>
          <form className="form-grid" onSubmit={saveMock}>
            <label className="full">
              模考名称
              <input name="title" required placeholder="例如：2025 考前第一次全真模考" autoFocus />
            </label>
            <label>
              日期
              <input name="date" type="date" required defaultValue={new Intl.DateTimeFormat('en-CA').format(new Date())} />
            </label>
            <label>
              实际总分
              <input name="total" type="number" required placeholder="例如：350" />
            </label>
            <label>
              目标总分
              <input name="target" type="number" required placeholder="例如：360" />
            </label>
            <label>
              排名（可选）
              <input name="rank" type="number" placeholder="例如：12" />
            </label>

            <div className="full score-fields">
              <strong>单科成绩</strong>
              {subjects.map((s) => (
                <div key={s.id}>
                  <span>{s.name}</span>
                  <input name={`score-${s.id}`} type="number" placeholder="得分" />
                  <input name={`full-${s.id}`} type="number" placeholder="满分" />
                </div>
              ))}
            </div>

            <button className="primary-btn full" type="submit">
              保存模考
            </button>
          </form>
        </Modal>
      )}

      {/* AI Mini Quiz Modal */}
      {quizOpen && (
        <AiQuizModal onClose={() => setQuizOpen(false)} />
      )}

      {/* Online Exam Room Modal */}
      {activeExamPaper && (
        <OnlineExamModal
          paper={activeExamPaper}
          onClose={() => {
            setActiveExamPaper(null)
            setAiPapers(getAiMockPapers())
          }}
          onFinish={() => {
            setAiPapers(getAiMockPapers())
          }}
        />
      )}
    </div>
  )
}
