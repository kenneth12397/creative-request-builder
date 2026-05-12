# Deliverables Module Redesign
**Date:** 2026-05-12
**Status:** Approved

---

## Overview

Redesign the deliverables section from a multi-field form into a lightweight subtask/task management module. The mental model shifts from "1 request = 1 deliverable" to "1 request contains multiple deliverable subtasks."

The benchmark feel is closer to Linear subtasks or Slack task items — fast, compact, operational, and editable over time.

---

## 1. Data Model

### Deliverable shape (updated)

```js
{
  id: "DEL-...",
  label: "A4 Poster",
  width: "210",
  height: "297",
  unit: "mm",
  source: "preset" | "custom" | "detected",
  status: "To Do" | "In Progress" | "For Review" | "For Revision" | "Done",
  notes: "",
  createdAt: "ISO string",
}
```

### Removed fields
- `options.qr`
- `options.fullMechanics`
- `options.minimalCopy`
- `options.ctaPriority`

These are removed entirely. This detail belongs in the request notes or brief context, not as per-deliverable checkboxes.

### New fields
- `source: "detected"` — marks deliverables added via NLP detection (for activity logging)
- `createdAt` — timestamp for when the deliverable was added

### Backward compatibility
`normalizeDeliverable()` already handles missing fields. The `options` field will be silently dropped on read. No migration needed.

---

## 2. Deliverable Composer (Pre-submission Form)

### Empty state
Section shows a single lightweight input:

```
What deliverable do you need?
[ Type name or size, e.g. A4, 1080x1350... ]
[ + Add ]
```

No dimension fields visible initially. Suggestions appear as the user types (existing preset matching logic retained). Selecting a suggestion auto-fills name and dimensions.

### After first deliverable added
Input stays visible at the bottom. List grows above it:

```
Deliverables

A4 Poster · 210×297 mm · To Do        [···]
FB Portrait · 1080×1350 px · To Do    [···]

[ Type name or size...        ] [ + Add ]
```

The persistent input encourages additive, campaign-grouped workflow without forcing a multi-step builder.

### Row actions (··· menu)
- Edit dimensions (inline — expands width/height/unit fields on the row)
- Toggle notes (expands a single textarea inline, collapsed by default)
- Remove

### Notes behavior
- Collapsed by default on every row
- Single textarea, expands inline when toggled
- Placeholder: "Specific notes for this size only..."

### Dimension fields
Width, height, unit fields are hidden by default in the composer. They appear either:
- Auto-filled when a suggestion is selected
- Manually shown via "Edit dimensions" on an existing row
- Or surfaced inline if the user types raw dimensions (e.g., "1080x1350")

---

## 3. NLP Deliverable Detection

### Trigger
A "Detect from brief" button appears next to the Deliverables section title once the brief/request details field has text content.

### Detection logic (client-side, no API)
Scan the brief text for:
- Known preset names (case-insensitive): "A4", "story", "portrait", "pull-up", "streamer", "banner", etc.
- Raw size patterns: `1080x1350`, `210×297`, `2x5`, `3×6`
- Unit hints: "px", "mm", "ft", "in"

Match against `MATERIAL_PRESETS` first. If no preset match, construct a custom deliverable from the parsed size.

### Confirmation strip
Detection NEVER auto-adds. Always shows a confirmation UI:

```
Detected deliverables:
☐ A4 Poster — 210×297 mm
☐ FB Portrait — 1080×1350 px
☐ Streamer — 2×5 ft

[ Add Selected ]  [ Dismiss ]
```

User selects which to include, then confirms. Unselected items are discarded.

### Activity logging
Deliverables added this way get `source: "detected"`. Activity entry reads:
`"AI detected 3 deliverables — 2 added by user"`

---

## 4. Deliverables in Task Modal (Post-submission)

### Layout
Replaces current checkbox + status dropdown with compact subtask rows:

```
Deliverables                              [ + Add deliverable ]

A4 Poster · 210×297 mm          [To Do ▾]        [···]
FB Portrait · 1080×1350 px      [Ongoing ▾]      [···]
Streamer · 2×5 ft               [Done ✓]         [···]
```

### Row interactions
- **Click label** — edits name/dimensions inline
- **Status dropdown** — To Do, In Progress, For Review, For Revision, Done
- **··· menu** — Toggle notes, Remove
- **Notes** — collapsed by default, expand inline per row

### Post-submission add
`[ + Add deliverable ]` button in the section header opens the same lightweight composer input. Requestors can add new deliverables after submission while designers are already working. Every addition is logged in the activity feed.

### Visual direction
- Compact rows, not cards
- No image thumbnails or icons
- Minimal borders
- Operational density over decoration

---

## 5. Activity Feed

### New tracked events

| Event | Example entry |
|-------|--------------|
| Request submitted | `Kenneth submitted the request` |
| Deliverable added (manual) | `Kenneth added FB Portrait — 1080×1350 px` |
| Deliverable added (detected) | `AI detected 3 deliverables — 2 added by Kenneth` |
| Deliverable removed | `Kenneth removed Streamer — 2×5 ft` |
| Dimensions changed | `Kenneth updated Streamer from 2×5 ft → 3×6 ft` |
| Notes updated | `Kenneth updated notes on A4 Poster` |
| Deliverable status changed | `A4 Poster changed from Not Started → Ongoing` |
| Request status changed | `Request moved from In Progress → For Review` |
| Assignee changed | `Assigned to Designer A` |
| Deadline changed | `Deadline updated to Jun 15` |

### Actor
Currently hardcoded as `"Current User"`. Architected to accept a `currentUser` prop from the parent system. When this module becomes embedded in the larger platform, auth credentials will be injected — no internal auth needed.

### Format
Each entry: `[timestamp] [actor] [action] [subject]`
Displayed newest-first. Timestamp shown as `Mon DD, H:MMam/pm`.

---

## 6. What Is NOT Changing

- Preset library (`MATERIAL_PRESETS`) — kept as-is
- Suggestion matching logic — kept as-is
- Comments system — not touched in this revision
- Reference images — not touched
- AI brief generation / image prompt builder — not touched
- Kanban board — not touched
- Overall form structure — not touched

---

## 7. Future-ready Hooks (Not Implementing Now)

The data model and activity system should not block these future features:
- Duplicate deliverable
- Assign designer per deliverable (`assignedTo` field on deliverable)
- Deliverable-specific revisions
- Notification for newly added deliverables after submission
- Recent/common deliverables quick-add
