export type EnglishExamType = 'english-i' | 'english-ii'

export interface EnglishPaperMeta {
  id: string
  legacy_id: string
  exam: EnglishExamType
  examLabel: '英语（一）' | '英语（二）'
  year: number
  title: string
  total_score: number
  answers: Record<number, string>
}

export interface QuestionMeta {
  id: number
  sectionKey: 'cloze' | 'reading-text-1' | 'reading-text-2' | 'reading-text-3' | 'reading-text-4' | 'new-question-type'
  sectionName: string
  score: number
  validOptions: string[]
}

export function getQuestionMeta(qNum: number, exam: EnglishExamType, year: number): QuestionMeta {
  if (qNum >= 1 && qNum <= 20) {
    return {
      id: qNum,
      sectionKey: 'cloze',
      sectionName: '完形填空 (Section I)',
      score: 0.5,
      validOptions: ['A', 'B', 'C', 'D'],
    }
  }
  if (qNum >= 21 && qNum <= 25) {
    return {
      id: qNum,
      sectionKey: 'reading-text-1',
      sectionName: '阅读理解 Text 1',
      score: 2,
      validOptions: ['A', 'B', 'C', 'D'],
    }
  }
  if (qNum >= 26 && qNum <= 30) {
    return {
      id: qNum,
      sectionKey: 'reading-text-2',
      sectionName: '阅读理解 Text 2',
      score: 2,
      validOptions: ['A', 'B', 'C', 'D'],
    }
  }
  if (qNum >= 31 && qNum <= 35) {
    return {
      id: qNum,
      sectionKey: 'reading-text-3',
      sectionName: '阅读理解 Text 3',
      score: 2,
      validOptions: ['A', 'B', 'C', 'D'],
    }
  }
  if (qNum >= 36 && qNum <= 40) {
    return {
      id: qNum,
      sectionKey: 'reading-text-4',
      sectionName: '阅读理解 Text 4',
      score: 2,
      validOptions: ['A', 'B', 'C', 'D'],
    }
  }
  // New question type 41-45
  const isTrueFalse = exam === 'english-ii' && year === 2010
  return {
    id: qNum,
    sectionKey: 'new-question-type',
    sectionName: '新题型 (Part B)',
    score: 2,
    validOptions: isTrueFalse ? ['T', 'F'] : ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  }
}

// 2010-2026 Objective Answers Database (34 sets total)
export const ENGLISH_PAPERS_DATA: EnglishPaperMeta[] = [
  // --- 2026 ---
  {
    id: 'paper-english-i-2026',
    legacy_id: 'english-i-2026',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2026,
    title: '2026 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'A', 2: 'D', 3: 'B', 4: 'C', 5: 'B', 6: 'C', 7: 'A', 8: 'D', 9: 'A', 10: 'D',
      11: 'D', 12: 'D', 13: 'C', 14: 'A', 15: 'B', 16: 'C', 17: 'C', 18: 'B', 19: 'B', 20: 'A',
      21: 'C', 22: 'D', 23: 'A', 24: 'B', 25: 'B',
      26: 'D', 27: 'A', 28: 'B', 29: 'C', 30: 'A',
      31: 'A', 32: 'A', 33: 'C', 34: 'B', 35: 'D',
      36: 'D', 37: 'C', 38: 'B', 39: 'D', 40: 'C',
      41: 'B', 42: 'E', 43: 'A', 44: 'G', 45: 'D'
    }
  },
  {
    id: 'paper-english-ii-2026',
    legacy_id: 'english-ii-2026',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2026,
    title: '2026 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'C', 2: 'B', 3: 'A', 4: 'C', 5: 'A', 6: 'D', 7: 'B', 8: 'D', 9: 'C', 10: 'A',
      11: 'B', 12: 'D', 13: 'A', 14: 'D', 15: 'C', 16: 'A', 17: 'D', 18: 'B', 19: 'C', 20: 'B',
      21: 'D', 22: 'C', 23: 'A', 24: 'A', 25: 'C',
      26: 'B', 27: 'A', 28: 'C', 29: 'D', 30: 'A',
      31: 'B', 32: 'A', 33: 'C', 34: 'D', 35: 'B',
      36: 'D', 37: 'C', 38: 'C', 39: 'B', 40: 'B',
      41: 'E', 42: 'A', 43: 'G', 44: 'C', 45: 'D'
    }
  },

  // --- 2025 ---
  {
    id: 'paper-english-i-2025',
    legacy_id: 'english-i-2025',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2025,
    title: '2025 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'B', 2: 'C', 3: 'B', 4: 'C', 5: 'B', 6: 'A', 7: 'D', 8: 'A', 9: 'A', 10: 'D',
      11: 'D', 12: 'A', 13: 'D', 14: 'C', 15: 'D', 16: 'C', 17: 'B', 18: 'B', 19: 'B', 20: 'A',
      21: 'C', 22: 'A', 23: 'A', 24: 'B', 25: 'A',
      26: 'B', 27: 'D', 28: 'C', 29: 'A', 30: 'C',
      31: 'D', 32: 'A', 33: 'A', 34: 'C', 35: 'D',
      36: 'C', 37: 'B', 38: 'B', 39: 'D', 40: 'D',
      41: 'D', 42: 'G', 43: 'B', 44: 'E', 45: 'F'
    }
  },
  {
    id: 'paper-english-ii-2025',
    legacy_id: 'english-ii-2025',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2025,
    title: '2025 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'D', 2: 'A', 3: 'C', 4: 'B', 5: 'D', 6: 'B', 7: 'A', 8: 'C', 9: 'D', 10: 'A',
      11: 'A', 12: 'B', 13: 'D', 14: 'D', 15: 'B', 16: 'A', 17: 'C', 18: 'C', 19: 'B', 20: 'C',
      21: 'B', 22: 'C', 23: 'A', 24: 'D', 25: 'A',
      26: 'B', 27: 'C', 28: 'C', 29: 'B', 30: 'C',
      31: 'A', 32: 'B', 33: 'A', 34: 'B', 35: 'D',
      36: 'C', 37: 'D', 38: 'A', 39: 'D', 40: 'D',
      41: 'F', 42: 'C', 43: 'G', 44: 'B', 45: 'A'
    }
  },

  // --- 2024 ---
  {
    id: 'paper-english-i-2024',
    legacy_id: 'english-i-2024',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2024,
    title: '2024 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'D', 2: 'C', 3: 'B', 4: 'A', 5: 'B', 6: 'C', 7: 'A', 8: 'D', 9: 'A', 10: 'D',
      11: 'A', 12: 'C', 13: 'C', 14: 'D', 15: 'C', 16: 'B', 17: 'D', 18: 'C', 19: 'B', 20: 'A',
      21: 'D', 22: 'D', 23: 'A', 24: 'B', 25: 'A',
      26: 'A', 27: 'B', 28: 'D', 29: 'C', 30: 'B',
      31: 'B', 32: 'C', 33: 'C', 34: 'D', 35: 'A',
      36: 'A', 37: 'B', 38: 'A', 39: 'D', 40: 'B',
      41: 'E', 42: 'C', 43: 'F', 44: 'G', 45: 'B'
    }
  },
  {
    id: 'paper-english-ii-2024',
    legacy_id: 'english-ii-2024',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2024,
    title: '2024 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'C', 2: 'B', 3: 'A', 4: 'D', 5: 'A', 6: 'C', 7: 'B', 8: 'B', 9: 'D', 10: 'A',
      11: 'D', 12: 'A', 13: 'B', 14: 'C', 15: 'C', 16: 'A', 17: 'C', 18: 'D', 19: 'B', 20: 'D',
      21: 'C', 22: 'C', 23: 'D', 24: 'A', 25: 'D',
      26: 'A', 27: 'A', 28: 'B', 29: 'D', 30: 'C',
      31: 'C', 32: 'D', 33: 'B', 34: 'B', 35: 'B',
      36: 'A', 37: 'A', 38: 'D', 39: 'B', 40: 'D',
      41: 'C', 42: 'E', 43: 'A', 44: 'G', 45: 'B'
    }
  },

  // --- 2023 ---
  {
    id: 'paper-english-i-2023',
    legacy_id: 'english-i-2023',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2023,
    title: '2023 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'C', 2: 'A', 3: 'D', 4: 'C', 5: 'C', 6: 'A', 7: 'B', 8: 'B', 9: 'A', 10: 'D',
      11: 'D', 12: 'C', 13: 'C', 14: 'B', 15: 'A', 16: 'B', 17: 'D', 18: 'A', 19: 'D', 20: 'A',
      21: 'C', 22: 'B', 23: 'A', 24: 'C', 25: 'D',
      26: 'A', 27: 'D', 28: 'B', 29: 'C', 30: 'D',
      31: 'A', 32: 'C', 33: 'B', 34: 'A', 35: 'D',
      36: 'B', 37: 'C', 38: 'A', 39: 'B', 40: 'D',
      41: 'B', 42: 'F', 43: 'D', 44: 'C', 45: 'G'
    }
  },
  {
    id: 'paper-english-ii-2023',
    legacy_id: 'english-ii-2023',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2023,
    title: '2023 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'B', 2: 'C', 3: 'A', 4: 'D', 5: 'D', 6: 'D', 7: 'A', 8: 'B', 9: 'B', 10: 'C',
      11: 'C', 12: 'D', 13: 'C', 14: 'A', 15: 'A', 16: 'B', 17: 'D', 18: 'B', 19: 'C', 20: 'A',
      21: 'A', 22: 'B', 23: 'B', 24: 'C', 25: 'D',
      26: 'D', 27: 'A', 28: 'C', 29: 'B', 30: 'D',
      31: 'C', 32: 'D', 33: 'A', 34: 'A', 35: 'B',
      36: 'A', 37: 'C', 38: 'D', 39: 'B', 40: 'A',
      41: 'D', 42: 'F', 43: 'B', 44: 'A', 45: 'G'
    }
  },

  // --- 2022 ---
  {
    id: 'paper-english-i-2022',
    legacy_id: 'english-i-2022',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2022,
    title: '2022 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'A', 2: 'C', 3: 'D', 4: 'C', 5: 'D', 6: 'B', 7: 'C', 8: 'B', 9: 'A', 10: 'D',
      11: 'C', 12: 'B', 13: 'A', 14: 'C', 15: 'B', 16: 'D', 17: 'A', 18: 'A', 19: 'D', 20: 'B',
      21: 'A', 22: 'C', 23: 'D', 24: 'D', 25: 'B',
      26: 'C', 27: 'B', 28: 'C', 29: 'D', 30: 'A',
      31: 'B', 32: 'A', 33: 'A', 34: 'B', 35: 'C',
      36: 'D', 37: 'A', 38: 'D', 39: 'B', 40: 'C',
      41: 'F', 42: 'C', 43: 'A', 44: 'D', 45: 'G'
    }
  },
  {
    id: 'paper-english-ii-2022',
    legacy_id: 'english-ii-2022',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2022,
    title: '2022 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'B', 2: 'B', 3: 'A', 4: 'D', 5: 'C', 6: 'A', 7: 'C', 8: 'C', 9: 'B', 10: 'B',
      11: 'C', 12: 'D', 13: 'B', 14: 'A', 15: 'A', 16: 'D', 17: 'A', 18: 'D', 19: 'C', 20: 'D',
      21: 'D', 22: 'C', 23: 'C', 24: 'B', 25: 'A',
      26: 'D', 27: 'A', 28: 'C', 29: 'D', 30: 'A',
      31: 'C', 32: 'D', 33: 'B', 34: 'B', 35: 'B',
      36: 'A', 37: 'B', 38: 'D', 39: 'C', 40: 'C',
      41: 'C', 42: 'E', 43: 'A', 44: 'F', 45: 'B'
    }
  },

  // --- 2021 ---
  {
    id: 'paper-english-i-2021',
    legacy_id: 'english-i-2021',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2021,
    title: '2021 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'B', 2: 'C', 3: 'D', 4: 'A', 5: 'D', 6: 'D', 7: 'B', 8: 'A', 9: 'D', 10: 'B',
      11: 'C', 12: 'A', 13: 'B', 14: 'C', 15: 'C', 16: 'A', 17: 'C', 18: 'D', 19: 'D', 20: 'B',
      21: 'D', 22: 'B', 23: 'C', 24: 'A', 25: 'A',
      26: 'C', 27: 'A', 28: 'D', 29: 'D', 30: 'B',
      31: 'B', 32: 'C', 33: 'A', 34: 'B', 35: 'C',
      36: 'A', 37: 'D', 38: 'D', 39: 'B', 40: 'C',
      41: 'E', 42: 'B', 43: 'G', 44: 'D', 45: 'F'
    }
  },
  {
    id: 'paper-english-ii-2021',
    legacy_id: 'english-ii-2021',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2021,
    title: '2021 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'B', 2: 'A', 3: 'D', 4: 'C', 5: 'A', 6: 'A', 7: 'B', 8: 'C', 9: 'D', 10: 'B',
      11: 'C', 12: 'B', 13: 'D', 14: 'B', 15: 'A', 16: 'C', 17: 'D', 18: 'C', 19: 'A', 20: 'D',
      21: 'C', 22: 'B', 23: 'A', 24: 'D', 25: 'C',
      26: 'B', 27: 'C', 28: 'C', 29: 'A', 30: 'B',
      31: 'D', 32: 'A', 33: 'B', 34: 'B', 35: 'D',
      36: 'A', 37: 'D', 38: 'D', 39: 'C', 40: 'A',
      41: 'E', 42: 'D', 43: 'F', 44: 'A', 45: 'B'
    }
  },

  // --- 2020 ---
  {
    id: 'paper-english-i-2020',
    legacy_id: 'english-i-2020',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2020,
    title: '2020 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'C', 2: 'A', 3: 'B', 4: 'D', 5: 'A', 6: 'B', 7: 'D', 8: 'A', 9: 'D', 10: 'C',
      11: 'C', 12: 'A', 13: 'B', 14: 'D', 15: 'C', 16: 'B', 17: 'A', 18: 'B', 19: 'C', 20: 'D',
      21: 'C', 22: 'B', 23: 'D', 24: 'B', 25: 'C',
      26: 'D', 27: 'A', 28: 'C', 29: 'A', 30: 'D',
      31: 'A', 32: 'C', 33: 'D', 34: 'C', 35: 'B',
      36: 'C', 37: 'A', 38: 'B', 39: 'C', 40: 'B',
      41: 'C', 42: 'E', 43: 'G', 44: 'A', 45: 'D'
    }
  },
  {
    id: 'paper-english-ii-2020',
    legacy_id: 'english-ii-2020',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2020,
    title: '2020 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'D', 2: 'B', 3: 'A', 4: 'C', 5: 'A', 6: 'B', 7: 'A', 8: 'C', 9: 'D', 10: 'C',
      11: 'A', 12: 'C', 13: 'D', 14: 'B', 15: 'D', 16: 'C', 17: 'D', 18: 'B', 19: 'A', 20: 'B',
      21: 'A', 22: 'D', 23: 'B', 24: 'C', 25: 'D',
      26: 'C', 27: 'D', 28: 'B', 29: 'D', 30: 'A',
      31: 'D', 32: 'D', 33: 'A', 34: 'D', 35: 'B',
      36: 'D', 37: 'C', 38: 'D', 39: 'B', 40: 'B',
      41: 'E', 42: 'F', 43: 'D', 44: 'A', 45: 'C'
    }
  },

  // --- 2019 ---
  {
    id: 'paper-english-i-2019',
    legacy_id: 'english-i-2019',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2019,
    title: '2019 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'C', 2: 'C', 3: 'B', 4: 'D', 5: 'A', 6: 'B', 7: 'D', 8: 'C', 9: 'A', 10: 'D',
      11: 'A', 12: 'B', 13: 'D', 14: 'C', 15: 'B', 16: 'D', 17: 'A', 18: 'A', 19: 'B', 20: 'C',
      21: 'A', 22: 'D', 23: 'B', 24: 'C', 25: 'B',
      26: 'D', 27: 'A', 28: 'A', 29: 'C', 30: 'B',
      31: 'C', 32: 'D', 33: 'B', 34: 'A', 35: 'C',
      36: 'C', 37: 'D', 38: 'C', 39: 'B', 40: 'A',
      41: 'E', 42: 'D', 43: 'G', 44: 'B', 45: 'A'
    }
  },
  {
    id: 'paper-english-ii-2019',
    legacy_id: 'english-ii-2019',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2019,
    title: '2019 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'D', 2: 'A', 3: 'B', 4: 'B', 5: 'D', 6: 'B', 7: 'A', 8: 'D', 9: 'C', 10: 'A',
      11: 'A', 12: 'D', 13: 'B', 14: 'A', 15: 'C', 16: 'D', 17: 'C', 18: 'A', 19: 'D', 20: 'A',
      21: 'C', 22: 'B', 23: 'D', 24: 'B', 25: 'D',
      26: 'D', 27: 'D', 28: 'B', 29: 'A', 30: 'C',
      31: 'C', 32: 'D', 33: 'B', 34: 'A', 35: 'B',
      36: 'B', 37: 'B', 38: 'D', 39: 'D', 40: 'C',
      41: 'A', 42: 'D', 43: 'C', 44: 'G', 45: 'F'
    }
  },

  // --- 2018 ---
  {
    id: 'paper-english-i-2018',
    legacy_id: 'english-i-2018',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2018,
    title: '2018 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'C', 2: 'A', 3: 'D', 4: 'B', 5: 'D', 6: 'B', 7: 'C', 8: 'D', 9: 'B', 10: 'A',
      11: 'B', 12: 'B', 13: 'A', 14: 'C', 15: 'D', 16: 'A', 17: 'C', 18: 'B', 19: 'A', 20: 'C',
      21: 'D', 22: 'C', 23: 'A', 24: 'D', 25: 'B',
      26: 'D', 27: 'A', 28: 'B', 29: 'C', 30: 'A',
      31: 'B', 32: 'C', 33: 'D', 34: 'D', 35: 'B',
      36: 'B', 37: 'A', 38: 'A', 39: 'C', 40: 'D',
      41: 'E', 42: 'G', 43: 'A', 44: 'B', 45: 'D'
    }
  },
  {
    id: 'paper-english-ii-2018',
    legacy_id: 'english-ii-2018',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2018,
    title: '2018 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'B', 2: 'D', 3: 'A', 4: 'D', 5: 'C', 6: 'D', 7: 'A', 8: 'B', 9: 'C', 10: 'A',
      11: 'D', 12: 'A', 13: 'C', 14: 'B', 15: 'B', 16: 'B', 17: 'C', 18: 'D', 19: 'B', 20: 'A',
      21: 'A', 22: 'C', 23: 'B', 24: 'D', 25: 'A',
      26: 'C', 27: 'A', 28: 'A', 29: 'C', 30: 'C',
      31: 'B', 32: 'C', 33: 'D', 34: 'A', 35: 'D',
      36: 'A', 37: 'D', 38: 'D', 39: 'B', 40: 'B',
      41: 'A', 42: 'F', 43: 'E', 44: 'B', 45: 'D'
    }
  },

  // --- 2017 ---
  {
    id: 'paper-english-i-2017',
    legacy_id: 'english-i-2017',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2017,
    title: '2017 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'B', 2: 'A', 3: 'D', 4: 'C', 5: 'B', 6: 'D', 7: 'B', 8: 'C', 9: 'A', 10: 'D',
      11: 'A', 12: 'B', 13: 'D', 14: 'B', 15: 'C', 16: 'A', 17: 'C', 18: 'A', 19: 'C', 20: 'D',
      21: 'A', 22: 'C', 23: 'D', 24: 'D', 25: 'C',
      26: 'B', 27: 'A', 28: 'B', 29: 'A', 30: 'D',
      31: 'D', 32: 'B', 33: 'D', 34: 'C', 35: 'A',
      36: 'C', 37: 'C', 38: 'A', 39: 'B', 40: 'D',
      41: 'F', 42: 'E', 43: 'A', 44: 'C', 45: 'G'
    }
  },
  {
    id: 'paper-english-ii-2017',
    legacy_id: 'english-ii-2017',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2017,
    title: '2017 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'C', 2: 'A', 3: 'D', 4: 'A', 5: 'B', 6: 'B', 7: 'C', 8: 'A', 9: 'D', 10: 'C',
      11: 'C', 12: 'B', 13: 'A', 14: 'D', 15: 'C', 16: 'D', 17: 'A', 18: 'B', 19: 'D', 20: 'B',
      21: 'A', 22: 'B', 23: 'C', 24: 'D', 25: 'B',
      26: 'B', 27: 'D', 28: 'D', 29: 'C', 30: 'A',
      31: 'C', 32: 'D', 33: 'A', 34: 'D', 35: 'A',
      36: 'B', 37: 'D', 38: 'C', 39: 'D', 40: 'B',
      41: 'E', 42: 'A', 43: 'G', 44: 'B', 45: 'F'
    }
  },

  // --- 2016 ---
  {
    id: 'paper-english-i-2016',
    legacy_id: 'english-i-2016',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2016,
    title: '2016 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'A', 2: 'D', 3: 'C', 4: 'A', 5: 'C', 6: 'B', 7: 'D', 8: 'B', 9: 'D', 10: 'A',
      11: 'D', 12: 'C', 13: 'B', 14: 'B', 15: 'C', 16: 'A', 17: 'B', 18: 'D', 19: 'B', 20: 'A',
      21: 'A', 22: 'D', 23: 'D', 24: 'C', 25: 'D',
      26: 'A', 27: 'D', 28: 'C', 29: 'A', 30: 'C',
      31: 'B', 32: 'C', 33: 'D', 34: 'A', 35: 'B',
      36: 'A', 37: 'B', 38: 'B', 39: 'C', 40: 'B',
      41: 'C', 42: 'F', 43: 'D', 44: 'E', 45: 'G'
    }
  },
  {
    id: 'paper-english-ii-2016',
    legacy_id: 'english-ii-2016',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2016,
    title: '2016 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'B', 2: 'B', 3: 'A', 4: 'C', 5: 'D', 6: 'B', 7: 'A', 8: 'D', 9: 'C', 10: 'A',
      11: 'A', 12: 'C', 13: 'B', 14: 'D', 15: 'C', 16: 'D', 17: 'A', 18: 'C', 19: 'D', 20: 'B',
      21: 'B', 22: 'B', 23: 'A', 24: 'C', 25: 'A',
      26: 'A', 27: 'C', 28: 'A', 29: 'D', 30: 'C',
      31: 'D', 32: 'B', 33: 'D', 34: 'A', 35: 'B',
      36: 'B', 37: 'C', 38: 'D', 39: 'D', 40: 'C',
      41: 'D', 42: 'F', 43: 'A', 44: 'B', 45: 'E'
    }
  },

  // --- 2015 ---
  {
    id: 'paper-english-i-2015',
    legacy_id: 'english-i-2015',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2015,
    title: '2015 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'D', 2: 'B', 3: 'C', 4: 'A', 5: 'C', 6: 'A', 7: 'D', 8: 'A', 9: 'B', 10: 'D',
      11: 'B', 12: 'A', 13: 'B', 14: 'D', 15: 'C', 16: 'C', 17: 'B', 18: 'D', 19: 'C', 20: 'A',
      21: 'D', 22: 'C', 23: 'B', 24: 'A', 25: 'C',
      26: 'C', 27: 'A', 28: 'D', 29: 'D', 30: 'D',
      31: 'B', 32: 'C', 33: 'D', 34: 'C', 35: 'A',
      36: 'A', 37: 'B', 38: 'A', 39: 'C', 40: 'B',
      41: 'C', 42: 'E', 43: 'G', 44: 'B', 45: 'A'
    }
  },
  {
    id: 'paper-english-ii-2015',
    legacy_id: 'english-ii-2015',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2015,
    title: '2015 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'A', 2: 'D', 3: 'B', 4: 'A', 5: 'C', 6: 'B', 7: 'A', 8: 'D', 9: 'C', 10: 'B',
      11: 'A', 12: 'C', 13: 'C', 14: 'D', 15: 'C', 16: 'D', 17: 'A', 18: 'B', 19: 'D', 20: 'B',
      21: 'A', 22: 'B', 23: 'B', 24: 'C', 25: 'D',
      26: 'C', 27: 'C', 28: 'C', 29: 'B', 30: 'D',
      31: 'D', 32: 'A', 33: 'D', 34: 'A', 35: 'B',
      36: 'B', 37: 'C', 38: 'A', 39: 'D', 40: 'A',
      41: 'D', 42: 'E', 43: 'G', 44: 'A', 45: 'C'
    }
  },

  // --- 2014 ---
  {
    id: 'paper-english-i-2014',
    legacy_id: 'english-i-2014',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2014,
    title: '2014 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'D', 2: 'A', 3: 'B', 4: 'A', 5: 'C', 6: 'D', 7: 'C', 8: 'D', 9: 'B', 10: 'C',
      11: 'A', 12: 'A', 13: 'B', 14: 'D', 15: 'C', 16: 'B', 17: 'A', 18: 'B', 19: 'C', 20: 'D',
      21: 'A', 22: 'C', 23: 'D', 24: 'A', 25: 'A',
      26: 'D', 27: 'D', 28: 'A', 29: 'B', 30: 'B',
      31: 'B', 32: 'C', 33: 'C', 34: 'B', 35: 'D',
      36: 'A', 37: 'D', 38: 'C', 39: 'C', 40: 'B',
      41: 'C', 42: 'F', 43: 'G', 44: 'D', 45: 'B'
    }
  },
  {
    id: 'paper-english-ii-2014',
    legacy_id: 'english-ii-2014',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2014,
    title: '2014 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'B', 2: 'A', 3: 'C', 4: 'A', 5: 'D', 6: 'A', 7: 'C', 8: 'C', 9: 'D', 10: 'B',
      11: 'A', 12: 'B', 13: 'C', 14: 'D', 15: 'B', 16: 'D', 17: 'A', 18: 'D', 19: 'C', 20: 'B',
      21: 'B', 22: 'A', 23: 'D', 24: 'B', 25: 'C',
      26: 'A', 27: 'C', 28: 'B', 29: 'A', 30: 'D',
      31: 'B', 32: 'A', 33: 'D', 34: 'D', 35: 'C',
      36: 'B', 37: 'C', 38: 'A', 39: 'C', 40: 'D',
      41: 'D', 42: 'E', 43: 'G', 44: 'C', 45: 'A'
    }
  },

  // --- 2013 ---
  {
    id: 'paper-english-i-2013',
    legacy_id: 'english-i-2013',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2013,
    title: '2013 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'B', 6: 'D', 7: 'A', 8: 'A', 9: 'D', 10: 'C',
      11: 'A', 12: 'C', 13: 'B', 14: 'C', 15: 'B', 16: 'C', 17: 'D', 18: 'D', 19: 'B', 20: 'A',
      21: 'A', 22: 'B', 23: 'D', 24: 'C', 25: 'C',
      26: 'D', 27: 'A', 28: 'C', 29: 'B', 30: 'D',
      31: 'B', 32: 'A', 33: 'D', 34: 'B', 35: 'A',
      36: 'B', 37: 'C', 38: 'A', 39: 'C', 40: 'D',
      41: 'E', 42: 'F', 43: 'D', 44: 'G', 45: 'A'
    }
  },
  {
    id: 'paper-english-ii-2013',
    legacy_id: 'english-ii-2013',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2013,
    title: '2013 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'B', 2: 'D', 3: 'B', 4: 'A', 5: 'C', 6: 'B', 7: 'A', 8: 'D', 9: 'C', 10: 'A',
      11: 'A', 12: 'C', 13: 'B', 14: 'D', 15: 'C', 16: 'D', 17: 'A', 18: 'B', 19: 'D', 20: 'C',
      21: 'A', 22: 'D', 23: 'B', 24: 'B', 25: 'C',
      26: 'A', 27: 'C', 28: 'C', 29: 'B', 30: 'D',
      31: 'D', 32: 'A', 33: 'B', 34: 'C', 35: 'B',
      36: 'B', 37: 'C', 38: 'A', 39: 'D', 40: 'C',
      41: 'F', 42: 'E', 43: 'G', 44: 'C', 45: 'D'
    }
  },

  // --- 2012 ---
  {
    id: 'paper-english-i-2012',
    legacy_id: 'english-i-2012',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2012,
    title: '2012 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'B', 2: 'A', 3: 'B', 4: 'D', 5: 'C', 6: 'B', 7: 'D', 8: 'B', 9: 'A', 10: 'B',
      11: 'A', 12: 'C', 13: 'C', 14: 'D', 15: 'A', 16: 'C', 17: 'A', 18: 'C', 19: 'D', 20: 'D',
      21: 'D', 22: 'B', 23: 'A', 24: 'C', 25: 'D',
      26: 'C', 27: 'D', 28: 'A', 29: 'D', 30: 'A',
      31: 'A', 32: 'B', 33: 'B', 34: 'D', 35: 'C',
      36: 'C', 37: 'D', 38: 'B', 39: 'C', 40: 'A',
      41: 'C', 42: 'D', 43: 'A', 44: 'F', 45: 'G'
    }
  },
  {
    id: 'paper-english-ii-2012',
    legacy_id: 'english-ii-2012',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2012,
    title: '2012 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'A', 2: 'B', 3: 'D', 4: 'A', 5: 'C', 6: 'D', 7: 'B', 8: 'A', 9: 'C', 10: 'B',
      11: 'D', 12: 'C', 13: 'C', 14: 'A', 15: 'D', 16: 'A', 17: 'B', 18: 'C', 19: 'B', 20: 'D',
      21: 'A', 22: 'C', 23: 'D', 24: 'B', 25: 'A',
      26: 'C', 27: 'B', 28: 'B', 29: 'A', 30: 'C',
      31: 'A', 32: 'B', 33: 'A', 34: 'C', 35: 'D',
      36: 'D', 37: 'D', 38: 'B', 39: 'D', 40: 'C',
      41: 'A', 42: 'F', 43: 'G', 44: 'C', 45: 'E'
    }
  },

  // --- 2011 ---
  {
    id: 'paper-english-i-2011',
    legacy_id: 'english-i-2011',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2011,
    title: '2011 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'C', 2: 'D', 3: 'B', 4: 'B', 5: 'A', 6: 'B', 7: 'A', 8: 'D', 9: 'C', 10: 'A',
      11: 'B', 12: 'C', 13: 'D', 14: 'C', 15: 'B', 16: 'D', 17: 'A', 18: 'D', 19: 'A', 20: 'C',
      21: 'C', 22: 'B', 23: 'D', 24: 'B', 25: 'A',
      26: 'B', 27: 'D', 28: 'C', 29: 'A', 30: 'C',
      31: 'D', 32: 'C', 33: 'B', 34: 'A', 35: 'A',
      36: 'C', 37: 'D', 38: 'A', 39: 'D', 40: 'B',
      41: 'B', 42: 'D', 43: 'A', 44: 'C', 45: 'F'
    }
  },
  {
    id: 'paper-english-ii-2011',
    legacy_id: 'english-ii-2011',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2011,
    title: '2011 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'A', 2: 'C', 3: 'B', 4: 'D', 5: 'D', 6: 'B', 7: 'A', 8: 'C', 9: 'C', 10: 'B',
      11: 'D', 12: 'B', 13: 'A', 14: 'C', 15: 'A', 16: 'A', 17: 'D', 18: 'A', 19: 'C', 20: 'D',
      21: 'B', 22: 'D', 23: 'C', 24: 'A', 25: 'B',
      26: 'D', 27: 'B', 28: 'C', 29: 'A', 30: 'A',
      31: 'C', 32: 'D', 33: 'C', 34: 'D', 35: 'B',
      36: 'B', 37: 'C', 38: 'B', 39: 'A', 40: 'D',
      41: 'E', 42: 'D', 43: 'C', 44: 'B', 45: 'G'
    }
  },

  // --- 2010 ---
  {
    id: 'paper-english-i-2010',
    legacy_id: 'english-i-2010',
    exam: 'english-i',
    examLabel: '英语（一）',
    year: 2010,
    title: '2010 年全国硕士研究生招生考试 英语（一）',
    total_score: 100,
    answers: {
      1: 'A', 2: 'B', 3: 'C', 4: 'B', 5: 'C', 6: 'B', 7: 'D', 8: 'A', 9: 'C', 10: 'D',
      11: 'C', 12: 'A', 13: 'A', 14: 'D', 15: 'B', 16: 'A', 17: 'D', 18: 'C', 19: 'B', 20: 'D',
      21: 'B', 22: 'A', 23: 'D', 24: 'A', 25: 'B',
      26: 'C', 27: 'D', 28: 'C', 29: 'B', 30: 'A',
      31: 'B', 32: 'D', 33: 'A', 34: 'C', 35: 'C',
      36: 'A', 37: 'D', 38: 'C', 39: 'B', 40: 'D',
      41: 'B', 42: 'F', 43: 'D', 44: 'G', 45: 'A'
    }
  },
  {
    id: 'paper-english-ii-2010',
    legacy_id: 'english-ii-2010',
    exam: 'english-ii',
    examLabel: '英语（二）',
    year: 2010,
    title: '2010 年全国硕士研究生招生考试 英语（二）',
    total_score: 100,
    answers: {
      1: 'D', 2: 'C', 3: 'B', 4: 'A', 5: 'A', 6: 'B', 7: 'D', 8: 'C', 9: 'B', 10: 'A',
      11: 'C', 12: 'D', 13: 'D', 14: 'A', 15: 'C', 16: 'B', 17: 'D', 18: 'C', 19: 'A', 20: 'B',
      21: 'D', 22: 'A', 23: 'B', 24: 'C', 25: 'C',
      26: 'A', 27: 'C', 28: 'B', 29: 'D', 30: 'B',
      31: 'A', 32: 'A', 33: 'D', 34: 'C', 35: 'B',
      36: 'D', 37: 'A', 38: 'C', 39: 'B', 40: 'D',
      41: 'F', 42: 'T', 43: 'F', 44: 'T', 45: 'F'
    }
  }
]

export function getEnglishPaperMeta(idOrLegacyId: string): EnglishPaperMeta | undefined {
  return ENGLISH_PAPERS_DATA.find((p) => p.id === idOrLegacyId || p.legacy_id === idOrLegacyId)
}

export function isEnglishPaper(paper: { legacy_id?: string | null; title?: string }): boolean {
  if (paper.legacy_id?.startsWith('english-i') || paper.legacy_id?.startsWith('english-ii')) return true
  if (paper.title && (paper.title.includes('英语（一）') || paper.title.includes('英语（二）') || paper.title.includes('英语一') || paper.title.includes('英语二'))) return true
  return false
}

// Markdown dynamic loaders via Vite
const paperModulesA = import.meta.glob<string>(
  '../../echo-kaoyan-english-skill-main/skills/kaoyan-english/references/papers/**/*.md',
  { query: '?raw', import: 'default' }
)
const paperModulesB = import.meta.glob<string>(
  '../../.local-content/echo/references/papers/**/*.md',
  { query: '?raw', import: 'default' }
)
const paperModulesC = import.meta.glob<string>(
  '/echo-kaoyan-english-skill-main/skills/kaoyan-english/references/papers/**/*.md',
  { query: '?raw', import: 'default' }
)

const allPaperModules = { ...paperModulesC, ...paperModulesB, ...paperModulesA }

export async function loadPaperMarkdown(
  exam: EnglishExamType,
  year: number,
  sectionFile = 'paper.md'
): Promise<string | null> {
  const needle = `/${exam}/${year}/${sectionFile}`.toLowerCase()
  for (const [path, loader] of Object.entries(allPaperModules)) {
    if (path.toLowerCase().endsWith(needle)) {
      try {
        const content = await loader()
        return content
      } catch (err) {
        console.warn('Failed to load markdown for', path, err)
      }
    }
  }
  return null
}

export interface ParsedQuestion {
  qNum: number
  stem: string
  options: Record<string, string>
}

export interface ParsedSection {
  passage: string
  questions: ParsedQuestion[]
}

export function parseSectionQuestions(rawText: string): ParsedSection {
  if (!rawText) return { passage: '', questions: [] }
  const cleanText = rawText.split('<!-- echo-enrichment:start -->')[0]

  // Find where questions begin (e.g. "\n1." or "\n21." or start of string)
  const matchFirstQ = cleanText.search(/(?:^|\n)\s*(\d{1,2})\.\s+/m)
  let passage = ''
  let questionsBlock = cleanText
  if (matchFirstQ !== -1) {
    passage = cleanText.slice(0, matchFirstQ).trim()
    questionsBlock = cleanText.slice(matchFirstQ)
  }

  const questions: ParsedQuestion[] = []
  const qMatches = Array.from(
    questionsBlock.matchAll(/(?:^|\n)\s*(\d{1,2})\.\s*([\s\S]*?)(?=(?:\n\s*\d{1,2}\.\s*)|$)/g)
  )

  for (const match of qMatches) {
    const qNum = Number(match[1])
    const body = match[2].trim()

    // Split stem and options (supporting [A] or A. or A))
    const optMarkerRegex = /(?:\[([A-G]|T|F)\]|(?:^|\n|\s+)([A-G]|T|F)[\.\)])/
    const firstOptMatch = body.match(optMarkerRegex)
    let stem = ''
    let optionsRaw = body

    if (firstOptMatch && typeof firstOptMatch.index === 'number') {
      stem = body.slice(0, firstOptMatch.index).trim()
      optionsRaw = body.slice(firstOptMatch.index)
    }

    const options: Record<string, string> = {}
    const optItemRegex = /(?:\[([A-G]|T|F)\]|(?:^|\n|\s+)([A-G]|T|F)[\.\)])\s*([\s\S]*?)(?=(?:\[(?:[A-G]|T|F)\]|(?:^|\n|\s+)(?:[A-G]|T|F)[\.\)]|$))/g
    const optMatches = Array.from(optionsRaw.matchAll(optItemRegex))

    for (const om of optMatches) {
      const letter = om[1] || om[2]
      const text = om[3]?.replace(/\s+/g, ' ').trim()
      if (letter && text) {
        options[letter] = text
      }
    }

    questions.push({
      qNum,
      stem: stem || `第 ${qNum} 题`,
      options,
    })
  }

  return { passage, questions }
}

