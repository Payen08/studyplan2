import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  BotMessageSquare,
  Sparkles,
  Key,
  CalendarPlus,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Zap,
  Flame,
  CheckCircle2,
  Compass,
  ArrowUp,
  Brain,
  Plus,
  BookOpen,
  Award,
  ArrowRight,
  FileCheck2,
} from 'lucide-react'
import { useData } from '../data/DataContext'
import { active, baseRecord, daysUntil, subjectFor } from '../data/helpers'
import { localDate } from '../data/defaults'
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY } from '../data/supabase'
import { Modal } from '../components/ui'
import { AiQuizModal } from '../components/AiQuizModal'
import { OnlineExamModal } from '../components/OnlineExamModal'
import {
  saveAiMockPaper,
  getAiMockPapers,
  DEFAULT_POLITICS_33_PAPER,
  type AiMockPaper,
} from '../data/mockPaperStore'
import type { StudyTask, MockExam, MockScore } from '../types'

interface ChatActionTask {
  title: string
  subject?: string
  date?: string
  period?: '全天' | '上午' | '下午' | '晚上'
  duration?: number
}

interface ChatActionMock {
  title: string
  exam_date?: string
  total_score: number
  target_score: number
  scores?: {
    subject: string
    score: number
    total_score: number
  }[]
}

type ChatAction =
  | { action: 'create_tasks'; tasks: ChatActionTask[] }
  | { action: 'create_mock_exam'; mock: ChatActionMock }
  | { action: 'create_full_mock_paper'; paper: AiMockPaper }

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoningContent?: string
  actions?: ChatAction[]
  timestamp: string
}

const STORAGE_KEY_HISTORY = 'study_ai_chat_history_v4'
const STORAGE_KEY_API_KEY = 'study_ai_api_key'
const STORAGE_KEY_ENDPOINT = 'study_ai_api_endpoint'
const STORAGE_KEY_MODEL = 'study_ai_model'
const STORAGE_KEY_TIER = 'study_ai_tier'
const STORAGE_KEY_THINKING = 'study_ai_thinking'

function extractActions(text: string): ChatAction[] {
  const actions: ChatAction[] = []
  if (!text) return actions

  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/gi
  let match: RegExpExecArray | null
  while ((match = jsonBlockRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      if (parsed?.action === 'create_tasks' && Array.isArray(parsed.tasks)) {
        actions.push(parsed)
      } else if (parsed?.action === 'create_full_mock_paper' && parsed.paper) {
        actions.push(parsed)
      } else if (parsed?.action === 'create_mock_exam' && parsed.mock) {
        actions.push(parsed)
      } else if (parsed?.action === 'create_mock_exam' && parsed.total_score !== undefined) {
        actions.push({ action: 'create_mock_exam', mock: parsed })
      } else if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item?.action === 'create_tasks' && Array.isArray(item.tasks)) {
            actions.push(item)
          } else if (item?.action === 'create_full_mock_paper' || item?.action === 'create_mock_exam') {
            actions.push(item)
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  if (!actions.length) {
    const rawMatch = text.match(/\{[\s\S]*"action"\s*:\s*"create_tasks"[\s\S]*\}/)
    if (rawMatch) {
      try {
        const parsed = JSON.parse(rawMatch[0])
        if (parsed?.action === 'create_tasks' && Array.isArray(parsed.tasks)) {
          actions.push(parsed)
        }
      } catch {
        // Ignore
      }
    }
    const mockMatch = text.match(/\{[\s\S]*"action"\s*:\s*"(?:create_mock_exam|create_full_mock_paper)"[\s\S]*\}/)
    if (mockMatch) {
      try {
        const parsed = JSON.parse(mockMatch[0])
        if (parsed?.action === 'create_full_mock_paper') {
          actions.push(parsed.paper ? parsed : { action: 'create_full_mock_paper', paper: parsed })
        } else if (parsed?.action === 'create_mock_exam') {
          actions.push(parsed.mock ? parsed : { action: 'create_mock_exam', mock: parsed })
        }
      } catch {
        // Ignore
      }
    }
  }

  return actions
}

export function AiChat() {
  const { data, userId, upsert } = useData()
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // Ignore
    }
    return []
  })

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [activeOnlineExamPaper, setActiveOnlineExamPaper] = useState<AiMockPaper | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({})
  const [addedActionBatches, setAddedActionBatches] = useState<Record<string, boolean>>({})
  const [addedMockBatches, setAddedMockBatches] = useState<Record<string, boolean>>({})

  // API Config
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_API_KEY) || '')
  const [apiEndpoint, setApiEndpoint] = useState(
    () => localStorage.getItem(STORAGE_KEY_ENDPOINT) || 'https://api.deepseek.com'
  )
  const [model, setModel] = useState(
    () => localStorage.getItem(STORAGE_KEY_MODEL) || 'deepseek-chat'
  )
  const [tier, setTier] = useState<'low' | 'mid' | 'high'>(
    () => (localStorage.getItem(STORAGE_KEY_TIER) as any) || 'mid'
  )
  const [thinkingMode, setThinkingMode] = useState(
    () => localStorage.getItem(STORAGE_KEY_THINKING) === 'true'
  )

  const chatBottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(messages))
    } catch {
      // Ignore
    }
  }, [messages])

  // Scroll on message change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const seed = sessionStorage.getItem('study_ai_seed_prompt')
    if (seed) {
      setInput(seed)
      sessionStorage.removeItem('study_ai_seed_prompt')
      textareaRef.current?.focus()
    }
  }, [])

  // Student Telemetry Snapshot
  const settings = data.user_settings?.[0]
  const examDate = settings?.exam_date ?? '2026-12-19'
  const examName = settings?.exam_name || '考研初试'
  const daysLeft = daysUntil(examDate)

  const subjects = useMemo(
    () => active(data.subjects).filter((s) => s.status === 'active'),
    [data.subjects]
  )
  const allTasks = useMemo(() => active(data.tasks), [data.tasks])
  const today = localDate()
  const todayTasks = useMemo(
    () => allTasks.filter((t) => t.task_date === today),
    [allTasks, today]
  )
  const todayDone = useMemo(
    () => todayTasks.filter((t) => t.status === 'done').length,
    [todayTasks]
  )

  const weekStart = useMemo(() => {
    const d = new Date(`${today}T00:00:00`)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return d
  }, [today])

  const weekTasks = useMemo(
    () => allTasks.filter((t) => new Date(`${t.task_date}T00:00:00`) >= weekStart),
    [allTasks, weekStart]
  )
  const weekDone = useMemo(
    () => weekTasks.filter((t) => t.status === 'done').length,
    [weekTasks]
  )
  const weekRate = weekTasks.length ? Math.round((weekDone / weekTasks.length) * 100) : 0

  const mistakesCount = useMemo(
    () => active(data.mistakes).filter((m) => !m.mastered).length,
    [data.mistakes]
  )
  const dueMistakesCount = useMemo(
    () => active(data.mistakes).filter((m) => !m.mastered && (!m.next_review_date || m.next_review_date <= today)).length,
    [data.mistakes, today]
  )
  const notesCount = useMemo(() => active(data.notes).length, [data.notes])

  // Context System Prompt
  const buildSystemPrompt = () => {
    const subList = subjects.map((s) => s.name).join('、') || '暂未录入科目'
    const todayTaskDetails = todayTasks.length
      ? todayTasks
          .map(
            (t) =>
              `- [${t.status === 'done' ? '已完成' : '未完成'}] ${t.title} (${
                subjectFor(subjects, t.subject_id)?.name ?? '综合'
              }, ${t.period})`
          )
          .join('\n')
      : '今日暂无任务'

    return `你是一位专业、有温度、逻辑清晰的专属考研备考学习规划与答疑伙伴。

【当前学生备考实时档案】
- 目标考试：${examName}（${examDate}，距离考试仅剩 ${daysLeft} 天）
- 备考科目：${subList}
- 今日（${today}）任务进度：共 ${todayTasks.length} 项，已完成 ${todayDone} 项
${todayTaskDetails}
- 本周任务完成率：${weekDone}/${weekTasks.length}（${weekRate}%）
- 错题与薄弱点：共有 ${mistakesCount} 道待强化错题
- 今日到期复习：${dueMistakesCount} 道
- 笔记沉淀：已记录 ${notesCount} 篇笔记

【系统能力与交互协议】
1. 规划任务：当建议具体任务时，在回复末尾附上规范的 JSON 代码块（action: "create_tasks"），系统支持一键写入日历任务。
2. 完整模考生成：当用户说“我想测验/出套模考/生成政治33题”等请求时，以命题组专家身份为用户量身定制完整的全真模拟卷（例如政治为标准33道选择题，含16道单选和17道多选共50分），并在末尾输出：
\`\`\`json
{
  "action": "create_full_mock_paper",
  "paper": {
    "title": "2027 考研政治全真模拟测试卷（33道选择题）",
    "subject_name": "思想政治理论",
    "total_questions": 33,
    "total_score": 50,
    "duration_minutes": 50,
    "description": "包含16道单选（16分）与17道多选（34分），考点全面覆盖马原、毛中特、史纲、思修与当代"
  }
}
\`\`\`
系统将自动为用户渲染一键进入考场答题的行动卡片，并支持用户直接去【模考记录】中考试。`
  }

  // Send message
  const handleSend = async (userText?: string) => {
    const text = (userText || input).trim()
    if (!text || loading) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    // Check if user specifically requested a full politics 33-question mock test
    const isPolitics33Intent =
      (text.includes('政治') || text.includes('马原') || text.includes('毛中特')) &&
      (text.includes('33') || text.includes('模考') || text.includes('测验') || text.includes('试卷') || text.includes('选择题'))

    try {
      const systemPrompt = buildSystemPrompt()
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...nextMessages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ]

      let replyText = ''
      let reasoningText = ''

      if (apiKey.trim()) {
        const cleanBase = apiEndpoint.trim().replace(/\/$/, '')
        const endpointUrl = cleanBase.endsWith('/chat/completions')
          ? cleanBase
          : `${cleanBase}/chat/completions`

        const tempMap = { low: 0.3, mid: 0.7, high: 0.85 }
        const maxTokensMap = { low: 2048, mid: 4096, high: 8192 }

        const payload: Record<string, unknown> = {
          model,
          messages: apiMessages,
          temperature: tempMap[tier] || 0.7,
          max_tokens: maxTokensMap[tier] || 4096,
          stream: false,
        }

        if (thinkingMode) {
          payload.thinking = { type: 'enabled' }
        }

        const res = await fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`API 响应错误 (${res.status}): ${errText.slice(0, 300)}`)
        }

        const dataRes = await res.json()
        const choice = dataRes?.choices?.[0]?.message
        replyText = choice?.content || ''
        reasoningText = choice?.reasoning_content || ''
      } else if (isPolitics33Intent) {
        // Instant response for full politics 33-question mock
        replyText = `已为你精准生成【2027 考研政治全真模拟卷（33道选择题）】！

本套试卷严格对标考研思想政治理论初试真题标准结构：
- **第一部分：单项选择题（第 1~16 题）**，共 16 题，每题 1 分，共 16 分。考查马原、毛中特、史纲、思修法基与当代形势核心定义辨析。
- **第二部分：多项选择题（第 17~33 题）**，共 17 题，每题 2 分，共 34 分。考查知识点综合串联与易错点辨析（选多、选少、选错均不得分）。
- **总分 50 分，建议用时 50 分钟**。

试卷已编排就绪，你可以点击下方卡片**立即进入全屏在线考场作答**，也可随时在左侧【模考记录】的“AI 智能考场”中开始考试！`
      } else {
        // Fallback edge function
        const edgeUrl = `${DEFAULT_SUPABASE_URL}/functions/v1/study-buddy`
        const res = await fetch(edgeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: DEFAULT_SUPABASE_KEY,
            Authorization: `Bearer ${DEFAULT_SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            modelPreset: tier === 'high' ? 'pro' : 'flash',
            thinking: thinkingMode ? 'enabled' : 'disabled',
          }),
        })

        if (!res.ok) {
          throw new Error(
            `云端通道暂未连接。请点击右上角【API 配置】填入你的 API Key 即可本地直连畅聊。`
          )
        }

        const dataRes = await res.json()
        replyText = dataRes?.reply || dataRes?.choices?.[0]?.message?.content || ''
        reasoningText = dataRes?.reasoning || dataRes?.choices?.[0]?.message?.reasoning_content || ''
      }

      let actions = extractActions(replyText)

      // If user wanted politics 33-question test, automatically attach the full paper action!
      if (isPolitics33Intent && !actions.some((a) => a.action === 'create_full_mock_paper')) {
        saveAiMockPaper(DEFAULT_POLITICS_33_PAPER)
        actions.push({
          action: 'create_full_mock_paper',
          paper: DEFAULT_POLITICS_33_PAPER,
        })
      }

      const cleanContent = replyText
        .replace(/```(?:json)?\s*\{[\s\S]*?"action"\s*:\s*"(?:create_tasks|create_mock_exam|create_full_mock_paper)"[\s\S]*?\}\s*```/gi, '')
        .trim()

      const assistantMessage: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: cleanContent || replyText,
        reasoningContent: reasoningText,
        actions: actions.length ? actions : undefined,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `对话未能成功发送：${err.message || err}

提示：点击右上角【API 配置】，输入你的 API Key（如 \`sk-...\`），即可本地极速直连。`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  // Handle batch adding tasks
  const handleAddTasks = async (batchId: string, actionTasks: ChatActionTask[]) => {
    if (!actionTasks?.length) return
    for (const t of actionTasks) {
      const matched = subjects.find(
        (s) => s.name.trim().toLowerCase() === String(t.subject || '').trim().toLowerCase()
      )
      const weekPlan = active(data.plans).find((plan) => plan.period_type === 'week' && plan.start_date <= (t.date || today) && plan.end_date >= (t.date || today))
      const node = active(data.syllabus_nodes).find((item) => item.subject_id === matched?.id && t.title.includes(item.title))
      const newTask: StudyTask = {
        ...baseRecord(userId),
        title: t.title || '学习任务',
        task_date: t.date || today,
        period: (['全天', '上午', '下午', '晚上'].includes(t.period || '')
          ? t.period
          : '全天') as StudyTask['period'],
        subject_id: matched?.id || (subjects[0]?.id ?? null),
        plan_id: weekPlan?.id || null,
        syllabus_node_id: node?.id || null,
        estimate_minutes: Number(t.duration) || 45,
        actual_minutes: 0,
        status: 'todo',
        sort_order: allTasks.length + 1,
        completed_at: null,
        source: 'ai',
      }
      await upsert('tasks', newTask)
    }
    setAddedActionBatches((prev) => ({ ...prev, [batchId]: true }))
  }

  // Handle adding mock exam from AI action
  const handleAddMock = async (batchId: string, mockData: ChatActionMock) => {
    if (!mockData) return
    const newMock: MockExam = {
      ...baseRecord(userId),
      title: mockData.title || `AI 测验 · ${subjects[0]?.name || '综合'}`,
      exam_date: mockData.exam_date || today,
      total_score: Number(mockData.total_score) || 80,
      target_score: Number(mockData.target_score) || 100,
      rank: null,
    }
    await upsert('mock_exams', newMock)

    if (Array.isArray(mockData.scores)) {
      for (const s of mockData.scores) {
        const matched = subjects.find(
          (sub) => sub.name.trim().toLowerCase() === String(s.subject || '').trim().toLowerCase()
        )
        if (matched) {
          const newScore: MockScore = {
            ...baseRecord(userId),
            mock_exam_id: newMock.id,
            subject_id: matched.id,
            score: Number(s.score) || 0,
            total_score: Number(s.total_score) || 100,
          }
          await upsert('mock_scores', newScore)
        }
      }
    } else if (subjects[0]) {
      const newScore: MockScore = {
        ...baseRecord(userId),
        mock_exam_id: newMock.id,
        subject_id: subjects[0].id,
        score: Number(mockData.total_score) || 80,
        total_score: Number(mockData.target_score) || 100,
      }
      await upsert('mock_scores', newScore)
    }

    setAddedMockBatches((prev) => ({ ...prev, [batchId]: true }))
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleClearHistory = () => {
    if (window.confirm('确定要清空与 AI 伴学的对话记录吗？')) {
      setMessages([])
      localStorage.removeItem(STORAGE_KEY_HISTORY)
    }
  }

  // Save Settings Form
  const handleSaveSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const newKey = String(form.get('apiKey') || '').trim()
    const newEndpoint = String(form.get('endpoint') || '').trim() || 'https://api.deepseek.com'
    const newModel = String(form.get('model') || '').trim() || 'deepseek-chat'
    const newTier = (String(form.get('tier') || 'mid')) as 'low' | 'mid' | 'high'
    const newThinking = form.get('thinking') === 'on'

    setApiKey(newKey)
    setApiEndpoint(newEndpoint)
    setModel(newModel)
    setTier(newTier)
    setThinkingMode(newThinking)

    localStorage.setItem(STORAGE_KEY_API_KEY, newKey)
    localStorage.setItem(STORAGE_KEY_ENDPOINT, newEndpoint)
    localStorage.setItem(STORAGE_KEY_MODEL, newModel)
    localStorage.setItem(STORAGE_KEY_TIER, newTier)
    localStorage.setItem(STORAGE_KEY_THINKING, newThinking ? 'true' : 'false')

    setSettingsOpen(false)
  }

  // Welcome Hero Cards
  const welcomeCards = [
    {
      icon: BookOpen,
      iconBg: 'rgba(0, 111, 238, 0.12)',
      iconColor: 'var(--accent)',
      title: '生成政治33题全真模考',
      desc: '33题真题规格，在线作答评分',
      prompt: '请为我生成一套考研政治全真模拟测试卷，包含完整的33道选择题（16道单选+17道多选，满分50分），覆盖马原、毛中特、史纲、思修与当代，生成模考卡片供我作答。',
    },
    {
      icon: Award,
      iconBg: 'rgba(120, 40, 200, 0.14)',
      iconColor: 'var(--secondary)',
      title: '快速随堂 AI 测验',
      desc: '5~10题自选题量，专项速测',
      isQuizPopup: true,
      prompt: '',
    },
    {
      icon: CalendarPlus,
      iconBg: 'rgba(0, 111, 238, 0.12)',
      iconColor: 'var(--accent)',
      title: '规划今日冲刺任务',
      desc: '智能编排今日核心待办清单',
      prompt: '请根据我当前的科目与今日待办进度，帮我规划今天剩余时间的冲刺任务清单，给出合理的时段和预计时长。',
    },
    {
      icon: CheckCircle2,
      iconBg: 'rgba(23, 201, 100, 0.14)',
      iconColor: '#16a34a',
      title: '科目弱项与错题诊断',
      desc: '分析薄弱科目与错题突破口',
      prompt: '请根据我当前各科目的复习状态和未掌握错题情况，帮我诊断现阶段最值得攻坚的科目薄弱点是什么？',
    },
  ]

  // Quick Chips (visible during conversation)
  const quickChips = [
    { label: '生成政治33题全真模考卷', prompt: '请帮我出一套考研政治33道全真选择题模拟卷，并在卡片中提供考试入口。' },
    { label: '开启 AI 随堂小测', prompt: '请根据我的薄弱点出一套 5 题专项单选测验。' },
    { label: '规划今日剩余任务', prompt: '请帮我规划今天剩余时间的冲刺任务，给出建议时段与时长。' },
    { label: '状态不佳请求减负', prompt: '今天状态不好，请帮我精简今日任务，挑选最关键的保底项。' },
  ]

  return (
    <div className="hero-chat-container">
      {/* Sleek Hero UI Navigation Bar */}
      <header className="hero-chat-navbar">
        <div className="hero-chat-navbar-left">
          <div className="hero-avatar-badge">
            <BotMessageSquare size={18} />
            <span className="hero-avatar-pulse" />
          </div>
          <div className="hero-navbar-meta">
            <span className="hero-navbar-title">AI 伴学伙伴</span>
            <button
              type="button"
              className="hero-model-chip"
              onClick={() => setSettingsOpen(true)}
              title="点击配置模型参数与档位"
            >
              <Zap size={11} />
              <span>{model} · {tier === 'high' ? '高档' : tier === 'low' ? '低档' : '中档'}</span>
            </button>
          </div>

          <div className="hero-telemetry-tags">
            <span className="hero-tag">
              倒计时 <strong>{daysLeft}天</strong>
            </span>
            <span className="hero-tag">
              今日待办 <strong>{todayDone}/{todayTasks.length}</strong>
            </span>
            <span className="hero-tag">
              活跃科目 <strong>{subjects.length}门</strong>
            </span>
          </div>
        </div>

        <div className="hero-chat-navbar-right">
          <button
            type="button"
            className="hero-header-btn"
            style={{
              color: 'var(--accent-text)',
              borderColor: 'rgba(0,111,238,0.25)',
              background: 'var(--accent-soft)',
            }}
            onClick={() => setQuizOpen(true)}
            title="启动 AI 随堂测验并可一键加入模考"
          >
            <BookOpen size={14} />
            <span>AI 测验</span>
          </button>
          <button
            type="button"
            className="hero-header-btn"
            onClick={() => setSettingsOpen(true)}
            title="配置 API Key 与模型"
          >
            <Key size={14} />
            <span>{apiKey ? '已配置 Key' : 'API 配置'}</span>
          </button>
          <button
            type="button"
            className="hero-header-btn"
            onClick={handleClearHistory}
            title="清空对话记录"
          >
            <RotateCcw size={14} />
            <span>新对话</span>
          </button>
        </div>
      </header>

      {/* Main Chat Scroll Canvas */}
      <main className="hero-chat-canvas">
        <div className={`hero-chat-col ${messages.length === 0 ? 'is-welcome' : ''}`}>
          {/* Welcome Screen (when conversation is fresh) */}
          {messages.length === 0 ? (
            <div className="hero-welcome-section">
              <div className="hero-welcome-badge">
                <Sparkles size={24} />
              </div>
              <h2 className="hero-welcome-title">今天想攻克哪个难关？</h2>
              <p className="hero-welcome-subtitle">
                随时为你组卷测验与规划冲刺日程。
              </p>

              <div className="hero-welcome-grid">
                {welcomeCards.map((card, idx) => {
                  const Icon = card.icon
                  return (
                    <div
                      key={idx}
                      className="hero-suggestion-card"
                      onClick={() => {
                        if (card.isQuizPopup) {
                          setQuizOpen(true)
                        } else {
                          handleSend(card.prompt)
                        }
                      }}
                    >
                      <div
                        className="hero-card-icon"
                        style={{ background: card.iconBg, color: card.iconColor }}
                      >
                        <Icon size={17} />
                      </div>
                      <div className="hero-card-content">
                        <h4>{card.title}</h4>
                        <p>{card.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Conversational Messages Stream */
            messages.map((msg, idx) => {
              const isAssistant = msg.role === 'assistant'
              const hasThinking = Boolean(msg.reasoningContent?.trim())
              const isThinkingOpen = expandedThinking[msg.id] ?? false
              const hasActions = msg.actions && msg.actions.length > 0

              if (!isAssistant) {
                return (
                  <div key={msg.id || idx} className="hero-message-row user">
                    <div className="hero-user-bubble">{msg.content}</div>
                  </div>
                )
              }

              return (
                <div key={msg.id || idx} className="hero-message-row assistant">
                  <div className="hero-assistant-wrap">
                    <div className="hero-assistant-avatar">
                      <BotMessageSquare size={17} />
                    </div>

                    <div className="hero-assistant-card">
                      <div className="hero-assistant-header">
                        <span className="hero-assistant-name">AI 伴学</span>
                        <span className="hero-assistant-time">{msg.timestamp}</span>
                      </div>

                      {/* Thinking Accordion */}
                      {hasThinking && (
                        <div className="hero-thinking-box">
                          <button
                            type="button"
                            className="hero-thinking-btn"
                            onClick={() =>
                              setExpandedThinking((prev) => ({
                                ...prev,
                                [msg.id]: !isThinkingOpen,
                              }))
                            }
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Sparkles size={13} />
                              深度推演逻辑过程
                            </span>
                            {isThinkingOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {isThinkingOpen && (
                            <div className="hero-thinking-body">{msg.reasoningContent}</div>
                          )}
                        </div>
                      )}

                      {/* Content Typography */}
                      <div className="hero-markdown-body">
                        {msg.content.split('\n').map((paragraph, pIdx) => {
                          if (!paragraph.trim()) return <div key={pIdx} style={{ height: 8 }} />
                          return <p key={pIdx}>{paragraph}</p>
                        })}
                      </div>

                      {/* Interactive Action Cards */}
                      {hasActions &&
                        msg.actions!.map((act, aIdx) => {
                          const batchId = `${msg.id}-action-${aIdx}`

                          // 1. Full Mock Paper Action Card (e.g. 33-question Politics)
                          if (act.action === 'create_full_mock_paper') {
                            const paper = act.paper || DEFAULT_POLITICS_33_PAPER
                            return (
                              <div className="ai-mock-paper-card" key={aIdx}>
                                <div className="ai-mock-header">
                                  <strong>
                                    <BookOpen size={16} className="text-accent" />
                                    {paper.title}
                                  </strong>
                                  <span className="exam-type-pill">{paper.subject_name}</span>
                                </div>

                                <div className="ai-mock-badges">
                                  <span className="ai-mock-badge">
                                    题量：<strong>{paper.total_questions} 题</strong>
                                  </span>
                                  <span className="ai-mock-badge">
                                    满分：<strong>{paper.total_score} 分</strong>
                                  </span>
                                  <span className="ai-mock-badge">
                                    建议时长：<strong>{paper.duration_minutes} 分钟</strong>
                                  </span>
                                </div>

                                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                                  {paper.description || '试卷已生成完毕，已自动同步至系统模考库。'}
                                </p>

                                <div className="ai-mock-btn-row">
                                  <button
                                    type="button"
                                    className="primary-btn"
                                    style={{ minHeight: 34, fontSize: 12.5, padding: '0 16px' }}
                                    onClick={() => setActiveOnlineExamPaper(paper)}
                                  >
                                    <FileCheck2 size={15} />
                                    <span>立即进入在线考场考试</span>
                                  </button>

                                  <a
                                    href="#/mocks"
                                    className="secondary-btn"
                                    style={{ minHeight: 34, fontSize: 12.5, padding: '0 14px' }}
                                  >
                                    <span>去【模考记录】中考试</span>
                                    <ArrowRight size={13} />
                                  </a>
                                </div>
                              </div>
                            )
                          }

                          // 2. Task creation action card
                          if (act.action === 'create_tasks') {
                            const isAdded = addedActionBatches[batchId]
                            return (
                              <div className="hero-action-box" key={aIdx}>
                                <div className="hero-action-header">
                                  <strong>
                                    <CalendarPlus size={15} className="text-accent" />
                                    建议待办计划 ({act.tasks.length} 项)
                                  </strong>
                                  <button
                                    type="button"
                                    className={`hero-action-btn ${isAdded ? 'done' : ''}`}
                                    disabled={isAdded}
                                    onClick={() => handleAddTasks(batchId, act.tasks)}
                                  >
                                    {isAdded ? (
                                      <>
                                        <Check size={13} /> 已加入日历
                                      </>
                                    ) : (
                                      <>
                                        <Plus size={13} /> 一键写入日历任务
                                      </>
                                    )}
                                  </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {act.tasks.map((taskItem, tIdx) => (
                                    <div className="hero-task-row" key={tIdx}>
                                      <span className="hero-task-dot" />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <strong style={{ display: 'block', color: 'var(--ink)' }}>
                                          {taskItem.title}
                                        </strong>
                                        <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                                          {taskItem.date || today} · {taskItem.period || '全天'} ·{' '}
                                          {taskItem.duration || 45} 分钟 ·{' '}
                                          {taskItem.subject || '未分类'}
                                        </small>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          }

                          // 3. Mock exam record action card
                          if (act.action === 'create_mock_exam') {
                            const isMockAdded = addedMockBatches[batchId]
                            const mock = act.mock
                            return (
                              <div className="hero-action-box" key={aIdx}>
                                <div className="hero-action-header">
                                  <strong>
                                    <Award size={15} className="text-accent" />
                                    AI 测验战报 · {mock.title || '模拟测验'} ({mock.total_score}/{mock.target_score}分)
                                  </strong>
                                  <button
                                    type="button"
                                    className={`hero-action-btn ${isMockAdded ? 'done' : ''}`}
                                    disabled={isMockAdded}
                                    onClick={() => handleAddMock(batchId, mock)}
                                  >
                                    {isMockAdded ? (
                                      <>
                                        <Check size={13} /> 已加入模考
                                      </>
                                    ) : (
                                      <>
                                        <Award size={13} /> 一键生成加入模考
                                      </>
                                    )}
                                  </button>
                                </div>

                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                                  考试日期：{mock.exam_date || today} · 总分：
                                  <strong style={{ color: 'var(--accent-text)', marginLeft: 4 }}>
                                    {mock.total_score}
                                  </strong>
                                  /{mock.target_score}
                                </div>

                                {isMockAdded && (
                                  <div style={{ marginTop: 8 }}>
                                    <a
                                      href="#/mocks"
                                      style={{
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        color: 'var(--accent)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                      }}
                                    >
                                      <span>前往【模考记录】查看总分趋势</span>
                                      <ArrowRight size={12} />
                                    </a>
                                  </div>
                                )}
                              </div>
                            )
                          }

                          return null
                        })}

                      {/* Footer Actions */}
                      <div className="hero-msg-actions">
                        <button
                          type="button"
                          className="hero-copy-btn"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="复制回答"
                        >
                          {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedId === msg.id ? '已复制' : '复制'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {/* Loading Bubble */}
          {loading && (
            <div className="hero-message-row assistant">
              <div className="hero-assistant-wrap">
                <div className="hero-assistant-avatar">
                  <BotMessageSquare size={17} />
                </div>
                <div className="hero-assistant-card" style={{ maxWidth: 300 }}>
                  <div className="hero-loading-dots">
                    <span className="hero-dot" />
                    <span className="hero-dot" />
                    <span className="hero-dot" />
                    <span style={{ fontSize: 12.5, color: 'var(--muted)', marginLeft: 6 }}>
                      AI 正在深度思考并排版组卷...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>
      </main>

      {/* Floating Bottom Dock */}
      <footer className="hero-dock-wrapper">
        <div className="hero-dock-inner">
          {/* Quick chips if in conversation */}
          {messages.length > 0 && (
            <div className="hero-quick-chips">
              {quickChips.map((chip, cIdx) => (
                <button
                  key={cIdx}
                  type="button"
                  className="hero-quick-chip"
                  disabled={loading}
                  onClick={() => handleSend(chip.prompt)}
                >
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Composite Hero Input Card */}
          <form
            className="hero-input-box"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
            <textarea
              ref={textareaRef}
              className="hero-textarea"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="输入复习疑问或测验需求... (Enter 发送)"
              disabled={loading}
            />

            <div className="hero-input-toolbar">
              <div className="hero-input-tools-left">
                <button
                  type="button"
                  className={`hero-tool-pill ${thinkingMode ? 'active' : ''}`}
                  onClick={() => {
                    const next = !thinkingMode
                    setThinkingMode(next)
                    localStorage.setItem(STORAGE_KEY_THINKING, next ? 'true' : 'false')
                  }}
                  title="开关深度思考推演模式"
                >
                  <Brain size={12} />
                  <span>思考模式: {thinkingMode ? '开' : '关'}</span>
                </button>

                <button
                  type="button"
                  className="hero-tool-pill"
                  onClick={() => {
                    const nextTier = tier === 'low' ? 'mid' : tier === 'mid' ? 'high' : 'low'
                    setTier(nextTier)
                    localStorage.setItem(STORAGE_KEY_TIER, nextTier)
                  }}
                  title="切换高中低档位"
                >
                  <Zap size={12} />
                  <span>档位: {tier === 'high' ? '高档' : tier === 'low' ? '低档' : '中档'}</span>
                </button>

                <button
                  type="button"
                  className="hero-tool-pill"
                  style={{ color: 'var(--accent-text)', background: 'var(--accent-soft)' }}
                  onClick={() => setQuizOpen(true)}
                  title="开启随堂小测"
                >
                  <BookOpen size={12} />
                  <span>随堂测验</span>
                </button>
              </div>

              <button
                type="submit"
                className="hero-send-btn"
                disabled={!input.trim() || loading}
                title="发送消息"
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </form>
        </div>
      </footer>

      {/* Quick Quiz Modal */}
      {quizOpen && (
        <AiQuizModal onClose={() => setQuizOpen(false)} />
      )}

      {/* Full Online Exam Hall Modal */}
      {activeOnlineExamPaper && (
        <OnlineExamModal
          paper={activeOnlineExamPaper}
          onClose={() => setActiveOnlineExamPaper(null)}
          onFinish={() => {
            // refresh
          }}
        />
      )}

      {/* Model & API Configuration Modal */}
      {settingsOpen && (
        <Modal title="AI 伴学服务与模型配置" onClose={() => setSettingsOpen(false)}>
          <form className="form-grid" onSubmit={handleSaveSettings}>
            <label className="full">
              <strong>自定义模型名称 (Model ID)</strong>
              <input
                id="model-input-field"
                name="model"
                defaultValue={model}
                placeholder="例如 deepseek-chat, deepseek-reasoner, gpt-4o, claude-3-5-sonnet..."
                required
                autoFocus
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>常用填入：</span>
                {['deepseek-chat', 'deepseek-reasoner', 'gpt-4o', 'qwen-plus'].map((mName) => (
                  <button
                    key={mName}
                    type="button"
                    className="hero-tool-pill"
                    onClick={() => {
                      const el = document.getElementById('model-input-field') as HTMLInputElement
                      if (el) el.value = mName
                    }}
                  >
                    {mName}
                  </button>
                ))}
              </div>
            </label>

            <label className="full">
              <strong>性能档位选择</strong>
              <select name="tier" defaultValue={tier} className="quiz-config-select">
                <option value="low">低档</option>
                <option value="mid">中档</option>
                <option value="high">高档</option>
              </select>
            </label>

            <label className="full" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-secondary)', padding: '12px 14px', borderRadius: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="thinking"
                defaultChecked={thinkingMode}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>
                  开启深度思考模式
                </strong>
              </div>
            </label>

            <label className="full">
              <strong>API Key (密钥)</strong>
              <input
                name="apiKey"
                type="password"
                defaultValue={apiKey}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </label>

            <label className="full">
              <strong>API 端点 (Base URL)</strong>
              <input
                name="endpoint"
                defaultValue={apiEndpoint}
                placeholder="https://api.deepseek.com"
              />
            </label>

            <div className="full button-row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setSettingsOpen(false)}
              >
                取消
              </button>
              <button type="submit" className="primary-btn">
                保存配置
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
