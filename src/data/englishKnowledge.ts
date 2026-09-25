export type EnglishExam = 'english-i' | 'english-ii'
export type EnglishSection = 'reading' | 'cloze' | 'translation' | 'writing' | 'new-question-type'

export interface EnglishLookup {
  exam: EnglishExam
  year: number
  section: EnglishSection
  text?: number
  question?: number
}

export const ECHO_SOURCE = {
  repository: 'https://github.com/Echo1LZJY/echo-kaoyan-english-skill',
  commit: '48ed6918fd2d3dcc5ec9b1b47b2519544cc800bd',
  licensedContent: false,
  years: Array.from({ length: 17 }, (_, index) => 2010 + index),
}

export const sectionLabels: Record<EnglishSection, string> = {
  reading: '阅读理解', cloze: '完形填空', translation: '翻译', writing: '作文', 'new-question-type': '新题型',
}

export function buildEnglishPrompt(lookup: EnglishLookup, userText = '') {
  const examName = lookup.exam === 'english-i' ? '英语一' : '英语二'
  const location = `${lookup.year} 年${examName}${sectionLabels[lookup.section]}${lookup.text ? ` Text ${lookup.text}` : ''}${lookup.question ? ` 第 ${lookup.question} 题` : ''}`
  const contracts: Record<EnglishSection, string> = {
    reading: '请按“原文定位→逻辑关系→选项陷阱→正确证据→中文解释→复盘建议”输出。',
    cloze: '请从语法、搭配、上下文语义和篇章逻辑解析。',
    translation: '请区分英一/英二评分标准，按意群评分，给出扣分点和修改稿。',
    writing: '请按对应题型分档评分，逐句修改，给出优化稿和可复用表达。',
    'new-question-type': '请分析篇章结构、衔接线索和干扰项。',
  }
  return `考研英语专项：${location}。${contracts[lookup.section]}${userText ? `\n我的作答/问题：${userText}` : ''}`
}
