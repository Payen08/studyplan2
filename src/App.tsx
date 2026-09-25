import { Component, lazy, ReactNode, Suspense, useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthPanel } from './components/AuthPanel'
import { supabase } from './data/supabase'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[Global ErrorBoundary caught]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f5', padding: 24 }}>
          <div style={{ maxWidth: 500, width: '100%', background: '#fff', border: '1px solid #e4e4e7', borderRadius: 16, padding: 28, boxShadow: '0 10px 25px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#18181b' }}>
              页面加载遇到问题
            </h2>
            <p style={{ fontSize: 13, color: '#f31260', margin: '0 0 16px', wordBreak: 'break-word' }}>
              {this.state.error?.message || '运行时发生异常'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                style={{ padding: '8px 18px', borderRadius: 8, background: '#006fee', color: '#fff', border: 0, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                onClick={() => window.location.reload()}
              >
                刷新页面
              </button>
              <button
                type="button"
                style={{ padding: '8px 18px', borderRadius: 8, background: '#f4f4f5', color: '#18181b', border: '1px solid #e4e4e7', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                onClick={() => {
                  window.location.hash = '#/dashboard'
                  this.setState({ hasError: false, error: null })
                }}
              >
                返回工作台
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const Dashboard=lazy(()=>import('./pages/Dashboard').then(m=>({default:m.Dashboard})))
const Plans=lazy(()=>import('./pages/Plans').then(m=>({default:m.Plans})))
const Subjects=lazy(()=>import('./pages/Subjects').then(m=>({default:m.Subjects})))
const Papers=lazy(()=>import('./pages/Papers').then(m=>({default:m.Papers})))
const Weaknesses=lazy(()=>import('./pages/Weaknesses').then(m=>({default:m.Weaknesses})))
const Mocks=lazy(()=>import('./pages/Mocks').then(m=>({default:m.Mocks})))
const Library=lazy(()=>import('./pages/Library').then(m=>({default:m.Library})))
const AiChat=lazy(()=>import('./pages/AiChat').then(m=>({default:m.AiChat})))
const EnglishLab=lazy(()=>import('./pages/EnglishLab').then(m=>({default:m.EnglishLab})))
const Settings=lazy(()=>import('./pages/Settings').then(m=>({default:m.Settings})))

export default function App(){
  const [authOpen,setAuthOpen]=useState(false)
  useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();document.querySelector<HTMLInputElement>('[data-global-search]')?.focus()}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[])
  return (
    <ErrorBoundary>
      <HashRouter>
        <Suspense fallback={<div className="route-loading"><span/><span/><span/></div>}>
          <Routes>
            <Route element={<Layout onAuth={()=>setAuthOpen(true)}/> }>
              <Route index element={<Navigate to="/dashboard" replace/>}/>
              <Route path="/dashboard" element={<Dashboard/>}/>
              <Route path="/plans" element={<Plans/>}/>
              <Route path="/subjects" element={<Subjects/>}/>
              <Route path="/papers" element={<Papers/>}/>
              <Route path="/weaknesses" element={<Weaknesses/>}/>
              <Route path="/mocks" element={<Navigate to="/papers?tab=mocks" replace/>}/>
              <Route path="/library" element={<Library/>}/>
              <Route path="/ai" element={<AiChat/>}/>
              <Route path="/english" element={<EnglishLab/>}/>
              <Route path="/settings" element={<Settings onAuth={()=>setAuthOpen(true)}/>}/>
              <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
            </Route>
          </Routes>
        </Suspense>
        {authOpen && <AuthPanel onClose={() => setAuthOpen(false)} />}
      </HashRouter>
    </ErrorBoundary>
  )
}
