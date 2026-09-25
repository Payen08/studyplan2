export type Bundled337Collection = 'practice' | 'mock'

export interface Bundled337Paper {
  id: string
  legacy_id: string
  year: number
  title: string
  total_score: number
  setNumber: number
  collection: Bundled337Collection
}

export interface Bundled337ChoiceQuestion {
  number: number
  stem: string
  options: Record<'A' | 'B' | 'C' | 'D', string>
  answer: string
}

export interface Bundled337SubjectiveQuestion {
  number: number
  prompt: string
}

export interface Parsed337Paper extends Bundled337Paper {
  choices: Bundled337ChoiceQuestion[]
  terms: Bundled337SubjectiveQuestion[]
  shortAnswers: Bundled337SubjectiveQuestion[]
  essays: Bundled337SubjectiveQuestion[]
  referenceAnswer: string
}

const practiceTitles = [
  '基础术语与经典作品',
  '模型、软件姿态与现代主义',
  '交互原则与北欧设计',
  '用户模型、隐喻与后现代产品',
  '设计方法论与产品设计',
  '包豪斯、现代主义与建筑',
  '北欧与美国职业工业设计',
  '现代设计运动与后现代主义',
  '可持续、情感化与产品生命周期',
  '综合押题卷',
]

const mockTitles = [
  '设计史基本盘卷',
  '交互与用户体验卷',
  '可持续与设计伦理卷',
  '中国工艺与传统造物卷',
  '综合实战卷（最接近预测）',
  '进阶卷 A（设计史深度 + 俄苏构成主义）',
  '进阶卷 B（交互与用户体验深度 + 术语翻译）',
  '进阶卷 C（综合高难 + 中国工艺深度）',
  '补漏卷（设计方法论 + 通史缺口）',
]

const createPapers = (
  collection: Bundled337Collection,
  titles: string[],
  total_score: number
): Bundled337Paper[] => titles.map((title, index) => {
  const setNumber = index + 1
  const prefix = collection === 'practice' ? '全真预测练习' : '模拟预测卷'
  return {
    id: `paper-gdut-337-${collection}-2027-set-${setNumber}`,
    legacy_id: `gdut-337-${collection}-2027-set-${setNumber}`,
    year: 2027,
    title: `广工 337 ${prefix} · 第 ${setNumber} 套 · ${title}`,
    total_score,
    setNumber,
    collection,
  }
})

export const BUNDLED_337_PAPERS: Bundled337Paper[] = [
  ...createPapers('practice', practiceTitles, 150),
  ...createPapers('mock', mockTitles, 160),
]

export const LEGACY_BUNDLED_337_IDS = new Set([
  'paper-gdut-337-practice-2027-10',
  'gdut-337-practice-2027-10',
  'paper-gdut-337-mock-collection-9',
  'gdut-337-mock-collection-9',
])

export function getBundled337Paper(key: string): Bundled337Paper | undefined {
  return BUNDLED_337_PAPERS.find((paper) => paper.id === key || paper.legacy_id === key)
}

export function isBundled337Paper(paper: { id: string; legacy_id?: string | null }): boolean {
  return Boolean(getBundled337Paper(paper.legacy_id || paper.id))
}

async function loadCollection(collection: Bundled337Collection): Promise<string> {
  if (collection === 'practice') {
    return import('../content/广工337英文选择题预测练习10套（2027）.md?raw').then((module) => module.default)
  }
  return import('../content/广工337模拟预测卷9套.md?raw').then((module) => module.default)
}

function extractSet(text: string, collection: Bundled337Collection, setNumber: number): string {
  const heading = collection === 'practice'
    ? new RegExp(`^##\\s+第${setNumber}套[：:]`, 'm')
    : new RegExp(`^#\\s+第\\s*${setNumber}\\s*套\\s*·`, 'm')
  const start = text.search(heading)
  if (start < 0) return ''
  const remaining = text.slice(start + 1)
  const nextHeading = collection === 'practice'
    ? remaining.search(/^##\s+第\d+套[：:]/m)
    : remaining.search(/^#\s+第\s*\d+\s*套\s*·/m)
  return nextHeading < 0 ? text.slice(start) : text.slice(start, start + 1 + nextHeading)
}

function sectionBetween(text: string, startPattern: RegExp, endPattern?: RegExp): string {
  const start = text.search(startPattern)
  if (start < 0) return ''
  const sliced = text.slice(start)
  const firstBreak = sliced.indexOf('\n')
  const body = firstBreak >= 0 ? sliced.slice(firstBreak + 1) : ''
  if (!endPattern) return body.trim()
  const end = body.search(endPattern)
  return (end < 0 ? body : body.slice(0, end)).trim()
}

function parseNumberedQuestions(section: string): Bundled337SubjectiveQuestion[] {
  return Array.from(section.matchAll(/^\s*(\d+)\.\s+(.+)$/gm)).map((match) => ({
    number: Number(match[1]),
    prompt: match[2].trim(),
  }))
}

function parseChoices(section: string, answers: Record<number, string>): Bundled337ChoiceQuestion[] {
  const questionMatches = Array.from(section.matchAll(/^(\d+)\.\s+([\s\S]*?)(?=^\d+\.\s+|(?![\s\S]))/gm))
  return questionMatches.flatMap((match) => {
    const number = Number(match[1])
    const body = match[2].replace(/　/g, ' ').trim()
    const firstOption = body.search(/(?:^|\s)A[.．]\s*/)
    if (firstOption < 0) return []
    const stem = body.slice(0, firstOption).trim()
    const options = {} as Record<'A' | 'B' | 'C' | 'D', string>
    const optionsText = body.slice(firstOption)
    for (const option of optionsText.matchAll(/(?:^|\s)([A-D])[.．]\s*([\s\S]*?)(?=(?:\s+[A-D][.．])|$)/g)) {
      options[option[1] as 'A' | 'B' | 'C' | 'D'] = option[2].replace(/\s+/g, ' ').trim()
    }
    if (!options.A || !options.B || !options.C || !options.D) return []
    return [{ number, stem, options, answer: answers[number] || '' }]
  })
}

function parseAnswerKey(text: string, setNumber: number, collection: Bundled337Collection): Record<number, string> {
  const source = collection === 'practice'
    ? text.match(new RegExp(`\\*\\*第${setNumber}套\\*\\*[：:]([^\\n]+)`))?.[1]
    : text.match(/选择题答案\*\*[：:]([^\n]+)/)?.[1]
  const answers: Record<number, string> = {}
  for (const match of (source || '').matchAll(/(\d+)\.([A-D])/g)) answers[Number(match[1])] = match[2]
  return answers
}

export async function loadParsed337Paper(paper: Bundled337Paper): Promise<Parsed337Paper> {
  const fullText = await loadCollection(paper.collection)
  const setText = extractSet(fullText, paper.collection, paper.setNumber)
  const headingLevel = paper.collection === 'practice' ? '###' : '##'
  const choicesSection = sectionBetween(setText, new RegExp(`^${headingLevel}\\s+一、选择题`, 'm'), new RegExp(`^${headingLevel}\\s+二、`, 'm'))
  const termsSection = sectionBetween(setText, new RegExp(`^${headingLevel}\\s+二、`, 'm'), new RegExp(`^${headingLevel}\\s+三、`, 'm'))
  const shortSection = sectionBetween(setText, new RegExp(`^${headingLevel}\\s+三、`, 'm'), new RegExp(`^${headingLevel}\\s+四、`, 'm'))
  const essaySection = sectionBetween(
    setText,
    new RegExp(`^${headingLevel}\\s+四、`, 'm'),
    paper.collection === 'practice' ? /^---\s*$/m : /^>\s*\[!success\]/m
  )
  const answers = parseAnswerKey(paper.collection === 'practice' ? fullText : setText, paper.setNumber, paper.collection)
  const referenceAnswer = paper.collection === 'mock'
    ? sectionBetween(setText, /^>\s*\[!success\]/m).replace(/^>\s?/gm, '').trim()
    : ''

  return {
    ...paper,
    choices: parseChoices(choicesSection, answers),
    terms: parseNumberedQuestions(termsSection),
    shortAnswers: parseNumberedQuestions(shortSection),
    essays: parseNumberedQuestions(essaySection),
    referenceAnswer,
  }
}
