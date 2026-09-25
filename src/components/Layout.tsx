import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CalendarRange,
  ChartNoAxesCombined,
  FileCheck2,
  Fingerprint,
  FolderOpen,
  Gauge,
  LibraryBig,
  Languages,
  Menu,
  Moon,
  BotMessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sun,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useData } from '../data/DataContext'

const nav = [
  ['/dashboard', '工作台', Gauge],
  ['/plans', '学习计划', CalendarRange],
  ['/subjects', '科目进度', ChartNoAxesCombined],
  ['/papers', '试卷', FileCheck2],
  ['/weaknesses', '错题 & 薄弱点', TriangleAlert],
  ['/library', '资料库', LibraryBig],
  ['/ai', 'AI 伴学', BotMessageSquare],
  ['/english', '英语专项', Languages],
] as const

const pageCopy: Record<string, [string, string]> = {
  dashboard: ['工作台', '考研目标、分数预测与核心复习态势。'],
  plans: ['学习计划', '日历排程与每日复习安排。'],
  subjects: ['科目进度', '看清章节、专题与掌握程度。'],
  papers: ['试卷', '按科目管理、作答与记录试卷。'],
  weaknesses: ['错题 & 薄弱点', '从单道错题回到真正的知识缺口。'],
  mocks: ['试卷', '按科目管理、作答与记录试卷。'],
  library: ['资料库', '笔记、课程、PDF、题库和链接收在一处。'],
  ai: ['AI 伴学', '智能规划、答疑复盘与个性化备考伙伴。'],
  english: ['英语专项', '原文证据、翻译作文与错题复习。'],
  settings: ['设置', '账号、迁移、同步与外观。'],
}

export function Layout({ onAuth }: { onAuth: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const key = location.pathname.split('/')[1] || 'dashboard'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('study_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })
  const { data, syncState, syncId } = useData()
  const [dark, setDark] = useState(() => localStorage.getItem('study_theme_mode') === 'dark')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('study_sidebar_collapsed', String(next))
      } catch {}
      return next
    })
  }
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []
    const rows = [
      ...data.tasks.map((item) => ({ id: item.id, label: item.title, meta: '任务', to: '/plans' })),
      ...data.syllabus_nodes.map((item) => ({ id: item.id, label: item.title, meta: '大纲', to: '/subjects' })),
      ...data.mistakes.map((item) => ({ id: item.id, label: item.question_ref || item.error_reason, meta: '错题', to: '/weaknesses' })),
      ...data.notes.map((item) => ({ id: item.id, label: item.title, meta: '笔记', to: `/library?note=${item.id}` })),
      ...data.resources.map((item) => ({ id: item.id, label: item.title, meta: '资料', to: '/library' })),
      ...data.papers.map((item) => ({ id: item.id, label: `${item.year} ${item.title}`, meta: '试卷', to: '/papers' })),
      ...data.mock_exams.map((item) => ({ id: item.id, label: item.title, meta: '模考', to: '/papers?tab=mocks' })),
    ]
    return rows.filter((item) => item.label.toLowerCase().includes(query)).slice(0, 8)
  }, [data, searchQuery])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('study_theme_mode', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const links = nav.map(([to, label, Icon]) => (
    <NavLink
      key={to}
      to={to}
      title={label}
      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
    >
      <Icon size={18} />
      <span className="nav-label">{label}</span>
    </NavLink>
  ))

  return (
    <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <div
            className="brand-main"
            onClick={collapsed ? toggleCollapsed : undefined}
            role={collapsed ? 'button' : undefined}
            title={collapsed ? '点击展开侧边栏' : undefined}
          >
            <img src="./icon-512.png" alt="学习工作台 Logo" className="brand-logo-img" />
            <div className="brand-text">
              <strong>学习工作台</strong>
              <small>STUDY WORKBENCH</small>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn sidebar-collapse-btn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
            title={collapsed ? '展开侧栏' : '收起侧栏'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          {mobileOpen && (
            <button
              type="button"
              className="icon-btn sidebar-close"
              onClick={() => setMobileOpen(false)}
              aria-label="关闭导航"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <nav>{links}</nav>
        <div className="sidebar-foot">
          <button
            type="button"
            className="nav-link sidebar-foot-toggle"
            onClick={toggleCollapsed}
            title={collapsed ? '展开侧栏' : '收起侧栏'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span className="nav-label">{collapsed ? '展开侧栏' : '收起侧栏'}</span>
          </button>
          <NavLink
            to="/settings"
            title="设置"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Settings size={18} />
            <span className="nav-label">设置</span>
          </NavLink>
          <a className="nav-link" href="./legacy/" target="_blank" rel="noreferrer" title="旧版核对">
            <FolderOpen size={18} />
            <span className="nav-label">旧版核对</span>
          </a>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="关闭导航遮罩"
        />
      )}

      <div className="app-stage">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="打开导航"
          >
            <Menu size={20} />
          </button>
          <button
            type="button"
            className="icon-btn desktop-sidebar-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="page-heading">
            <h1>{pageCopy[key]?.[0]}</h1>
            <p>{pageCopy[key]?.[1]}</p>
          </div>
          <div className="top-actions">
            <label className="global-search" onFocus={() => setSearchOpen(true)} onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}>
              <Search size={16} />
              <input data-global-search value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索任务、错题和笔记 ⌘K" />
              {searchOpen && searchQuery && <div className="global-search-results">{searchResults.length ? searchResults.map((item) => <button key={`${item.meta}:${item.id}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { navigate(item.to); setSearchOpen(false); setSearchQuery('') }}><span>{item.meta}</span><strong>{item.label}</strong></button>) : <p>没有找到匹配内容</p>}</div>}
            </label>
            <button
              className="icon-btn"
              onClick={() => setDark(!dark)}
              aria-label="切换外观"
              title={dark ? '切换为浅色模式' : '切换为深色模式'}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="account-btn"
              onClick={onAuth}
              title={syncId ? `当前同步ID: ${syncId} (点击管理同步或切换)` : '点击设置同步ID以在多端同步'}
            >
              <span className={`sync-dot ${syncState}`} />
              <Fingerprint size={16} className="text-blue-500" style={{ color: '#006fee' }} />
              <span className="sync-id-text">
                {syncId ? `同步ID: ${syncId}` : '设置同步ID'}
              </span>
            </button>
          </div>
        </header>

        <main id="main-content">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav">
        {nav.slice(0, 4).map(([to, label, Icon]) => (
          <NavLink key={to} to={to}>
            <Icon size={20} />
            <span>{label.replace(' & 薄弱点', '').replace(' & 模考', '')}</span>
          </NavLink>
        ))}
        <button onClick={() => setMobileOpen(true)}>
          <Menu size={20} />
          <span>更多</span>
        </button>
      </nav>
    </div>
  )
}
