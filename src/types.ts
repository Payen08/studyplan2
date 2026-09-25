export type Id = string
export type IsoDate = string
export type RecordStatus = 'active' | 'archived'
export type TaskStatus = 'todo' | 'doing' | 'done'
export type SyllabusStatus = 'todo' | 'doing' | 'done'
export type PeriodType = 'month' | 'week'
export type ResourceKind = 'course' | 'pdf' | 'question_bank' | 'link'
export type TaskSource = 'manual' | 'ai' | 'plan' | 'review'

export interface BaseRecord { id: Id; user_id: Id; created_at: string; updated_at: string; deleted_at: string | null; legacy_id?: string | null }
export interface Profile extends BaseRecord { display_name: string; timezone: string }
export interface UserSettings extends BaseRecord { exam_name: string; exam_date: IsoDate; theme: 'light' | 'dark'; ai_settings?: Record<string, unknown> }
export interface Subject extends BaseRecord { name: string; color: string; sort_order: number; status: RecordStatus }
export interface SyllabusNode extends BaseRecord { subject_id: Id; parent_id: Id | null; title: string; kind: 'chapter' | 'topic'; status: SyllabusStatus; sort_order: number }
export interface Plan extends BaseRecord { parent_plan_id: Id | null; title: string; period_type: PeriodType; start_date: IsoDate; end_date: IsoDate; target: string }
export interface StudyTask extends BaseRecord { plan_id: Id | null; subject_id: Id | null; syllabus_node_id: Id | null; title: string; task_date: IsoDate; period: '全天' | '上午' | '下午' | '晚上'; estimate_minutes: number; actual_minutes: number; status: TaskStatus; sort_order: number; completed_at: string | null; source?: TaskSource; completion_summary?: string; confidence?: 1 | 2 | 3 | 4 | 5 | null; unresolved_issues?: string }
export interface StudySession extends BaseRecord { task_id: Id | null; subject_id: Id | null; started_at: string; ended_at: string; minutes: number; source: 'timer' | 'manual' | 'legacy' }
export interface NotebookFolder extends BaseRecord { subject_id: Id | null; name: string; sort_order: number }
export interface Note extends BaseRecord { folder_id: Id | null; subject_id: Id | null; title: string; html: string; plain_text: string; pinned: boolean; source: 'web' | 'obsidian' | 'legacy' | 'daily_note' | 'novaforge'; linked_dates: IsoDate[]; conflict_of: Id | null }
export interface Paper extends BaseRecord { subject_id: Id; year: number; title: string; total_score: number }
export interface PaperAttempt extends BaseRecord { paper_id: Id; attempt_no: number; status: 'planned' | 'done'; score: number | null; duration_minutes: number | null; completed_date: IsoDate | null }
export interface KnowledgePoint extends BaseRecord { subject_id: Id; title: string }
export interface Mistake extends BaseRecord { subject_id: Id; knowledge_point_id: Id | null; source_type: 'paper' | 'mock' | 'manual'; source_id: Id | null; question_ref: string; error_reason: string; weakness: 1 | 2 | 3 | 4 | 5; next_review_date: IsoDate | null; mastered: boolean; user_answer?: string; correct_answer?: string; evidence?: string; trap_type?: string }
export interface ReviewRecord extends BaseRecord { mistake_id: Id; grade: 'again' | 'hard' | 'good'; reviewed_at: string; comment: string }
export interface MockExam extends BaseRecord { title: string; exam_date: IsoDate; total_score: number; target_score: number; rank: number | null }
export interface MockScore extends BaseRecord { mock_exam_id: Id; subject_id: Id; score: number; total_score: number }
export interface Resource extends BaseRecord { subject_id: Id | null; title: string; kind: ResourceKind; url: string; storage_path: string | null; status: RecordStatus }
export interface EntityLink extends BaseRecord { source_type: EntityKind; source_id: Id; target_type: EntityKind; target_id: Id }
export interface AppData { profiles: Profile[]; user_settings: UserSettings[]; subjects: Subject[]; syllabus_nodes: SyllabusNode[]; plans: Plan[]; tasks: StudyTask[]; study_sessions: StudySession[]; notebook_folders: NotebookFolder[]; notes: Note[]; papers: Paper[]; paper_attempts: PaperAttempt[]; knowledge_points: KnowledgePoint[]; mistakes: Mistake[]; review_records: ReviewRecord[]; mock_exams: MockExam[]; mock_scores: MockScore[]; resources: Resource[]; entity_links: EntityLink[] }
export type EntityKind = keyof AppData
export type AppEntity = AppData[EntityKind][number]
export interface MigrationReport { subjects: number; tasks: number; folders: number; notes: number; sessions: number; skipped: number }
