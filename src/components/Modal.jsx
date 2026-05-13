import { useEffect, useRef, useState, useId } from 'react'
import { createPortal } from 'react-dom'

// useEffect, useRef, useState used by InputModal (added in Task 4)

const OVERLAY_STYLE = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9998,
}

const BOX_STYLE = {
  background: '#16213e',
  border: '1px solid #0f3460',
  borderRadius: '12px',
  padding: '28px 32px',
  width: '400px',
  maxWidth: '90vw',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}) {
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmBg = confirmVariant === 'danger' ? '#ef4444' : '#6366f1'

  return createPortal(
    <div data-testid="confirm-overlay" style={OVERLAY_STYLE} onClick={onCancel}>
      <div
        style={BOX_STYLE}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
      >
        <h3
          id={titleId}
          style={{ margin: '0 0 8px', color: '#e2e8f0', fontSize: '1.1rem', fontWeight: 600 }}
        >
          {title}
        </h3>
        <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: '0.875rem' }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            autoFocus
            onClick={onCancel}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: confirmBg,
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// InputModal added in Task 4
export function InputModal() { return null }
