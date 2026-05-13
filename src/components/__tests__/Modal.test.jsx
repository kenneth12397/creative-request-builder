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
    await userEvent.click(screen.getByTestId('confirm-overlay'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when Escape key pressed', async () => {
    const onCancel = vi.fn()
    render(
      <ConfirmModal isOpen title="Del?" message="Sure?" onConfirm={() => {}} onCancel={onCancel} />
    )
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
  })
})

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
