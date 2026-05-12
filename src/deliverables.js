function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export const MATERIAL_PRESETS = [
  { id: "a4", label: "A4 Poster", width: "210", height: "297", unit: "mm", category: "Print" },
  { id: "letter", label: "Letter Flyer", width: "8.5", height: "11", unit: "in", category: "Print" },
  { id: "pullup", label: "Pull-up Banner", width: "3", height: "5", unit: "ft", category: "Print" },
  { id: "socmed-square", label: "Social Media Square", width: "1080", height: "1080", unit: "px", category: "Social Media" },
  { id: "socmed-portrait", label: "Social Media Portrait", width: "1080", height: "1350", unit: "px", category: "Social Media" },
  { id: "story", label: "Story / Reels Cover", width: "1080", height: "1920", unit: "px", category: "Social Media" },
  { id: "web", label: "Web Banner", width: "1440", height: "560", unit: "px", category: "Digital" },
  { id: "mobile", label: "Mobile Banner", width: "390", height: "420", unit: "px", category: "Digital" },
  { id: "tablet", label: "Tablet Banner", width: "1024", height: "480", unit: "px", category: "Digital" },
  { id: "logo", label: "Logo / Brand Mark", width: "N/A", height: "N/A", unit: "N/A", category: "Branding" },
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
  if (item.outputUrl !== undefined && item.outputUrl !== "") normalized.outputUrl = item.outputUrl
  if (item.outputNotes !== undefined && item.outputNotes !== "") normalized.outputNotes = item.outputNotes
  return normalized
}

export function detectDeliverablesFromText(text) {
  if (!text || !text.trim()) return []
  const results = []
  const seenPresets = new Set()

  const aliases = [
    { pattern: /\bA4\b/i, presetId: "a4" },
    { pattern: /\bletter\b/i, presetId: "letter" },
    { pattern: /\bpull.?up\b/i, presetId: "pullup" },
    { pattern: /\bsquare\b/i, presetId: "socmed-square" },
    { pattern: /\bportrait\b/i, presetId: "socmed-portrait" },
    { pattern: /\bstory\b/i, presetId: "story" },
    { pattern: /\breels?\b/i, presetId: "story" },
    { pattern: /\bweb\s*banner\b/i, presetId: "web" },
    { pattern: /\bmobile\s*banner\b/i, presetId: "mobile" },
    { pattern: /\btablet\s*banner\b/i, presetId: "tablet" },
    { pattern: /\blogo\b/i, presetId: "logo" },
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
    const unitStr = unit ? unit.toLowerCase() : ""
    const matchedPreset = MATERIAL_PRESETS.find(
      p => p.width === w && p.height === h && (unitStr === "" || p.unit === unitStr)
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
