import type { ReviewRecord } from '../types'

export type ReviewGrade = ReviewRecord['grade']

const addDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() + days)
  return new Intl.DateTimeFormat('en-CA').format(date)
}

export function nextReviewDate(today: string, grade: ReviewGrade, previous: ReviewRecord[]) {
  if (grade === 'again') return addDays(today, 1)
  if (grade === 'hard') return addDays(today, 3)
  const consecutiveGood = [...previous]
    .sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at))
    .findIndex((item) => item.grade !== 'good')
  const existingRun = consecutiveGood === -1 ? previous.filter((item) => item.grade === 'good').length : consecutiveGood
  return addDays(today, [7, 14, 30][Math.min(existingRun, 2)])
}

export function shouldMaster(grade: ReviewGrade, previous: ReviewRecord[]) {
  if (grade !== 'good') return false
  const recent = [...previous].sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at))
  return recent.slice(0, 2).every((item) => item.grade === 'good') && recent.length >= 2
}
