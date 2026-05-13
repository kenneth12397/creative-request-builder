# Phase 1 UX Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace native browser dialogs and drag-and-drop with proper React components, add edit/delete/toast flows, and debounce a performance issue — making the Creative Request Builder fully usable by both marketing associates and designers.

**Architecture:** Three new standalone components (`Toast`, `ConfirmModal`/`InputModal`, `StatusDropdown`) are built and tested in isolation first, then wired into the existing monolith. Drag-and-drop is removed entirely; all Supabase mutations are wrapped in try/catch and report via Toast.

**Tech Stack:** React 18, Vite, Supabase JS client, Vitest, @testing-library/react, @testing-library/user-event

---

## File Map

```
src/
  components/
    Toast.jsx                          ← NEW
    Modal.jsx                          ← NEW (exports ConfirmModal + InputModal)
    StatusDropdown.jsx                 ← NEW (exports default + STATUS_COLORS + STATUSES)
    __tests__/
      Toast.test.jsx                   ← NEW
      Modal.test.jsx                   ← NEW
      StatusDropdown.test.jsx          ← NEW
  creative_brief_builder_prototype.jsx ← MODIFY (all wiring) — NOTE: this file is at the REPO ROOT, not inside src/
```

---

## Task 1: Verify test infrastructure

**Files:**
- Check: `package.json`, `vite.config.js` or `vitest.config.js`

**Note:** Vitest, @testing-library/react, @testing-library/jest-dom, and jsdom are already installed. `vite.config.js` already has the test block and `src/test-setup.js` exists. The ONLY missing dependency is `@testing-library/user-event`.

- [ ] **Step 1: Install user-event**

```bash
npm install -D @testing-library/user-event
```

- [ ] **Step 2: Verify setup works**

```bash
npm run test
```

Expected: existing deliverables tests pass (around 14 tests).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @testing-library/user-event"
```

---

## Task 2: Toast component

**Files:**
- Create: `src/components/Toast.jsx`
- Create: `src/components/__tests__/Toast.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/Toast.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Toast from '../Toast'

describe('Toast', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.restoreAllMocks() })

  it('renders the message', () => {
    render(<Toast message="Request saved" variant="success" onDismiss={() => {}} />)
    expect(screen.getByText('Request saved')).toBeInTheDocument()
  })

  it('calls onDismiss after 3000ms', () => {
    const onDismiss = vi.fn()
    render(<Toast message="Done" variant="success" onDismiss={onDismiss} />)
    act(() => { vi.advanceTimersByTime(3000) })
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('does not call onDismiss before 3000ms', () => {
    const onDismiss = vi.fn()
    render(<Toast message="Done" variant="success" onDismiss={onDismiss} />)
    act(() => { vi.advanceTimersByTime(2999) })
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('calls onDismiss when dismiss button clicked', async () => {
    const onDismiss = vi.fn()
    render(<Toast message="Done" variant="success" onDismiss={onDismiss} />)
    await userEvent.click(screen.getByLabelText('Dismiss'))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('applies green left border for success variant', () => {
    render(<Toast message="OK" variant="success" onDismiss={() => {}} />)
    const el = screen.getByRole('status')
    expect(el.style.borderLeft).toContain('#22c55e')
  })

  it('applies red left border for error variant', () => {
    render(<Toast message="Fail" variant="error" onDismiss={() => {}} />)
    const el = screen.getByRole('status')
    expect(el.style.borderLeft).toContain('#ef4444')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test:run -- Toast
```

Expected: `Cannot find module '../Toast'`

- [ ] **Step 3: Create `src/components/Toast.jsx`**

```jsx
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const STYLES = {
  success: { border: '#22c55e', icon: '✓' },
  error:   { border: '#ef4444', icon: '✕' },
}

export default function Toast({ message, variant = 'success', onDismiss }) {
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test:run -- Toast
```

Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add src/components/Toast.jsx src/components/__tests__/Toast.test.jsx
git commit -m "feat: add Toast component with success and error variants"
```

---

## Task 3: ConfirmModal component

**Files:**
- Create: `src/components/Modal.jsx`
- Create: `src/components/__tests__/Modal.test.jsx`

- [ ] **Step 1: Write the failing tests for ConfirmModal**

Create `src/components/__tests__/Modal.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmModal, InputModal } from '../Modal'

describe('ConfirmModal', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <ConfirmModal isOpen={false} title="Delete?" message="Sure?" onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders title and message when isOpen is true', () => {
    render(
      <ConfirmModal isOpen title="Delete Request?" message="This cannot be undone." onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(screen.getByText('Delete Request?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('shows custom confirmLabel', () => {
    render(
      <ConfirmModal isOpen title="Del?" message="Sure?" confirmLabel="Remove" onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmModal isOpen title="Del?" message="Sure?" confirmLabel="Delete" onConfirm={onConfirm} onCancel={() => {}} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when Cancel clicked', async () => {
    const onCancel = vi.fn()
    render(
      <ConfirmModal isOpen title="Del?" message="Sure?" onConfirm={() => {}} onCancel={onCancel} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when overlay clicked', async () => {
    const onCancel = vi.fn()
    render(
      <ConfirmModal isOpen title="Del?" message="Sure?" onConfirm={() => {}} onCancel={onCancel} />
    )
    // Click the overlay (parent of dialog)
    await userEvent.click(document.querySelector('[aria-modal]').parentElement)
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test:run -- Modal
```

Expected: `Cannot find module '../Modal'`

- [ ] **Step 3: Create `src/components/Modal.jsx` with ConfirmModal only**

```jsx
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  if (!isOpen) return null

  const confirmBg = confirmVariant === 'danger' ? '#ef4444' : '#6366f1'

  return createPortal(
    <div style={OVERLAY_STYLE} onClick={onCancel}>
      <div
        style={BOX_STYLE}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={e => e.stopPropagation()}
      >
        <h3
          id="confirm-title"
          style={{ margin: '0 0 8px', color: '#e2e8f0', fontSize: '1.1rem', fontWeight: 600 }}
        >
          {title}
        </h3>
        <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: '0.875rem' }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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
```

- [ ] **Step 4: Run ConfirmModal tests — expect PASS**

```bash
npm run test:run -- Modal
```

Expected: ConfirmModal tests `6 passed`, InputModal tests will fail (not yet implemented — that's correct).

- [ ] **Step 5: Commit**

```bash
git add src/components/Modal.jsx src/components/__tests__/Modal.test.jsx
git commit -m "feat: add ConfirmModal component"
```

---

## Task 4: InputModal component

**Files:**
- Modify: `src/components/Modal.jsx`
- Tests already exist in `src/components/__tests__/Modal.test.jsx` — add InputModal tests now

- [ ] **Step 1: Add InputModal tests to `Modal.test.jsx`**

Append to the bottom of `src/components/__tests__/Modal.test.jsx`:

```jsx
describe('InputModal', () => {
  it('renders nothing when isOpen is false', () => {
    render(<InputModal isOpen={false} title="Add Note" onSubmit={() => {}} onCancel={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders title when open', () => {
    render(<InputModal isOpen title="Add Revision Note" onSubmit={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('Add Revision Note')).toBeInTheDocument()
  })

  it('calls onSubmit with trimmed value when form submitted', async () => {
    const onSubmit = vi.fn()
    render(<InputModal isOpen title="Note" onSubmit={onSubmit} onCancel={() => {}} />)
    await userEvent.type(screen.getByRole('textbox'), '  Change the color  ')
    await userEvent.click(screen.getByRole('button', { name: 'Submit Note' }))
    expect(onSubmit).toHaveBeenCalledWith('Change the color')
  })

  it('does not call onSubmit when textarea is empty', async () => {
    const onSubmit = vi.fn()
    render(<InputModal isOpen title="Note" onSubmit={onSubmit} onCancel={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Submit Note' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onCancel when Cancel clicked', async () => {
    const onCancel = vi.fn()
    render(<InputModal isOpen title="Note" onSubmit={() => {}} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('clears textarea when modal is reopened', async () => {
    const { rerender } = render(
      <InputModal isOpen title="Note" onSubmit={() => {}} onCancel={() => {}} />
    )
    await userEvent.type(screen.getByRole('textbox'), 'old text')
    rerender(<InputModal isOpen={false} title="Note" onSubmit={() => {}} onCancel={() => {}} />)
    rerender(<InputModal isOpen title="Note" onSubmit={() => {}} onCancel={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('')
  })
})
```

- [ ] **Step 2: Run tests — expect InputModal FAIL**

```bash
npm run test:run -- Modal
```

Expected: InputModal tests fail (`renders nothing` may pass but submit/cancel will fail).

- [ ] **Step 3: Replace the stub InputModal in `Modal.jsx` with the real implementation**

Replace `export function InputModal() { return null }` with:

```jsx
export function InputModal({ isOpen, title, placeholder = '', onSubmit, onCancel }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setValue('')
      // small delay so portal renders before focusing
      setTimeout(() => textareaRef.current?.focus(), 0)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setValue('')
  }

  return createPortal(
    <div style={OVERLAY_STYLE} onClick={onCancel}>
      <div
        style={BOX_STYLE}
        role="dialog"
        aria-modal="true"
        aria-labelledby="input-title"
        onClick={e => e.stopPropagation()}
      >
        <h3
          id="input-title"
          style={{ margin: '0 0 14px', color: '#e2e8f0', fontSize: '1.1rem', fontWeight: 600 }}
        >
          {title}
        </h3>
        <textarea
          ref={textareaRef}
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
            disabled={!value.trim()}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: '#6366f1',
              color: 'white',
              cursor: value.trim() ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: 500,
              opacity: value.trim() ? 1 : 0.5,
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
```

- [ ] **Step 4: Run all Modal tests — expect PASS**

```bash
npm run test:run -- Modal
```

Expected: `12 passed`

- [ ] **Step 5: Commit**

```bash
git add src/components/Modal.jsx src/components/__tests__/Modal.test.jsx
git commit -m "feat: add InputModal component"
```

---

## Task 5: StatusDropdown component

**Files:**
- Create: `src/components/StatusDropdown.jsx`
- Create: `src/components/__tests__/StatusDropdown.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/StatusDropdown.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StatusDropdown, { STATUS_COLORS, STATUSES } from '../StatusDropdown'

describe('StatusDropdown', () => {
  it('renders the current status as selected value', () => {
    render(<StatusDropdown value="In Progress" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toHaveValue('In Progress')
  })

  it('renders all 5 status options', () => {
    render(<StatusDropdown value="To Do" onChange={() => {}} />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(5)
    expect(options.map(o => o.value)).toEqual(STATUSES)
  })

  it('calls onChange with the new status when selection changes', async () => {
    const onChange = vi.fn()
    render(<StatusDropdown value="To Do" onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'In Progress')
    expect(onChange).toHaveBeenCalledWith('In Progress')
  })

  it('applies STATUS_COLORS color for "To Do"', () => {
    render(<StatusDropdown value="To Do" onChange={() => {}} />)
    expect(screen.getByRole('combobox').style.color).toBe(STATUS_COLORS['To Do'])
  })

  it('applies STATUS_COLORS color for "Done"', () => {
    render(<StatusDropdown value="Done" onChange={() => {}} />)
    expect(screen.getByRole('combobox').style.color).toBe(STATUS_COLORS['Done'])
  })

  it('exports STATUS_COLORS with all 5 statuses', () => {
    expect(Object.keys(STATUS_COLORS)).toEqual(STATUSES)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test:run -- StatusDropdown
```

Expected: `Cannot find module '../StatusDropdown'`

- [ ] **Step 3: Create `src/components/StatusDropdown.jsx`**

```jsx
export const STATUS_COLORS = {
  'To Do':        '#475569',
  'In Progress':  '#3b82f6',
  'For Review':   '#f59e0b',
  'For Revision': '#f97316',
  'Done':         '#22c55e',
}

export const STATUSES = Object.keys(STATUS_COLORS)

export default function StatusDropdown({ value, onChange }) {
  const color = STATUS_COLORS[value] ?? '#475569'

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: '#0f172a',
        border: `1px solid ${color}`,
        color,
        borderRadius: '20px',
        padding: '4px 10px',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        paddingRight: '24px',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${encodeURIComponent(color)}' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
      }}
    >
      {STATUSES.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test:run -- StatusDropdown
```

Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add src/components/StatusDropdown.jsx src/components/__tests__/StatusDropdown.test.jsx
git commit -m "feat: add StatusDropdown component with color coding"
```

---

## Task 6: Wire Toast into main component

**Files:**
- Modify: `creative_brief_builder_prototype.jsx` (repo root — NOT inside src/)

- [ ] **Step 1: Add imports at the top of the main file**

Find the existing imports block and add:

```jsx
import Toast from './src/components/Toast'
```

- [ ] **Step 2: Add toast state inside the main component function**

Find where other `useState` calls are declared and add:

```jsx
const [toast, setToast] = useState(null)
```

- [ ] **Step 3: Add a showToast helper directly below the state declarations**

```jsx
const showToast = (message, variant = 'success') => {
  setToast({ message, variant })
}
```

- [ ] **Step 4: Add Toast render at the bottom of the JSX return**

Find the closing `</div>` of the main component's return and add just before it:

```jsx
{toast && (
  <Toast
    message={toast.message}
    variant={toast.variant}
    onDismiss={() => setToast(null)}
  />
)}
```

- [ ] **Step 5: Trigger toast on request submit — find the existing submit handler**

Find the function that calls `supabase` when the brief form is submitted (likely named `handleSubmit`, `handleAddRequest`, or similar). Wrap the Supabase call in try/catch and add toast calls:

```jsx
// BEFORE (typical existing pattern):
await supabase.from('requests').upsert(newRequest)

// AFTER:
try {
  const { error } = await supabase.from('requests').upsert(newRequest)
  if (error) throw error
  showToast('Request submitted successfully')
} catch (err) {
  showToast(err.message ?? 'Failed to submit request', 'error')
}
```

- [ ] **Step 6: Verify manually in the browser**

```bash
npm run dev
```

Submit a new request. Confirm a green toast appears bottom-right and auto-dismisses after 3 seconds.

- [ ] **Step 7: Commit**

```bash
git add src/creative_brief_builder_prototype.jsx
git commit -m "feat: wire Toast into main component, show on request submit"
```

---

## Task 7: Replace window.confirm with ConfirmModal (delete)

**Files:**
- Modify: `creative_brief_builder_prototype.jsx` (repo root)

- [ ] **Step 1: Add ConfirmModal import**

```jsx
import { ConfirmModal, InputModal } from './src/components/Modal'
```

- [ ] **Step 2: Add deletingRequest state**

```jsx
const [deletingRequest, setDeletingRequest] = useState(null)
```

- [ ] **Step 3: Find and replace window.confirm delete logic**

Search for `window.confirm` in the file. You will find something like:

```jsx
// EXISTING (find and remove):
if (window.confirm(`Delete "${request.title}"?`)) {
  await supabase.from('requests').delete().eq('id', request.id)
}
```

Replace the Delete button's onClick to open the modal instead:

```jsx
// REPLACE the onClick that called window.confirm:
onClick={() => setDeletingRequest(request)}
```

- [ ] **Step 4: Add ConfirmModal + delete handler to JSX**

Add this just before the Toast render you added in Task 6:

```jsx
<ConfirmModal
  isOpen={deletingRequest !== null}
  title={`Delete "${deletingRequest?.title}"?`}
  message="This cannot be undone. All deliverables and comments will be permanently removed."
  confirmLabel="Delete"
  confirmVariant="danger"
  onCancel={() => setDeletingRequest(null)}
  onConfirm={async () => {
    try {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', deletingRequest.id)
      if (error) throw error
      setDeletingRequest(null)
      showToast('Request deleted')
    } catch (err) {
      showToast(err.message ?? 'Failed to delete request', 'error')
    }
  }}
/>
```

- [ ] **Step 5: Verify manually**

```bash
npm run dev
```

Click Delete on a request card. Confirm a modal appears (not a browser dialog). Click Cancel — nothing changes. Click Delete — request disappears and toast shows "Request deleted".

- [ ] **Step 6: Commit**

```bash
git add src/creative_brief_builder_prototype.jsx
git commit -m "feat: replace window.confirm with ConfirmModal for delete"
```

---

## Task 8: Replace window.prompt with InputModal (revision notes)

**Files:**
- Modify: `creative_brief_builder_prototype.jsx` (repo root)

- [ ] **Step 1: Add revisionTarget state**

```jsx
const [revisionTarget, setRevisionTarget] = useState(null)
// revisionTarget shape: { requestId: string, deliverableId: string } | null
```

- [ ] **Step 2: Find and replace window.prompt revision logic**

Search for `window.prompt` in the file. You will find something like:

```jsx
// EXISTING (find and remove):
const note = window.prompt('Add revision note:')
if (note) {
  // saves note...
}
```

Replace the revision note button's onClick to open the modal instead:

```jsx
// REPLACE the onClick that called window.prompt:
onClick={() => setRevisionTarget({ requestId: request.id, deliverableId: deliverable.id })}
```

- [ ] **Step 3: Add InputModal + save handler to JSX**

Add this alongside the ConfirmModal you added in Task 7:

```jsx
<InputModal
  isOpen={revisionTarget !== null}
  title="Add Revision Note"
  placeholder="Describe what needs to be revised..."
  onCancel={() => setRevisionTarget(null)}
  onSubmit={async (note) => {
    try {
      const newComment = {
        deliverable_id: revisionTarget.deliverableId,
        type: 'Revision',
        text: note,
        // TODO: replace "Current User" with real user identity from partner system profile
        author: 'Current User',
        created_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('comments').insert(newComment)
      if (error) throw error
      setRevisionTarget(null)
      showToast('Revision note added')
    } catch (err) {
      showToast(err.message ?? 'Failed to add revision note', 'error')
    }
  }}
/>
```

- [ ] **Step 4: Verify manually**

```bash
npm run dev
```

Click "Add Revision Note" on a deliverable. Confirm a modal appears (not a browser prompt). Type a note and submit — toast shows "Revision note added". Try submitting with empty input — button stays disabled.

- [ ] **Step 5: Commit**

```bash
git add src/creative_brief_builder_prototype.jsx
git commit -m "feat: replace window.prompt with InputModal for revision notes"
```

---

## Task 9: Add Edit Request flow

**Files:**
- Modify: `creative_brief_builder_prototype.jsx` (repo root)

- [ ] **Step 1: Add editingRequest state**

```jsx
const [editingRequest, setEditingRequest] = useState(null)
```

- [ ] **Step 2: Add Edit button to each kanban card**

Find where each request card is rendered. Add an Edit button in the top-right corner of the card, visible on hover. Add this inside the card's container:

```jsx
<div
  style={{
    position: 'absolute',
    top: '8px',
    right: '8px',
    display: 'flex',
    gap: '4px',
    opacity: 0,
    transition: 'opacity 150ms',
  }}
  className="card-actions"
>
  <button
    onClick={() => setEditingRequest(request)}
    title="Edit request"
    style={{
      background: 'transparent',
      border: '1px solid #334155',
      borderRadius: '6px',
      color: '#94a3b8',
      cursor: 'pointer',
      fontSize: '0.75rem',
      padding: '3px 8px',
    }}
  >
    Edit
  </button>
</div>
```

Add hover CSS to the existing `<style>` tag in the component:

```css
.request-card { position: relative; }
.request-card:hover .card-actions { opacity: 1; }
```

> **Note:** The existing card element may already have a className. Add `request-card` to it, e.g. `className="request-card"` (or append to existing classes).

- [ ] **Step 3: Add EditModal to JSX — reuse the brief form inside a ConfirmModal wrapper**

The brief form already exists as a section in the component. For edit mode, open it pre-filled. Add this state check that pre-fills the form when editingRequest is set. Find where the brief form's initial/blank state is defined (likely an object with `title`, `brand`, `deliverables`, etc.) and modify the form open logic:

```jsx
// When Edit button is clicked, open the form pre-filled:
// Find the function or handler that opens the brief form (e.g. setShowForm(true))
// and instead do:
const handleEditClick = (request) => {
  setEditingRequest(request)
  // populate form fields with request data:
  setFormData({
    title: request.title ?? '',
    brand: request.brand ?? '',
    requestDetails: request.requestDetails ?? '',
    deadline: request.deadline ?? '',
    deliverables: request.deliverables ?? [],
    referenceImages: request.referenceImages ?? [],
    // add any other fields the form uses
  })
  setShowForm(true)  // or whatever state controls form visibility
}
```

> **Note:** The exact state variable names for the form fields depend on the existing code. Search for the form's `onChange` handlers to find the right variable names.

- [ ] **Step 4: Modify the form submit handler to handle both create and update**

Find the existing form submit handler. Add an edit branch:

```jsx
const handleFormSubmit = async () => {
  if (editingRequest) {
    // UPDATE
    try {
      const { error } = await supabase
        .from('requests')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', editingRequest.id)
      if (error) throw error
      setEditingRequest(null)
      setShowForm(false)
      showToast('Request updated')
    } catch (err) {
      showToast(err.message ?? 'Failed to update request', 'error')
    }
  } else {
    // CREATE (existing logic — keep as-is, just wrap in try/catch if not already)
    try {
      const newRequest = {
        ...formData,
        // TODO: replace "Current User" with real user identity from partner system profile
        createdBy: 'Current User',
        created_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('requests').upsert(newRequest)
      if (error) throw error
      setShowForm(false)
      showToast('Request submitted successfully')
    } catch (err) {
      showToast(err.message ?? 'Failed to submit request', 'error')
    }
  }
}
```

- [ ] **Step 5: Update the form's submit button label**

Find the submit button in the form JSX and make its label dynamic:

```jsx
<button onClick={handleFormSubmit}>
  {editingRequest ? 'Save Changes' : 'Submit Request'}
</button>
```

- [ ] **Step 6: Clear editingRequest when form is cancelled**

Find the form cancel handler and add:

```jsx
setEditingRequest(null)
```

- [ ] **Step 7: Verify manually**

```bash
npm run dev
```

Hover a card — Edit button appears top-right. Click it — form opens pre-filled with the request's data. Change a field, save — card updates, toast shows "Request updated". Open again, click Cancel — nothing changes.

- [ ] **Step 8: Commit**

```bash
git add src/creative_brief_builder_prototype.jsx
git commit -m "feat: add edit request flow with pre-filled form and update toast"
```

---

## Task 10: Replace drag-and-drop with StatusDropdown + column color coding

**Files:**
- Modify: `creative_brief_builder_prototype.jsx` (repo root)

- [ ] **Step 1: Add StatusDropdown import**

```jsx
import StatusDropdown, { STATUS_COLORS } from './src/components/StatusDropdown'
```

- [ ] **Step 2: Remove drag-and-drop handlers**

Search for and **delete** each of these in the file:
- The `dropOnStatus` function
- Any `onDragStart` handler / prop
- Any `onDragOver` handler / prop
- Any `onDrop` handler / prop
- Any `draggable` prop on card elements

- [ ] **Step 3: Add StatusDropdown to each kanban card**

Find where each card is rendered. Add StatusDropdown just below the card title:

```jsx
<StatusDropdown
  value={request.status}
  onChange={async (newStatus) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: newStatus })
        .eq('id', request.id)
      if (error) throw error
      // optimistic update — update local state immediately
      setRequests(prev =>
        prev.map(r => r.id === request.id ? { ...r, status: newStatus } : r)
      )
    } catch (err) {
      showToast(err.message ?? 'Failed to update status', 'error')
    }
  }}
/>
```

- [ ] **Step 4: Add color coding to columns**

Find where each column header is rendered (the `To Do`, `In Progress`, etc. headings). Add the color from STATUS_COLORS to the column's top border and header text:

```jsx
// For each column, compute its color:
const columnColor = STATUS_COLORS[columnStatus] ?? '#475569'

// Apply to column container's top border:
style={{ borderTop: `3px solid ${columnColor}`, ... }}

// Apply to column header text:
style={{ color: columnColor, ... }}
```

- [ ] **Step 5: Add color-coded left border to each card**

Find each card's container style and add:

```jsx
style={{
  borderLeft: `3px solid ${STATUS_COLORS[request.status] ?? '#475569'}`,
  // ...existing styles
}}
```

- [ ] **Step 6: Verify manually**

```bash
npm run dev
```

Confirm: no cards are draggable. Click the status dropdown on any card — select a new status — card moves to the correct column. Column headers show the right color. Card left borders match column colors. Open Supabase dashboard → Table Editor → check `requests` table — each status change writes exactly once (no duplicate rows updating).

- [ ] **Step 7: Commit**

```bash
git add src/creative_brief_builder_prototype.jsx
git commit -m "feat: replace drag-and-drop with StatusDropdown, add color coding"
```

---

## Task 11: Debounce generateOutput

**Files:**
- Modify: `creative_brief_builder_prototype.jsx` (repo root)

- [ ] **Step 1: Find generateOutput and the textarea that triggers it**

Search for `generateOutput` in the file. You will find it called in one of:
- An `onChange` handler on a textarea
- A `useEffect` watching `requestDetails`

- [ ] **Step 2: Replace direct call with debounced useEffect**

If it's currently called directly in an `onChange`:

```jsx
// BEFORE (in onChange or similar):
onChange={e => {
  setRequestDetails(e.target.value)
  generateOutput(e.target.value)  // ← runs on every keystroke
}}

// AFTER:
onChange={e => setRequestDetails(e.target.value)}
```

Then add a `useEffect` that debounces the call. Place it near the other `useEffect` calls in the component:

```jsx
useEffect(() => {
  const id = setTimeout(() => {
    generateOutput(requestDetails)
  }, 300)
  return () => clearTimeout(id)
}, [requestDetails])
```

If it's already in a `useEffect` without a debounce, wrap the call:

```jsx
// BEFORE:
useEffect(() => {
  generateOutput(requestDetails)
}, [requestDetails])

// AFTER:
useEffect(() => {
  const id = setTimeout(() => {
    generateOutput(requestDetails)
  }, 300)
  return () => clearTimeout(id)
}, [requestDetails])
```

- [ ] **Step 3: Verify manually**

```bash
npm run dev
```

Open the brief form. Type quickly in the request details textarea. Open DevTools console and add a temporary `console.log('generateOutput called')` inside `generateOutput`. Confirm it fires once after you stop typing, not on every keystroke. Remove the log after confirming.

- [ ] **Step 4: Commit**

```bash
git add src/creative_brief_builder_prototype.jsx
git commit -m "perf: debounce generateOutput on requestDetails textarea"
```

---

## Task 12: Add auth TODO comments

**Files:**
- Modify: `creative_brief_builder_prototype.jsx` (repo root)

- [ ] **Step 1: Find all hardcoded "Current User" strings**

```bash
grep -n "Current User" creative_brief_builder_prototype.jsx
```

- [ ] **Step 2: Add TODO comment above every occurrence**

For each line found, add the comment on the line above:

```jsx
// TODO: replace "Current User" with real user identity from partner system profile
author: 'Current User',
```

And similarly for any `createdBy`:

```jsx
// TODO: replace "Current User" with real user identity from partner system profile
createdBy: 'Current User',
```

- [ ] **Step 3: Commit**

```bash
git add src/creative_brief_builder_prototype.jsx
git commit -m "chore: mark all hardcoded user identity sites for partner system auth integration"
```

---

## Task 13: Run all tests + final manual verification

- [ ] **Step 1: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests pass — `Toast`, `ConfirmModal`, `InputModal`, `StatusDropdown`.

- [ ] **Step 2: Run the dev server and walk through the full user journey**

```bash
npm run dev
```

Walk through this checklist:

- [ ] Submit a new request → green toast appears, disappears after 3s
- [ ] Hover a card → Edit button visible
- [ ] Edit a request → form pre-fills, save shows "Request updated" toast
- [ ] Delete a request → modal appears, cancel does nothing, confirm deletes with toast
- [ ] Add revision note → input modal appears, empty submit is blocked, submit shows toast
- [ ] Change status via dropdown → card moves to correct column, no browser drag needed
- [ ] All columns have correct color-coded headers and borders
- [ ] Type quickly in request details → AI output updates only after pause (not every keystroke)
- [ ] Simulate a Supabase error (temporarily break the URL in `.env`) → error toast shows instead of crash

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "chore: phase 1 complete — all manual verification passed"
```
