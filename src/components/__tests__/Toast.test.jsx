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
    vi.useRealTimers()
    const onDismiss = vi.fn()
    render(<Toast message="Done" variant="success" onDismiss={onDismiss} />)
    await userEvent.click(screen.getByLabelText('Dismiss'))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('applies green left border for success variant', () => {
    render(<Toast message="OK" variant="success" onDismiss={() => {}} />)
    const el = screen.getByRole('status')
    expect(el.style.borderLeft).toContain('rgb(34, 197, 94)')
  })

  it('applies red left border for error variant', () => {
    render(<Toast message="Fail" variant="error" onDismiss={() => {}} />)
    const el = screen.getByRole('status')
    expect(el.style.borderLeft).toContain('rgb(239, 68, 68)')
  })
})
