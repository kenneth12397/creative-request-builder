import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StatusDropdown, { STATUS_COLORS, STATUSES } from '../StatusDropdown'

// Helper to convert hex to rgb for comparison
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : null
}

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
    const select = screen.getByRole('combobox')
    const expectedColor = STATUS_COLORS['To Do']
    const expectedRgb = hexToRgb(expectedColor)
    expect([expectedColor, expectedRgb]).toContain(select.style.color)
  })

  it('applies STATUS_COLORS color for "Done"', () => {
    render(<StatusDropdown value="Done" onChange={() => {}} />)
    const select = screen.getByRole('combobox')
    const expectedColor = STATUS_COLORS['Done']
    const expectedRgb = hexToRgb(expectedColor)
    expect([expectedColor, expectedRgb]).toContain(select.style.color)
  })

  it('exports STATUS_COLORS with all 5 statuses', () => {
    expect(Object.keys(STATUS_COLORS)).toEqual(STATUSES)
  })
})
