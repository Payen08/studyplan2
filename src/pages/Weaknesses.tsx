import { useMemo, useState } from 'react'
import { Brain, Check, CirclePlus, Clock3, RotateCcw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { active, baseRecord, subjectFor } from '../data/helpers'
import { localDate } from '../data/defaults'
import { nextReviewDate, shouldMaster, type ReviewGrade } from '../domain/review'
import type { KnowledgePoint, Mistake, ReviewRecord, StudyTask } from '../types'
import { Chip, Empty, Modal } from '../components/ui'

export function Weaknesses() {
  const { data, userId, upsert } = useData()
  const [params] = useSearchParams()
  const [view, setView] = useState<'due'|'soon'|'all'>(() => params.get('view') === 'due' ? 'due' : 'due')
  const [modal, setModal] = useState(false)
  const [reviewing, setReviewing] = useState<Mistake | null>(null)
  const mistakes = active(data.mistakes)
  const points = active(data.knowledge_points)
  const subjects = active(data.subjects).filter((s) => s.status === 'active')
  const today = localDate()
  const soon = new Date(); soon.setDate(soon.getDate() + 7); const soonDate = localDate(soon)
  const visible = useMemo(() => mistakes.filter((item) => {
    if (view === 'all') return true
    if (view === 'due') return !item.mastered && (!item.next_review_date || item.next_review_date <= today)
    return !item.mastered && Boolean(item.next_review_date && item.next_review_date > today && item.next_review_date <= soonDate)
  }), [mistakes, soonDate, today, view])

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const subjectId = String(form.get('subject'))
    let point = points.find((item) => item.subject_id === subjectId && item.title === String(form.get('point')).trim())
    if (!point) { point = { ...baseRecord(userId), subject_id: subjectId, title: String(form.get('point')).trim() } as KnowledgePoint; await upsert('knowledge_points', point) }
    const mistake: Mistake = { ...baseRecord(userId), subject_id: subjectId, knowledge_point_id: point.id, source_type: 'manual', source_id: null, question_ref: String(form.get('question')).trim(), error_reason: String(form.get('reason')).trim(), weakness: Number(form.get('weakness')) as Mistake['weakness'], next_review_date: String(form.get('review')) || today, mastered: false }
    await upsert('mistakes', mistake); setModal(false)
  }

  const gradeReview = async (grade: ReviewGrade) => {
    if (!reviewing) return
    const previous = active(data.review_records).filter((record) => record.mistake_id === reviewing.id)
    const record: ReviewRecord = { ...baseRecord(userId), mistake_id: reviewing.id, grade, reviewed_at: new Date().toISOString(), comment: '' }
    await upsert('review_records', record)
    await upsert('mistakes', { ...reviewing, mastered: shouldMaster(grade, previous), next_review_date: nextReviewDate(today, grade, previous) })
    setReviewing(null)
  }

  const createReviewTask = async (item: Mistake) => {
    const existing = active(data.tasks).find((task) => task.legacy_id === `review-task:${item.id}:${today}`)
    if (existing) return
    const task: StudyTask = { ...baseRecord(userId), legacy_id: `review-task:${item.id}:${today}`, plan_id: null, subject_id: item.subject_id, syllabus_node_id: null, title: `复习：${item.question_ref || points.find(p => p.id === item.knowledge_point_id)?.title || '错题'}`, task_date: today, period: '晚上', estimate_minutes: 25, actual_minutes: 0, status: 'todo', sort_order: active(data.tasks).length, completed_at: null, source: 'review' }
    await upsert('tasks', task)
  }

  return <div className="stack">
    <div className="toolbar"><div className="segmented"><button className={view === 'due' ? 'active' : ''} onClick={() => setView('due')}>今日到期 <span>{mistakes.filter(i => !i.mastered && (!i.next_review_date || i.next_review_date <= today)).length}</span></button><button className={view === 'soon' ? 'active' : ''} onClick={() => setView('soon')}>即将复习</button><button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>全部薄弱点</button></div><button className="primary-btn" onClick={() => setModal(true)}><CirclePlus size={16}/>记录错题</button></div>
    {visible.length ? <div className="review-queue">{visible.map((item) => { const point = points.find(p => p.id === item.knowledge_point_id); const previous = active(data.review_records).filter(r => r.mistake_id === item.id); return <article className={`review-card ${item.mastered ? 'mastered' : ''}`} key={item.id}><div className="review-card-head"><span>{subjectFor(subjects,item.subject_id)?.name || '未分类'}</span><Chip size="sm" variant="flat" color={item.mastered ? 'success' : item.weakness >= 4 ? 'danger' : 'warning'}>{item.mastered ? '已掌握' : `薄弱 ${item.weakness}/5`}</Chip></div><h3>{point?.title || '未分组知识点'}</h3><strong>{item.question_ref || '未填题号'}</strong><p>{item.error_reason || '还没有记录错因。'}</p>{item.evidence && <blockquote>{item.evidence}</blockquote>}<div className="review-meta"><span><Clock3 size={13}/>{item.next_review_date ? `${item.next_review_date} 复习` : '今日复习'}</span><span>{previous.length} 次复测</span></div><div className="button-row"><button className="secondary-btn" onClick={() => createReviewTask(item)}>加入今日任务</button><button className="primary-btn" onClick={() => setReviewing(item)}>{item.mastered ? '重新复习' : '开始复测'}</button></div></article> })}</div> : <Empty title={view === 'due' ? '今天没有到期错题' : '暂无匹配的薄弱点'} body={view === 'due' ? '可以继续今日计划，或从真题和测验中补充错题。' : undefined}/>} 
    {modal && <Modal title="记录错题" onClose={() => setModal(false)}><form className="form-grid" onSubmit={save}><label>科目<select name="subject" required>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>薄弱程度<select name="weakness" defaultValue="3">{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label><label className="full">知识点<input name="point" required autoFocus/></label><label>题号 / 来源<input name="question"/></label><label>首次复习<input name="review" type="date" defaultValue={today}/></label><label className="full">错误原因<textarea name="reason" rows={3}/></label><button className="primary-btn full" type="submit">保存错题</button></form></Modal>}
    {reviewing && <Modal title="复测知识缺口" onClose={() => setReviewing(null)}><div className="review-session"><Brain size={28}/><h3>{points.find(p => p.id === reviewing.knowledge_point_id)?.title || reviewing.question_ref}</h3><p>{reviewing.error_reason || '回忆当时错因，然后在纸上或心里完整重做一次。'}</p><div className="grade-grid"><button onClick={() => gradeReview('again')}><RotateCcw size={16}/><strong>Again</strong><small>明天再来</small></button><button onClick={() => gradeReview('hard')}><Brain size={16}/><strong>Hard</strong><small>3 天后</small></button><button onClick={() => gradeReview('good')}><Check size={16}/><strong>Good</strong><small>7 / 14 / 30 天</small></button></div></div></Modal>}
  </div>
}
