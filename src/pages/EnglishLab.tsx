import { useMemo, useState } from 'react'
import { BookOpen, Check, FileSearch, FolderOpen, MessageSquareText, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ECHO_SOURCE, buildEnglishPrompt, sectionLabels, type EnglishExam, type EnglishSection } from '../data/englishKnowledge'
import { Chip, Empty } from '../components/ui'
import { useData } from '../data/DataContext'
import { active, baseRecord } from '../data/helpers'
import { localDate } from '../data/defaults'
import type { KnowledgePoint, Mistake, StudyTask } from '../types'

type LocalDoc = { path: string; text: string }

export function EnglishLab() {
  const navigate = useNavigate()
  const { data, userId, upsert } = useData()
  const [exam, setExam] = useState<EnglishExam>('english-i')
  const [year, setYear] = useState(2025)
  const [section, setSection] = useState<EnglishSection>('reading')
  const [text, setText] = useState(1)
  const [question, setQuestion] = useState(21)
  const [answer, setAnswer] = useState('')
  const [docs, setDocs] = useState<LocalDoc[]>([])
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState(false)
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle) return docs.filter((doc) => `${doc.path}\n${doc.text}`.toLowerCase().includes(needle)).slice(0, 20)
    const sectionNeedle = section === 'reading' ? `reading-text-${text}` : section
    const scoped = docs.filter((doc) => doc.path.toLowerCase().includes(`/${exam}/${year}/`) && doc.path.toLowerCase().includes(sectionNeedle))
    return (scoped.length ? scoped : docs).slice(0, 12)
  }, [docs, exam, query, section, text, year])

  const importFolder = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => /\.(md|json|txt)$/i.test(file.name))
    const loaded = await Promise.all(files.map(async (file) => ({ path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name, text: await file.text() })))
    setDocs(loaded)
    const bytes = new TextEncoder().encode(loaded.map((item) => `${item.path}:${item.text.length}`).join('|'))
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const hash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
    localStorage.setItem('echo_local_import', JSON.stringify({ repository: ECHO_SOURCE.repository, commit: ECHO_SOURCE.commit, importedAt: new Date().toISOString(), contentHash: hash, fileCount: loaded.length, licenseStatus: 'local_only' }))
  }

  const askAi = () => {
    sessionStorage.setItem('study_ai_seed_prompt', buildEnglishPrompt({ exam, year, section, text: section === 'reading' ? text : undefined, question: ['reading','cloze','new-question-type'].includes(section) ? question : undefined }, answer))
    navigate('/ai')
  }

  const saveSuggestion = async () => {
    if (!answer.trim() || saved) return
    const englishSubject = active(data.subjects).find((item) => item.name.includes('英语')) || active(data.subjects)[0]
    if (!englishSubject) return
    const pointTitle = `${sectionLabels[section]} · ${section === 'reading' ? '证据定位' : '专项方法'}`
    let point = active(data.knowledge_points).find((item) => item.subject_id === englishSubject.id && item.title === pointTitle)
    if (!point) { point = { ...baseRecord(userId), subject_id: englishSubject.id, title: pointTitle } as KnowledgePoint; await upsert('knowledge_points', point) }
    const ref = `${year} ${exam === 'english-i' ? '英语一' : '英语二'} ${sectionLabels[section]}${section === 'reading' ? ` Text ${text}` : ''}${question ? ` 第 ${question} 题` : ''}`
    const mistake: Mistake = { ...baseRecord(userId), legacy_id: `english:${exam}:${year}:${section}:${text}:${question}`, subject_id: englishSubject.id, knowledge_point_id: point.id, source_type: 'manual', source_id: null, question_ref: ref, error_reason: '待结合专项解析确认错误模式。', weakness: 4, next_review_date: localDate(), mastered: false, user_answer: answer, correct_answer: '', evidence: '', trap_type: '待确认' }
    await upsert('mistakes', mistake)
    const task: StudyTask = { ...baseRecord(userId), legacy_id: `review-task:${mistake.id}:${localDate()}`, plan_id: null, subject_id: englishSubject.id, syllabus_node_id: null, title: `复习：${ref}`, task_date: localDate(), period: '晚上', estimate_minutes: 25, actual_minutes: 0, status: 'todo', sort_order: active(data.tasks).length, completed_at: null, source: 'review' }
    await upsert('tasks', task)
    setSaved(true)
  }

  return <div className="english-lab stack">
    <section className="english-hero panel"><div><Chip size="sm" variant="flat" color="primary">考研英语专项</Chip><h2>从真题证据到错题复习</h2><p>按年份和题号定位，将解析、批改和后续复习收进同一条链路。</p></div><BookOpen size={34}/></section>
    {!ECHO_SOURCE.licensedContent && <div className="license-gate"><ShieldAlert size={18}/><span><strong>发布内容门禁已开启</strong><small>Echo 语料未确认再分发授权，默认构建不打包原文。可在本机选择语料目录进行开发与个人学习。</small></span></div>}
    <section className="english-workbench panel"><div className="english-config"><label>考试类型<select value={exam} onChange={(e) => { setExam(e.target.value as EnglishExam); setSaved(false) }}><option value="english-i">英语一</option><option value="english-ii">英语二</option></select></label><label>年份<select value={year} onChange={(e) => { setYear(Number(e.target.value)); setSaved(false) }}>{ECHO_SOURCE.years.map(item => <option key={item}>{item}</option>)}</select></label><label>题型<select value={section} onChange={(e) => { setSection(e.target.value as EnglishSection); setSaved(false) }}>{Object.entries(sectionLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>{section === 'reading' && <label>篇目<select value={text} onChange={(e) => setText(Number(e.target.value))}>{[1,2,3,4].map(item => <option key={item}>{item}</option>)}</select></label>}{['reading','cloze','new-question-type'].includes(section) && <label>题号<input type="number" value={question} onChange={(e) => setQuestion(Number(e.target.value))}/></label>}<label className="full">我的作答 / 文本<textarea rows={5} value={answer} onChange={(e) => { setAnswer(e.target.value); setSaved(false) }} placeholder="粘贴选项、翻译或作文……"/></label><div className="button-row full"><button className="secondary-btn" disabled={!answer.trim() || saved} onClick={saveSuggestion}>{saved ? <><Check size={15}/>已进入复习队列</> : '确认加入错题库'}</button><button className="primary-btn" onClick={askAi}><MessageSquareText size={16}/>按专项规则解析</button></div></div></section>
    <section className="panel local-corpus"><div className="section-head"><div><h2>本地真题库</h2><p>选择 Echo `references` 目录，内容只在当前浏览器会话中读取。</p></div><label className="secondary-btn file-picker"><FolderOpen size={16}/>选择语料目录<input type="file" multiple {...({ webkitdirectory: '' } as Record<string,string>)} onChange={importFolder}/></label></div>{docs.length ? <><div className="corpus-search"><FileSearch size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索年份、题型、原文或答案……"/></div><div className="corpus-results">{results.map(doc => <article key={doc.path}><strong>{doc.path.split('/').slice(-3).join(' / ')}</strong><p>{doc.text.replace(/[#*`>|\[\]]/g,' ').slice(0,220)}</p></article>)}</div></> : <Empty title="尚未载入本地语料" body="不会将未授权内容打包到公开版本。"/>}</section>
  </div>
}
