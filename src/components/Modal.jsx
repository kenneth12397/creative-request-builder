import { useEffect, useState, useId } from 'react'
import { createPortal } from 'react-dom'

// useEffect, useState used by InputModal and ConfirmModal

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

export function InputModal({ isOpen, title, placeholder = '', onSubmit, onCancel }) {
  const [value, setValue] = useState('')
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) return
    setValue('')
  }, [isOpen])

  // Escape key handler (same pattern as ConfirmModal)
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setValue('')
  }

  const isSubmittable = value.trim().length > 0

  return createPortal(
    <div data-testid="input-overlay" style={OVERLAY_STYLE} onClick={onCancel}>
      <div
        style={BOX_STYLE}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
      >
        <h3
          id={titleId}
          style={{ margin: '0 0 14px', color: '#e2e8f0', fontSize: '1.1rem', fontWeight: 600 }}
        >
          {title}
        </h3>
        <textarea
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{
            width: '100%',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#e2e8f0',
            padding: '10px',
            fontSize: '0.875rem',
            resize: 'vertical',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button
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
            onClick={handleSubmit}
            disabled={!isSubmittable}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: '#6366f1',
              color: 'white',
              cursor: isSubmittable ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: 500,
              opacity: isSubmittable ? 1 : 0.5,
            }}
          >
            Submit Note
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
