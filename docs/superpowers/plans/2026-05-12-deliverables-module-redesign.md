# Deliverables Module Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the deliverables section from a multi-field form into a lightweight subtask management module with compact rows, NLP detection, and a granular activity feed.

**Architecture:** Extract pure utility functions to `src/deliverables.js` for TDD coverage first, then rewrite `DeliverableComposer` and the Task Modal's deliverables section. The existing `MATERIAL_PRESETS` array moves to the new module. CSS is updated inline in the existing `const css` template string in the main JSX file.

**Tech Stack:** React 18, Vite 6, Vitest, @testing-library/react, jsdom

---

### Task 1: Test Infrastructure

**Files:**
- Modify: `vite.config.js`
- Modify: `package.json`
- Create: `src/test-setup.js`

- [ ] **Step 1: Install test dependencies**

Run: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`

Expected: `package-lock.json` updates, `node_modules` updated.

- [ ] **Step 2: Update vite.config.js**

Current content:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

Replace with:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
```

- [ ] **Step 3: Create src/test-setup.js**

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test scripts to package.json**

In the `"scripts"` object, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify test runner**

Run: `npm test`
Expected: output mentions "no test files found" — no crash, exits cleanly.

- [ ] **Step 6: Commit**

```bash
git add vite.config.js package.json src/test-setup.js package-lock.json
git commit -m "chore: add vitest test infrastructure"
```

---

### Task 2: Extract Utility Functions (TDD)

**Files:**
- Create: `src/deliverables.js`
- Create: `src/deliverables.test.js`

- [ ] **Step 1: Write the failing test file first**

Create `src/deliverables.test.js`:

```js
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
```

- [ ] **Step 2: Run tests — confirm FAIL**

Run: `npm test`
Expected: FAIL — "Cannot find module './deliverables.js'"

- [ ] **Step 3: Create src/deliverables.js**

```js
function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export const MATERIAL_PRESETS = [
  { id: "a4", label: "A4 Poster", width: "210", height: "297", unit: "mm" },
  { id: "a5", label: "A5 Flyer", width: "148", height: "210", unit: "mm" },
  { id: "fb-portrait", label: "FB Portrait", width: "1080", height: "1350", unit: "px" },
  { id: "fb-story", label: "FB Story", width: "1080", height: "1920", unit: "px" },
  { id: "fb-square", label: "FB Square", width: "1080", height: "1080", unit: "px" },
  { id: "fb-landscape", label: "FB Landscape", width: "1200", height: "628", unit: "px" },
  { id: "pull-up", label: "Pull-Up Banner", width: "850", height: "2000", unit: "mm" },
  { id: "streamer", label: "Streamer", width: "2", height: "5", unit: "ft" },
  { id: "leaderboard", label: "Leaderboard", width: "728", height: "90", unit: "px" },
  { id: "mrec", label: "MREC", width: "300", height: "250", unit: "px" },
]

export function normalizeDeliverable(item) {
  const normalized = {
    id: item.id || uid("DEL"),
    presetId: item.presetId || null,
    label: item.label || "Custom Size",
    width: item.width || "",
    height: item.height || "",
    unit: item.unit || "",
    source: item.source || "custom",
    status: item.status || "To Do",
    notes: item.notes || "",
    createdAt: item.createdAt || new Date().toISOString(),
  }
  if (item.outputUrl !== undefined) normalized.outputUrl = item.outputUrl
  if (item.outputNotes !== undefined) normalized.outputNotes = item.outputNotes
  return normalized
}

export function detectDeliverablesFromText(text) {
  if (!text || !text.trim()) return []
  const results = []
  const seenPresets = new Set()

  const aliases = [
    { pattern: /\bA4\b/i, presetId: "a4" },
    { pattern: /\bA5\b/i, presetId: "a5" },
    { pattern: /\bstory\b/i, presetId: "fb-story" },
    { pattern: /\bportrait\b/i, presetId: "fb-portrait" },
    { pattern: /\bsquare\b/i, presetId: "fb-square" },
    { pattern: /\blandscape\b/i, presetId: "fb-landscape" },
    { pattern: /\bpull.?up\b/i, presetId: "pull-up" },
    { pattern: /\bstreamer\b/i, presetId: "streamer" },
    { pattern: /\bleaderboard\b/i, presetId: "leaderboard" },
    { pattern: /\bmrec\b/i, presetId: "mrec" },
  ]

  for (const { pattern, presetId } of aliases) {
    if (pattern.test(text) && !seenPresets.has(presetId)) {
      const preset = MATERIAL_PRESETS.find(p => p.id === presetId)
      if (preset) {
        seenPresets.add(presetId)
        results.push(normalizeDeliverable({ ...preset, source: "detected" }))
      }
    }
  }

  const sizePattern = /(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(px|mm|cm|in|ft)?/gi
  for (const match of text.matchAll(sizePattern)) {
    const [, w, h, unit] = match
    const unitStr = unit || "px"
    const matchedPreset = MATERIAL_PRESETS.find(
      p => p.width === w && p.height === h && p.unit === unitStr
    )
    if (matchedPreset && !seenPresets.has(matchedPreset.id)) {
      seenPresets.add(matchedPreset.id)
      results.push(normalizeDeliverable({ ...matchedPreset, source: "detected" }))
    } else if (!matchedPreset) {
      results.push(normalizeDeliverable({
        label: `${w}×${h}${unitStr ? " " + unitStr : ""}`,
        width: w,
        height: h,
        unit: unitStr,
        source: "detected",
      }))
    }
  }

  return results
}

export function statusPillColor(status) {
  const map = {
    "To Do": "",
    "In Progress": "blue",
    "For Review": "yellow",
    "For Revision": "red",
    "Done": "green",
  }
  return map[status] ?? ""
}
```

- [ ] **Step 4: Run tests — confirm PASS**

Run: `npm test`
Expected: All 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/deliverables.js src/deliverables.test.js
git commit -m "feat: extract deliverable utilities with tests"
```

---

### Task 3: Remove Old CSS, Add New CSS Classes

**Files:**
- Modify: `creative_brief_builder_prototype.jsx` (CSS string section, lines ~54-155)

Background: All CSS lives in a `const css = \`...\`` template string near the top of the main file. You need to find and remove old deliverable classes, then add the new ones.

- [ ] **Step 1: Remove old deliverable CSS classes**

In `creative_brief_builder_prototype.jsx`, inside the `const css` template string, find and DELETE all of these class blocks:
- `.deliverable-item { ... }`
- `.deliverable-head { ... }`
- `.deliverable-options { ... }`
- `.check-row { ... }`
- `.check-row input { ... }`
- `.deliverable-check { ... }`
- `.deliverable-row-main { ... }`
- `.output-fields { ... }`

- [ ] **Step 2: Add new deliverable CSS**

Inside the same `const css` template string, append in place of the deleted section:

```css
.del-composer { display: flex; flex-direction: column; gap: 6px; }
.del-input-row { display: flex; gap: 6px; align-items: center; }
.del-input-row input { flex: 1; padding: 7px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }
.del-input-row input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,.15); }
.del-add-btn { padding: 7px 14px; background: #6366f1; color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.del-add-btn:hover { background: #4f46e5; }
.del-suggestions { position: absolute; z-index: 50; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.1); width: 100%; max-height: 180px; overflow-y: auto; }
.del-suggestion-item { padding: 8px 12px; font-size: 13px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.del-suggestion-item:hover { background: #f3f4f6; }
.del-suggestion-dim { color: #9ca3af; font-size: 12px; }
.del-list { display: flex; flex-direction: column; gap: 0; }
.del-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
.del-row:last-child { border-bottom: none; }
.del-row-label { flex: 1; font-weight: 500; }
.del-row-dim { color: #9ca3af; font-size: 12px; white-space: nowrap; }
.del-status-select { padding: 3px 6px; border: 1px solid #e5e7eb; border-radius: 5px; font-size: 12px; cursor: pointer; background: #fff; }
.del-status-select.blue { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.del-status-select.yellow { background: #fefce8; border-color: #fde68a; color: #92400e; }
.del-status-select.red { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
.del-status-select.green { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
.del-menu-btn { background: none; border: none; cursor: pointer; padding: 2px 6px; color: #9ca3af; font-size: 16px; border-radius: 4px; }
.del-menu-btn:hover { background: #f3f4f6; color: #374151; }
.del-notes-area { width: 100%; margin-top: 4px; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; resize: vertical; min-height: 52px; box-sizing: border-box; }
.del-notes-area:focus { outline: none; border-color: #6366f1; }
.del-inline-dims { display: flex; gap: 4px; align-items: center; margin-top: 4px; }
.del-inline-dims input { width: 64px; padding: 4px 6px; border: 1px solid #e5e7eb; border-radius: 5px; font-size: 12px; }
.del-inline-dims select { padding: 4px 6px; border: 1px solid #e5e7eb; border-radius: 5px; font-size: 12px; }
.del-detect-btn { font-size: 12px; padding: 3px 8px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 5px; cursor: pointer; color: #374151; }
.del-detect-btn:hover { background: #e5e7eb; }
.del-confirm-strip { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px; margin-top: 8px; }
.del-confirm-strip h5 { margin: 0 0 8px; font-size: 12px; color: #15803d; font-weight: 600; }
.del-confirm-item { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 13px; }
.del-confirm-item label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.del-confirm-actions { display: flex; gap: 6px; margin-top: 8px; }
.del-confirm-add { padding: 5px 12px; background: #16a34a; color: #fff; border: none; border-radius: 5px; font-size: 12px; cursor: pointer; }
.del-confirm-dismiss { padding: 5px 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 5px; font-size: 12px; cursor: pointer; }
```

- [ ] **Step 3: Verify app still builds**

Run: `npm run dev`
Expected: No build errors. App opens in browser. Deliverables section may look broken — that's OK, mid-refactor.

- [ ] **Step 4: Commit**

```bash
git add creative_brief_builder_prototype.jsx
git commit -m "style: replace deliverable CSS with compact row classes"
```

---

### Task 4: Rewrite DeliverableComposer Component

**Files:**
- Modify: `creative_brief_builder_prototype.jsx`
  - Remove: `const blankDraft = { name: "", width: "", height: "", unit: "px" }` (~line 52)
  - Replace: entire `DeliverableComposer` function (~lines 507-582)
  - Update: imports at top (add from deliverables.js; remove local definitions)

- [ ] **Step 1: Update imports at top of file**

Add this import line at the very top of `creative_brief_builder_prototype.jsx` (after any existing imports):
```js
import { MATERIAL_PRESETS, normalizeDeliverable, detectDeliverablesFromText, statusPillColor } from './src/deliverables.js'
```

Then DELETE the following from the file body:
- The `MATERIAL_PRESETS` array definition (~lines 15-26)
- The `normalizeDeliverable` function definition (~lines 208-223)
- The line `const blankDraft = { name: "", width: "", height: "", unit: "px" }` (~line 52)

- [ ] **Step 2: Replace the DeliverableComposer function**

Find the current `function DeliverableComposer(` and replace the ENTIRE function with:

```jsx
function DeliverableComposer({ deliverables, onChange, briefText = "" }) {
  const [input, setInput] = React.useState("")
  const [suggestions, setSuggestions] = React.useState([])
  const [detectedItems, setDetectedItems] = React.useState(null)
  const [selectedDetected, setSelectedDetected] = React.useState([])
  const [expandedNotes, setExpandedNotes] = React.useState({})
  const [expandedDims, setExpandedDims] = React.useState({})
  const inputRef = React.useRef(null)

  const hasBriefText = briefText && briefText.trim().length > 0

  function handleInput(e) {
    const val = e.target.value
    setInput(val)
    if (!val.trim()) { setSuggestions([]); return }
    const lower = val.toLowerCase()
    const matched = MATERIAL_PRESETS.filter(p =>
      p.label.toLowerCase().includes(lower) ||
      `${p.width}x${p.height}`.includes(lower) ||
      `${p.width}×${p.height}`.includes(lower)
    ).slice(0, 6)
    setSuggestions(matched)
  }

  function addFromPreset(preset) {
    const newDel = normalizeDeliverable({ ...preset, source: "preset" })
    onChange([...deliverables, newDel])
    setInput("")
    setSuggestions([])
    inputRef.current?.focus()
  }

  function addCustom() {
    if (!input.trim()) return
    const dimMatch = input.match(/^(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(px|mm|cm|in|ft)?$/i)
    let newDel
    if (dimMatch) {
      const [, w, h, unit] = dimMatch
      newDel = normalizeDeliverable({ label: `${w}×${h} ${unit || "px"}`, width: w, height: h, unit: unit || "px", source: "custom" })
    } else {
      newDel = normalizeDeliverable({ label: input.trim(), source: "custom" })
    }
    onChange([...deliverables, newDel])
    setInput("")
    setSuggestions([])
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") { e.preventDefault(); addCustom() }
    if (e.key === "Escape") setSuggestions([])
  }

  function removeDeliverable(id) {
    onChange(deliverables.filter(d => d.id !== id))
  }

  function updateDeliverable(id, patch) {
    onChange(deliverables.map(d => d.id === id ? { ...d, ...patch } : d))
  }

  function toggleNotes(id) {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleDims(id) {
    setExpandedDims(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function handleDetect() {
    const found = detectDeliverablesFromText(briefText)
    const existingLabels = new Set(deliverables.map(d => d.label.toLowerCase()))
    const novel = found.filter(f => !existingLabels.has(f.label.toLowerCase()))
    if (!novel.length) { alert("No new deliverables detected in the brief."); return }
    setDetectedItems(novel)
    setSelectedDetected(novel.map(d => d.id))
  }

  function confirmDetected() {
    const toAdd = detectedItems.filter(d => selectedDetected.includes(d.id))
    onChange([...deliverables, ...toAdd])
    setDetectedItems(null)
    setSelectedDetected([])
  }

  const STATUSES = ["To Do", "In Progress", "For Review", "For Revision", "Done"]

  return (
    <div className="del-composer">
      {deliverables.length > 0 && (
        <div className="del-list">
          {deliverables.map(d => (
            <div key={d.id}>
              <div className="del-row">
                <span className="del-row-label">{d.label}</span>
                {d.width && d.height && (
                  <span className="del-row-dim">{d.width}×{d.height} {d.unit}</span>
                )}
                <select
                  className={`del-status-select ${statusPillColor(d.status)}`}
                  value={d.status}
                  onChange={e => updateDeliverable(d.id, { status: e.target.value })}
                >
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <button className="del-menu-btn" onClick={() => {
                  const action = window.prompt("a = edit dims  |  n = notes  |  r = remove")
                  if (action === "a") toggleDims(d.id)
                  if (action === "n") toggleNotes(d.id)
                  if (action === "r") removeDeliverable(d.id)
                }}>···</button>
              </div>
              {expandedDims[d.id] && (
                <div className="del-inline-dims">
                  <input placeholder="W" value={d.width} onChange={e => updateDeliverable(d.id, { width: e.target.value })} />
                  <span>×</span>
                  <input placeholder="H" value={d.height} onChange={e => updateDeliverable(d.id, { height: e.target.value })} />
                  <select value={d.unit} onChange={e => updateDeliverable(d.id, { unit: e.target.value })}>
                    {["px","mm","cm","in","ft"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              )}
              {expandedNotes[d.id] && (
                <textarea
                  className="del-notes-area"
                  placeholder="Specific notes for this size only..."
                  value={d.notes}
                  onChange={e => updateDeliverable(d.id, { notes: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <div className="del-input-row">
          <input
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type name or size, e.g. A4, 1080×1350..."
          />
          <button className="del-add-btn" onClick={addCustom}>+ Add</button>
          {hasBriefText && (
            <button className="del-detect-btn" onClick={handleDetect}>Detect from brief</button>
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="del-suggestions">
            {suggestions.map(p => (
              <div key={p.id} className="del-suggestion-item" onClick={() => addFromPreset(p)}>
                <span>{p.label}</span>
                <span className="del-suggestion-dim">{p.width}×{p.height} {p.unit}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {detectedItems && (
        <div className="del-confirm-strip">
          <h5>Detected deliverables:</h5>
          {detectedItems.map(d => (
            <div key={d.id} className="del-confirm-item">
              <label>
                <input
                  type="checkbox"
                  checked={selectedDetected.includes(d.id)}
                  onChange={e => setSelectedDetected(prev =>
                    e.target.checked ? [...prev, d.id] : prev.filter(id => id !== d.id)
                  )}
                />
                {d.label}{d.width ? ` — ${d.width}×${d.height} ${d.unit}` : ""}
              </label>
            </div>
          ))}
          <div className="del-confirm-actions">
            <button className="del-confirm-add" onClick={confirmDetected}>Add Selected</button>
            <button className="del-confirm-dismiss" onClick={() => setDetectedItems(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update the DeliverableComposer call site**

Search for `<DeliverableComposer` in the file. Ensure the call passes `briefText`. Find where the brief/description text lives in form state (likely `form.brief` or `form.description`) and update:

```jsx
<DeliverableComposer
  deliverables={form.deliverables}
  onChange={dels => setForm(prev => ({ ...prev, deliverables: dels }))}
  briefText={form.brief || form.description || ""}
/>
```

- [ ] **Step 4: Test in browser**

Run: `npm run dev`

Check:
- [ ] Empty state shows just the input row
- [ ] Typing "A4" shows a suggestions dropdown
- [ ] Clicking a suggestion adds a compact row above the input
- [ ] Row shows: label · dims · status dropdown · ··· button
- [ ] ··· prompts action (a/n/r), each works correctly
- [ ] "Detect from brief" button appears once the brief field has text
- [ ] Detection confirmation strip appears with checkboxes, never auto-adds

- [ ] **Step 5: Commit**

```bash
git add creative_brief_builder_prototype.jsx
git commit -m "feat: rewrite DeliverableComposer as compact row-based list"
```

---

### Task 5: Update Task Modal Deliverables Section

**Files:**
- Modify: `creative_brief_builder_prototype.jsx` (TaskModal function, ~lines 716-904)

- [ ] **Step 1: Add new state variables inside TaskModal**

At the top of the `TaskModal` function, alongside existing state declarations, add:

```js
const [delExpandedNotes, setDelExpandedNotes] = React.useState({})
const [addingDeliverable, setAddingDeliverable] = React.useState(false)
const [newDelInput, setNewDelInput] = React.useState("")
const [newDelSuggestions, setNewDelSuggestions] = React.useState([])
```

- [ ] **Step 2: Add helper functions inside TaskModal**

After the state declarations, add:

```js
function updateDeliverableStatus(delId, newStatus) {
  const oldDel = task.deliverables.find(d => d.id === delId)
  const updated = task.deliverables.map(d =>
    d.id === delId ? { ...d, status: newStatus } : d
  )
  onUpdateTask({ ...task, deliverables: updated })
  addActivity(`${oldDel.label} changed from ${oldDel.status} → ${newStatus}`)
}

function updateDeliverableField(delId, patch) {
  const updated = task.deliverables.map(d =>
    d.id === delId ? { ...d, ...patch } : d
  )
  onUpdateTask({ ...task, deliverables: updated })
}

function removeModalDeliverable(delId) {
  const del = task.deliverables.find(d => d.id === delId)
  const updated = task.deliverables.filter(d => d.id !== delId)
  onUpdateTask({ ...task, deliverables: updated })
  addActivity(`Removed ${del.label}${del.width ? ` — ${del.width}×${del.height} ${del.unit}` : ""}`)
}

function handleNewDelInput(e) {
  const val = e.target.value
  setNewDelInput(val)
  if (!val.trim()) { setNewDelSuggestions([]); return }
  const lower = val.toLowerCase()
  const matched = MATERIAL_PRESETS.filter(p =>
    p.label.toLowerCase().includes(lower) ||
    `${p.width}x${p.height}`.includes(lower)
  ).slice(0, 5)
  setNewDelSuggestions(matched)
}

function addNewDeliverable(preset) {
  if (!preset && !newDelInput.trim()) return
  const newDel = normalizeDeliverable(
    preset
      ? { ...preset, source: "preset" }
      : { label: newDelInput.trim(), source: "custom" }
  )
  const updated = [...(task.deliverables || []), newDel]
  onUpdateTask({ ...task, deliverables: updated })
  addActivity(`Added ${newDel.label}${newDel.width ? ` — ${newDel.width}×${newDel.height} ${newDel.unit}` : ""}`)
  setNewDelInput("")
  setNewDelSuggestions([])
  setAddingDeliverable(false)
}
```

Note: `addActivity` must already exist in TaskModal scope. If it doesn't, find the existing pattern for logging activity (it may push to an `activity` array then call `onUpdateTask`) and match that pattern.

- [ ] **Step 3: Replace the deliverables section in the TaskModal JSX**

Find the section in the TaskModal JSX that renders deliverables (look for `.deliverable-item`, checkbox inputs per deliverable, or the existing status dropdown). Replace that entire block with:

```jsx
<div className="modal-section">
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
    <h4 className="modal-section-title">Deliverables</h4>
    <button className="del-detect-btn" onClick={() => setAddingDeliverable(v => !v)}>
      + Add deliverable
    </button>
  </div>

  {addingDeliverable && (
    <div style={{ position: "relative", marginBottom: 8 }}>
      <div className="del-input-row">
        <input
          autoFocus
          value={newDelInput}
          onChange={handleNewDelInput}
          onKeyDown={e => {
            if (e.key === "Enter") addNewDeliverable(null)
            if (e.key === "Escape") setAddingDeliverable(false)
          }}
          placeholder="Type name or size..."
        />
        <button className="del-add-btn" onClick={() => addNewDeliverable(null)}>Add</button>
      </div>
      {newDelSuggestions.length > 0 && (
        <div className="del-suggestions">
          {newDelSuggestions.map(p => (
            <div key={p.id} className="del-suggestion-item" onClick={() => addNewDeliverable(p)}>
              <span>{p.label}</span>
              <span className="del-suggestion-dim">{p.width}×{p.height} {p.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )}

  <div className="del-list">
    {(task.deliverables || []).map(d => (
      <div key={d.id}>
        <div className="del-row">
          <span className="del-row-label">{d.label}</span>
          {d.width && d.height && (
            <span className="del-row-dim">{d.width}×{d.height} {d.unit}</span>
          )}
          <select
            className={`del-status-select ${statusPillColor(d.status)}`}
            value={d.status || "To Do"}
            onChange={e => updateDeliverableStatus(d.id, e.target.value)}
          >
            {["To Do", "In Progress", "For Review", "For Revision", "Done"].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button className="del-menu-btn" onClick={() => {
            const action = window.prompt("n = toggle notes  |  r = remove")
            if (action === "n") setDelExpandedNotes(prev => ({ ...prev, [d.id]: !prev[d.id] }))
            if (action === "r") removeModalDeliverable(d.id)
          }}>···</button>
        </div>
        {delExpandedNotes[d.id] && (
          <textarea
            className="del-notes-area"
            placeholder="Specific notes for this size only..."
            value={d.notes || ""}
            onChange={e => updateDeliverableField(d.id, { notes: e.target.value })}
          />
        )}
      </div>
    ))}
  </div>

  {(!task.deliverables || task.deliverables.length === 0) && (
    <p style={{ color: "#9ca3af", fontSize: 13, margin: "4px 0" }}>No deliverables yet.</p>
  )}
</div>
```

- [ ] **Step 4: Test in browser**

Run: `npm run dev`, open an existing task in the modal.

- [ ] Deliverable rows appear compact: label · dims · status dropdown · ··· button
- [ ] Status dropdown change triggers activity log entry: `"{label} changed from X → Y"`
- [ ] "+ Add deliverable" opens inline input with suggestions
- [ ] Adding a deliverable from the modal logs: `"Added {label} — {dims}"`
- [ ] Removing logs: `"Removed {label}"`

- [ ] **Step 5: Commit**

```bash
git add creative_brief_builder_prototype.jsx
git commit -m "feat: redesign task modal deliverables as compact subtask rows"
```

---

### Task 6: Update Activity Feed

**Files:**
- Modify: `creative_brief_builder_prototype.jsx`

- [ ] **Step 1: Update submitRequest activity entry**

Find the `submitRequest` function (~line 1002). Find where it pushes to the activity log. Update the entry to:

```js
addActivity("Current User submitted the request")
```

(The actor is hardcoded as `"Current User"` — architected to accept a `currentUser` prop from the parent system in the future.)

- [ ] **Step 2: Update changeTaskStatus activity entry**

Find `changeTaskStatus` (~line 740). Update its activity log call to:

```js
addActivity(`Request moved from ${oldStatus} → ${newStatus}`)
```

- [ ] **Step 3: Verify deliverable entries are in place**

Confirm the following calls were added in Task 5:
- `addActivity(\`${oldDel.label} changed from ${oldDel.status} → ${newStatus}\`)` in `updateDeliverableStatus`
- `addActivity(\`Added ${newDel.label}...\`)` in `addNewDeliverable`
- `addActivity(\`Removed ${del.label}...\`)` in `removeModalDeliverable`

- [ ] **Step 4: Add or update timestamp formatter**

Find where activity entries are rendered in the modal (look for a `.activity-feed` section or a list of activity objects). Find or create the timestamp display. Update or add:

```js
function formatActivityTime(isoString) {
  const d = new Date(isoString)
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, "0")
  const ampm = h >= 12 ? "pm" : "am"
  const hour = h % 12 || 12
  return `${months[d.getMonth()]} ${d.getDate()}, ${hour}:${m}${ampm}`
}
```

- [ ] **Step 5: Confirm feed is newest-first**

The activity array should be prepended (unshift) not appended (push), so the newest entry appears at the top. If using `addActivity`, confirm it does:

```js
function addActivity(message) {
  const entry = { message, timestamp: new Date().toISOString(), actor: "Current User" }
  onUpdateTask({ ...task, activity: [entry, ...(task.activity || [])] })
}
```

- [ ] **Step 6: Test in browser**

Open the task modal:
- [ ] Change deliverable status → activity reads: `"{label} changed from X → Y"`
- [ ] Add a deliverable → `"Added {label} — {dims}"`
- [ ] Remove → `"Removed {label}"`
- [ ] Entries appear newest-first
- [ ] Timestamps show as `May 12, 2:30pm`

- [ ] **Step 7: Commit**

```bash
git add creative_brief_builder_prototype.jsx
git commit -m "feat: update activity feed with granular deliverable events"
```

---

### Task 7: Final Cleanup

**Files:**
- Modify: `creative_brief_builder_prototype.jsx`

- [ ] **Step 1: Search for leftover references and remove**

Search the file for each of these and verify they are gone:
- `blankDraft` — should be fully deleted
- `options.qr` — remove any conditional renders or references
- `options.fullMechanics` — remove
- `options.minimalCopy` — remove
- `options.ctaPriority` — remove
- Local `MATERIAL_PRESETS` array definition — should be deleted (imported now)
- Local `normalizeDeliverable` function — should be deleted (imported now)

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All tests in `src/deliverables.test.js` PASS

- [ ] **Step 3: Check browser console**

Run: `npm run dev`
Open browser console — should be zero errors related to deliverables, undefined variables, or missing imports.

- [ ] **Step 4: Commit**

```bash
git add creative_brief_builder_prototype.jsx
git commit -m "chore: remove legacy deliverable options fields and dead blankDraft"
```

---

### Task 8: End-to-End Verification

- [ ] **Step 1: Full flow test**

Run: `npm run dev` and manually walk through the complete flow:

1. Open the new request form
2. Type "A4" in the deliverable input → suggestions appear
3. Select "A4 Poster" → row added showing `210×297 mm · To Do`
4. Type `1080x1350` → parses as FB Portrait or custom size
5. Add text to the brief mentioning "story" → "Detect from brief" button appears
6. Click "Detect from brief" → confirmation strip with FB Story pre-checked
7. Deselect one item, click "Add Selected" → only checked items are added
8. Submit the request → appears on the kanban board
9. Open the task modal → deliverables show as compact rows
10. Change status dropdown on a deliverable → activity feed logs the change
11. Click "+ Add deliverable" in the modal → inline input appears with suggestions
12. Add a deliverable from the modal → activity feed entry appears

- [ ] **Step 2: Backward compat check**

If there are existing tasks in Supabase or localStorage:
- [ ] Old deliverables without `source` or `createdAt` still display (normalizeDeliverable fills defaults)
- [ ] Old `options` fields are silently ignored — no crash, no console error

- [ ] **Step 3: Final test run**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 4: Final commit if needed**

```bash
git add -A
git commit -m "fix: e2e verification cleanup"
```

---

*Generated 2026-05-12 · Creative Request Builder — Deliverables Module Redesign*
