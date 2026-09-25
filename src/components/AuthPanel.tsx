import { useState } from 'react'
import { Check, Copy, RefreshCw, Sparkles, X } from 'lucide-react'
import { useData } from '../data/DataContext'
import { supabase } from '../data/supabase'
import { readLegacyStorage } from '../data/migrateLegacy'

export function AuthPanel({ onClose }: { onClose: () => void }) {
  const { syncId, setSyncId, generateNewSyncId, syncState, syncError, lastSyncTime, sync, importLegacy } = useData()
  const [inputSyncId, setInputSyncId] = useState(syncId || '')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const hasLocalLegacy = Boolean(readLegacyStorage())

  // Account state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountMessage, setAccountMessage] = useState('')

  const handleSave = async () => {
    const val = inputSyncId.trim()
    setBusy(true)
    try {
      await setSyncId(val)
      setTimeout(() => {
        onClose()
      }, 400)
    } catch {
      // Handled in context
    } finally {
      setBusy(false)
    }
  }

  const handleGenerate = () => {
    const newId = generateNewSyncId()
    setInputSyncId(newId)
  }

  const handleCopy = async () => {
    if (!inputSyncId) return
    try {
      await navigator.clipboard.writeText(inputSyncId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleClear = async () => {
    setInputSyncId('')
    await setSyncId('')
  }

  const actAccount = async (mode: 'in' | 'up' | 'reset') => {
    if (!supabase) return
    setBusy(true)
    setAccountMessage('')
    const result =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : mode === 'up'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.resetPasswordForEmail(email)
    setBusy(false)
    setAccountMessage(
      result.error?.message ?? (mode === 'reset' ? '重置密码邮件已发送' : '操作完成')
    )
    if (!result.error && mode === 'in') setTimeout(onClose, 450)
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        className="modal-card clean-auth-card"
        role="dialog"
        aria-modal="true"
        aria-label="设置同步 ID"
      >
        <button
          className="icon-btn modal-close"
          onClick={onClose}
          aria-label="关闭弹窗"
        >
          <X size={18} />
        </button>

        {!showEmail ? (
          <>
            <div className="clean-auth-header">
              <h3>设置同步 ID</h3>
              <p>设置相同的 ID 即可在手机和电脑间同步所有数据。</p>
            </div>

            <div className="clean-sync-input-group">
              <input
                type="text"
                className="clean-sync-input"
                value={inputSyncId}
                onChange={(e) => setInputSyncId(e.target.value.trim())}
                placeholder="输入或生成同步 ID..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSave()
                }}
                autoFocus
              />
              <div className="clean-input-actions">
                <button
                  type="button"
                  className="icon-action-btn"
                  onClick={handleGenerate}
                  title="随机生成 6 位 ID"
                >
                  <Sparkles size={15} />
                </button>
                {inputSyncId && (
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={handleCopy}
                    title="复制同步 ID"
                  >
                    {copied ? <Check size={15} color="var(--success)" /> : <Copy size={15} />}
                  </button>
                )}
              </div>
            </div>

            {/* Status Line */}
            <div className="clean-sync-status">
              {busy || syncState === 'syncing' ? (
                <span className="sync-status-text syncing">
                  <RefreshCw size={12} className="animate-spin" />
                  <span>正在同步云端...</span>
                </span>
              ) : syncState === 'synced' ? (
                <span className="sync-status-text success">
                  <span className="sync-dot synced" />
                  <span>云端已连接{lastSyncTime ? ` · 上次同步 ${lastSyncTime}` : ''}</span>
                </span>
              ) : syncState === 'error' ? (
                <span className="sync-status-text error" title={syncError || ''}>
                  <span className="sync-dot error" />
                  <span>{syncError ? (syncError.includes('fetch') ? '云端网络超时，数据已保存在本机' : `云端提示: ${syncError.slice(0, 24)}...`) : '已保存在本机离线存储'}</span>
                </span>
              ) : (
                <span className="sync-status-text muted">
                  <span className="sync-dot" />
                  <span>本地离线模式 (数据安全保存在本机)</span>
                </span>
              )}
            </div>

            <div className="clean-button-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={onClose}
              >
                取消
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={busy}
                onClick={handleSave}
              >
                {busy ? '正在保存...' : '确认'}
              </button>
            </div>

            <div className="clean-auth-footer">
              {hasLocalLegacy && (
                <button
                  type="button"
                  className="text-subtle-btn"
                  style={{ color: 'var(--primary, #006fee)' }}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await importLegacy()
                      setTimeout(onClose, 500)
                    } finally {
                      setBusy(false)
                    }
                  }}
                  title="检测到当前浏览器存有旧版数据，点击快速导入"
                >
                  从本机旧版一键恢复
                </button>
              )}
              {syncId && (
                <button
                  type="button"
                  className="text-subtle-btn"
                  onClick={handleClear}
                >
                  清除此 ID
                </button>
              )}
              <button
                type="button"
                className="text-subtle-btn"
                onClick={() => setShowEmail(true)}
              >
                邮箱账号登录
              </button>
            </div>
          </>
        ) : (
          <div className="account-panel">
            <div className="clean-auth-header">
              <h3>云端账号登录</h3>
              <p>使用邮箱账号在多设备间同步数据。</p>
            </div>

            <label>
              电子邮箱
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoFocus
              />
            </label>

            <label>
              账号密码
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                placeholder="至少 6 位字符"
              />
            </label>

            {accountMessage && <div className="form-message">{accountMessage}</div>}

            <div className="clean-button-row">
              <button
                className="secondary-btn"
                disabled={busy || !email || password.length < 6}
                onClick={() => actAccount('up')}
              >
                注册
              </button>
              <button
                className="primary-btn"
                disabled={busy || !email || password.length < 6}
                onClick={() => actAccount('in')}
              >
                {busy ? '请稍候...' : '登录'}
              </button>
            </div>

            <div className="clean-auth-footer">
              <button
                type="button"
                className="text-subtle-btn"
                onClick={() => setShowEmail(false)}
              >
                ← 返回同步 ID 模式
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
