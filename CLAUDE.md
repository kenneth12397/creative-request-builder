# Creative Request Builder — Claude Instructions

## Project

Creative brief management system for design teams. React + Supabase + Vercel.

- **Live:** https://creative-request-builder.vercel.app/
- **Repo:** https://github.com/kenneth12397/creative-request-builder
- **Main file:** `creative_brief_builder_prototype.jsx` (repo root, ~1800 lines, entire app in one component)
- **Entry:** `src/main.jsx` (imports main component via `../creative_brief_builder_prototype.jsx`)
- **Env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Tech Stack

- React 18.3.1 + Vite 6.3.5
- Supabase (PostgreSQL + real-time subscriptions via `@supabase/supabase-js`)
- No CSS framework — custom inline styles (~200 rules in a `<style>` tag)
- Vercel for hosting

## Skills to Use

Always use these skills for this project:

- `superpowers:brainstorming` — before planning any new feature
- `superpowers:test-driven-development` — when writing new logic
- `superpowers:systematic-debugging` — when fixing bugs
- `superpowers:verification-before-completion` — before marking anything done
- `ui-ux-pro-max` — for any UI or frontend work (avoid generic template-looking UI)

## Architecture Notes

- **Single-file monolith:** Do NOT add more logic to `creative_brief_builder_prototype.jsx`. Extract into smaller files instead.
- **Data normalization:** `normalizeRequest()` and `normalizeDeliverable()` handle legacy format migration — always run new data through these.
- **Real-time sync:** Uses `isRealtime` ref flag to prevent update loops. Don't bypass it.
- **Draft state pattern:** Deliverables are staged locally before batch-adding to Supabase.
- **Reference images:** Currently stored as base64 in a Supabase JSON column — don't add more image fields here; use Supabase Storage instead.

## Known Bugs (fix before adding features)

| Bug | Location | Notes |
|-----|----------|-------|
| Double Supabase write on drag-and-drop | `dropOnStatus` | Calls `supabase.upsert()` inside `setRequests` AND the sync `useEffect` also fires |
| Side effect inside state updater | `setRequests` callback | Anti-pattern — React Strict Mode can call it twice |
| `Header` defined inside main component | `creative_brief_builder_prototype.jsx` | Redefined on every render, causing unnecessary remounts |

## Agreed Quick Wins (do these first, in order)

- [ ] **A** — Replace `window.confirm` / `window.prompt` with proper modals
- [ ] **B** — Move `Header` outside the main component
- [ ] **C** — Add `useMemo` to `filteredRequests` and `grouped`
- [ ] **D** — Add success toast after request submission
- [ ] **E** — Debounce `generateOutput` on `requestDetails` textarea

## Coding Rules

- Immutability: always return new objects, never mutate state directly
- No new logic in the monolith — extract to `src/hooks/`, `src/components/`, `src/lib/`
- Supabase calls belong in dedicated functions, never inside `setState` callbacks
- Replace any remaining `window.confirm` / `window.alert` / `window.prompt` with modal components
- No hardcoded user strings (currently "Current User" is hardcoded as comment author)
- Validate Supabase responses — never silently swallow errors

## Integration Context

This system is part of a larger **marketing department system** for the office:

- **Partner system** (marketing associate): campaign planner, content calendar, budget tracker, merch quantity tracker, brainstorming tool, AI support. Has existing **user profiles with name + position/title** for all office staff.
- **Shared kanban**: both marketing associates and designers use this system. Marketing associates submit/edit/remove requests. Designers execute.
- **Auth rule**: when authentication is built, integrate with the partner system's existing profiles — do NOT create a separate user profile table. Store `createdBy` as a plain name string for now with a `// TODO: replace with real user ID from partner system` comment at every usage site.

## Phase 1 (approved — build this next)

Spec: `docs/superpowers/specs/2026-05-13-phase1-ux-improvements-design.md`

1. Status dropdown + color coding — replaces drag-and-drop, kills double-write bug
2. Edit request — currently missing entirely
3. Delete confirmation modal — replaces `window.confirm`
4. Revision note input modal — replaces `window.prompt`
5. Success/error toast — on all Supabase mutations
6. Debounce `generateOutput` — 300ms, no new libraries

New files: `src/components/Modal.jsx` (`ConfirmModal` + `InputModal`), `Toast.jsx`, `StatusDropdown.jsx`

## Bigger Features (backlog)

- Auth — integrate with partner system's existing profiles (NOT Supabase Auth from scratch)
- Move reference images to Supabase Storage
- Dashboard filters: by brand, deadline
- Touch support for mobile
- Notifications when status changes
