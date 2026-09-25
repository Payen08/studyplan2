import { useState } from 'react'
import { CirclePlus, LineChart, Target, Sparkles, BookOpen, BotMessageSquare, PenTool } from 'lucide-react'
import { useData } from '../data/DataContext'
import { active, baseRecord } from '../data/helpers'
import type { MockExam, MockScore } from '../types'
import { Chip, Empty, Modal } from '../components/ui'
import { AiQuizModal } from '../components/AiQuizModal'
import { OnlineExamModal } from '../components/OnlineExamModal'
import { getAiMockPapers, type AiMockPaper } from '../data/mockPaperStore'

export function Mocks() {
  const { data, userId, upsert } = useData()
  const mocks = active(data.mock_exams).sort((a, b) => a.exam_date.localeCompare(b.exam_date))
  const scores = active(data.mock_scores)
  const subjects = active(data.subjects).filter((s) => s.status === 'active')
  const [modal, setModal] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [aiPapers, setAiPapers] = useState<AiMockPaper[]>(() => getAiMockPapers())
  const [activeExamPaper, setActiveExamPaper] = useState<AiMockPaper | null>(null)

  const max = Math.max(1, ...mocks.map((m) => m.total_score))
  const points = mocks
    .map(
      (m, i) =>
        `${mocks.length === 1 ? 50 : (i / (mocks.length - 1)) * 100},${
          100 - (m.total_score / max) * 84
        }`
    )
    .join(' ')

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
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
    setModal(false)
  }

  const latestMock = mocks.at(-1)
  const delta = latestMock ? latestMock.total_score - latestMock.target_score : 0

  return (
    <div className="stack">
      <section className="trend-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">SCORE TREND</span>
            <h2>总分趋势</h2>
          </div>
          <LineChart size={20} color="var(--accent)" />
        </div>

        {mocks.length ? (
          <>
            <svg className="trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={points} />
              {mocks.map((m, i) => (
                <circle
                  key={m.id}
                  cx={mocks.length === 1 ? 50 : (i / (mocks.length - 1)) * 100}
                  cy={100 - (m.total_score / max) * 84}
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
          <Empty title="暂无趋势数据" />
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
              ? `${delta >= 0 ? '+' : ''}${delta} 目标差值`
              : '等待第一次模考'}
          </span>
        </div>
        <div className="button-row">
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
            AI 智能测验出卷
          </button>
          <button className="primary-btn" onClick={() => setModal(true)}>
            <CirclePlus size={16} />
            录入模考
          </button>
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
                    const score = scores.find(
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
        <Empty title="暂无模考记录" />
      )}

      {modal && (
        <Modal title="录入模考" onClose={() => setModal(false)} wide>
          <form className="form-grid" onSubmit={save}>
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
                  <span>
                    {s.name}
                  </span>
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

      {quizOpen && (
        <AiQuizModal onClose={() => setQuizOpen(false)} />
      )}

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
