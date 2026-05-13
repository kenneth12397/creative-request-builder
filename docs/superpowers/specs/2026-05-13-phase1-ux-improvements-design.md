# Phase 1 UX Improvements — Design Spec

**Date:** 2026-05-13
**Project:** Creative Request Builder
**Status:** Approved

---

## Context

The Creative Request Builder is a React + Supabase kanban tool used by two roles:

- **Marketing Associates** — submit, edit, and remove creative briefs
- **Designers** — execute requests, move them through the kanban, add revision notes

The system will be integrated with a marketing associate's campaign/content planner as part of a complete marketing department system. Both roles share one kanban board. This phase focuses on making the request lifecycle fully functional for both roles before any integration work begins.

---

## Problem

Four gaps block the system from being usable end-to-end:

1. **No edit** — marketing associates cannot change a brief after submitting
2. **Broken native dialogs** — `window.confirm` and `window.prompt` are used for delete and revision notes, which is broken UX on modern browsers and mobile
3. **No feedback** — no confirmation after submitting, editing, or deleting a request
4. **Accidental drag-and-drop** — status changes via drag-and-drop cause mis-drops and trigger a double Supabase write bug

---

## Scope

### In scope

1. Status dropdown + color coding (replaces drag-and-drop)
2. Edit request
3. Delete confirmation modal
4. Revision note input modal
5. Success / error toast
6. Debounce `generateOutput`

### Out of scope (later phases)

- Authentication — **important note:** the marketing associate's system already has user profiles with names and position/title for everyone in the office. When auth is built, it should integrate with or reference those existing profiles rather than creating a parallel user system. Avoid storing redundant profile data.
- Notifications
- Supabase Storage for reference images
- Mobile kanban
- Dashboard filters by brand / deadline
- Full integration with marketing associate's system

### Profile compatibility — design constraint for Phase 1

Because real profiles exist in the partner system, Phase 1 code must not hardcode assumptions about user identity that are hard to unpick later. Specifically:

- The `createdBy` / `submittedBy` field on a request should be stored as a plain string (name) for now — structured so it can be swapped for a foreign key to a shared user ID later
- Comments currently hardcode `"Current User"` — leave a clear `TODO` comment marking the exact line where the real user identity will be injected once auth is wired
- Do not build a separate user profile table in Supabase for this phase

---

## Role Matrix

| Action | Marketing Associate | Designer |
|--------|:-------------------:|:--------:|
| Submit new request | ✅ | ✅ |
| Edit request | ✅ | ✅ |
| Delete request | ✅ | ✅ |
| Change status | ✅ | ✅ |
| Add comment / revision note | ✅ | ✅ |

---

## Design

### 1. Status Dropdown + Color Coding

**Replaces** drag-and-drop entirely. Each kanban card displays a color-coded `<select>` showing the current status. Selecting a new value calls `supabase.upsert()` directly — no drag events, no `dropOnStatus` handler.

**Side effect:** removes the `dropOnStatus` code path, which is where the double Supabase write bug and the `setRequests` side-effect anti-pattern live. Both bugs disappear without a dedicated fix.

**Color system:**

| Status | Color | Hex |
|--------|-------|-----|
| To Do | Slate | `#475569` |
| In Progress | Blue | `#3b82f6` |
| For Review | Amber | `#f59e0b` |
| For Revision | Orange | `#f97316` |
| Done | Green | `#22c55e` |

Color applied to: card left border, column top border, column header text, dropdown border/text.

**Component:** `src/components/StatusDropdown.jsx`

```
Props:
  value: string          — current status
  onChange: (status) => void
```

### 2. Edit Request

An Edit button on each kanban card (top-right corner, visible on hover) opens the existing brief form pre-filled with the card's current data. On save, `supabase.upsert()` updates the record. On cancel, no changes are made.

The brief form already exists — edit mode reuses it inside a modal wrapper with a different submit label ("Save Changes" vs "Submit Request").

**State added to main component:**
- `editingRequest: Request | null` — null = closed, populated = edit modal open

**Component:** reuses existing brief form + `Modal.jsx` as wrapper

### 3. Delete Confirmation Modal

Replaces `window.confirm("Delete this request?")`.

- Trigger: Delete button on kanban card
- Modal shows: title of the request being deleted, "This cannot be undone" warning
- Actions: Cancel (closes modal, no change) | Delete (calls `supabase.delete()`, shows toast, closes modal)

**Component:** `src/components/Modal.jsx` — confirm variant

```
Props:
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string        — default "Delete"
  confirmVariant: string      — "danger" | "primary"
  onConfirm: () => void
  onCancel: () => void
```

### 4. Revision Note Input Modal

Replaces `window.prompt("Add revision note:")`.

- Trigger: "Add Revision Note" button on a deliverable
- Modal shows: textarea for the note
- Actions: Cancel | Submit Note

**Component:** `src/components/Modal.jsx` — input variant

```
Props:
  isOpen: boolean
  title: string
  placeholder: string
  onSubmit: (value: string) => void
  onCancel: () => void
```

`Modal.jsx` exports two named components — `ConfirmModal` and `InputModal` — with separate prop interfaces as described above.

### 5. Toast

Auto-dismissing notification, bottom-right, 3 second timeout.

**Triggers:**
- Request submitted → "Request submitted successfully"
- Request updated → "Request updated"
- Request deleted → "Request deleted"
- Revision note added → "Revision note added"
- Any Supabase error → error variant with message

**Variants:** success (green left border) | error (red left border)

**Component:** `src/components/Toast.jsx`

```
Props:
  message: string
  variant: "success" | "error"
  onDismiss: () => void
```

Rendered via a React portal to `document.body` to avoid z-index conflicts with modals.

**State added to main component:**
- `toast: { message: string, variant: string } | null`

### 6. Debounce `generateOutput`

`generateOutput` currently runs on every keystroke in the `requestDetails` textarea, recomputing the AI prompt output string on every character.

Fix: wrap the call in a `useEffect` with a 300ms debounce using a `setTimeout` / `clearTimeout` pattern. No new libraries required.

No visual change.

---

## Architecture

### New files

```
src/
  components/
    Modal.jsx           — confirm + input variants
    Toast.jsx           — success + error, auto-dismiss, portal
    StatusDropdown.jsx  — color-coded status selector
```

### Modified files

```
src/
  creative_brief_builder_prototype.jsx
    — replace dropOnStatus drag handler with StatusDropdown onChange
    — replace window.confirm with Modal confirm variant
    — replace window.prompt with Modal input variant
    — add editingRequest state + Edit button + edit modal
    — add toast state + trigger toast on all Supabase mutations
    — debounce generateOutput in useEffect
```

### What gets removed

- `dropOnStatus` function
- `onDragStart`, `onDragOver`, `onDrop` event handlers on cards/columns
- All `window.confirm` and `window.prompt` calls

---

## Error Handling

- All `supabase` calls are wrapped in try/catch
- On error: show error toast with the Supabase error message
- On success: show success toast
- Modal stays open on error so the user can retry

---

## Testing

For each of the 6 improvements, verify:

- Status dropdown: changing status updates the card column in real-time, no double write (check Supabase logs)
- Edit: pre-fills correctly, saves correctly, cancel makes no changes
- Delete modal: cancel does nothing, confirm deletes and shows toast
- Revision note modal: cancel does nothing, submit saves note and shows toast
- Toast: appears on every mutation, auto-dismisses after 3s, error variant shows on Supabase failure
- Debounce: typing quickly in requestDetails does not trigger generateOutput on every keystroke (verify with console.log count)
