import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { MATERIAL_PRESETS, normalizeDeliverable, detectDeliverablesFromText, statusPillColor } from './src/deliverables.js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
const MAX_REFERENCE_IMAGES = 14;
const STORAGE_BUCKET = "reference-images";

const STATUS_COLUMNS = ["To Do", "In Progress", "For Review", "For Revision", "Done"];
const STATUS_ACCENT = { "To Do": "#94a3b8", "In Progress": "#3b82f6", "For Review": "#f59e0b", "For Revision": "#f97316", "Done": "#22c55e" };
const DELIVERABLE_STATUSES = ["To Do", "In Progress", "For Review", "For Revision", "Done"];
const COMMENT_TYPES = ["General", "Clarification", "Revision", "Approval"];
const ASSET_PROMPT_TYPES = ["Key Visual", "Background", "Character / Mascot", "3D Object", "Scene Reference"];

const ASSET_TYPE_META = {
  "Key Visual":         { icon: "🎨", desc: "Full KV layout — product focal point, brand, QR, and mandatories" },
  "Background":         { icon: "🌫️", desc: "Clean background plate only — no logos, text, or QR code" },
  "Character / Mascot": { icon: "🎭", desc: "Isolated character on a plain background, ready to cut out" },
  "3D Object":          { icon: "📦", desc: "Polished 3D asset, front-facing with simple lighting" },
  "Scene Reference":    { icon: "🎬", desc: "Mood and environment reference — not the final ad layout" },
};


const REQUESTORS = [
  "Marketing Manager",
  "Marketing Associate",
  "Boss / Approver",
  "Retail / Outlet Team",
  "Operations Team",
  "Other Requestor",
];

const DESIGNERS = ["Unassigned", "Senior Designer", "Designer A", "Designer B", "Designer C"];

const blankForm = {
  title: "",
  brand: "LakiWin",
  outputMode: "Static",
  requestDetails: "",
  deliverables: [],
  deadline: "",
  requestor: "",
  assignedTo: "Unassigned",
  referenceImages: [],
  referenceNotes: "",
};


const css = `
  :root {
    --fs-heading: 20px; --fs-subheading: 15px; --fs-body: 14px; --fs-small: 13px; --fs-caption: 12px;
    --fw-black: 900; --fw-bold: 800; --fw-semi: 600; --fw-regular: 400;
  }
  * { box-sizing: border-box; }
  body { margin: 0; }
  .app { min-height: 100vh; background: #f4f4f5; color: #18181b; font-family: Inter, Arial, sans-serif; }
  .header { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,.94); border-bottom: 1px solid #e4e4e7; backdrop-filter: blur(8px); }
  .header-inner { max-width: 1240px; margin: 0 auto; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
  .container { max-width: 1240px; margin: 0 auto; padding: 20px; }
  .grid { display: grid; grid-template-columns: minmax(0, 1fr) 350px; gap: 20px; align-items: start; }
  .card { background: white; border: 1px solid #e4e4e7; border-radius: 18px; box-shadow: 0 1px 3px rgba(0,0,0,.05); margin-bottom: 16px; }
  .card-header { padding: 16px 18px; border-bottom: 1px solid #f1f1f1; font-weight: 800; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .card-title { display: flex; align-items: center; gap: 10px; }
  .card-body { padding: 18px; }
  .section-num { width: 26px; height: 26px; border-radius: 999px; background: #18181b; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; flex: 0 0 auto; }
  label, .field-label { font-size: var(--fs-caption); font-weight: var(--fw-bold); display: block; margin-bottom: 6px; color: #71717a; text-transform: uppercase; letter-spacing: .04em; }
  input, textarea, select { width: 100%; border: 1px solid #d4d4d8; border-radius: 12px; padding: 10px 12px; font-size: 14px; outline: none; background: white; color: #18181b; }
  textarea { min-height: 110px; resize: vertical; line-height: 1.45; }
  input:focus, textarea:focus, select:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,.12); }
  .field { margin-bottom: 14px; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .three-row { display: grid; grid-template-columns: 1fr 1fr 100px; gap: 10px; }
  .btn { border: 0; border-radius: 12px; padding: 10px 14px; font-size: 14px; font-weight: 850; cursor: pointer; background: #18181b; color: #fff; transition: transform .08s ease, opacity .12s ease; }
  .btn:hover { transform: translateY(-1px); }
  .btn.secondary { border: 1px solid #d4d4d8; background: white; color: #18181b; }
  .btn.ghost { background: transparent; color: #18181b; padding: 6px 8px; }
  .btn.purple { background: #7c3aed; }
  .btn.danger { border: 1px solid #fecaca; background: white; color: #991b1b; }
  .btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
  .pill { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #d4d4d8; border-radius: 999px; padding: 6px 10px; font-size: 13px; font-weight: 800; background: white; color: #3f3f46; line-height: 1; }
  .pill.blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
  .pill.red { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
  .pill.yellow { background: #fffbeb; color: #92400e; border-color: #fde68a; }
  .pill.green { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
  .pill.purple { background: #f3e8ff; color: #6d28d9; border-color: #e9d5ff; }
  .muted { color: #71717a; }
  .small { font-size: var(--fs-small); }
  .warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; border-radius: 12px; padding: 11px 12px; font-size: 13px; margin-bottom: 8px; }
  .success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 12px; padding: 11px 12px; font-size: 13px; margin-bottom: 8px; }
  .sticky { position: sticky; top: 92px; }
  .choice-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
  .choice { text-align: left; border: 1px solid #d4d4d8; border-radius: 14px; padding: 13px; background: #fff; cursor: pointer; font-weight: 850; }
  .choice-wrap { position: relative; }
  .choice-tip { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: #18181b; color: #fff; font-size: 12px; font-weight: 500; padding: 6px 12px; border-radius: 8px; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.15s 0s; z-index: 10; }
  .choice-tip::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #18181b; }
  .choice-wrap:hover .choice-tip { opacity: 1; transition: opacity 0.15s 1s; }
  .choice.active { background: #18181b; color: white; border-color: #18181b; }
  .composer { border: 1px dashed #d4d4d8; border-radius: 16px; background: #fbfbfd; padding: 12px; }
  .suggestions { display: grid; gap: 8px; margin-top: 10px; }
  .suggestion { border: 1px solid #e4e4e7; border-radius: 12px; background: white; padding: 10px; display: flex; justify-content: space-between; gap: 10px; align-items: center; cursor: pointer; text-align: left; }
  .suggestion:hover { border-color: #a78bfa; }
  .reference-panel { border: 1px solid #e4e4e7; border-radius: 16px; padding: 14px; background: #fbfbfd; }
  .thumb-strip { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
  .thumb { width: 64px; height: 64px; border-radius: 12px; border: 1px solid #e4e4e7; object-fit: cover; background: #f4f4f5; }
  .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.48); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 99; }
  .modal { background: white; border-radius: 20px; width: 100%; max-width: 680px; max-height: 88vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.28); display: flex; flex-direction: column; }
  .modal.large { max-width: 960px; }
  .modal-header { padding: 18px 20px; border-bottom: 1px solid #e4e4e7; display: flex; align-items: center; justify-content: space-between; gap: 16px; background: white; flex-shrink: 0; }
  .modal-body { padding: 20px; overflow: auto; flex: 1; }
  .upload-zone { border: 1.5px dashed #a1a1aa; border-radius: 18px; min-height: 160px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 22px; background: #fafafa; }
  .upload-zone.dragging { background: #f3e8ff; border-color: #8b5cf6; }
  .thumb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 10px; margin-top: 16px; }
  .thumb-card { position: relative; border: 1px solid #e4e4e7; border-radius: 14px; padding: 8px; background: white; min-width: 0; }
  .thumb-card img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 10px; background: #f4f4f5; }
  .thumb-remove { position: absolute; top: 6px; right: 6px; border: 0; width: 24px; height: 24px; border-radius: 999px; background: rgba(24,24,27,.82); color: white; cursor: pointer; }
  .board { display: grid; grid-template-columns: repeat(5, minmax(210px, 1fr)); gap: 14px; align-items: start; overflow-x: auto; padding-bottom: 12px; }
  .board-column { min-height: 520px; background: #ededf0; border: 1px solid #e4e4e7; border-radius: 18px; padding: 10px; }
  .board-column.drag-over { outline: 3px solid rgba(139,92,246,.25); }
  .column-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 4px 10px; }
  .column-title { font-weight: 900; display: flex; align-items: center; gap: 8px; }
  .count { min-width: 24px; height: 24px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; background: white; border: 1px solid #d4d4d8; font-size: 12px; color: #52525b; }
  .task-card { position: relative; background: white; border: 1px solid #dddde3; border-radius: 12px; padding: 16px 14px 14px 16px; margin-bottom: 10px; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,.07); transition: transform .08s ease, box-shadow .12s ease; }
  .task-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,.10); }
  .strip-gray { background: #a1a1aa; }
  .strip-green { background: #22c55e; }
  .strip-yellow { background: #facc15; }
  .strip-orange { background: #fb923c; }
  .strip-red { background: #ef4444; }
  .task-top { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 8px; }
  .task-title { font-size: var(--fs-subheading); font-weight: var(--fw-black); line-height: 1.3; margin: 0 0 3px; }
  .task-brand { font-size: var(--fs-caption); color: #71717a; font-weight: var(--fw-semi); margin-bottom: 10px; }
  .task-assignee { display: flex; align-items: center; gap: 5px; font-size: var(--fs-caption); font-weight: var(--fw-semi); color: #52525b; margin-bottom: 12px; }
  .assignee-avatar { width: 20px; height: 20px; border-radius: 50%; background: #e4e4e7; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: var(--fw-black); color: #71717a; flex-shrink: 0; }
  .assignee-avatar.assigned { background: #d1fae5; color: #065f46; }
  .task-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px solid #f4f4f5; padding-top: 10px; }
  .task-deadline { font-size: var(--fs-caption); font-weight: var(--fw-semi); display: inline-flex; align-items: center; gap: 4px; }
  .task-deadline.dl-overdue { color: #dc2626; }
  .task-deadline.dl-soon { color: #d97706; }
  .task-deadline.dl-safe { color: #16a34a; }
  .task-deadline.dl-none { color: #a1a1aa; }
  .task-icons { display: flex; gap: 10px; align-items: center; }
  .task-meta { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; font-size: 14px; color: #3f3f46; }
  .task-icon { display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-caption); font-weight: var(--fw-bold); color: #52525b; white-space: nowrap; position: relative; }
  .card-status-select { border: 1px solid; font-size: 11px; font-weight: var(--fw-bold); cursor: pointer; padding: 3px 6px; border-radius: 8px; outline: none; max-width: 116px; }
  .card-status-select.s-todo { background: #f4f4f5; color: #52525b; border-color: #d4d4d8; }
  .card-status-select.s-inprogress { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
  .card-status-select.s-forreview { background: #fffbeb; color: #92400e; border-color: #fde68a; }
  .card-status-select.s-forrevision { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
  .card-status-select.s-done { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
  .card-status-select option { background: white; color: #18181b; }
  .unread-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; border-radius: 999px; background: #ef4444; color: white; font-size: 10px; font-weight: 900; padding: 0 5px; }
  .dashboard-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .dashboard-toolbar select { width: auto; flex-shrink: 0; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 34px; }
  .toolbar-search { position: relative; flex: 1; }
  .toolbar-search input { padding-left: 38px; padding-right: 36px; }
  .toolbar-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #a1a1aa; pointer-events: none; display: flex; }
  .detail-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(260px, .8fr); gap: 18px; }
  .info-box { border: 1px solid #e4e4e7; border-radius: 14px; padding: 12px; background: #fafafa; margin-bottom: 12px; }
  .table-ish { display: grid; gap: 8px; }
  .deliverable-detail { border: 1px solid #e4e4e7; border-radius: 12px; padding: 10px; background: white; }
  .comment { border-bottom: 1px solid #f1f1f1; padding: 10px 0; }
  .comment-type { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 8px; font-size: 11px; font-weight: 900; background: #f4f4f5; color: #52525b; margin-left: 6px; }
  .asset-type-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 10px 0; }
  .asset-type { border: 1px solid #d4d4d8; border-radius: 12px; padding: 9px 10px; background: white; cursor: pointer; font-weight: 850; font-size: 13px; }
  .asset-type.active { background: #18181b; color: white; border-color: #18181b; }
  .asset-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
  .asset-card { border: 1.5px solid #e4e4e7; border-radius: 14px; padding: 12px 14px; background: white; cursor: pointer; text-align: left; transition: border-color .12s, background .12s; width: 100%; }
  .asset-card:hover { border-color: #a78bfa; background: #faf8ff; }
  .asset-card.active { border-color: #7c3aed; background: #f5f3ff; }
  .asset-card-icon { font-size: 22px; margin-bottom: 6px; display: block; line-height: 1; }
  .asset-card-name { font-size: 13px; font-weight: 850; color: #18181b; display: block; margin-bottom: 3px; }
  .asset-card-desc { font-size: 11px; color: #71717a; display: block; line-height: 1.45; }
  .asset-card.active .asset-card-name { color: #5b21b6; }
  .asset-card.active .asset-card-desc { color: #7c3aed; }
  .prompt-block { background: #f8fafc; color: #1e293b; border-radius: 14px; padding: 16px 18px; font-size: 13px; line-height: 1.7; max-height: 280px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; font-family: inherit; margin: 10px 0 8px; border: 1px solid #e2e8f0; }
  .prompt-copy-btn { width: 100%; border: 0; border-radius: 12px; padding: 11px; font-size: 14px; font-weight: 850; cursor: pointer; background: #7c3aed; color: white; transition: background .15s; }
  .prompt-copy-btn:hover { background: #6d28d9; }
  .prompt-copy-btn.copied { background: #059669; }
  .activity-item { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 8px; padding: 8px 0; border-bottom: 1px solid #f1f1f1; font-size: 13px; }
  .del-composer { display: flex; flex-direction: column; gap: 6px; }
  .del-input-row { display: flex; gap: 6px; align-items: center; }
  .del-input-row input { flex: 1; padding: 7px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; width: auto; }
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
  .del-status-select { padding: 3px 6px; border: 1px solid #e5e7eb; border-radius: 5px; font-size: 12px; cursor: pointer; background: #fff; width: auto; }
  .del-status-select.blue { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
  .del-status-select.yellow { background: #fefce8; border-color: #fde68a; color: #92400e; }
  .del-status-select.red { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
  .del-status-select.green { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
  .del-menu-btn { background: none; border: none; cursor: pointer; padding: 2px 6px; color: #9ca3af; font-size: 16px; border-radius: 4px; width: auto; }
  .del-menu-btn:hover { background: #f3f4f6; color: #374151; }
  .del-menu-wrap { position: relative; }
  .del-dropdown { position: absolute; right: 0; top: 100%; z-index: 100; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,.1); min-width: 148px; padding: 4px 0; margin-top: 2px; }
  .del-dropdown-item { display: block; width: 100%; text-align: left; background: none; border: none; padding: 7px 12px; font-size: 13px; color: #374151; cursor: pointer; white-space: nowrap; }
  .del-dropdown-item:hover { background: #f3f4f6; }
  .del-dropdown-item.danger { color: #dc2626; }
  .del-dropdown-item.danger:hover { background: #fef2f2; }
  .del-notes-area { width: 100%; margin-top: 4px; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; resize: vertical; min-height: 52px; box-sizing: border-box; }
  .del-notes-area:focus { outline: none; border-color: #6366f1; }
  .del-inline-dims { display: flex; gap: 4px; align-items: center; margin-top: 4px; }
  .del-inline-dims input { width: 64px; padding: 4px 6px; border: 1px solid #e5e7eb; border-radius: 5px; font-size: 12px; }
  .del-inline-dims select { padding: 4px 6px; border: 1px solid #e5e7eb; border-radius: 5px; font-size: 12px; width: auto; }
  .del-detect-btn { font-size: 12px; padding: 5px 10px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 10px; cursor: pointer; color: #374151; white-space: nowrap; }
  .del-detect-btn:hover { background: #e5e7eb; }
  .del-composer-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .del-name-wrap { position: relative; flex: 1 1 180px; min-width: 0; }
  .del-name-input { width: 100%; padding: 9px 12px; border: 1px solid #d4d4d8; border-radius: 12px; font-size: 14px; outline: none; background: white; color: #18181b; }
  .del-name-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,.12); }
  .del-dim-input { width: 62px; padding: 9px 10px; border: 1px solid #d4d4d8; border-radius: 12px; font-size: 14px; outline: none; text-align: center; background: white; color: #18181b; }
  .del-dim-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,.12); }
  .del-dim-sep { color: #71717a; font-size: 14px; flex-shrink: 0; }
  .del-unit-select { padding: 9px 10px; border: 1px solid #d4d4d8; border-radius: 12px; font-size: 14px; outline: none; background: white; color: #18181b; width: auto; }
  .del-unit-select:focus { border-color: #8b5cf6; }
  .del-match-hint { font-size: 12px; color: #6d28d9; background: #f5f3ff; border: 1px solid #ede9fe; border-radius: 8px; padding: 6px 10px; }
  .del-cards { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
  .del-card { background: white; border: 1px solid #e4e4e7; border-radius: 14px; padding: 14px 16px; }
  .del-card-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .del-card-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
  .del-card-name { font-size: 14px; font-weight: 800; color: #18181b; }
  .del-card-size { font-size: 13px; color: #71717a; }
  .del-card-notes-preview { font-size: 12px; color: #52525b; margin: 2px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-style: italic; }
  .del-card-actions { display: flex; gap: 6px; flex-shrink: 0; align-items: center; }
  .del-card-btn { border: 1px solid #e4e4e7; background: white; color: #3f3f46; font-size: 12px; font-weight: 700; border-radius: 8px; padding: 5px 10px; cursor: pointer; white-space: nowrap; }
  .del-card-btn:hover { background: #f4f4f5; border-color: #a1a1aa; }
  .del-card-btn.danger { color: #991b1b; border-color: #fecaca; }
  .del-card-btn.danger:hover { background: #fef2f2; }
  .del-confirm-actions { display: flex; gap: 6px; margin-top: 8px; }
  .del-confirm-add { padding: 5px 12px; background: #16a34a; color: #fff; border: none; border-radius: 5px; font-size: 12px; cursor: pointer; }
  .del-confirm-dismiss { padding: 5px 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 5px; font-size: 12px; cursor: pointer; }
  .revision-dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .revision-dialog { background: #fff; border-radius: 18px; padding: 28px 28px 22px; width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); display: flex; flex-direction: column; gap: 0; }
  .revision-dialog-title { font-size: 17px; font-weight: 800; color: #18181b; margin-bottom: 6px; }
  .revision-dialog-textarea { width: 100%; min-height: 100px; border-radius: 10px; border: 1.5px solid #e5e7eb; padding: 12px 14px; font-size: 14px; font-family: inherit; resize: vertical; margin: 10px 0 16px; box-sizing: border-box; }
  .revision-dialog-textarea:focus { outline: none; border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.12); }
  .revision-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .toast-container { position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 8px; z-index: 9999; pointer-events: none; }
  .toast { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-radius: 12px; font-size: var(--fs-body); font-weight: var(--fw-semi); box-shadow: 0 8px 24px rgba(0,0,0,.15); min-width: 220px; animation: toast-in .15s ease; }
  .toast.success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
  .toast.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
  @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .tm-deadline-chip { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e4e4e7; border-radius: 10px; margin-bottom: 12px; }
  .tm-deadline-chip.chip-overdue { background: #fef2f2; border-color: #fecaca; }
  .tm-deadline-chip.chip-soon { background: #fffbeb; border-color: #fde68a; }
  .tm-deadline-chip.chip-safe { background: #ecfdf5; border-color: #a7f3d0; }
  .tm-deadline-date { font-size: 14px; font-weight: 800; color: #18181b; }
  .tm-comments-scroll { max-height: 260px; overflow-y: auto; padding-right: 2px; }
  .tm-activity-scroll { max-height: 200px; overflow-y: auto; padding-right: 2px; }
  .modal-aside { background: #f4f4f5; border-radius: 16px; overflow: hidden; }
  .modal-aside .info-box { background: transparent; border: none; border-radius: 0; border-bottom: 1px solid #e4e4e7; padding: 14px 16px; margin-bottom: 0; }
  .modal-aside .info-box:last-child { border-bottom: none; }
  .modal-status-select { width: 100%; border: 1.5px solid; border-radius: 10px; padding: 9px 12px; font-size: var(--fs-body); font-weight: var(--fw-bold); cursor: pointer; outline: none; }
  .modal-status-select:focus { box-shadow: 0 0 0 3px rgba(139,92,246,.12); }
  .modal-status-select.s-todo { background: #f4f4f5; color: #52525b; border-color: #d4d4d8; }
  .modal-status-select.s-inprogress { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
  .modal-status-select.s-forreview { background: #fffbeb; color: #92400e; border-color: #fde68a; }
  .modal-status-select.s-forrevision { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
  .modal-status-select.s-done { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
  .modal-status-select option { background: white; color: #18181b; }
  .del-progress-bar { height: 4px; background: #e4e4e7; border-radius: 99px; overflow: hidden; margin: 0 0 12px; }
  .del-progress-fill { height: 100%; border-radius: 99px; transition: width .35s ease; background: #22c55e; }
  .ctype-row { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px; }
  .ctype-btn { border: 1px solid #e4e4e7; background: white; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 800; cursor: pointer; color: #71717a; transition: all .12s; line-height: 1.5; }
  .ctype-btn:hover { border-color: #a1a1aa; color: #3f3f46; }
  .ctype-btn.active { background: #18181b; color: white; border-color: #18181b; }
  .ctype-btn.active-revision { background: #991b1b; color: white; border-color: #991b1b; }
  @media (max-width: 1000px) { .grid, .detail-grid, .dashboard-toolbar { grid-template-columns: 1fr; } .sticky { position: static; } .board { grid-template-columns: repeat(5, 260px); } }
  @media (max-width: 620px) { .row, .three-row { grid-template-columns: 1fr; } .task-meta { grid-template-columns: 1fr auto auto; gap: 8px; } }
`;

function uid(prefix = "REQ") {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function Section({ n, title, optional, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><span className="section-num">{n}</span>{title}</div>
        {optional && <span className="pill">Optional</span>}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function formatSize(item) {
  if (!item) return "";
  if (item.width === "N/A" || item.unit === "N/A") return "N/A";
  return `${item.width || "—"} × ${item.height || "—"} ${item.unit || ""}`.trim();
}

function formatDate(dateStr) {
  if (!dateStr) return "No deadline";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateFull(dateStr) {
  if (!dateStr) return "No deadline set";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatActivityTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function makeActivity(action, detail = "", actor = "Current User") {
  return { id: uid("ACT"), action, detail, actor, createdAt: new Date().toISOString() };
}


function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  target.setHours(0, 0, 0, 0);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target - today) / 86400000);
}

function deadlineMeta(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return { label: "No deadline", strip: "strip-gray", badge: "", days };
  if (days < 0) return { label: "Overdue", strip: "strip-red", badge: "red", days };
  if (days <= 3) return { label: "Due soon", strip: "strip-orange", badge: "yellow", days };
  if (days <= 7) return { label: "Less than 7 days", strip: "strip-yellow", badge: "yellow", days };
  return { label: "More than 7 days", strip: "strip-green", badge: "green", days };
}

function normalizeStatus(status) {
  if (!status || status === "Submitted") return "To Do";
  return STATUS_COLUMNS.includes(status) ? status : "To Do";
}

function normalizeRequest(r) {
  const rawDeliverables = Array.isArray(r.form?.deliverables) ? r.form.deliverables : legacyDeliverables(r.form || {});
  return {
    ...r,
    status: normalizeStatus(r.status),
    comments: Array.isArray(r.comments) ? r.comments.map((c) => ({ type: "General", ...c })) : [],
    unreadComments: Number.isFinite(r.unreadComments) ? r.unreadComments : 0,
    activity: Array.isArray(r.activity) ? r.activity : [],
    form: {
      ...blankForm,
      ...(r.form || {}),
      requestDetails: r.form?.requestDetails || r.form?.ideaDump || "",
      deliverables: rawDeliverables.map(normalizeDeliverable),
      referenceImages: Array.isArray(r.form?.referenceImages) ? r.form.referenceImages : Array.isArray(r.form?.files) ? r.form.files : [],
      assignedTo: r.form?.assignedTo || "Unassigned",
    },
  };
}

function legacyDeliverables(form) {
  const output = [];
  if (Array.isArray(form.materials)) {
    form.materials.forEach((id) => {
      const preset = MATERIAL_PRESETS.find((m) => m.id === id);
      if (preset) output.push(normalizeDeliverable({ ...preset, source: "preset", status: "To Do", notes: "", options: {} }));
    });
  }
  if (form.customMaterial?.trim()) {
    output.push(normalizeDeliverable({ id: uid("DEL"), label: form.customMaterial.trim(), width: "", height: "", unit: "", source: "custom", status: "To Do", notes: "", options: {} }));
  }
  return output;
}

async function loadFromSupabase() {
  const { data, error } = await supabase
    .from("requests")
    .select("data")
    .order("created_at", { ascending: false });
  if (error) { console.warn("Load error", error); return []; }
  return (data || []).map((row) => normalizeRequest(row.data));
}

function textLines(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-•\s]+/, "").trim())
    .filter(Boolean);
}

function summarizeRequestDetails(form) {
  const lines = textLines(form.requestDetails);
  if (!lines.length) return "No request details provided yet.";
  return lines.slice(0, 3).join(" ").slice(0, 190) + (lines.join(" ").length > 190 ? "…" : "");
}

function generateOutput(form) {
  const lines = textLines(form.requestDetails);
  const details = form.requestDetails.trim();
  const title = form.title.trim() || "Untitled Project";
  const deliverables = form.deliverables || [];
  const deliverableText = deliverables.length
    ? deliverables.map((item) => `${item.label || "Custom Size"}${formatSize(item) ? ` — ${formatSize(item)}` : ""}`).join(", ")
    : "No deliverables selected";
  const lower = `${title} ${details}`.toLowerCase();
  const missing = [];

  if (!details) missing.push("Request details / full brief is not provided.");
  if (!deliverables.length) missing.push("No deliverables / sizes added.");
  if (!form.deadline) missing.push("Date needed is missing.");
  if (!form.requestor) missing.push("Requested by is not selected.");
  if (!/(cta|call to action|register|join|scan|visit|deposit|play|click|learn more)/i.test(details)) missing.push("Final CTA is not clearly provided.");
  if (!/(qr|file|asset|drive|attachment|upload)/i.test(details) && /qr/i.test(lower)) missing.push("QR asset/file still needs to be attached or confirmed.");
  if (!/(location|branch|outlet|venue|placement|site|area|kiosk|monitor)/i.test(lower)) missing.push("Location / placement is not clearly provided.");

  const detected = {
    mainMessage: lines[0] || title,
    featuredProduct: /superace/i.test(details) ? "SuperAce by JILI" : findAfterKeyword(details, ["feature", "showcase", "promote"]) || "Not clearly provided",
    mandatories: /pagcor/i.test(details) ? "PAGCOR mandatories required" : /responsible/i.test(details) ? "Responsible gaming mandatory required" : "Not clearly provided",
    qr: /qr/i.test(details) ? "QR code required" : "Not requested",
    logo: /logo/i.test(details) ? "Logo must be shown" : "Not clearly provided",
    cta: findCTA(details) || "Not clearly provided",
  };

  const brief = details
    ? `Create a ${form.outputMode.toLowerCase()} creative request for “${title}” under ${form.brand}. Use the requestor's notes as the main source of truth: ${summarizeRequestDetails(form)} Adapt the same campaign system across: ${deliverableText}.`
    : `Create a ${form.outputMode.toLowerCase()} creative request for “${title}” under ${form.brand}. Adapt the campaign system across: ${deliverableText}.`;

  const visualDirection = buildVisualDirection(form, detected);

  return {
    summary: `${title} — ${summarizeRequestDetails(form)}`,
    brief,
    detected,
    missing: missing.length ? missing : ["No major gaps detected. Final approval and compliance should still be checked."],
    visualDirection,
    imagePrompt: buildImagePrompt(form, detected, visualDirection),
  };
}

function findAfterKeyword(text, keywords) {
  const line = textLines(text).find((l) => keywords.some((k) => l.toLowerCase().startsWith(k)));
  return line ? line.replace(new RegExp(`^(${keywords.join("|")})\\s+`, "i"), "").replace(/[.:]/g, "").trim() : "";
}

function findCTA(text) {
  const line = textLines(text).find((l) => /(register|join|scan|visit|deposit|play|click|learn more|download)/i.test(l));
  return line || "";
}

function buildVisualDirection(form, detected) {
  const lower = `${form.title} ${form.requestDetails}`.toLowerCase();
  const isLogo = /logo|brand mark|identity/.test(lower);
  const isPromo = /promo|deposit|bonus|raffle|register|play|game|jili|superace/.test(lower);

  if (isLogo) {
    return {
      mood: "Clean, recognizable, scalable brand direction.",
      colorBalance: "Use brand colors first. Keep the logo readable in full color, black, and white.",
      coreIdea: "Prioritize a simple mark that can work from small icon usage to signage.",
      imagery: ["wordmark lockup", "icon-only mark", "clear negative space"],
    };
  }

  return {
    mood: isPromo ? "Direct, promotional, easy-to-scan campaign system." : "Clear, branded, production-ready creative direction.",
    colorBalance: form.brand === "LakiWin" ? "60% LakiWin yellow, 25% white/black structure, 15% controlled warm orange or gold highlights." : "Use the selected brand palette as the main structure, with one supporting accent only.",
    coreIdea: detected.featuredProduct !== "Not clearly provided" ? `Make ${detected.featuredProduct} the focal point, then support it with brand, QR, and mandatory elements.` : "Use one dominant focal idea and make all supporting graphics point toward it.",
    imagery: ["main focal asset", "brand logo space", "QR-safe layout", "mandatory text area"],
  };
}

function buildImagePrompt(form, detected, visualDirection) {
  const deliverableText = form.deliverables?.length ? form.deliverables.map((d) => `${d.label} ${formatSize(d)}`).join(", ") : "selected formats";
  return `KV Direction — ${form.title || "Untitled Project"}

Requestor Notes:
${form.requestDetails || "No request details provided."}

Deliverables:
${deliverableText}

Core Idea:
${visualDirection.coreIdea}

Hierarchy:
1. Main message / focal product: ${detected.featuredProduct !== "Not clearly provided" ? detected.featuredProduct : form.title || "project title"}
2. Brand presence: ${detected.logo}
3. Action element: ${detected.qr}
4. Mandatories: ${detected.mandatories}

Visual Direction:
${visualDirection.mood}
${visualDirection.colorBalance}

Composition Rules:
Keep a clear safe area for text and mandatories. Do not overload the layout. Make the main focal point readable from a distance. Adapt the KV consistently across all listed deliverables.`;
}

const BRAND_DNA = {
  "LakiWin": {
    palette: "dominant LakiWin yellow (#FFD700) and warm gold, white structural zones, controlled dark navy or black grounding elements, warm orange accent highlights",
    aesthetic: "bold Filipino online casino — energetic, celebratory, trustworthy, premium gaming platform feel",
    style: "vibrant digital illustration with clean graphic design, casino-gaming visual language, polished and modern",
    motifs: "gold coins, light rays, glow halos, lucky charm iconography, winners celebrating, dynamic diagonal energy lines",
    typography_feel: "strong impact headline weight implied in layout zones, high contrast readable hierarchy",
  },
  "VikingFunLand": {
    palette: "deep forest green and weathered ocean blue, gold and bronze metallic accents, aged wood and stone textures, muted earthy midtones",
    aesthetic: "Viking mythology adventure theme — epic, bold, mythic, action-forward, rugged yet exciting",
    style: "dramatic character illustration with fantasy undertones, strong silhouettes against atmospheric lighting",
    motifs: "Viking warriors, runic symbols, longships, battle axes, shields, Northern lights aurora, treasure chests, mead halls",
    typography_feel: "carved stone or woodcut-style lettering implied in composition zones",
  },
  "RAC PH": {
    palette: "racing red and matte white, metallic silver and chrome accents, track black, Philippine flag color references",
    aesthetic: "Philippine motorsports and automotive — speed, precision, adrenaline, local racing pride",
    style: "high-energy graphic design with dynamic motion lines, perspective-forward automotive photography aesthetic",
    motifs: "race cars, speed blur trails, checkered flags, pit crews, helmets, trophies, asphalt textures, speedway",
    typography_feel: "bold condensed race-number styling implied, high legibility at speed",
  },
  "Other Brand": {
    palette: "neutral brand palette — clean white base with a single strong accent color, professional and flexible",
    aesthetic: "versatile commercial — clean, clear, brand-forward without a specific theme",
    style: "clean digital graphic design, universal commercial advertising aesthetic",
    motifs: "product focal point, lifestyle context, clean negative space",
    typography_feel: "clean editorial hierarchy implied in safe zones",
  },
}

function detectVisualIntent(title, details) {
  const t = (title + " " + details).toLowerCase()
  if (/register|sign.?up|creat.? account|how to join|step.?by.?step/.test(t))
    return { subject: "step-by-step registration guide visual", layout: "numbered flow (1–2–3) arranged in scannable sequence, mobile/app screen as central focal point, clean instructional composition" }
  if (/jackpot|big win|winner|prize|reward|grand/.test(t))
    return { subject: "jackpot celebration and prize reveal visual", layout: "explosive celebration focal point — coins, lights, trophy or winner figure as hero element, radiating energy composition" }
  if (/promo|promotion|offer|bonus|discount|deal|sale/.test(t))
    return { subject: "promotional campaign visual", layout: "bold hero zone for offer/message, strong CTA implied layout, product or game art as supporting element" }
  if (/event|tournament|league|cup|championship/.test(t))
    return { subject: "event announcement and hype visual", layout: "date/event name implied zone at top or center, dramatic build-up composition, crowd energy or arena atmosphere" }
  if (/game|slot|poker|baccarat|feature|launch/.test(t))
    return { subject: "game feature spotlight visual", layout: "game art or character as dominant center piece, supporting brand elements frame it, immersive gaming atmosphere" }
  if (/pull.?up|banner|outdoor|billboard|signage/.test(t))
    return { subject: "large-format outdoor advertising visual", layout: "vertically optimized composition, bold simple hierarchy, readable at distance — single strong focal point with brand zone at top" }
  return { subject: "branded marketing creative", layout: "strong hero zone with one dominant focal idea, supporting graphics radiate outward from center" }
}

function buildComprehensivePrompt(form, ai) {
  const title = form.title?.trim() || "Untitled Project"
  const brand = form.brand || "Other Brand"
  const outputMode = form.outputMode || "Static"
  const details = (form.requestDetails || "").trim()
  const deliverables = form.deliverables || []
  const referenceNotes = (form.referenceNotes || "").trim()
  const vd = (ai && ai.visualDirection) || {}
  const detected = (ai && ai.detected) || {}

  const dna = BRAND_DNA[brand] || BRAND_DNA["Other Brand"]
  const intent = detectVisualIntent(title, details)

  const deliverableLines = deliverables.length
    ? deliverables.map(d => {
        const size = d.width && d.unit !== "N/A" ? ` — ${d.width}×${d.height} ${d.unit}` : ""
        const note = d.notes ? ` (${d.notes})` : ""
        return `• ${d.label}${size}${note}`
      }).join("\n")
    : "• No sizes specified yet"

  const firstWithDims = deliverables.find(d => d.width && d.height && d.unit !== "N/A")
  const arHint = firstWithDims ? `--ar ${firstWithDims.width}:${firstWithDims.height}` : ""

  const mandatories = []
  if (/qr/i.test(details)) mandatories.push("designated QR code placement zone")
  if (/pagcor/i.test(details)) mandatories.push("PAGCOR regulatory text band")
  if (/responsible.?gaming/i.test(details)) mandatories.push("responsible gaming disclaimer strip")
  mandatories.push("brand logo safe zone", "headline text area", "mandatory regulatory space")
  const mandatoryNote = `Safe zones reserved for: ${mandatories.join(", ")}. No actual logos, text, or QR codes rendered in the image.`

  const featuredProduct = detected.featuredProduct && detected.featuredProduct !== "Not clearly provided"
    ? `Feature "${detected.featuredProduct}" as a supporting focal element. ` : ""

  const motionNote = outputMode === "Motion"
    ? "Composition designed for animation — layered depth, foreground/midground/background separation, elements that can move independently. "
    : ""

  const refNote = referenceNotes
    ? `\nReference direction from requestor: ${referenceNotes}` : ""

  const prompt = [
    `${intent.subject} for ${brand} — ${outputMode.toLowerCase()} graphic design.`,
    `Brand palette: ${dna.palette}.`,
    `Visual aesthetic: ${dna.aesthetic}.`,
    `Style: ${dna.style}.`,
    `Brand motifs available to incorporate: ${dna.motifs}.`,
    `Layout: ${intent.layout}.`,
    featuredProduct,
    vd.mood ? `Campaign mood: ${vd.mood}.` : "",
    motionNote,
    mandatoryNote,
    arHint,
  ].filter(Boolean).join(" ").replace(/\s{2,}/g, " ").trim()

  return [
    `PROJECT: ${title}`,
    `BRAND: ${brand} | TYPE: ${outputMode}`,
    deliverables.length ? `DELIVERABLES: ${deliverables.map(d => d.label + (d.width ? ` (${d.width}×${d.height} ${d.unit})` : "")).join(", ")}` : null,
    ``,
    `━━━ PROMPT ━━━`,
    prompt,
    refNote || null,
  ].filter(l => l !== null).join("\n")
}

function buildAssetPrompt(form, ai, promptType) {
  const visualDirection = ai.visualDirection || {};
  const detected = ai.detected || {};
  const deliverableText = form.deliverables?.length ? form.deliverables.map((d) => `${d.label} ${formatSize(d)}`).join(", ") : "the selected deliverables";
  const base = `Project: ${form.title || "Untitled Project"}
Brand: ${form.brand}
Output: ${form.outputMode}
Deliverables: ${deliverableText}
Request details: ${form.requestDetails || "No request details provided."}
Core direction: ${visualDirection.coreIdea || ai.brief || "Create a clear, branded creative direction."}
Color direction: ${visualDirection.colorBalance || "Use brand colors with strong hierarchy."}`;

  if (promptType === "Background") {
    return `${base}

Generate a clean background plate only. No logos, no readable text, no QR code, no final layout. Leave safe negative space for the main logo, copy, mandatories, and QR area. Style should support: ${visualDirection.mood || "clear branded promotional design"}.`;
  }

  if (promptType === "Character / Mascot") {
    return `${base}

Generate a reusable character / mascot asset that matches the project mood. Use a clean isolated composition, plain solid background, no text, no logos, no QR code. Make it easy to cut out and place into the layout.`;
  }

  if (promptType === "3D Object") {
    return `${base}

Generate a polished 3D object / supporting asset for the layout. Keep it isolated, high-resolution, front-readable, with simple lighting and a plain solid background for easy masking. No text, no logos, no QR code.`;
  }

  if (promptType === "Scene Reference") {
    return `${base}

Generate a scene reference for the overall look and feel. Focus on lighting, mood, environment, and composition. Do not create the final ad. Keep space for designer-added text, logo, QR, and mandatories.`;
  }

  return `${base}

Create a key visual reference only, not a finished material. Feature ${detected.featuredProduct && detected.featuredProduct !== "Not clearly provided" ? detected.featuredProduct : "the main campaign idea"} as the focal point. Leave clear safe areas for logo, headline, QR, and mandatories. Keep the design adaptable across all deliverables.`;
}

function getMissing(form) {
  const missing = [];
  if (!form.title.trim()) missing.push("Project title is missing.");
  if (!form.requestDetails.trim()) missing.push("Request details / full brief is missing.");
  if (!form.deliverables.length) missing.push("No deliverable / size has been added.");
  if (!form.deadline) missing.push("Date needed is missing.");
  if (!form.requestor) missing.push("Requested by is missing.");
  return missing;
}

function matchPresetBySize(width, height, unit) {
  const w = String(width || "").trim();
  const h = String(height || "").trim();
  const u = String(unit || "").trim().toLowerCase();
  if (!w || !h || !u) return null;
  return MATERIAL_PRESETS.find((p) => String(p.width).toLowerCase() === w.toLowerCase() && String(p.height).toLowerCase() === h.toLowerCase() && String(p.unit).toLowerCase() === u) || null;
}

function getSuggestions(draft) {
  const q = draft.name.trim().toLowerCase();
  const matched = matchPresetBySize(draft.width, draft.height, draft.unit);
  const byName = q
    ? MATERIAL_PRESETS.filter((p) => `${p.label} ${p.category} ${formatSize(p)}`.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const combined = matched ? [matched, ...byName.filter((p) => p.id !== matched.id)] : byName;
  return combined.slice(0, 5);
}

function resizeImage(file, maxDim = 1920, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
    img.src = objectUrl;
  });
}

async function uploadReferenceImage(imageId, filename, blob) {
  const path = `${imageId}/${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function deleteStorageImage(imageId, filename) {
  const path = `${imageId}/${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}

async function processImageFiles(fileList, existing = []) {
  const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
  const remaining = Math.max(0, MAX_REFERENCE_IMAGES - existing.length);
  const results = await Promise.all(files.slice(0, remaining).map(async (file) => {
    try {
      const imageId = uid("REF");
      const blob = await resizeImage(file);
      const src = await uploadReferenceImage(imageId, file.name, blob);
      return { id: imageId, name: file.name, src };
    } catch {
      return null;
    }
  }));
  return results.filter(Boolean);
}


function DeliverableComposer({ form, setForm }) {
  const [draft, setDraft] = React.useState({ name: "", width: "", height: "", unit: "px" })
  const [nameSuggestions, setNameSuggestions] = React.useState([])
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [editingId, setEditingId] = React.useState(null)
  const [openNotesId, setOpenNotesId] = React.useState(null)
  const [detectMsg, setDetectMsg] = React.useState("")
  const nameRef = React.useRef(null)

  const deliverables = form.deliverables || []
  const matchedPreset = matchPresetBySize(draft.width, draft.height, draft.unit)
  const draftNameLower = draft.name.trim().toLowerCase()
  const showMatchHint = !!(matchedPreset && draftNameLower && draftNameLower !== matchedPreset.label.toLowerCase())
  const showAutoNameHint = !draft.name.trim() && !!(draft.width && draft.height)
  const hasBriefText = (form.requestDetails || "").trim().length > 0

  function handleNameChange(e) {
    const val = e.target.value
    setDraft(prev => ({ ...prev, name: val }))
    setDetectMsg("")
    if (val.trim()) {
      const q = val.toLowerCase()
      const matched = MATERIAL_PRESETS.filter(p =>
        p.label.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      ).slice(0, 6)
      setNameSuggestions(matched)
      setShowSuggestions(matched.length > 0)
    } else {
      setNameSuggestions([])
      setShowSuggestions(false)
    }
  }

  function selectPreset(preset) {
    setDraft({ name: preset.label, width: preset.width, height: preset.height, unit: preset.unit })
    setNameSuggestions([])
    setShowSuggestions(false)
  }

  function handleAdd() {
    const label = draft.name.trim() || ((draft.width && draft.height) ? "Custom Size" : "")
    if (!label) return
    const newDel = normalizeDeliverable({
      label,
      width: draft.width,
      height: draft.height,
      unit: draft.unit,
      presetId: matchedPreset?.id || null,
      source: draft.name.trim() ? "custom" : "preset",
    })
    setForm(prev => ({ ...prev, deliverables: [...prev.deliverables, newDel] }))
    setDraft({ name: "", width: "", height: "", unit: "px" })
    setDetectMsg("")
    nameRef.current?.focus()
  }

  function removeDeliverable(id) {
    setForm(prev => ({ ...prev, deliverables: prev.deliverables.filter(d => d.id !== id) }))
  }

  function updateDeliverable(id, patch) {
    setForm(prev => ({ ...prev, deliverables: prev.deliverables.map(d => d.id === id ? { ...d, ...patch } : d) }))
  }

  function handleDetect() {
    const found = detectDeliverablesFromText(form.requestDetails || "")
    const existingLabels = new Set(deliverables.map(d => d.label.toLowerCase()))
    const novel = found.filter(f => !existingLabels.has(f.label.toLowerCase()))
    if (!novel.length) {
      setDetectMsg("No new deliverables detected in the brief.")
      return
    }
    setForm(prev => ({ ...prev, deliverables: [...prev.deliverables, ...novel] }))
    setDetectMsg(`${novel.length} deliverable${novel.length > 1 ? "s" : ""} added from brief.`)
  }

  return (
    <div className="del-composer">
      <div style={{ position: "relative" }}>
        <div className="del-composer-row">
          <div className="del-name-wrap">
            <input
              ref={nameRef}
              className="del-name-input"
              value={draft.name}
              onChange={handleNameChange}
              onFocus={() => { if (nameSuggestions.length) setShowSuggestions(true) }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
              placeholder="Search or name deliverable..."
            />
            {showSuggestions && nameSuggestions.length > 0 && (
              <div className="del-suggestions">
                {nameSuggestions.map(p => (
                  <div key={p.id} className="del-suggestion-item" onMouseDown={() => selectPreset(p)}>
                    <span>{p.label}</span>
                    <span className="del-suggestion-dim">{p.width !== "N/A" ? `${p.width}×${p.height} ${p.unit}` : "N/A"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <input
            className="del-dim-input"
            value={draft.width}
            onChange={e => { setDraft(prev => ({ ...prev, width: e.target.value })); setDetectMsg("") }}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
            placeholder="W"
          />
          <span className="del-dim-sep">×</span>
          <input
            className="del-dim-input"
            value={draft.height}
            onChange={e => { setDraft(prev => ({ ...prev, height: e.target.value })); setDetectMsg("") }}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
            placeholder="H"
          />
          <select
            className="del-unit-select"
            value={draft.unit}
            onChange={e => setDraft(prev => ({ ...prev, unit: e.target.value }))}
          >
            {["px","mm","cm","in","ft","N/A"].map(u => <option key={u}>{u}</option>)}
          </select>
          <button className="btn purple" type="button" onClick={handleAdd} style={{ fontSize: 13, padding: "9px 14px", whiteSpace: "nowrap" }}>+ Add Deliverable</button>
          {hasBriefText && (
            <button className="del-detect-btn" type="button" onClick={handleDetect}>Detect from brief</button>
          )}
        </div>
      </div>

      {showMatchHint && (
        <div className="del-match-hint">Matches preset: <strong>{matchedPreset.label}</strong></div>
      )}
      {showAutoNameHint && (
        <div className="del-match-hint" style={{ color: "#92400e", background: "#fffbeb", borderColor: "#fde68a" }}>
          Will be named <strong>"Custom Size"</strong> — add a name to override
        </div>
      )}
      {detectMsg && (
        <div className="del-match-hint" style={{ color: "#374151", background: "#f9fafb", borderColor: "#e5e7eb" }}>{detectMsg}</div>
      )}

      {deliverables.length > 0 && (
        <div className="del-cards">
          {deliverables.map(d => (
            <div key={d.id} className="del-card">
              <div className="del-card-main">
                <div className="del-card-info">
                  <span className="del-card-name">{d.label}</span>
                  {d.width && d.height && d.unit !== "N/A" && (
                    <span className="del-card-size">{d.width} × {d.height} {d.unit}</span>
                  )}
                  {d.notes && <p className="del-card-notes-preview">{d.notes}</p>}
                </div>
                <div className="del-card-actions">
                  <button className="del-card-btn" type="button"
                    onClick={() => setOpenNotesId(openNotesId === d.id ? null : d.id)}>
                    Notes
                  </button>
                  <button className="del-card-btn" type="button"
                    onClick={() => setEditingId(editingId === d.id ? null : d.id)}>
                    Edit
                  </button>
                  <button className="del-card-btn danger" type="button"
                    onClick={() => removeDeliverable(d.id)}>
                    Remove
                  </button>
                </div>
              </div>
              {editingId === d.id && (
                <div className="del-inline-dims" style={{ marginTop: 10 }}>
                  <input placeholder="W" value={d.width} onChange={e => updateDeliverable(d.id, { width: e.target.value })} />
                  <span>×</span>
                  <input placeholder="H" value={d.height} onChange={e => updateDeliverable(d.id, { height: e.target.value })} />
                  <select value={d.unit || "px"} onChange={e => updateDeliverable(d.id, { unit: e.target.value })}>
                    {["px","mm","cm","in","ft","N/A"].map(u => <option key={u}>{u}</option>)}
                  </select>
                  <button type="button" className="del-card-btn" onClick={() => setEditingId(null)}>Done</button>
                </div>
              )}
              {openNotesId === d.id && (
                <textarea
                  className="del-notes-area"
                  placeholder="Specific notes for this size only..."
                  value={d.notes || ""}
                  onChange={e => updateDeliverable(d.id, { notes: e.target.value })}
                  autoFocus
                  style={{ marginTop: 10 }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReferenceUploader({ form, setForm }) {
  const [open, setOpen] = useState(false);
  const [draftImages, setDraftImages] = useState(form.referenceImages || []);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) setDraftImages(form.referenceImages || []);
  }, [open, form.referenceImages]);

  const addFiles = async (files) => {
    setUploading(true);
    const next = await processImageFiles(files, draftImages);
    setDraftImages((prev) => [...prev, ...next].slice(0, MAX_REFERENCE_IMAGES));
    setUploading(false);
  };

  const removeImage = (id) => {
    const img = draftImages.find((i) => i.id === id);
    if (img && img.src && !img.src.startsWith("data:")) {
      deleteStorageImage(img.id, img.name);
    }
    setDraftImages((prev) => prev.filter((i) => i.id !== id));
  };

  const confirmImages = () => {
    setForm((prev) => ({ ...prev, referenceImages: draftImages }));
    setOpen(false);
  };

  return (
    <div className="reference-panel">
      <button className="btn secondary" type="button" onClick={() => setOpen(true)}>+ Add reference images</button>
      {form.referenceImages.length > 0 && <div className="thumb-strip">
        <span className="pill">{form.referenceImages.length} image{form.referenceImages.length > 1 ? "s" : ""} attached</span>
        {form.referenceImages.slice(0, 5).map((img) => <img className="thumb" src={img.src} alt={img.name} key={img.id} />)}
        {form.referenceImages.length > 5 && <span className="pill">+{form.referenceImages.length - 5}</span>}
      </div>}
      <div style={{ marginTop: 16 }}>
        <Field label="Reference notes"><textarea value={form.referenceNotes} onChange={(e) => setForm((prev) => ({ ...prev, referenceNotes: e.target.value }))} placeholder="What should we borrow from these references? e.g. Use the composition and hierarchy only — adapt colors to match the brand." /></Field>
      </div>

      {open && <div className="modal-bg" onClick={() => setOpen(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header"><h2 style={{ margin: 0 }}>Upload reference images</h2><span className="muted small">{draftImages.length}/{MAX_REFERENCE_IMAGES}</span></div>
          <div className="modal-body">
            <div
              className={`upload-zone ${dragging ? "dragging" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            >
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⇧</div>
                {uploading ? (
                  <><strong>Uploading…</strong><p className="muted">Resizing and uploading images</p></>
                ) : (
                  <><strong>Drag images here</strong><p className="muted">or choose screenshots / downloaded reference images</p></>
                )}
                <label className="btn secondary" style={{ display: "inline-flex", cursor: uploading ? "not-allowed" : "pointer", textTransform: "none", letterSpacing: 0, color: "#18181b", opacity: uploading ? 0.5 : 1 }}>
                  Choose files
                  <input type="file" accept="image/*" multiple style={{ display: "none" }} disabled={uploading} onChange={(e) => addFiles(e.target.files)} />
                </label>
              </div>
            </div>

            {draftImages.length > 0 && <div className="thumb-grid">
              {draftImages.map((img) => <div className="thumb-card" key={img.id}>
                <button className="thumb-remove" type="button" onClick={() => removeImage(img.id)}>×</button>
                <img src={img.src} alt={img.name} />
                <div className="small" style={{ marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.name}</div>
              </div>)}
            </div>}

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 18 }}>
              <button className="btn secondary" type="button" onClick={() => setDraftImages([])}>Clear all</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn purple" type="button" onClick={confirmImages}>Add</button>
              </div>
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
}

function RequestReviewModal({ form, ai, onCancel, onSubmit }) {
  const missing = getMissing(form);
  const output = ai || generateOutput(form);
  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h2 style={{ margin: 0 }}>Review before submitting</h2><button className="btn ghost" onClick={onCancel}>×</button></div>
        <div className="modal-body">
          <div className="detail-grid">
            <div>
              <div className="info-box"><div className="field-label">Project</div><h2 style={{ margin: "0 0 8px" }}>{form.title || "Untitled"}</h2><span className="pill purple">{form.brand}</span> <span className="pill blue">{form.outputMode}</span></div>
              <div className="info-box"><div className="field-label">Original Request Details</div><p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{form.requestDetails || "—"}</p></div>
              <div className="info-box"><div className="field-label">Deliverables</div>{form.deliverables.length ? form.deliverables.map((d) => <div key={d.id}>• <strong>{d.label}</strong> — {formatSize(d)}</div>) : <span className="muted">No deliverables</span>}</div>
              <div className="info-box"><div className="field-label">AI Organized Brief</div><p>{output.brief}</p></div>
            </div>
            <div>
              <div className="info-box"><div className="field-label">Schedule</div><p>Created now → Due {formatDate(form.deadline)}</p><p>Requested by: <strong>{form.requestor || "—"}</strong></p></div>
              <div className="info-box"><div className="field-label">Missing / Warnings</div>{missing.length ? missing.map((m) => <div className="warning" key={m}>{m}</div>) : output.missing.map((m) => <div className="success" key={m}>{m}</div>)}</div>
              <div className="info-box"><div className="field-label">References</div><p>{form.referenceImages.length} image{form.referenceImages.length === 1 ? "" : "s"} attached</p><p className="muted small">{form.referenceNotes || "No reference notes."}</p></div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}><button className="btn secondary" onClick={onCancel}>Back to Edit</button><button className="btn purple" onClick={onSubmit}>Submit Request</button></div>
        </div>
      </div>
    </div>
  );
}

const STATUS_CLASS = {
  "To Do": "s-todo",
  "In Progress": "s-inprogress",
  "For Review": "s-forreview",
  "For Revision": "s-forrevision",
  "Done": "s-done",
};

function TaskCard({ request, onOpen, onStatusChange }) {
  const meta = deadlineMeta(request.form.deadline);
  const deliverables = request.form.deliverables || [];
  const done = deliverables.filter((d) => d.status === "Done").length;
  const total = deliverables.length;
  const assignedTo = request.form.assignedTo || "Unassigned";
  const isAssigned = assignedTo !== "Unassigned";
  const initials = isAssigned
    ? assignedTo.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const dlClass = meta.days === null ? "dl-none" : meta.days < 0 ? "dl-overdue" : meta.days <= 7 ? "dl-soon" : "dl-safe";

  return (
    <div
      className="task-card"
      onClick={() => onOpen(request.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(request.id); }}
    >
      <div className="task-top">
        <span className={`pill ${request.form.outputMode === "Motion" ? "purple" : "blue"}`} style={{ fontSize: 11, padding: "3px 8px" }}>
          {request.form.outputMode}
        </span>
        <select
          className={`card-status-select ${STATUS_CLASS[request.status] || "s-todo"}`}
          value={request.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => { e.stopPropagation(); onStatusChange(request.id, e.target.value); }}
        >
          {STATUS_COLUMNS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <h3 className="task-title">{request.form.title || "Untitled Request"}</h3>
      <div className="task-brand">{request.form.brand}</div>
      <div className="task-assignee">
        <span className={`assignee-avatar ${isAssigned ? "assigned" : ""}`}>{initials}</span>
        {assignedTo}
      </div>
      <div className="task-footer">
        <span className={`task-deadline ${dlClass}`}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <circle cx="6" cy="6" r="5"/>
            <path d="M6 3.5V6l1.5 1.5"/>
          </svg>
          {formatDate(request.form.deadline) || "No deadline"}
        </span>
        <div className="task-icons">
          <span className="task-icon">☑ {done}/{total || 0}</span>
          {request.unreadComments > 0 && <span className="unread-badge">{request.unreadComments}</span>}
        </div>
      </div>
    </div>
  );
}

function TaskModal({ request, setRequests, onClose, onDelete, onEdit, onToast, onArchive }) {
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState("General");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [delExpandedNotes, setDelExpandedNotes] = useState({});
  const [addingDeliverable, setAddingDeliverable] = useState(false);
  const [newDelInput, setNewDelInput] = useState("");
  const [newDelSuggestions, setNewDelSuggestions] = useState([]);
  const [modalDelMenu, setModalDelMenu] = useState(null);
  const [copied, setCopied] = useState(false);
  const [revisionDialog, setRevisionDialog] = useState(null);
  const [revisionNoteText, setRevisionNoteText] = useState("");
  if (!request) return null;
  const ai = request.ai || generateOutput(request.form);
  const meta = deadlineMeta(request.form.deadline);
  const deliverables = request.form.deliverables || [];
  const doneCount = deliverables.filter((d) => d.status === "Done").length;

  const appendActivityToRequest = (r, action, detail = "") => ({
    ...r,
    activity: [makeActivity(action, detail), ...(r.activity || [])],
  });

  const applyStatusChange = (status, revisionNote) => {
    setRequests((prev) => prev.map((r) => {
      if (r.id !== request.id) return r;
      let next = appendActivityToRequest({ ...r, status }, `Request moved from ${r.status} → ${status}`);
      if (revisionNote.trim()) {
        const revisionComment = { id: uid("COM"), type: "Revision", author: "Current User", body: revisionNote.trim(), createdAt: new Date().toISOString() };
        next = {
          ...next,
          comments: [...(next.comments || []), revisionComment],
          unreadComments: (next.unreadComments || 0) + 1,
          activity: [makeActivity("Revision note added", revisionNote.trim()), ...(next.activity || [])],
        };
      }
      return next;
    }));
    onToast?.("Status updated to " + status);
  };

  const changeTaskStatus = (status) => {
    if (status === request.status) return;
    if (status === "For Revision") {
      setRevisionNoteText("");
      setRevisionDialog({ pendingStatus: status });
      return;
    }
    applyStatusChange(status, "");
  };

  const changeAssignee = (assignedTo) => {
    setRequests((prev) => prev.map((r) => {
      if (r.id !== request.id) return r;
      return appendActivityToRequest({ ...r, form: { ...r.form, assignedTo } }, "Assignee changed", assignedTo);
    }));
  };

  const updateDeliverable = (id, patch, activityDetail = "") => {
    setRequests((prev) => prev.map((r) => {
      if (r.id !== request.id) return r;
      const target = r.form.deliverables.find((d) => d.id === id);
      const updatedDeliverables = r.form.deliverables.map((d) => d.id === id ? { ...d, ...patch } : d);
      const next = { ...r, form: { ...r.form, deliverables: updatedDeliverables } };
      return activityDetail && target ? appendActivityToRequest(next, activityDetail, target.label) : next;
    }));
  };

  const updateDeliverableStatus = (id, newStatus) => {
    const current = deliverables.find((d) => d.id === id);
    if (!current || current.status === newStatus) return;
    setRequests((prev) => prev.map((r) => {
      if (r.id !== request.id) return r;
      const updatedDeliverables = r.form.deliverables.map((d) =>
        d.id === id ? { ...d, status: newStatus } : d
      );
      const updated = { ...r, form: { ...r.form, deliverables: updatedDeliverables } };
      return appendActivityToRequest(updated, `${current.label} changed from ${current.status} → ${newStatus}`);
    }));
  };

  const removeModalDeliverable = (id) => {
    const del = deliverables.find((d) => d.id === id);
    if (!del) return;
    setRequests((prev) => prev.map((r) => {
      if (r.id !== request.id) return r;
      const updatedDeliverables = r.form.deliverables.filter((d) => d.id !== id);
      const updated = { ...r, form: { ...r.form, deliverables: updatedDeliverables } };
      return appendActivityToRequest(updated, `Removed ${del.label}${del.width && del.unit !== "N/A" ? ` — ${del.width}×${del.height} ${del.unit}` : ""}`);
    }));
  };

  const handleNewDelInput = (e) => {
    const val = e.target.value;
    setNewDelInput(val);
    if (!val.trim()) { setNewDelSuggestions([]); return; }
    const lower = val.toLowerCase();
    const matched = MATERIAL_PRESETS.filter(p =>
      p.label.toLowerCase().includes(lower) ||
      `${p.width}x${p.height}`.includes(lower)
    ).slice(0, 5);
    setNewDelSuggestions(matched);
  };

  const addNewDeliverable = (preset) => {
    if (!preset && !newDelInput.trim()) return;
    const newDel = normalizeDeliverable(
      preset
        ? { ...preset, source: "preset" }
        : { label: newDelInput.trim(), source: "custom" }
    );
    setRequests((prev) => prev.map((r) => {
      if (r.id !== request.id) return r;
      const updatedDeliverables = [...r.form.deliverables, newDel];
      const updated = { ...r, form: { ...r.form, deliverables: updatedDeliverables } };
      return appendActivityToRequest(updated, `Added ${newDel.label}${newDel.width && newDel.unit !== "N/A" ? ` — ${newDel.width}×${newDel.height} ${newDel.unit}` : ""}`);
    }));
    setNewDelInput("");
    setNewDelSuggestions([]);
    setAddingDeliverable(false);
  };

  const addComment = () => {
    const body = commentText.trim();
    if (!body) return;
    const nextComment = { id: uid("COM"), type: commentType, author: "Current User", body, createdAt: new Date().toISOString() };
    setRequests((prev) => prev.map((r) => r.id === request.id ? {
      ...r,
      comments: [...(r.comments || []), nextComment],
      unreadComments: 0,
      activity: [makeActivity(`${commentType} comment added`, body), ...(r.activity || [])],
    } : r));
    setCommentText("");
    setCommentType("General");
  };

  function copyPrompt() {
    navigator.clipboard?.writeText(generatedPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal large" onClick={(e) => e.stopPropagation()}>
        {/* ── Sticky header: title + deadline + always-visible actions ── */}
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: "var(--fw-black)", lineHeight: 1.2 }}>
              {request.form.title || "Untitled Request"}
            </h2>
            <span style={{ fontSize: "var(--fs-body)", color: "#71717a" }}>
              {request.form.brand} · {request.form.outputMode}{request.form.requestor ? ` · by ${request.form.requestor}` : ""}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <button className="btn secondary" style={{ fontSize: "var(--fs-small)", padding: "8px 14px" }} onClick={() => { onClose(); onEdit(request.id); }}>Edit</button>
            {normalizeStatus(request.status) === "Done" && <button className="btn secondary" style={{ fontSize: "var(--fs-small)", padding: "8px 14px" }} onClick={() => onArchive(request.id)}>Archive</button>}
            <button className="btn danger" style={{ fontSize: "var(--fs-small)", padding: "8px 14px" }} onClick={() => onDelete(request.id)}>Delete</button>
            <button className="btn ghost" onClick={onClose} style={{ fontSize: 20, lineHeight: 1, padding: "6px 10px" }}>×</button>
          </div>
        </div>

        <div className="modal-body">
          <div className="detail-grid">
            {/* ── Left column: Brief → Deliverables → Prompt ── */}
            <main>
              <div className="info-box">
                <div className="field-label">Brief</div>
                {textLines(request.form.requestDetails).length > 0 ? (
                  <div>
                    {textLines(request.form.requestDetails).map((line, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, lineHeight: 1.55, fontSize: "var(--fs-body)" }}>
                        <span style={{ color: "#a1a1aa", flexShrink: 0, marginTop: 2 }}>•</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "#a1a1aa", margin: 0, fontSize: "var(--fs-body)" }}>No brief details provided.</p>
                )}
              </div>

              <div className="info-box">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div className="field-label" style={{ marginBottom: 0 }}>Deliverables</div>
                  <span style={{ fontSize: "var(--fs-caption)", color: "#71717a", fontWeight: "var(--fw-bold)" }}>{doneCount}/{deliverables.length} done</span>
                </div>
                {deliverables.length > 0 && (
                  <div className="del-progress-bar">
                    <div className="del-progress-fill" style={{ width: `${Math.round((doneCount / deliverables.length) * 100)}%` }} />
                  </div>
                )}
                <div className="del-list">
                  {deliverables.map(d => (
                    <div key={d.id}>
                      <div className="del-row">
                        <span className="del-row-label">{d.label}</span>
                        {d.width && d.unit !== "N/A" && (
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
                        <div className="del-menu-wrap">
                          <button className="del-menu-btn" type="button" onClick={(e) => { e.stopPropagation(); setModalDelMenu(modalDelMenu === d.id ? null : d.id); }}>···</button>
                          {modalDelMenu === d.id && (
                            <div className="del-dropdown">
                              <button className="del-dropdown-item" type="button" onClick={() => { setDelExpandedNotes(prev => ({ ...prev, [d.id]: !prev[d.id] })); setModalDelMenu(null); }}>Notes</button>
                              <button className="del-dropdown-item danger" type="button" onClick={() => { removeModalDeliverable(d.id); setModalDelMenu(null); }}>Remove</button>
                            </div>
                          )}
                        </div>
                      </div>
                      {delExpandedNotes[d.id] && (
                        <textarea
                          className="del-notes-area"
                          placeholder="Specific notes for this size only..."
                          value={d.notes || ""}
                          onChange={e => updateDeliverable(d.id, { notes: e.target.value })}
                        />
                      )}
                      <div style={{ marginTop: 4 }}>
                        <input
                          style={{ fontSize: 12, padding: "4px 8px", borderRadius: 5, border: "1px solid #e5e7eb" }}
                          value={d.outputUrl || ""}
                          onChange={e => updateDeliverable(d.id, { outputUrl: e.target.value })}
                          onBlur={e => { if (e.target.value.trim()) updateDeliverable(d.id, { outputUrl: e.target.value }, "Output link added"); }}
                          placeholder="Paste output file link..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {deliverables.length === 0 && (
                  <p style={{ color: "#a1a1aa", fontSize: "var(--fs-small)", margin: "4px 0" }}>No deliverables yet.</p>
                )}
                {addingDeliverable ? (
                  <div style={{ position: "relative", marginTop: 8 }}>
                    <div className="del-input-row">
                      <input
                        autoFocus
                        value={newDelInput}
                        onChange={handleNewDelInput}
                        onKeyDown={e => {
                          if (e.key === "Enter") addNewDeliverable(null);
                          if (e.key === "Escape") setAddingDeliverable(false);
                        }}
                        placeholder="Type name or size..."
                      />
                      <button className="del-add-btn" type="button" onClick={() => addNewDeliverable(null)}>Add</button>
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
                ) : (
                  <button className="del-detect-btn" type="button" style={{ marginTop: 8, width: "100%", justifyContent: "center" }} onClick={() => setAddingDeliverable(true)}>
                    + Add deliverable
                  </button>
                )}
              </div>

              <div className="info-box">
                <div className="field-label">Prompt Generator</div>
                <div className="prompt-block" style={{ minHeight: 80 }}>
                  {generatedPrompt || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Click Generate to build an AI prompt from this request.</span>}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    className="btn purple"
                    type="button"
                    style={{ flex: 1 }}
                    onClick={() => setGeneratedPrompt(buildComprehensivePrompt(request.form, ai))}
                  >
                    Generate
                  </button>
                  {generatedPrompt && (
                    <button
                      className={`prompt-copy-btn${copied ? " copied" : ""}`}
                      type="button"
                      style={{ flex: 1, marginTop: 0 }}
                      onClick={copyPrompt}
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </div>
            </main>

            {/* ── Right sidebar: unified property panel ── */}
            <aside className="modal-aside">
              <div className="info-box">
                <div className="field-label">Deadline</div>
                <div className={`tm-deadline-chip ${meta.days === null ? "" : meta.days < 0 ? "chip-overdue" : meta.days <= 7 ? "chip-soon" : "chip-safe"}`}>
                  <span className="tm-deadline-date">📅 {formatDateFull(request.form.deadline)}</span>
                  {meta.days !== null && (
                    <span className={`pill ${meta.badge}`} style={{ fontSize: 11, padding: "2px 7px" }}>
                      {meta.days < 0 ? `${Math.abs(meta.days)}d overdue` : meta.days === 0 ? "Due today" : `${meta.days}d left`}
                    </span>
                  )}
                </div>
              </div>

              <div className="info-box">
                <div className="field-label">Status</div>
                <select
                  className={`modal-status-select ${STATUS_CLASS[request.status] || "s-todo"}`}
                  value={request.status}
                  onChange={(e) => changeTaskStatus(e.target.value)}
                >
                  {STATUS_COLUMNS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="info-box">
                <div className="field-label">Assigned To</div>
                <select value={request.form.assignedTo || "Unassigned"} onChange={(e) => changeAssignee(e.target.value)}>
                  {DESIGNERS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>

              {(request.form.referenceImages?.length > 0 || request.form.referenceNotes) && (
                <div className="info-box">
                  <div className="field-label">References</div>
                  {request.form.referenceImages?.length > 0 && (
                    <div className="thumb-strip">{request.form.referenceImages.map((img) => <img className="thumb" src={img.src} alt={img.name} key={img.id} />)}</div>
                  )}
                  {request.form.referenceNotes && (
                    <p className="small muted" style={{ marginTop: 8, whiteSpace: "pre-wrap", marginBottom: 0 }}>{request.form.referenceNotes}</p>
                  )}
                </div>
              )}

              <div className="info-box">
                <div className="field-label">Comments</div>
                {request.comments?.length > 0 && (
                  <div className="tm-comments-scroll">
                    {request.comments.map((c) => (
                      <div className="comment" key={c.id}>
                        <strong style={{ fontSize: "var(--fs-small)" }}>{c.author}</strong>
                        <span className="comment-type">{c.type || "General"}</span>
                        <br />
                        <span style={{ fontSize: "var(--fs-body)" }}>{c.body}</span>
                        <br />
                        <small className="muted">{formatActivityTime(c.createdAt)}</small>
                      </div>
                    ))}
                  </div>
                )}
                {!request.comments?.length && <p className="muted small" style={{ marginBottom: 8 }}>No comments yet.</p>}
                <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: 10, marginTop: request.comments?.length ? 8 : 0 }}>
                  <div className="ctype-row">
                    {COMMENT_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        className={`ctype-btn${commentType === type ? (type === "Revision" ? " active-revision" : " active") : ""}`}
                        onClick={() => setCommentType(type)}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <textarea style={{ minHeight: 64, marginBottom: 8 }} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add comment or revision note..." />
                  <button className="btn" style={{ width: "100%" }} onClick={addComment}>Add Comment</button>
                </div>
              </div>

              <div className="info-box">
                <div className="field-label">Activity</div>
                {request.activity?.length > 0 ? (
                  <div className="tm-activity-scroll">
                    {request.activity.map((item) => (
                      <div className="activity-item" key={item.id}>
                        <small className="muted">{formatActivityTime(item.createdAt)}</small>
                        <div style={{ fontSize: "var(--fs-small)" }}>
                          <strong>{item.action}</strong>
                          {item.detail ? <><br /><span className="muted">{item.detail}</span></> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted small">No activity yet.</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      {revisionDialog && (
        <div className="revision-dialog-overlay" onClick={(e) => { e.stopPropagation(); setRevisionDialog(null); }}>
          <div className="revision-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="revision-dialog-title">Add Revision Note</div>
            <p className="muted" style={{ margin: 0 }}>Optional — describe what needs to change. Leave blank to just move the status.</p>
            <textarea
              className="revision-dialog-textarea"
              value={revisionNoteText}
              onChange={(e) => setRevisionNoteText(e.target.value)}
              placeholder="What needs to be revised? Be specific..."
              autoFocus
            />
            <div className="revision-dialog-actions">
              <button className="btn secondary" type="button" onClick={() => setRevisionDialog(null)}>Cancel</button>
              <button className="btn purple" type="button" onClick={() => { applyStatusChange(revisionDialog.pendingStatus, revisionNoteText); setRevisionDialog(null); setRevisionNoteText(""); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppHeader({ onCreateRequest }) {
  return (
    <div className="header">
      <div className="header-inner">
        <div>
          <h2 style={{ margin: 0, fontSize: "var(--fs-heading)", fontWeight: "var(--fw-black)" }}>Creative Request Builder</h2>
          <div className="muted small">Request intake → AI brief → task dashboard</div>
        </div>
        <button className="btn" onClick={onCreateRequest}>Create Request</button>
      </div>
    </div>
  );
}

function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === "success" ? "✓" : "✕"} {t.message}
        </div>
      ))}
    </div>
  );
}

function DeleteConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <strong>Delete Request</strong>
          <button className="btn ghost" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ margin: "0 0 20px", color: "#52525b" }}>This will permanently delete the request and all its data. This cannot be undone.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn secondary" onClick={onCancel}>Cancel</button>
            <button className="btn" style={{ background: "#991b1b", borderColor: "#991b1b", color: "white" }} onClick={onConfirm}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const DETAILS_PLACEHOLDER = `Campaign: Mid-Year Sale — 50% off selected items\nFeatured product: [main product or promo name]\nHeadline: "Your Big Win Starts Here"\nSubtext: "Play now and claim your bonus"\nCTA: "Join Now"\n\nInclude:\n- QR code (bottom-right corner)\n- Brand logo (top-left)\n- Responsible gaming text (footer strip)\n- Any required regulatory text\n\nMood: Energetic, celebratory, premium feel\nAvoid: Dark backgrounds, overly complex layouts`;

function CreateRequestModal({ form, setForm, editingId, onClose, onReview }) {
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const [detailsFocused, setDetailsFocused] = useState(false);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal large" style={{ maxWidth: 820, maxHeight: "92vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: "var(--fw-black)", lineHeight: 1.2 }}>
              {editingId ? "Edit Request" : "New Request"}
            </h2>
            <p className="muted" style={{ margin: "3px 0 0", fontSize: "var(--fs-small)" }}>
              Fill in details, add sizes, then review before submitting.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <button className="btn purple" onClick={onReview}>Review Request</button>
            <button className="btn ghost" onClick={onClose} style={{ fontSize: 20, lineHeight: 1, padding: "6px 10px" }}>×</button>
          </div>
        </div>
        <div className="modal-body">
          <Section n="1" title="Request Info">
            <div className="row">
              <Field label="Project title"><input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Monitor Topper — KonKon Promo" /></Field>
              <Field label="Brand"><select value={form.brand} onChange={(e) => update("brand", e.target.value)}><option>LakiWin</option><option>VikingFunLand</option><option>RAC PH</option><option>Other Brand</option></select></Field>
            </div>
            <div className="row">
              <Field label="Date needed"><input type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} /></Field>
              <Field label="Requested by"><select value={form.requestor} onChange={(e) => update("requestor", e.target.value)}><option value="">Select requestor</option>{REQUESTORS.map((person) => <option key={person}>{person}</option>)}</select></Field>
            </div>
            <Field label="Output type">
              <div className="choice-grid">
                {[
                  { key: "Static", desc: "Still images — posters, banners, social posts" },
                  { key: "Motion", desc: "Animated assets — videos, GIFs, motion graphics" },
                ].map(({ key, desc }) => (
                  <div key={key} className="choice-wrap">
                    <button type="button" className={`choice ${form.outputMode === key ? "active" : ""}`} onClick={() => update("outputMode", key)} style={{ width: "100%" }}>{key}</button>
                    <div className="choice-tip">{desc}</div>
                  </div>
                ))}
              </div>
            </Field>
          </Section>

          <Section n="2" title="Request Details">
            <p className="muted" style={{ marginTop: 0 }}>Describe what needs to be made — include copy, key elements, and any mandatory requirements.</p>
            <textarea value={form.requestDetails} onChange={(e) => update("requestDetails", e.target.value)} onFocus={() => setDetailsFocused(true)} onBlur={() => setDetailsFocused(false)} placeholder={detailsFocused ? "" : DETAILS_PLACEHOLDER} style={{ minHeight: 155 }} />
          </Section>

          <Section n="3" title="Sizes">
            <DeliverableComposer form={form} setForm={setForm} />
          </Section>

          <Section n="4" title="References">
            <ReferenceUploader form={form} setForm={setForm} />
          </Section>
        </div>
      </div>
    </div>
  );
}

export default function CreativeBriefBuilderPrototype() {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [requests, setRequests] = useState([]);
  const [ai, setAi] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState({ search: "", assignedTo: "" });
  const [loading, setLoading] = useState(true);
  const [boardRevision, setBoardRevision] = useState(null);
  const [boardRevisionNote, setBoardRevisionNote] = useState("");
  const [toasts, setToasts] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [boardView, setBoardView] = useState("active");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [debouncedDetails, setDebouncedDetails] = useState(form.requestDetails);
  const mounted = useRef(false);
  const prevRequests = useRef([]);
  const isRealtime = useRef(false);

  // Load from Supabase on mount + subscribe to real-time changes
  useEffect(() => {
    loadFromSupabase().then((loaded) => {
      setRequests(loaded);
      prevRequests.current = loaded;
      mounted.current = true;
      setLoading(false);
    });

    const channel = supabase
      .channel("requests-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, (payload) => {
        isRealtime.current = true;
        if (payload.eventType === "DELETE") {
          setRequests((prev) => prev.filter((r) => r.id !== payload.old.id));
        } else {
          const updated = normalizeRequest(payload.new.data);
          setRequests((prev) => {
            const exists = prev.find((r) => r.id === updated.id);
            return exists
              ? prev.map((r) => (r.id === updated.id ? updated : r))
              : [updated, ...prev];
          });
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Sync local changes to Supabase (skips real-time-triggered updates)
  useEffect(() => {
    if (!mounted.current) return;
    if (isRealtime.current) {
      isRealtime.current = false;
      prevRequests.current = requests;
      return;
    }
    const prev = prevRequests.current;
    prevRequests.current = requests;

    const toUpsert = requests.filter((r) => {
      const old = prev.find((p) => p.id === r.id);
      return !old || JSON.stringify(old) !== JSON.stringify(r);
    });
    const toDelete = prev.filter((r) => !requests.find((c) => c.id === r.id));

    if (toUpsert.length > 0) {
      supabase
        .from("requests")
        .upsert(toUpsert.map((r) => ({ id: r.id, data: r })))
        .then(({ error }) => { if (error) console.error("[Supabase] upsert failed:", error.message, error); });
    }
    toDelete.forEach((r) => {
      supabase.from("requests").delete().eq("id", r.id)
        .then(({ error }) => { if (error) console.error("[Supabase] delete failed:", error.message, error); });
    });
  }, [requests]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDetails(form.requestDetails), 300);
    return () => clearTimeout(timer);
  }, [form.requestDetails]);

  const output = useMemo(() => generateOutput({ ...form, requestDetails: debouncedDetails }), [form, debouncedDetails]);
  const selectedRequest = useMemo(() => requests.find((r) => r.id === selectedId) || null, [requests, selectedId]);

  const addToast = (message, type = "success") => {
    const id = uid("TOAST");
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const resetBuilder = () => {
    setForm(blankForm);
    setAi(null);
    setReviewOpen(false);
    setSelectedId(null);
    setEditingId(null);
    setBuilderOpen(true);
  };

  const submitRequest = () => {
    const nextAi = ai || output;
    if (editingId) {
      setRequests((prev) => prev.map((r) => {
        if (r.id !== editingId) return r;
        return { ...r, form: { ...form }, ai: nextAi, activity: [makeActivity("Request edited"), ...(r.activity || [])] };
      }));
      addToast("Request updated successfully");
    } else {
      const record = normalizeRequest({
        id: uid(),
        createdAt: new Date().toISOString(),
        status: "To Do",
        form: { ...form },
        ai: nextAi,
        comments: [],
        unreadComments: 0,
        activity: [makeActivity(`${form.requestor || "Current User"} submitted the request`)],
      });
      setRequests((prev) => [record, ...prev]);
      addToast("Request submitted successfully");
    }
    setForm(blankForm);
    setAi(null);
    setReviewOpen(false);
    setEditingId(null);
    setBuilderOpen(false);
  };

  const startEditRequest = (id) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    setForm(req.form);
    setAi(req.ai || null);
    setEditingId(id);
    setSelectedId(null);
    setBuilderOpen(true);
  };

  const openReview = () => {
    setAi(output);
    setReviewOpen(true);
  };

  const activeRequests = requests.filter((r) => !r.archivedAt);
  const archivedRequests = requests.filter((r) => !!r.archivedAt);

  const dashStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = activeRequests.filter((r) => {
      if (r.status === "Done" || !r.form.deadline) return false;
      const d = new Date(`${r.form.deadline}T00:00:00`);
      return !isNaN(d.getTime()) && d < today;
    }).length;
    return {
      total: activeRequests.length,
      overdue,
      forRevision: activeRequests.filter((r) => normalizeStatus(r.status) === "For Revision").length,
      inProgress: activeRequests.filter((r) => normalizeStatus(r.status) === "In Progress").length,
      toDo: activeRequests.filter((r) => normalizeStatus(r.status) === "To Do").length,
      active: activeRequests.filter((r) => normalizeStatus(r.status) !== "Done").length,
    };
  }, [activeRequests]);

  const archiveRequest = (id) => {
    setRequests((prev) => prev.map((r) => r.id !== id ? r : { ...r, archivedAt: new Date().toISOString() }));
    setSelectedId(null);
    addToast("Request archived");
  };

  const restoreRequest = (id) => {
    setRequests((prev) => prev.map((r) => r.id !== id ? r : { ...r, archivedAt: null }));
    addToast("Request restored");
  };

  const filteredRequests = activeRequests.filter((r) => {
    const q = filters.search.toLowerCase();
    const matchesSearch = !q || `${r.form.title} ${r.form.requestor} ${r.form.brand} ${r.form.requestDetails}`.toLowerCase().includes(q);
    const matchesAssignee = !filters.assignedTo || r.form.assignedTo === filters.assignedTo;
    return matchesSearch && matchesAssignee;
  });

  const grouped = STATUS_COLUMNS.reduce((acc, status) => {
    acc[status] = filteredRequests.filter((r) => normalizeStatus(r.status) === status);
    return acc;
  }, {});

  const applyBoardDrop = (id, status, revisionNote) => {
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id || r.status === status) return r;
      let updated = { ...r, status, activity: [makeActivity(`Request moved from ${r.status} → ${status}`), ...(r.activity || [])] };
      if (revisionNote.trim()) {
        const revisionComment = { id: uid("COM"), type: "Revision", author: "Current User", body: revisionNote.trim(), createdAt: new Date().toISOString() };
        updated = {
          ...updated,
          comments: [...(updated.comments || []), revisionComment],
          unreadComments: (updated.unreadComments || 0) + 1,
          activity: [makeActivity("Revision note added", revisionNote.trim()), ...(updated.activity || [])],
        };
      }
      return updated;
    }));
    addToast("Status updated to " + status);
  };

  const onCardStatusChange = (id, newStatus) => {
    const req = requests.find((r) => r.id === id);
    if (!req || req.status === newStatus) return;
    if (newStatus === "For Revision") {
      setBoardRevisionNote("");
      setBoardRevision({ id, status: newStatus });
      return;
    }
    applyBoardDrop(id, newStatus, "");
  };

  const openTask = (id) => {
    setSelectedId(id);
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, unreadComments: 0 } : r));
  };

  const deleteRequest = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    const req = requests.find((r) => r.id === deleteConfirmId);
    if (req) {
      (req.form.referenceImages || []).forEach((img) => {
        if (img.src && !img.src.startsWith("data:")) deleteStorageImage(img.id, img.name);
      });
    }
    setRequests((prev) => prev.filter((r) => r.id !== deleteConfirmId));
    setSelectedId(null);
    setDeleteConfirmId(null);
    addToast("Request deleted");
  };

  if (loading) return (
    <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <style>{css}</style>
      <div style={{ textAlign: "center", color: "#71717a" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>⟳</div>
        <div>Loading requests…</div>
      </div>
    </div>
  );

  return (
    <div className="app">
      <style>{css}</style>
      <AppHeader onCreateRequest={resetBuilder} />

      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ width: "100%" }}>
            <h1 style={{ margin: "0 0 14px", fontSize: "var(--fs-heading)", fontWeight: "var(--fw-black)" }}>Dashboard</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "Active", value: dashStats.active, accent: "#52525b", bg: "#f4f4f5" },
                { label: "To Do", value: dashStats.toDo, accent: "#94a3b8", bg: "#f1f5f9" },
                { label: "In Progress", value: dashStats.inProgress, accent: "#3b82f6", bg: "#eff6ff" },
                { label: "For Revision", value: dashStats.forRevision, accent: "#ea580c", bg: "#fff7ed" },
              ].map(({ label, value, accent, bg }) => (
                <div key={label} style={{ background: accent, borderRadius: 14, padding: "16px 20px" }}>
                  <div style={{ fontSize: 36, fontWeight: "var(--fw-black)", color: "#fff", lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: "var(--fs-small)", color: "rgba(255,255,255,0.75)", marginTop: 6 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid #e4e4e7", paddingBottom: 0 }}>
          {[{ key: "active", label: "Active" }, { key: "archived", label: `Archived (${archivedRequests.length})` }].map(({ key, label }) => (
            <button key={key} onClick={() => setBoardView(key)} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 16px", fontWeight: boardView === key ? "var(--fw-black)" : "var(--fw-normal)", color: boardView === key ? "#18181b" : "#71717a", borderBottom: boardView === key ? "2px solid #18181b" : "2px solid transparent", marginBottom: -2, fontSize: "var(--fs-body)", transition: "all 0.15s" }}>{label}</button>
          ))}
        </div>

        {boardView === "active" ? (<>
          <div className="dashboard-toolbar">
            <div className="toolbar-search">
              <span className="toolbar-search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </span>
              <input placeholder="Search requests..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              {filters.search && (
                <button onClick={() => setFilters({ ...filters, search: "" })} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#a1a1aa", fontSize: 18, lineHeight: 1, padding: "0 4px" }}>×</button>
              )}
            </div>
            <select value={filters.assignedTo} onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}>
              <option value="">Assignee</option>
              {DESIGNERS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="board">
            {STATUS_COLUMNS.map((status) => (
              <section key={status} className="board-column">
                <div className="column-header">
                  <div className="column-title">{status} <span className="count">{grouped[status]?.length || 0}</span></div>
                  {status === "To Do" && <button className="btn ghost" title="Create request" onClick={resetBuilder}>＋</button>}
                </div>
                <div style={{ height: 3, borderRadius: 2, background: STATUS_ACCENT[status], marginBottom: 10 }} />
                {grouped[status]?.map((request) => <TaskCard key={request.id} request={request} onOpen={openTask} onStatusChange={onCardStatusChange} />)}
              </section>
            ))}
          </div>
        </>) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              placeholder="Search archived requests..."
              value={archiveSearch}
              onChange={(e) => setArchiveSearch(e.target.value)}
              style={{ maxWidth: 400 }}
            />
            {archivedRequests.length === 0 ? (
              <p className="muted" style={{ textAlign: "center", padding: "48px 0" }}>No archived requests yet.</p>
            ) : (() => {
              const q = archiveSearch.toLowerCase();
              const visible = archivedRequests.filter((r) => !q || `${r.form.title} ${r.form.brand} ${r.form.requestor}`.toLowerCase().includes(q));
              if (!visible.length) return <p className="muted" style={{ textAlign: "center", padding: "48px 0" }}>No results for "{archiveSearch}".</p>;
              return visible.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#fff", border: "1px solid #e4e4e7", borderRadius: 12, padding: "14px 18px", cursor: "pointer" }} onClick={() => setSelectedId(r.id)}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: "var(--fw-black)", fontSize: "var(--fs-body)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.form.title || "Untitled Request"}</div>
                    <div style={{ fontSize: "var(--fs-small)", color: "#71717a" }}>{r.form.brand} · {r.form.requestor || "—"} · Archived {formatDate(r.archivedAt?.slice(0, 10))}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn secondary" style={{ fontSize: "var(--fs-small)", padding: "6px 14px" }} onClick={() => restoreRequest(r.id)}>Restore</button>
                    <button className="btn danger" style={{ fontSize: "var(--fs-small)", padding: "6px 14px" }} onClick={() => setDeleteConfirmId(r.id)}>Delete</button>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {builderOpen && <CreateRequestModal form={form} setForm={setForm} editingId={editingId} onClose={() => { setBuilderOpen(false); setEditingId(null); setForm(blankForm); }} onReview={openReview} />}
      {reviewOpen && <RequestReviewModal form={form} ai={ai || output} onCancel={() => setReviewOpen(false)} onSubmit={submitRequest} />}
      {selectedRequest && <TaskModal request={selectedRequest} setRequests={setRequests} onClose={() => setSelectedId(null)} onDelete={deleteRequest} onEdit={startEditRequest} onToast={addToast} onArchive={archiveRequest} />}
      {deleteConfirmId && <DeleteConfirmModal onConfirm={confirmDelete} onCancel={() => setDeleteConfirmId(null)} />}
      <Toast toasts={toasts} />
      {boardRevision && (
        <div className="revision-dialog-overlay" onClick={() => setBoardRevision(null)}>
          <div className="revision-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="revision-dialog-title">Add Revision Note</div>
            <p className="muted" style={{ margin: 0 }}>Optional — describe what needs to change. Leave blank to just move the status.</p>
            <textarea
              className="revision-dialog-textarea"
              value={boardRevisionNote}
              onChange={(e) => setBoardRevisionNote(e.target.value)}
              placeholder="What needs to be revised? Be specific..."
              autoFocus
            />
            <div className="revision-dialog-actions">
              <button className="btn secondary" type="button" onClick={() => setBoardRevision(null)}>Cancel</button>
              <button className="btn purple" type="button" onClick={() => { applyBoardDrop(boardRevision.id, boardRevision.status, boardRevisionNote); setBoardRevision(null); setBoardRevisionNote(""); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
