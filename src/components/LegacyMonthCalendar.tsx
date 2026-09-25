import { useMemo, useRef } from 'react'
import type { CSSProperties, MouseEvent, TouchEvent } from 'react'
import { Check } from 'lucide-react'
import type { Note, StudyTask, Subject } from '../types'
import { localDate } from '../data/defaults'

type LegacyMonthCalendarProps = {
  cursor: Date
  tasks: StudyTask[]
  notes: Note[]
  subjects: Subject[]
  onCursorChange: (date: Date) => void
  onToggle: (task: StudyTask) => void
  onAdd: (date: string) => void
  onEdit: (task: StudyTask) => void
  onNote: (date: string) => void
  onOpenDay: (date: string) => void
}

const HOLIDAYS_2026: Record<string, string> = {
  '1-1': '元旦', '1-2': '假期', '1-3': '假期',
  '2-15': '假期', '2-16': '除夕', '2-17': '春节', '2-18': '初二', '2-19': '初三',
  '2-20': '初四', '2-21': '初五', '2-22': '初六', '2-23': '初七',
  '4-5': '清明',
  '5-1': '劳动节', '5-2': '假期', '5-3': '假期', '5-4': '假期', '5-5': '假期',
  '6-19': '端午', '6-20': '假期', '6-21': '假期',
  '9-25': '中秋', '9-26': '假期', '9-27': '假期',
  '10-1': '国庆', '10-2': '假期', '10-3': '假期', '10-4': '假期',
  '10-5': '假期', '10-6': '假期', '10-7': '假期',
  '12-19': '考研 Day 1', '12-20': '考研 Day 2',
}

const MONTHS = Array.from({ length: 12 }, (_, index) => index)
const YEARS = [2025, 2026]
const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const dateKey = (date: Date) => new Intl.DateTimeFormat('en-CA').format(date)

const CalendarAddIcon = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22ZM12 8.25C12.4142 8.25 12.75 8.58579 12.75 9V11.25H15C15.4142 11.25 15.75 11.5858 15.75 12C15.75 12.4142 15.4142 12.75 15 12.75H12.75V15C12.75 15.4142 12.4142 15.75 12 15.75C11.5858 15.75 11.25 15.4142 11.25 15V12.75H9C8.58579 12.75 8.25 12.4142 8.25 12C8.25 11.5858 8.58579 11.25 9 11.25H11.25V9C11.25 8.58579 11.5858 8.25 12 8.25Z" fill="currentColor"/></svg>

const CalendarNoteIcon = () => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16.5189 16.5013C16.6939 16.3648 16.8526 16.2061 17.1701 15.8886L21.1275 11.9312C21.2231 11.8356 21.1793 11.6708 21.0515 11.6264C20.5844 11.4644 19.9767 11.1601 19.4083 10.5917C18.8399 10.0233 18.5356 9.41561 18.3736 8.94849C18.3292 8.82066 18.1644 8.77687 18.0688 8.87254L14.1114 12.8299C13.7939 13.1474 13.6352 13.3061 13.4987 13.4811C13.3377 13.6876 13.1996 13.9109 13.087 14.1473C12.9915 14.3476 12.9205 14.5606 12.7786 14.9865L12.0299 17.2323C11.9601 17.4419 12.0146 17.6729 12.1708 17.8292C12.3271 17.9854 12.5581 18.0399 12.7677 17.9701L15.0135 17.2214C15.4394 17.0795 15.6524 17.0085 15.8527 16.913C16.0891 16.8004 16.3124 16.6623 16.5189 16.5013Z" fill="currentColor"/><path d="M22.3665 10.6922C23.2112 9.84754 23.2112 8.47812 22.3665 7.63348C21.5219 6.78884 20.1525 6.78884 19.3078 7.63348L19.1806 7.76071C19.0578 7.88348 19.0022 8.05496 19.0329 8.22586C19.0522 8.33336 19.0879 8.49053 19.153 8.67807C19.2831 9.05314 19.5288 9.54549 19.9917 10.0083C20.4545 10.4712 20.9469 10.7169 21.3219 10.847C21.5095 10.9121 21.6666 10.9478 21.7741 10.9671C21.945 10.9978 22.1165 10.9422 22.2393 10.8194L22.3665 10.6922Z" fill="currentColor"/><path fillRule="evenodd" clipRule="evenodd" d="M4.17157 3.17157C3 4.34315 3 6.22876 3 10V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C20.9812 19.6756 20.9997 17.8316 21 14.1801L18.1817 16.9984C17.9119 17.2683 17.691 17.4894 17.4415 17.6841C17.1491 17.9121 16.8328 18.1076 16.4981 18.2671C16.2124 18.4032 15.9159 18.502 15.5538 18.6225L13.2421 19.3931C12.4935 19.6426 11.6682 19.4478 11.1102 18.8898C10.5523 18.3318 10.3574 17.5065 10.607 16.7579L11.3775 14.4463C11.4981 14.0842 11.5968 13.7876 11.7329 13.5019C11.8924 13.1672 12.0879 12.8509 12.316 12.5586C12.5106 12.309 12.7317 12.0881 13.0017 11.8183L18.2472 6.57282C18.9626 5.85741 19.9003 5.49981 20.838 5.5C20.6867 4.46945 20.3941 3.73727 19.8284 3.17157C18.6569 2 16.7712 2 13 2H11C7.22876 2 5.34315 2 4.17157 3.17157ZM7.25 9C7.25 8.58579 7.58579 8.25 8 8.25H14.5C14.9142 8.25 15.25 8.58579 15.25 9C15.25 9.41421 14.9142 9.75 14.5 9.75H8C7.58579 9.75 7.25 9.41421 7.25 9ZM7.25 13C7.25 12.5858 7.58579 12.25 8 12.25H10.5C10.9142 12.25 11.25 12.5858 11.25 13C11.25 13.4142 10.9142 13.75 10.5 13.75H8C7.58579 13.75 7.25 13.4142 7.25 13ZM7.25 17C7.25 16.5858 7.58579 16.25 8 16.25H9.5C9.91421 16.25 10.25 16.5858 10.25 17C10.25 17.4142 9.91421 17.75 9.5 17.75H8C7.58579 17.75 7.25 17.4142 7.25 17Z" fill="currentColor"/></svg>

export function LegacyMonthCalendar({ cursor, tasks, notes, subjects, onCursorChange, onToggle, onAdd, onEdit, onNote, onOpenDay }: LegacyMonthCalendarProps) {
  const lastTap = useRef<Record<string, number>>({})
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const cells = useMemo(() => {
    const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7
    const dates = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => {
      const date = new Date(year, month, index + 1)
      return { date: dateKey(date), day: index + 1, holiday: year === 2026 ? HOLIDAYS_2026[`${month + 1}-${index + 1}`] : undefined }
    })
    return [...Array(firstOffset).fill(null), ...dates]
  }, [month, year])

  const tasksByDate = useMemo(() => {
    const result = new Map<string, StudyTask[]>()
    tasks.forEach((task) => {
      const group = result.get(task.task_date) || []
      group.push(task)
      result.set(task.task_date, group)
    })
    result.forEach((group) => group.sort((a, b) => a.sort_order - b.sort_order))
    return result
  }, [tasks])

  const noteDates = useMemo(() => new Set(notes.flatMap((note) => note.linked_dates || [])), [notes])
  const subjectMap = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects])
  const isInteractive = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('button'))
  const addFromBlank = (event: MouseEvent<HTMLElement>, date: string) => { if (!isInteractive(event.target)) onAdd(date) }
  const addFromDoubleTap = (event: TouchEvent<HTMLElement>, date: string) => {
    if (isInteractive(event.target)) return
    const now = Date.now()
    if (now - (lastTap.current[date] || 0) < 400) { event.preventDefault(); onAdd(date); lastTap.current[date] = 0 }
    else lastTap.current[date] = now
  }

  return (
    <section className="legacy-calendar-shell" aria-label={`${year}年${month + 1}月学习日历`}>
      <div className="legacy-calendar-toolbar">
        <div className="legacy-year-strip" aria-label="选择年份">
          {YEARS.map((value) => <button key={value} className={value === year ? 'active' : ''} onClick={() => onCursorChange(new Date(value, value === 2025 ? 11 : month, 1))}>{value}</button>)}
          <span aria-hidden="true"/>
        </div>
        <div className="legacy-month-strip" aria-label="选择月份">
          {year === 2025
            ? <button className="active" onClick={() => onCursorChange(new Date(2025, 11, 1))}>冲刺月</button>
            : MONTHS.map((value) => <button key={value} className={value === month ? 'active' : ''} onClick={() => onCursorChange(new Date(year, value, 1))}>{value + 1}月</button>)}
        </div>
      </div>

      <div className="legacy-weekdays" aria-hidden="true">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="legacy-calendar-grid">
        {cells.map((cell, index) => {
          if (!cell) return <i className="legacy-calendar-blank" key={`blank-${index}`}/>
          const dayTasks = tasksByDate.get(cell.date) || []
          const hasNote = noteDates.has(cell.date)
          const isToday = cell.date === localDate()
          return (
            <article
              key={cell.date}
              className={`legacy-day-card${isToday ? ' is-today' : ''}${hasNote ? ' has-note' : ''}${cell.holiday ? ' has-holiday' : ''}`}
              onDoubleClick={(event) => addFromBlank(event, cell.date)}
              onTouchEnd={(event) => addFromDoubleTap(event, cell.date)}
              aria-label={`${cell.date}${dayTasks.length ? `，${dayTasks.length}项任务` : '，暂无任务'}`}
            >
              <header className="legacy-day-head">
                <button className="legacy-day-number" onClick={() => onOpenDay(cell.date)} aria-label={`查看${cell.date}安排`}>{cell.day}</button>
                {cell.holiday && <span className="legacy-holiday">{cell.holiday}</span>}
                <div className="legacy-day-actions">
                  <button onClick={() => onAdd(cell.date)} aria-label={`${cell.date}添加任务`} title="添加任务"><CalendarAddIcon/></button>
                  <button className={hasNote ? 'active' : ''} onClick={() => onNote(cell.date)} aria-label={`${cell.date}随手记`} title="随手记"><CalendarNoteIcon/></button>
                </div>
              </header>
              <div className="legacy-task-list">
                {dayTasks.map((task) => {
                  const subject = task.subject_id ? subjectMap.get(task.subject_id) : undefined
                  const color = subject?.color || '#64748b'
                  return (
                    <div key={task.id} className={`legacy-task-item${task.status === 'done' ? ' is-done' : ''}`} style={{ '--task-color': color } as CSSProperties}>
                      <button className="legacy-task-check" onClick={() => onToggle(task)} aria-label={task.status === 'done' ? `取消完成${task.title}` : `完成${task.title}`}>
                        <span>{task.status === 'done' && <Check size={13}/>}</span>
                      </button>
                      <button className="legacy-task-content" onClick={() => onEdit(task)}>
                        <strong>{task.title}</strong>
                      </button>
                    </div>
                  )
                })}
              </div>
              {!dayTasks.length && <div className="legacy-empty-day" aria-hidden="true">双击空白处添加任务</div>}
            </article>
          )
        })}
      </div>
    </section>
  )
}
