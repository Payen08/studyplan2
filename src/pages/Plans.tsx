import { useState } from 'react'
import { CalendarDays, Check, FileText, ListTodo, Pencil, Plus, Trash2 } from 'lucide-react'
import { useData } from '../data/DataContext'
import { active, baseRecord, subjectFor } from '../data/helpers'
import { localDate } from '../data/defaults'
import type { StudyTask } from '../types'
import { Empty, Modal } from '../components/ui'
import { DailyNoteModal } from '../components/DailyNoteModal'
import { LegacyMonthCalendar } from '../components/LegacyMonthCalendar'

export function Plans() {
  const { data, userId, upsert, remove } = useData()
  const [view, setView] = useState<'month' | 'week' | 'today'>('month')
  const [cursor, setCursor] = useState(new Date())
  const [taskModal, setTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dailyNoteDate, setDailyNoteDate] = useState<string | null>(null)
  const subjects = active(data.subjects).filter((s) => s.status === 'active')
  const nodes = active(data.syllabus_nodes)
  const tasks = active(data.tasks)
  const notes = active(data.notes)

  const saveTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const existing = editingTask
    const task: StudyTask = {
      ...(existing || baseRecord(userId)),
      title: String(form.get('title')).trim(),
      task_date: String(form.get('date')),
      period: String(form.get('period')) as StudyTask['period'],
      subject_id: String(form.get('subject')) || null,
      plan_id: existing?.plan_id || null,
      syllabus_node_id: String(form.get('node')) || null,
      estimate_minutes: Number(form.get('minutes')) || 0,
      actual_minutes: existing?.actual_minutes || 0,
      status: existing?.status || 'todo',
      sort_order: existing?.sort_order ?? tasks.length,
      completed_at: existing?.completed_at || null,
      source: existing?.source || 'manual',
    }
    await upsert('tasks', task)
    setTaskModal(false)
    setEditingTask(null)
    setSelectedDay(null)
  }

  const toggle = (task: StudyTask) =>
    upsert('tasks', {
      ...task,
      status: task.status === 'done' ? 'todo' : 'done',
      completed_at: task.status === 'done' ? null : new Date().toISOString(),
    })

  const openTask = (date = localDate(), task?: StudyTask) => {
    setEditingTask(task || null)
    setSelectedDay(date)
    setTaskModal(true)
  }

  const dayTasks = (date: string) =>
    tasks.filter((task) => task.task_date === date).sort((a, b) => a.sort_order - b.sort_order)

  const taskList = (rows: StudyTask[]) =>
    rows.length ? (
      <div className="compact-tasks">
        {rows.map((task) => (
          <div className="linked-task-row" key={task.id}>
            <button className={task.status === 'done' ? 'done' : ''} onClick={() => toggle(task)}>
              <span className="mini-check">{task.status === 'done' && <Check />}</span>
              <span>
                <small>
                  {subjectFor(subjects, task.subject_id)?.name || '未分类'} · {task.period}
                </small>
                <strong>{task.title}</strong>
              </span>
            </button>
            <button
              className="icon-btn"
              onClick={() => openTask(task.task_date, task)}
              aria-label="编辑任务"
            >
              <Pencil size={14} />
            </button>
          </div>
        ))}
      </div>
    ) : (
      <Empty title="暂无任务" />
    )

  return (
    <div className="plans-page stack">
      <div className="toolbar">
        <div className="segmented">
          {(
            [
              ['month', '月历', CalendarDays],
              ['week', '本周', ListTodo],
              ['today', '今日', CalendarDays],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              className={view === key ? 'active' : ''}
              onClick={() => setView(key)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <button className="primary-btn" onClick={() => openTask()}>
          <Plus size={16} />
          新任务
        </button>
      </div>

      {view === 'month' && (
        <LegacyMonthCalendar
          cursor={cursor}
          tasks={tasks}
          notes={notes}
          subjects={subjects}
          onCursorChange={setCursor}
          onToggle={toggle}
          onAdd={(date) => openTask(date)}
          onEdit={(task) => openTask(task.task_date, task)}
          onNote={setDailyNoteDate}
          onOpenDay={setSelectedDay}
        />
      )}

      {view === 'week' && (
        <section className="panel">
          <div className="section-head">
            <h2>本周任务</h2>
          </div>
          {taskList(
            tasks.filter((task) => {
              const d = new Date(`${task.task_date}T00:00:00`)
              const start = new Date()
              start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
              start.setHours(0, 0, 0, 0)
              const end = new Date(start)
              end.setDate(end.getDate() + 7)
              return d >= start && d < end
            })
          )}
        </section>
      )}

      {view === 'today' && (
        <section className="panel">
          <div className="section-head">
            <h2>{localDate()}</h2>
            <button className="secondary-btn" onClick={() => setDailyNoteDate(localDate())}>
              <FileText size={14} />
              今日随手记
            </button>
          </div>
          {taskList(dayTasks(localDate()))}
        </section>
      )}

      {selectedDay && !taskModal && (
        <Modal title={`${selectedDay} · 当日安排`} onClose={() => setSelectedDay(null)}>
          <div className="stack">
            {taskList(dayTasks(selectedDay))}
            <div className="button-row">
              <button className="secondary-btn" onClick={() => setDailyNoteDate(selectedDay)}>
                <FileText size={15} />
                随手记
              </button>
              <button className="primary-btn" onClick={() => openTask(selectedDay)}>
                <Plus size={15} />
                添加任务
              </button>
            </div>
          </div>
        </Modal>
      )}

      {taskModal && (
        <Modal
          title={editingTask ? '编辑任务' : '新增学习任务'}
          onClose={() => {
            setTaskModal(false)
            setEditingTask(null)
            setSelectedDay(null)
          }}
        >
          <form className="form-grid" onSubmit={saveTask}>
            <label className="full">
              任务内容
              <input name="title" required autoFocus defaultValue={editingTask?.title} />
            </label>
            <label>
              日期
              <input
                name="date"
                type="date"
                required
                defaultValue={editingTask?.task_date || selectedDay || localDate()}
              />
            </label>
            <label>
              时段
              <select name="period" defaultValue={editingTask?.period || '全天'}>
                {['全天', '上午', '下午', '晚上'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              科目
              <select name="subject" defaultValue={editingTask?.subject_id || ''}>
                <option value="">未分类</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              预计分钟
              <input
                name="minutes"
                type="number"
                min="0"
                defaultValue={editingTask?.estimate_minutes || 45}
              />
            </label>
            <label>
              大纲节点
              <select name="node" defaultValue={editingTask?.syllabus_node_id || ''}>
                <option value="">不关联</option>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {subjectFor(subjects, n.subject_id)?.name} · {n.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="button-row full">
              {editingTask && (
                <button
                  type="button"
                  className="danger-btn"
                  onClick={async () => {
                    await remove('tasks', editingTask.id)
                    setTaskModal(false)
                    setEditingTask(null)
                  }}
                >
                  <Trash2 size={15} />
                  删除
                </button>
              )}
              <button className="primary-btn" type="submit">
                保存任务
              </button>
            </div>
          </form>
        </Modal>
      )}

      {dailyNoteDate && (
        <DailyNoteModal date={dailyNoteDate} onClose={() => setDailyNoteDate(null)} />
      )}
    </div>
  )
}
