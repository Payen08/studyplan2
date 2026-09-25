import { describe, expect, it } from 'vitest'
import { BUNDLED_337_PAPERS, loadParsed337Paper } from './bundled337Papers'
import { createDefaultData } from './defaults'
import { ENGLISH_PAPERS_DATA } from './englishPapersData'

describe('bundled 337 papers', () => {
  it('splits the two source collections into 19 independent papers', () => {
    expect(BUNDLED_337_PAPERS).toHaveLength(19)
    expect(BUNDLED_337_PAPERS.filter((paper) => paper.collection === 'practice')).toHaveLength(10)
    expect(BUNDLED_337_PAPERS.filter((paper) => paper.collection === 'mock')).toHaveLength(9)
  })

  it('parses every paper into interactive question sections', async () => {
    for (const paper of BUNDLED_337_PAPERS) {
      const parsed = await loadParsed337Paper(paper)
      expect(parsed.choices, paper.title).toHaveLength(paper.collection === 'practice' ? 10 : 15)
      expect(parsed.choices.every((question) => Boolean(question.answer)), paper.title).toBe(true)
      expect(parsed.terms, paper.title).toHaveLength(6)
      expect(parsed.shortAnswers, paper.title).toHaveLength(5)
      expect(parsed.essays, paper.title).toHaveLength(2)
    }
  })

  it('keeps bundled English and 337 papers in their own subject tabs', () => {
    const data = createDefaultData()
    const englishSubject = data.subjects.find((subject) => subject.name === '英语')
    const gdut337Subject = data.subjects.find((subject) => subject.name === '337')
    const englishKeys = new Set(ENGLISH_PAPERS_DATA.map((paper) => paper.id))
    const gdut337Keys = new Set(BUNDLED_337_PAPERS.map((paper) => paper.id))

    expect(englishSubject).toBeDefined()
    expect(gdut337Subject).toBeDefined()
    expect(data.papers.filter((paper) => englishKeys.has(paper.id))).toHaveLength(34)
    expect(data.papers.filter((paper) => gdut337Keys.has(paper.id))).toHaveLength(19)
    expect(data.papers.filter((paper) => englishKeys.has(paper.id)).every((paper) => paper.subject_id === englishSubject?.id)).toBe(true)
    expect(data.papers.filter((paper) => gdut337Keys.has(paper.id)).every((paper) => paper.subject_id === gdut337Subject?.id)).toBe(true)
  })
})
