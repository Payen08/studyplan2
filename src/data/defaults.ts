import type { AppData, Paper, Subject, UserSettings } from '../types'
import { ENGLISH_PAPERS_DATA } from './englishPapersData'
import { BUNDLED_337_PAPERS } from './bundled337Papers'
export const LOCAL_USER_ID = 'local-user'
export const nowIso = () => new Date().toISOString()
export const id = () => crypto.randomUUID()
export const localDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const createSubject = (name: string, color: string, sort_order: number): Subject => { const timestamp = nowIso(); return { id: id(), user_id: LOCAL_USER_ID, created_at: timestamp, updated_at: timestamp, deleted_at: null, name, color, sort_order, status: 'active' } }
export const createDefaultData = (): AppData => {
  const timestamp = nowIso(); const subjects = [createSubject('英语', '#006fee', 0), createSubject('政治', '#7828c8', 1), createSubject('数学', '#17c964', 2), createSubject('专业课', '#f5a524', 3), createSubject('337', '#f97316', 4)]; const folderId = id()
  const settings: UserSettings = { id: id(), user_id: LOCAL_USER_ID, created_at: timestamp, updated_at: timestamp, deleted_at: null, exam_name: '距离考试', exam_date: '2026-12-19', theme: 'light' }
  const defaultPapers: Paper[] = ENGLISH_PAPERS_DATA.map((p) => ({
    id: p.id,
    legacy_id: p.legacy_id,
    user_id: LOCAL_USER_ID,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
    subject_id: subjects[0].id,
    year: p.year,
    title: p.title,
    total_score: p.total_score,
  }))
  const gdut337Subject = subjects.find((subject) => subject.name === '337')!
  defaultPapers.push(...BUNDLED_337_PAPERS.map((paper) => ({
    id: paper.id,
    legacy_id: paper.legacy_id,
    user_id: LOCAL_USER_ID,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
    subject_id: gdut337Subject.id,
    year: paper.year,
    title: paper.title,
    total_score: paper.total_score,
  })))
  return { profiles: [], user_settings: [settings], subjects, syllabus_nodes: [], plans: [], tasks: [], study_sessions: [], notebook_folders: [{ id: folderId, user_id: LOCAL_USER_ID, created_at: timestamp, updated_at: timestamp, deleted_at: null, subject_id: subjects[0].id, name: '默认笔记', sort_order: 0 }], notes: [], papers: defaultPapers, paper_attempts: [], knowledge_points: [], mistakes: [], review_records: [], mock_exams: [], mock_scores: [], resources: [], entity_links: [] }
}
