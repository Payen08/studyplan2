import { describe, expect, it } from 'vitest'
import { nextReviewDate, shouldMaster } from './review'
import type { ReviewRecord } from '../types'

const records = (grades: ReviewRecord['grade'][]): ReviewRecord[] => grades.map((grade, index) => ({
  id: `review-${index}`,
  user_id: 'user',
  mistake_id: 'mistake',
  grade,
  reviewed_at: `2026-09-${String(14 - index).padStart(2, '0')}T08:00:00.000Z`,
  comment: '',
  created_at: '2026-09-15T08:00:00.000Z',
  updated_at: '2026-09-15T08:00:00.000Z',
  deleted_at: null,
}))

describe('graded review schedule', () => {
  it('schedules Again, Hard and Good at the expected intervals', () => {
    expect(nextReviewDate('2026-09-15', 'again', records([]))).toBe('2026-09-16')
    expect(nextReviewDate('2026-09-15', 'hard', records([]))).toBe('2026-09-18')
    expect(nextReviewDate('2026-09-15', 'good', records([]))).toBe('2026-09-22')
    expect(nextReviewDate('2026-09-15', 'good', records(['good']))).toBe('2026-09-29')
    expect(nextReviewDate('2026-09-15', 'good', records(['good', 'good']))).toBe('2026-10-15')
  })

  it('marks a mistake mastered only after three consecutive Good reviews', () => {
    expect(shouldMaster('good', records(['good']))).toBe(false)
    expect(shouldMaster('good', records(['good', 'good']))).toBe(true)
    expect(shouldMaster('good', records(['again', 'good', 'good']))).toBe(false)
  })
})
