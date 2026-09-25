import React, { useMemo, useState } from 'react'
import {
  BookOpen,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Sparkles,
} from 'lucide-react'

interface EnglishPaperViewerProps {
  rawText: string
  fontSize?: number // in px (e.g. 15, 16, 17)
  onOpenExam?: () => void
}

interface QuestionItem {
  qNum: number
  stem: string
  options: { key: string; text: string }[]
}

interface SectionBlock {
  id: string
  type: 'title' | 'section-header' | 'directions' | 'subtext-header' | 'passage' | 'questions' | 'email-card' | 'chart-card' | 'raw-paragraph'
  title?: string
  content?: string
  questions?: QuestionItem[]
  extra?: any
}

// Clean and normalize markdown from OCR / PDF line breaks
function normalizeExamText(text: string): string {
  if (!text) return ''
  // 1. Join hyphenated words split across lines: e.g. "hu-\nman" -> "human", "virtu-\nally" -> "virtually"
  let cleaned = text.replace(/(\b[A-Za-z]+)-\r?\n\s*([A-Za-z]+\b)/g, '$1$2')
  return cleaned
}

// Parse markdown lines into structured readable blocks
function parsePaperBlocks(rawText: string): { blocks: SectionBlock[]; echoEnrichment: string | null } {
  const parts = rawText.split(/<!--\s*echo-enrichment:start\s*-->/i)
  const mainPaperRaw = normalizeExamText(parts[0] || '')
  const echoEnrichment = parts[1]?.trim() || null

  const lines = mainPaperRaw.split('\n')
  const blocks: SectionBlock[] = []

  let i = 0
  let blockIdx = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    // 1. Empty line
    if (!line) {
      i++
      continue
    }

    // 2. Main Title (e.g. "# 2026 考研英语一完整试题")
    if (line.startsWith('# ')) {
      blocks.push({
        id: `block-${blockIdx++}`,
        type: 'title',
        title: line.replace(/^#\s*/, '').trim(),
      })
      i++
      continue
    }

    // 3. Section Header (e.g. "Section I Use of English", "Section II Reading Comprehension", "Section III Writing")
    if (/^Section\s+[I|V|X]+/i.test(line)) {
      blocks.push({
        id: `block-${blockIdx++}`,
        type: 'section-header',
        title: line,
      })
      i++
      continue
    }

    // 4. Part Header (e.g. "Part A", "Part B", "Part C")
    if (/^Part\s+[A-C]\b/i.test(line)) {
      blocks.push({
        id: `block-${blockIdx++}`,
        type: 'section-header',
        title: line,
      })
      i++
      continue
    }

    // 5. Reading Subtext Header (e.g. "Text 1", "Text 2", "Text 3", "Text 4")
    if (/^Text\s+[1-4]\b/i.test(line)) {
      blocks.push({
        id: `block-${blockIdx++}`,
        type: 'subtext-header',
        title: line,
      })
      i++
      continue
    }

    // 6. Directions (e.g. "Directions:", "51. Directions:", "52. Directions:")
    if (/^(?:\d{1,2}\.\s*)?Directions:/i.test(line)) {
      const dirLines: string[] = [line]
      i++
      while (i < lines.length && lines[i].trim() && !/^Section\s+/i.test(lines[i]) && !/^Text\s+[1-4]/i.test(lines[i]) && !/^\d{1,2}\.\s+[A-Z]/i.test(lines[i])) {
        const next = lines[i].trim()
        if (next.startsWith('For thousands of years') || next.startsWith('Advances in artificial') || next.startsWith('Hi Li Ming') || next.startsWith('Science education today')) {
          break
        }
        dirLines.push(next)
        i++
      }
      blocks.push({
        id: `block-${blockIdx++}`,
        type: 'directions',
        content: dirLines.join(' '),
      })
      continue
    }

    // 7. Questions group (starts with "1. A. ..." or "21. What...")
    if (/^\d{1,2}\.\s+/.test(line) && !/Directions:/i.test(line)) {
      const questions: QuestionItem[] = []

      while (i < lines.length) {
        const qLine = lines[i].trim()
        if (!qLine) {
          i++
          continue
        }
        const qMatch = qLine.match(/^(\d{1,2})\.\s*(.*)/)
        if (!qMatch) {
          // If next line starts with option [A] or A. for the current question
          if (/^(?:\[(?:[A-G]|T|F)\]|(?:[A-G]|T|F)[\.\)])\s*/.test(qLine) && questions.length > 0) {
            const lastQ = questions[questions.length - 1]
            parseOptionsIntoQuestion(lastQ, qLine)
            i++
            continue
          }
          break
        }

        const qNum = Number(qMatch[1])
        const rest = qMatch[2]

        const currentQ: QuestionItem = {
          qNum,
          stem: '',
          options: [],
        }

        // Split stem and inline options
        const optMarkerRegex = /(?:\[([A-G]|T|F)\]|(?:\b|^)([A-G]|T|F)[\.\)])/
        const firstOpt = rest.match(optMarkerRegex)
        if (firstOpt && typeof firstOpt.index === 'number') {
          currentQ.stem = rest.slice(0, firstOpt.index).trim()
          parseOptionsIntoQuestion(currentQ, rest.slice(firstOpt.index))
        } else {
          currentQ.stem = rest.trim()
        }

        // Check subsequent lines for options
        i++
        while (i < lines.length) {
          const nextL = lines[i].trim()
          if (!nextL) {
            i++
            continue
          }
          if (/^\d{1,2}\.\s+/.test(nextL) || /^Section\s+/i.test(nextL) || /^Part\s+/i.test(nextL) || /^Text\s+[1-4]/i.test(nextL)) {
            break
          }
          if (/(?:\[(?:[A-G]|T|F)\]|(?:^|\b)(?:[A-G]|T|F)[\.\)])/.test(nextL)) {
            parseOptionsIntoQuestion(currentQ, nextL)
            i++
          } else {
            if (currentQ.options.length === 0) {
              currentQ.stem = (currentQ.stem + ' ' + nextL).trim()
              i++
            } else {
              break
            }
          }
        }

        questions.push(currentQ)
      }

      if (questions.length) {
        blocks.push({
          id: `block-${blockIdx++}`,
          type: 'questions',
          questions,
        })
      }
      continue
    }

    // 8. Paragraph of reading passage or writing prompt
    const paraLines: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !/^Section\s+/i.test(lines[i].trim()) &&
      !/^Part\s+/i.test(lines[i].trim()) &&
      !/^Text\s+[1-4]/i.test(lines[i].trim()) &&
      !/^(?:\d{1,2}\.\s*)?Directions:/i.test(lines[i].trim()) &&
      !/^\d{1,2}\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim())
      i++
    }

    const fullPara = paraLines.join(' ')
    // Distinguish special cards like Email in writing
    if (fullPara.includes('Hi Li Ming') || fullPara.includes('Yours, Paul')) {
      blocks.push({
        id: `block-${blockIdx++}`,
        type: 'email-card',
        content: fullPara,
      })
    } else {
      blocks.push({
        id: `block-${blockIdx++}`,
        type: 'passage',
        content: fullPara,
      })
    }
  }

  return { blocks, echoEnrichment }
}

function parseOptionsIntoQuestion(q: QuestionItem, text: string) {
  const optRegex = /(?:\[([A-G]|T|F)\]|(?:^|\n|\s+)([A-G]|T|F)[\.\)])\s*([\s\S]*?)(?=(?:\[(?:[A-G]|T|F)\]|(?:^|\n|\s+)(?:[A-G]|T|F)[\.\)]|$))/g
  const matches = Array.from(text.matchAll(optRegex))
  for (const m of matches) {
    const key = m[1] || m[2]
    const optText = m[3]?.trim()
    if (key && optText && !q.options.some((o) => o.key === key)) {
      q.options.push({ key, text: optText })
    }
  }
}

export function EnglishPaperViewer({
  rawText,
  fontSize = 15,
  onOpenExam,
}: EnglishPaperViewerProps) {
  const [showEnrichment, setShowEnrichment] = useState(false)

  const { blocks, echoEnrichment } = useMemo(() => {
    return parsePaperBlocks(rawText)
  }, [rawText])

  return (
    <div
      className="paper-typography-container"
      style={{ fontSize: `${fontSize}px` }}
    >
      {blocks.map((block) => {
        switch (block.type) {
          case 'title':
            return (
              <header key={block.id} className="paper-viewer-title-banner">
                <div className="title-accent-pill">官方真题原卷</div>
                <h1>{block.title}</h1>
              </header>
            )

          case 'section-header':
            return (
              <div key={block.id} className="paper-section-banner">
                <div className="section-banner-line" />
                <div className="section-banner-badge">
                  <BookOpen size={16} />
                  <span>{block.title}</span>
                </div>
                <div className="section-banner-line" />
              </div>
            )

          case 'subtext-header':
            return (
              <div key={block.id} className="paper-subtext-heading">
                <span className="subtext-pill">{block.title}</span>
                <span className="subtext-label">阅读篇章材料</span>
              </div>
            )

          case 'directions':
            return (
              <div key={block.id} className="paper-directions-box">
                <div className="directions-header">
                  <Info size={15} className="text-accent" />
                  <strong>Directions (作答指导说明)</strong>
                </div>
                <p className="directions-text">{block.content}</p>
              </div>
            )

          case 'email-card':
            return (
              <div key={block.id} className="paper-email-card">
                <div className="email-card-header">
                  <FileText size={15} />
                  <span>附信材料 (Incoming Email)</span>
                </div>
                <div className="email-card-body">
                  <pre className="email-pre-text">{block.content}</pre>
                </div>
              </div>
            )

          case 'passage':
            const processedContent = block.content || ''
            return (
              <p key={block.id} className="paper-passage-paragraph">
                {renderFormattedParagraph(processedContent)}
              </p>
            )

          case 'questions':
            return (
              <div key={block.id} className="paper-questions-flow">
                {block.questions?.map((q) => (
                  <article key={q.qNum} className="viewer-question-card">
                    <div className="viewer-q-header">
                      <span className="viewer-q-num">{q.qNum}</span>
                      <div className="viewer-q-stem">
                        {q.stem || `第 ${q.qNum} 题`}
                      </div>
                      {onOpenExam && (
                        <button
                          type="button"
                          className="quick-answer-jump-btn"
                          onClick={onOpenExam}
                          title="在答题卡中作答此题"
                        >
                          <CheckCircle2 size={13} />
                          作答
                        </button>
                      )}
                    </div>

                    {q.options && q.options.length > 0 && (
                      <div
                        className={`viewer-options-grid ${
                          q.options.some((o) => o.text.length > 25)
                            ? 'stacked'
                            : 'grid-2'
                        }`}
                      >
                        {q.options.map((opt) => (
                          <div key={opt.key} className="viewer-option-cell">
                            <span className="viewer-opt-badge">{opt.key}</span>
                            <span className="viewer-opt-text">{opt.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )

          default:
            return (
              <p key={block.id} className="paper-passage-paragraph">
                {block.content}
              </p>
            )
        }
      })}

      {/* Echo Enrichment Accordion (参考译文与解析) */}
      {echoEnrichment && (
        <section className="echo-enrichment-wrapper">
          <button
            type="button"
            className="echo-enrichment-toggle-btn"
            onClick={() => setShowEnrichment(!showEnrichment)}
          >
            <div className="toggle-label-wrap">
              <Sparkles size={16} className="text-accent" />
              <strong>Echo 专属难点评析与参考译文</strong>
              <span className="enrichment-badge">解析精讲</span>
            </div>
            {showEnrichment ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </button>

          {showEnrichment && (
            <div className="echo-enrichment-body panel">
              <div className="enrichment-disclaimer">
                <Info size={14} />
                <span>以下为考卷难点评析、易错点总结及参考译文，辅助理解篇章逻辑：</span>
              </div>
              <div className="enrichment-markdown-content">
                {echoEnrichment.split('\n\n').map((para, pIdx) => {
                  const p = para.trim()
                  if (!p) return null
                  if (p.startsWith('### ')) {
                    return <h4 key={pIdx}>{p.replace('### ', '')}</h4>
                  }
                  if (p.startsWith('## ')) {
                    return <h3 key={pIdx}>{p.replace('## ', '')}</h3>
                  }
                  if (p.startsWith('> ')) {
                    return (
                      <blockquote key={pIdx}>
                        {p.replace(/^>\s*/, '')}
                      </blockquote>
                    )
                  }
                  return <p key={pIdx}>{p}</p>
                })}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function renderFormattedParagraph(text: string) {
  const parts = text.split(/(\s\d{1,2}\s|\(\d{2}\))/g)
  return parts.map((part, idx) => {
    const blankMatch = part.match(/^\s(\d{1,2})\s$/)
    if (blankMatch) {
      return (
        <span key={idx} className="cloze-blank-tag">
          [ {blankMatch[1]} ]
        </span>
      )
    }
    const transMatch = part.match(/^\((\d{2})\)$/)
    if (transMatch) {
      return (
        <span key={idx} className="trans-marker-tag">
          ({transMatch[1]})
        </span>
      )
    }
    return part
  })
}
