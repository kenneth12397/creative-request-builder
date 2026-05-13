import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const STYLES = {
  success: { border: '#22c55e', icon: '✓' },
  error:   { border: '#ef4444', icon: '✕' },
}

export default function Toast({ message, variant = 'success', onDismiss = () => {} }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 3000)
    return () => clearTimeout(id)
  }, [onDismiss])

  const { border, icon } = STYLES[variant] ?? STYLES.success

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderLeft: `4px solid ${border}`,
        borderRadius: '10px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        minWidth: '260px',
        zIndex: 9999,
      }}
    >
      <span style={{ color: border, fontSize: '1.1rem', fontWeight: 700 }}>{icon}</span>
      <span style={{ color: '#e2e8f0', fontSize: '0.875rem' }}>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          marginLeft: 'auto',
          background: 'none',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          fontSize: '1.1rem',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>,
    document.body
  )
}
