import type { BaseRecord, Plan, StudyTask, Subject, SyllabusNode } from '../types'
import { id, nowIso } from './defaults'
export const baseRecord=(userId:string):BaseRecord=>{const now=nowIso();return{id:id(),user_id:userId,created_at:now,updated_at:now,deleted_at:null}}
export const active = <T extends BaseRecord>(rows?: T[] | null): T[] =>
  (Array.isArray(rows) ? rows : []).filter((row): row is T => Boolean(row && !row.deleted_at))
export const subjectFor = (subjects?: Subject[] | null, id?: string | null) =>
  (Array.isArray(subjects) ? subjects : []).find((subject) => subject && subject.id === id)
export const taskProgress=(tasks:StudyTask[])=>tasks.length?Math.round(tasks.filter((task)=>task.status==='done').length/tasks.length*100):0
export const planProgress=(plan:Plan,plans:Plan[],tasks:StudyTask[])=>{const childIds=new Set(plans.filter((item)=>item.parent_plan_id===plan.id).map((item)=>item.id));const linked=tasks.filter((task)=>task.plan_id===plan.id||childIds.has(task.plan_id??''));return taskProgress(linked)}
export const subjectProgress=(subjectId:string,nodes:SyllabusNode[])=>{const own=nodes.filter((node)=>node.subject_id===subjectId);const parents=new Set(own.map((node)=>node.parent_id).filter(Boolean));const leaves=own.filter((node)=>!parents.has(node.id));return leaves.length?Math.round(leaves.filter((node)=>node.status==='done').length/leaves.length*100):0}
export const fmtMinutes=(minutes:number)=>minutes>=60?`${Math.floor(minutes/60)}h ${minutes%60?`${minutes%60}m`:''}`:`${minutes}m`
export const daysUntil=(iso:string)=>Math.max(0,Math.ceil((new Date(`${iso}T00:00:00+08:00`).getTime()-Date.now())/86400000))
