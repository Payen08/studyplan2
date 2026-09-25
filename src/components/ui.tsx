import { Layers3, X } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  children,
  wide = false,
  className = '',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  className?: string
}) {
  return (
    <div className={`modal-backdrop ${className}`} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className={`modal-card ${wide ? 'wide' : ''} ${className}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn modal-close" onClick={onClose} aria-label="关闭弹窗">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}

export function Empty({
  title,
  body,
  action,
  icon,
}: {
  title: string
  body?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-icon-wrap">
        {icon ?? <Layers3 size={26} className="text-muted" />}
      </div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  )
}

export function Progress({
  value,
  color,
  size = 'md',
}: {
  value: number
  color?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const clamped = Math.max(0, Math.min(100, isNaN(value) ? 0 : value))
  return (
    <div className={`progress-track progress-${size}`} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <span
        className="progress-indicator"
        style={{
          width: `${clamped}%`,
          background: color ? color : undefined,
        }}
      />
    </div>
  )
}

export function CircularProgress({
  value,
  size = 'md',
  color = 'primary',
  showValueLabel = true,
  label,
  strokeWidth,
  className = '',
}: {
  value: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  showValueLabel?: boolean
  label?: ReactNode
  strokeWidth?: number
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, isNaN(value) ? 0 : Math.round(value)))

  const config = {
    sm: { size: 36, stroke: strokeWidth ?? 3, fontSize: 10, labelSize: 10 },
    md: { size: 54, stroke: strokeWidth ?? 4, fontSize: 13, labelSize: 11 },
    lg: { size: 76, stroke: strokeWidth ?? 5.5, fontSize: 16, labelSize: 11.5 },
  }[size]

  const radius = (config.size - config.stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const center = config.size / 2

  return (
    <div
      className={`hero-circular-progress hero-circular-${size} hero-circular-${color} ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="hero-circular-svg-wrap" style={{ width: config.size, height: config.size }}>
        <svg
          width={config.size}
          height={config.size}
          viewBox={`0 0 ${config.size} ${config.size}`}
          className="hero-circular-svg"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            strokeWidth={config.stroke}
            className="hero-circular-track"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            strokeWidth={config.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="hero-circular-indicator"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </svg>
        {showValueLabel && (
          <span className="hero-circular-value" style={{ fontSize: config.fontSize }}>
            {clamped}%
          </span>
        )}
      </div>
      {label && <span className="hero-circular-label" style={{ fontSize: config.labelSize }}>{label}</span>}
    </div>
  )
}

export function SubjectDot({
  color,
  size = 8,
}: {
  color?: string
  size?: number
}) {
  return null
}

export function Chip({
  children,
  color = 'default',
  variant = 'flat',
  size = 'sm',
  className = '',
}: {
  children: ReactNode
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  variant?: 'flat' | 'solid' | 'bordered' | 'dot'
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <span className={`hero-chip hero-chip-${color} hero-chip-${variant} hero-chip-${size} ${className}`}>
      {variant === 'dot' && <span className="hero-chip-dot" />}
      {children}
    </span>
  )
}

export function Button({
  children,
  variant = 'solid',
  color = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'flat' | 'bordered' | 'light'
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <button
      className={`hero-btn hero-btn-${variant} hero-btn-${color} hero-btn-${size} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
