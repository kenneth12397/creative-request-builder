import { describe, it, expect } from 'vitest'
import { normalizeDeliverable, detectDeliverablesFromText, statusPillColor } from './deliverables.js'

describe('normalizeDeliverable', () => {
  it('fills missing fields with defaults', () => {
    const result = normalizeDeliverable({})
    expect(result.status).toBe('To Do')
    expect(result.notes).toBe('')
    expect(result.source).toBe('custom')
    expect(result.label).toBe('Custom Size')
    expect(result.id).toMatch(/^DEL-/)
  })

  it('preserves existing values', () => {
    const input = { id: 'DEL-abc', label: 'A4 Poster', status: 'Done', notes: 'test note' }
    const result = normalizeDeliverable(input)
    expect(result.id).toBe('DEL-abc')
    expect(result.label).toBe('A4 Poster')
    expect(result.status).toBe('Done')
    expect(result.notes).toBe('test note')
  })

  it('drops legacy options field', () => {
    const input = { options: { qr: true, fullMechanics: false } }
    const result = normalizeDeliverable(input)
    expect(result.options).toBeUndefined()
  })

  it('preserves outputUrl if present', () => {
    const input = { outputUrl: 'https://example.com/file.pdf' }
    const result = normalizeDeliverable(input)
    expect(result.outputUrl).toBe('https://example.com/file.pdf')
  })
})

describe('detectDeliverablesFromText', () => {
  it('returns empty array for empty input', () => {
    expect(detectDeliverablesFromText('')).toEqual([])
    expect(detectDeliverablesFromText(null)).toEqual([])
  })

  it('detects A4 by short alias', () => {
    const results = detectDeliverablesFromText('I need an A4 poster for the event')
    expect(results.length).toBeGreaterThan(0)
    const labels = results.map(r => r.label.toLowerCase())
    expect(labels.some(l => l.includes('a4'))).toBe(true)
  })

  it('detects raw dimensions', () => {
    const results = detectDeliverablesFromText('Please make a 1080x1350 image')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].width).toBe('1080')
    expect(results[0].height).toBe('1350')
  })

  it('does not duplicate preset matches', () => {
    const results = detectDeliverablesFromText('I need A4 and another A4 please')
    const a4Count = results.filter(r => r.label.toLowerCase().includes('a4')).length
    expect(a4Count).toBe(1)
  })

  it('sets source to detected on all results', () => {
    const results = detectDeliverablesFromText('A4 poster 1080x1920')
    expect(results.every(r => r.source === 'detected')).toBe(true)
  })
})

describe('statusPillColor', () => {
  it('maps each status to correct color', () => {
    expect(statusPillColor('To Do')).toBe('')
    expect(statusPillColor('In Progress')).toBe('blue')
    expect(statusPillColor('For Review')).toBe('yellow')
    expect(statusPillColor('For Revision')).toBe('red')
    expect(statusPillColor('Done')).toBe('green')
  })

  it('returns empty string for unknown status', () => {
    expect(statusPillColor('Pending')).toBe('')
  })
})
