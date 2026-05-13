export const STATUS_COLORS = {
  'To Do':        '#475569',
  'In Progress':  '#3b82f6',
  'For Review':   '#f59e0b',
  'For Revision': '#f97316',
  'Done':         '#22c55e',
}

export const STATUSES = Object.keys(STATUS_COLORS)

export default function StatusDropdown({ value, onChange }) {
  const color = STATUS_COLORS[value] ?? '#94a3b8'

  return (
    <select
      aria-label="Request status"
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
