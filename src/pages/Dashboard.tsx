import { useMemo } from 'react'
import {
  ArrowRight,
  Clock3,
  FileCheck2,
  LineChart,
  Sparkles,
  Target,
  PenTool,
  BotMessageSquare,
  TriangleAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { active, daysUntil } from '../data/helpers'
import { localDate } from '../data/defaults'
import { Chip, CircularProgress, Empty, Progress } from '../components/ui'

export function Dashboard() {
  const { data } = useData()
  const today = localDate()

  const subjects = active(data.subjects).filter((item) => item.status === 'active')
  const mistakes = active(data.mistakes)
  const sessions = active(data.study_sessions)
  const papers = active(data.papers)
  const attempts = active(data.paper_attempts)
  const mocks = active(data.mock_exams).sort((a, b) => a.exam_date.localeCompare(b.exam_date))
  const mockScores = active(data.mock_scores)
  const syllabusNodes = active(data.syllabus_nodes)
  const settings = data.user_settings[0]

  // Key stats
  const dueMistakes = mistakes.filter((item) => !item.mastered && (!item.next_review_date || item.next_review_date <= today))
  const openMistakes = mistakes.filter((item) => !item.mastered)
  const totalStudyMinutes = sessions.reduce((sum, item) => sum + item.minutes, 0)
  const daysLeft = daysUntil(settings?.exam_date || today)

  // Target score & Prediction Logic
  const latestMock = mocks.at(-1)
  const targetScore = latestMock?.target_score || 380

  // Calculation of predicted total score
  const predictedScore = useMemo(() => {
    if (mocks.length > 0) {
      const recentMocks = mocks.slice(-3)
      return Math.round(recentMocks.reduce((sum, m) => sum + m.total_score, 0) / recentMocks.length)
    }
    if (attempts.length > 0) {
      const avgAttemptScore = attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
      return Math.min(460, Math.max(280, Math.round(avgAttemptScore * 4.2)))
    }
    return 365
  }, [mocks, attempts])

  const scoreDiff = predictedScore - targetScore

  // Core 4 postgraduate exam academic subjects (prevent non-academic tags like '紧急', '学习' from bloating the score matrix)
  const coreExamSubjects = useMemo(() => {
    const invalidNames = ['紧急', '学习', '日常', '临时', '待办', '杂项', '综合']
    const valid = subjects.filter((s) => !invalidNames.includes(s.name.trim()))
    const standardKeywords = ['政治', '思想', '英语', '数学', '专业课', '业务课', '计算机', '408', '西医', '中医', '管综']
    const sorted = [...valid].sort((a, b) => {
      const aStd = standardKeywords.some((k) => a.name.includes(k))
      const bStd = standardKeywords.some((k) => b.name.includes(k))
      if (aStd && !bStd) return -1
      if (!aStd && bStd) return 1
      return a.sort_order - b.sort_order
    })
    return (sorted.length >= 3 ? sorted : subjects).slice(0, 4)
  }, [subjects])

  // Per-subject score predictions & mastery breakdown
  const subjectBreakdowns = useMemo(() => {
    return coreExamSubjects.map((sub) => {
      const is100 = sub.name.includes('政治') || sub.name.includes('英语')
      const fullScore = is100 ? 100 : 150
      const subTarget = is100 ? 75 : 115

      // Subject mocks
      const subScores = mockScores.filter((s) => s.subject_id === sub.id)
      let subPredicted = 0
      if (subScores.length > 0) {
        subPredicted = Math.round(subScores.slice(-3).reduce((acc, s) => acc + s.score, 0) / Math.min(subScores.length, 3))
      } else {
        subPredicted = Math.round((predictedScore / 500) * fullScore)
      }

      // Mastery from syllabus nodes
      const subNodes = syllabusNodes.filter((n) => n.subject_id === sub.id)
      const masteredNodes = subNodes.filter((n) => (n.mastery_level || 0) >= 3)
      const masteryPct = subNodes.length ? Math.round((masteredNodes.length / subNodes.length) * 100) : 0

      return {
        id: sub.id,
        name: sub.name,
        fullScore,
        subTarget,
        subPredicted: Math.min(fullScore, subPredicted),
        subNodesCount: subNodes.length,
        masteredNodesCount: masteredNodes.length,
        masteryPct,
      }
    })
  }, [coreExamSubjects, mockScores, predictedScore, syllabusNodes])

  // Mini trendline points for score trend
  const maxMockScore = Math.max(1, ...mocks.map((m) => m.total_score))
  const mockTrendPoints = mocks
    .map(
      (m, i) =>
        `${mocks.length === 1 ? 50 : (i / (mocks.length - 1)) * 100},${
          100 - (m.total_score / maxMockScore) * 80
        }`
    )
    .join(' ')

  // Recent exams combining mocks and paper attempts
  const recentExams = useMemo(() => {
    const list: Array<{
      id: string
      title: string
      type: 'mock' | 'paper'
      scoreText: string
      date: string
      link: string
    }> = []

    for (const m of mocks) {
      list.push({
        id: `mock-${m.id}`,
        title: m.title,
        type: 'mock',
        scoreText: `${m.total_score} 分`,
        date: m.exam_date,
        link: '/papers?tab=mocks',
      })
    }

    for (const a of attempts) {
      const p = papers.find((paper) => paper.id === a.paper_id)
      if (p) {
        list.push({
          id: `attempt-${a.id}`,
          title: `${p.year} ${p.title} (第${a.attempt_no}刷)`,
          type: 'paper',
          scoreText: `${a.score}/${p.total_score} 分`,
          date: a.completed_date,
          link: '/papers',
        })
      }
    }

    return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  }, [mocks, attempts, papers])

  return (
    <div className="dashboard-grid">
      {/* 1. Hero Welcome & Countdown Banner */}
      <section className="dash-welcome-header">
        <div className="dash-welcome-left">
          <h1>
            考研备战工作台
            <Chip size="sm" variant="flat" color="primary">冲刺中控</Chip>
          </h1>
          <p>
            {settings?.exam_name || '考研初试'} 倒计时 <strong>{daysLeft}</strong> 天 · 目标总分 <strong>{targetScore}</strong> 分
          </p>
        </div>

        <div className="dash-welcome-right">
          <Link to="/papers?tab=mocks" className="primary-btn">
            <Sparkles size={15} />
            全真模拟考
          </Link>
          <Link to="/ai" className="secondary-btn">
            <BotMessageSquare size={15} />
            AI 伴学
          </Link>
          <Link to="/weaknesses" className="secondary-btn">
            <TriangleAlert size={15} />
            错题攻坚
          </Link>
        </div>
      </section>

      {/* 2. Core Score Prediction & Evaluation Panel */}
      <section className="score-prediction-panel">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div>
            <span className="eyebrow">SCORE PREDICTION & TARGET EVALUATION</span>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={20} className="text-accent" />
              考研成绩预测与目标评估
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
              基于历次全真模拟考表现、历年真题实战得分率与知识大纲掌握度加权动态测算
            </p>
          </div>
          <Link to="/papers?tab=mocks" className="secondary-btn" style={{ minHeight: 32, fontSize: 12, padding: '0 12px' }}>
            查看全真模考
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="prediction-grid-hero">
          {/* Left: Circular Gauge Dial Card */}
          <div className="prediction-dial-card">
            <div className="score-dial-wrap">
              <svg viewBox="0 0 160 160" className="score-dial-svg">
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="transparent"
                  stroke="var(--surface-tertiary)"
                  strokeWidth="9"
                  strokeDasharray="389"
                  strokeDashoffset="97"
                  transform="rotate(135 80 80)"
                  strokeLinecap="round"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="transparent"
                  stroke="url(#scoreGradHero)"
                  strokeWidth="9"
                  strokeDasharray="389"
                  strokeDashoffset={389 - ((Math.min(500, predictedScore) / 500) * 0.75 * 389)}
                  transform="rotate(135 80 80)"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="scoreGradHero" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#006fee" />
                    <stop offset="100%" stopColor="#7828c8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="score-dial-center">
                <span className="score-dial-num">{predictedScore}</span>
                <span className="score-dial-label">/ 500 预估总分</span>
              </div>
            </div>

            <div className="prediction-dial-meta">
              <Chip
                size="sm"
                variant="flat"
                color={scoreDiff >= 0 ? 'success' : 'danger'}
              >
                {scoreDiff >= 0 ? `超目标 +${scoreDiff}` : `距目标 ${scoreDiff}`} 分 (目标 {targetScore})
              </Chip>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {mocks.length ? `最近模考：${latestMock?.total_score} 分` : '基于考点掌握度估算'}
              </span>
            </div>

            <Link to="/papers?tab=mocks" className="primary-btn" style={{ width: '100%', justifyContent: 'center', minHeight: 34, fontSize: 12 }}>
              <Sparkles size={14} />
              进入全真模拟考场
            </Link>
          </div>

          {/* Right: 2x2 Grid of Subjects */}
          <div className="prediction-subjects-grid">
            {subjectBreakdowns.map((sub) => {
              const pct = Math.min(100, Math.round((sub.subPredicted / sub.fullScore) * 100))
              const isTargetMet = sub.subPredicted >= sub.subTarget
              return (
                <div key={sub.id} className="prediction-subject-card">
                  <div className="prediction-subject-top">
                    <span className="prediction-subject-name">{sub.name}</span>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={isTargetMet ? 'success' : 'primary'}
                    >
                      {isTargetMet ? '达标良好' : '冲刺提分'}
                    </Chip>
                  </div>

                  <div className="prediction-subject-score-row">
                    <strong>
                      {sub.subPredicted}{' '}
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>
                        / 目标 {sub.subTarget}
                      </span>
                    </strong>
                    <small>满分 {sub.fullScore}</small>
                  </div>

                  <div className="prediction-mini-track">
                    <div
                      className={`prediction-mini-fill ${isTargetMet ? 'success' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                    <span>考点掌握：{sub.masteryPct}%</span>
                    <span style={{ color: isTargetMet ? 'var(--success)' : undefined }}>
                      {isTargetMet ? '已达预期' : `差 ${sub.subTarget - sub.subPredicted} 分`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Diagnostic Insight Banner */}
        <div className="prediction-insight-banner">
          <Sparkles size={15} className="text-accent" style={{ flexShrink: 0 }} />
          <span>
            <strong>智能提分诊断：</strong>
            {scoreDiff >= 0
              ? '当前各科达标状态优良，建议保持全真模拟节奏，重点规避临场答题失误与细节丢分。'
              : '客观题与核心专业课考点仍具备显著提分潜力，建议优先在错题本攻坚高频丢分考点，并定期进行套卷全真模考。'}
          </span>
        </div>

        {/* Lower Trend Sparkline */}
        <div className="prediction-trend-section">
          <div className="prediction-trend-header">
            <h4>
              <LineChart size={15} className="text-accent" />
              模考总分走势微图
            </h4>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {mocks.length ? `共记录 ${mocks.length} 次模考成绩` : '暂无模考记录'}
            </span>
          </div>

          {mocks.length ? (
            <>
              <svg className="trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height: 110 }}>
                <polyline points={mockTrendPoints} />
                {mocks.map((m, i) => (
                  <circle
                    key={m.id}
                    cx={mocks.length === 1 ? 50 : (i / (mocks.length - 1)) * 100}
                    cy={100 - (m.total_score / maxMockScore) * 80}
                    r="2.5"
                  />
                ))}
              </svg>
              <div className="trend-labels" style={{ marginTop: 4 }}>
                {mocks.map((m) => (
                  <span key={m.id}>{m.exam_date.slice(5)} ({m.total_score}分)</span>
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              暂未记录全真模拟考成绩。在「真题 & 模考」完成 33 题在线考试后将自动点亮分数走势。
            </div>
          )}
        </div>
      </section>

      {/* 3. 4-Metric Grid (Hero UI Cards) */}
      <section className="metric-grid-4">
        <Link to="/papers?tab=mocks" className="metric-card-modern">
          <div className="metric-card-top">
            <span className="metric-label">模拟考</span>
            <div className="metric-icon-wrap metric-icon-blue">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-num">
              {latestMock ? latestMock.total_score : '—'}
            </span>
            <span className="metric-unit">分</span>
          </div>
          <div className="metric-bottom">
            <span>{mocks.length ? `已完成 ${mocks.length} 套试卷` : '点击开考首套模拟卷'}</span>
            <ArrowRight size={13} />
          </div>
        </Link>

        <Link to="/papers" className="metric-card-modern">
          <div className="metric-card-top">
            <span className="metric-label">历年真题</span>
            <div className="metric-icon-wrap metric-icon-green">
              <FileCheck2 size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-num">{attempts.length}</span>
            <span className="metric-unit">次实做</span>
          </div>
          <div className="metric-bottom">
            <span>已覆盖 {new Set(attempts.map((a) => a.paper_id)).size} 套真题</span>
            <ArrowRight size={13} />
          </div>
        </Link>

        <Link to="/weaknesses" className="metric-card-modern">
          <div className="metric-card-top">
            <span className="metric-label">薄弱错题</span>
            <div className="metric-icon-wrap metric-icon-amber">
              <TriangleAlert size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-num">{openMistakes.length}</span>
            <span className="metric-unit">个缺口</span>
          </div>
          <div className="metric-bottom">
            <span style={{ color: dueMistakes.length ? 'var(--danger)' : undefined }}>
              {dueMistakes.length ? `${dueMistakes.length} 个今日到期待复测` : '暂无到期待复测'}
            </span>
            <ArrowRight size={13} />
          </div>
        </Link>

        <div className="metric-card-modern">
          <div className="metric-card-top">
            <span className="metric-label">有效专注</span>
            <div className="metric-icon-wrap metric-icon-purple">
              <Clock3 size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-num">
              {totalStudyMinutes ? Math.round(totalStudyMinutes / 60) : 0}
            </span>
            <span className="metric-unit">小时</span>
          </div>
          <div className="metric-bottom">
            <span>{sessions.length} 次真实深度学习记录</span>
          </div>
        </div>
      </section>

      {/* 4. Subject Mastery Grid (Hero UI Circular Progress) */}
      <section className="panel" style={{ padding: 22 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">SUBJECT MASTERY OVERVIEW</span>
            <h2>科目掌握全景</h2>
          </div>
          <Link to="/subjects" className="secondary-btn" style={{ minHeight: 30, fontSize: 12, padding: '0 12px' }}>
            管理大纲考点
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="subject-mastery-grid">
          {subjectBreakdowns.map((sub) => (
            <Link key={sub.id} to="/subjects" className="subject-mastery-card">
              <div className="subject-mastery-info">
                <strong>{sub.name}</strong>
                <span>{sub.masteredNodesCount} / {sub.subNodesCount} 考点掌握</span>
              </div>
              <CircularProgress
                value={sub.masteryPct}
                size="md"
                color={sub.masteryPct >= 70 ? 'success' : 'primary'}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Recent Real Exams & Practices Section */}
      <section className="panel" style={{ padding: 22 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">RECENT PRACTICES & MOCKS</span>
            <h2>近期实战记录</h2>
          </div>
          <Link to="/papers" className="secondary-btn" style={{ minHeight: 30, fontSize: 12, padding: '0 12px' }}>
            查看真题 & 模考库
            <ArrowRight size={13} />
          </Link>
        </div>

        {recentExams.length ? (
          <div className="recent-exams-grid">
            {recentExams.map((item) => (
              <Link key={item.id} to={item.link} className="recent-exam-card">
                <div className="recent-exam-left">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Chip size="sm" variant="flat" color={item.type === 'mock' ? 'primary' : 'default'}>
                      {item.type === 'mock' ? '全真模考' : '历年真题'}
                    </Chip>
                    <time style={{ fontSize: 11.5, color: 'var(--muted)' }}>{item.date}</time>
                  </div>
                  <h4>{item.title}</h4>
                </div>
                <div className="recent-exam-right">
                  <span className="recent-exam-score">{item.scoreText}</span>
                  <span style={{ fontSize: 11, color: 'var(--accent-text)', display: 'flex', alignItems: 'center', gap: 2 }}>
                    查看详情 <ArrowRight size={11} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title="暂无实战记录"
            body="完成首套历年真题或全真模拟考试后，将在此汇总实战轨迹。"
            action={
              <Link to="/papers?tab=mocks" className="primary-btn">
                <Sparkles size={14} />
                进入全真模考
              </Link>
            }
          />
        )}
      </section>
    </div>
  )
}
