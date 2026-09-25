import { useState } from 'react'
import { CheckCircle2, Cloud, DatabaseBackup, ExternalLink, Fingerprint, RefreshCw, ShieldCheck } from 'lucide-react'
import { useData } from '../data/DataContext'
import { cloudConfigured, supabase } from '../data/supabase'

export function Settings({ onAuth }: { onAuth: () => void }) {
  const { data, userId, syncId, syncState, lastSyncTime, sync, importLegacy, upsert } = useData()
  const settings = data.user_settings[0]
  const [report, setReport] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const migrate = async () => {
    setBusy(true)
    const result = await importLegacy()
    setBusy(false)
    setReport(
      result
        ? `已迁移 ${result.subjects} 个科目、${result.tasks} 个任务、${result.folders} 个文件夹、${result.notes} 篇笔记。`
        : '没有找到可迁移的旧版数据。'
    )
  }

  return (
    <div className="settings-grid">
      <section className="settings-card">
        <span className="settings-icon">
          <Fingerprint size={20} />
        </span>
        <div>
          <span className="eyebrow">ACCOUNT & SYNC</span>
          <h2>多端同步 ID 与云端</h2>
          <p>
            {syncId ? (
              <>
                当前多端同步 ID：<strong style={{ fontFamily: 'monospace', color: 'var(--primary, #006fee)', background: 'var(--surface-secondary)', padding: '2px 6px', borderRadius: 4 }}>{syncId}</strong>
                {lastSyncTime ? ` · 上次同步: ${lastSyncTime}` : ''}
                <br />
                在手机、平板或电脑上设置相同的同步 ID 即可多端双向互通，无需邮箱密码。
              </>
            ) : (
              '当前处于本地离线模式，数据仅保存在本机。设置或生成同步 ID 即可在多设备间实时同步。'
            )}
          </p>
        </div>
        <div className="button-row">
          <button className="primary-btn" onClick={onAuth}>
            <Fingerprint size={16} />
            {syncId ? '修改/管理同步 ID' : '配置同步 ID'}
          </button>
          {syncId && (
            <button
              className="secondary-btn"
              disabled={syncState === 'syncing'}
              onClick={() => sync()}
            >
              <RefreshCw size={16} className={syncState === 'syncing' ? 'animate-spin' : ''} />
              {syncState === 'syncing' ? '同步中...' : '立即同步'}
            </button>
          )}
          {supabase && userId !== 'local-user' && userId !== syncId && (
            <button className="secondary-btn" onClick={() => supabase!.auth.signOut()}>
              退出云账号
            </button>
          )}
        </div>
      </section>

      <section className="settings-card">
        <span className="settings-icon">
          <DatabaseBackup size={20} />
        </span>
        <div>
          <span className="eyebrow">LEGACY MIGRATION</span>
          <h2>旧版数据迁移</h2>
          <p>
            从同源 localStorage 读取 <code>study_v2</code> 历史记录，迁移前保留原始快照，通过 legacy_id 避免重复。
          </p>
          {report && (
            <div className="success-message">
              <CheckCircle2 size={16} />
              {report}
            </div>
          )}
        </div>
        <button className="secondary-btn" disabled={busy} onClick={migrate}>
          <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
          {busy ? '正在迁移...' : '检查并迁移'}
        </button>
      </section>

      <section className="settings-card">
        <span className="settings-icon">
          <ShieldCheck size={20} />
        </span>
        <div>
          <span className="eyebrow">PRIVACY</span>
          <h2>数据安全与边界</h2>
          <p>
            云端数据库按 user_id 强制启用 Row Level Security (RLS) 行级隔离，所有文件资源使用私有存储桶。
          </p>
        </div>
      </section>

      <section className="settings-card">
        <span className="settings-icon">
          <ExternalLink size={20} />
        </span>
        <div>
          <span className="eyebrow">LEGACY VIEWER</span>
          <h2>旧版对照查看</h2>
          <p>
            过渡期间可以对照原有单页面日历、笔记本和配置。建议不要在新旧两端同时写入同项数据。
          </p>
        </div>
        <a className="secondary-btn" href="./legacy/" target="_blank" rel="noreferrer">
          打开旧版
        </a>
      </section>

      {settings && (
        <section className="settings-card full">
          <div>
            <span className="eyebrow">GOAL COUNTDOWN</span>
            <h2>冲刺目标与倒计时</h2>
          </div>
          <div className="inline-form">
            <label>
              目标考试/计划名称
              <input
                value={settings.exam_name}
                onChange={(e) =>
                  upsert('user_settings', { ...settings, exam_name: e.target.value })
                }
                placeholder="例如：2026 年度冲刺目标 / 考试计划"
              />
            </label>
            <label>
              目标考试日期
              <input
                type="date"
                value={settings.exam_date}
                onChange={(e) =>
                  upsert('user_settings', { ...settings, exam_date: e.target.value })
                }
              />
            </label>
          </div>
        </section>
      )}
    </div>
  )
}
