import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { MATERIAL_PRESETS, normalizeDeliverable, detectDeliverablesFromText, statusPillColor } from './src/deliverables.js'
import Toast from './src/components/Toast'
import { ConfirmModal, InputModal } from './src/components/Modal'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
const MAX_REFERENCE_IMAGES = 14;

const STATUS_COLUMNS = ["To Do", "In Progress", "For Review", "For Revision", "Done"];
const DELIVERABLE_STATUSES = ["To Do", "In Progress", "For Review", "For Revision", "Done"];
const COMMENT_TYPES = ["General", "Clarification", "Revision", "Approval"];
const ASSET_PROMPT_TYPES = ["Key Visual", "Background", "Character / Mascot", "3D Object", "Scene Reference"];


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
  label, .field-label { font-size: 12px; font-weight: 850; display: block; margin-bottom: 6px; color: #71717a; text-transform: uppercase; letter-spacing: .04em; }
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
  .small { font-size: 13px; }
  .warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; border-radius: 12px; padding: 11px 12px; font-size: 13px; margin-bottom: 8px; }
  .success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 12px; padding: 11px 12px; font-size: 13px; margin-bottom: 8px; }
  .sticky { position: sticky; top: 92px; }
  .choice-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
  .choice { text-align: left; border: 1px solid #d4d4d8; border-radius: 14px; padding: 13px; background: #fff; cursor: pointer; font-weight: 850; }
  .choice.active { background: #18181b; color: white; border-color: #18181b; }
  .composer { border: 1px dashed #d4d4d8; border-radius: 16px; background: #fbfbfd; padding: 12px; }
  .suggestions { display: grid; gap: 8px; margin-top: 10px; }
  .suggestion { border: 1px solid #e4e4e7; border-radius: 12px; background: white; padding: 10px; display: flex; justify-content: space-between; gap: 10px; align-items: center; cursor: pointer; text-align: left; }
  .suggestion:hover { border-color: #a78bfa; }
  .reference-panel { border: 1px solid #e4e4e7; border-radius: 16px; padding: 14px; background: #fbfbfd; }
  .thumb-strip { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
  .thumb { width: 64px; height: 64px; border-radius: 12px; border: 1px solid #e4e4e7; object-fit: cover; background: #f4f4f5; }
  .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.48); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 99; }
  .modal { background: white; border-radius: 20px; width: 100%; max-width: 680px; max-height: 88vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,.28); }
  .modal.large { max-width: 960px; }
  .modal-header { padding: 18px 20px; border-bottom: 1px solid #e4e4e7; display: flex; align-items: center; justify-content: space-between; gap: 16px; position: sticky; top: 0; background: white; z-index: 2; }
  .modal-body { padding: 20px; }
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
  .task-card { position: relative; background: white; border: 1px solid #dddde3; border-radius: 4px; padding: 14px 12px 12px 22px; margin-bottom: 10px; cursor: grab; box-shadow: 0 1px 3px rgba(0,0,0,.08); min-height: 112px; transition: transform .08s ease, box-shadow .12s ease; }
  .task-card:hover { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(0,0,0,.10); }
  .task-card:active { cursor: grabbing; }
  .deadline-strip { position: absolute; left: 0; top: 0; bottom: 0; width: 14px; border-radius: 4px 0 0 4px; background: #a1a1aa; }
  .strip-gray { background: #a1a1aa; }
  .strip-green { background: #22c55e; }
  .strip-yellow { background: #facc15; }
  .strip-orange { background: #fb923c; }
  .strip-red { background: #ef4444; }
  .task-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
  .task-title { font-size: 16px; font-weight: 900; line-height: 1.25; margin: 0 0 12px; }
  .task-meta { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; font-size: 14px; color: #3f3f46; }
  .task-icon { display: inline-flex; align-items: center; gap: 5px; font-weight: 800; white-space: nowrap; position: relative; }
  .comment-badge { position: absolute; right: -8px; top: -9px; min-width: 17px; height: 17px; border-radius: 999px; background: #ef4444; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; border: 2px solid white; }
  .dashboard-toolbar { display: grid; grid-template-columns: minmax(260px, 1fr) 180px 180px; gap: 10px; margin-bottom: 16px; }
  .detail-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(260px, .8fr); gap: 18px; }
  .info-box { border: 1px solid #e4e4e7; border-radius: 14px; padding: 12px; background: #fafafa; margin-bottom: 12px; }
  .table-ish { display: grid; gap: 8px; }
  .deliverable-detail { border: 1px solid #e4e4e7; border-radius: 12px; padding: 10px; background: white; }
  .comment { border-bottom: 1px solid #f1f1f1; padding: 10px 0; }
  .comment-type { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 8px; font-size: 11px; font-weight: 900; background: #f4f4f5; color: #52525b; margin-left: 6px; }
  .asset-type-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 10px 0; }
  .asset-type { border: 1px solid #d4d4d8; border-radius: 12px; padding: 9px 10px; background: white; cursor: pointer; font-weight: 850; font-size: 13px; }
  .asset-type.active { background: #18181b; color: white; border-color: #18181b; }
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
  .del-detect-btn { font-size: 12px; padding: 3px 8px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 5px; cursor: pointer; color: #374151; }
  .del-detect-btn:hover { background: #e5e7eb; }
  .del-confirm-strip { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px; margin-top: 8px; }
  .del-confirm-strip h5 { margin: 0 0 8px; font-size: 12px; color: #15803d; font-weight: 600; }
  .del-confirm-item { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 13px; }
  .del-confirm-item label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: normal; text-transform: none; letter-spacing: normal; color: #18181b; margin-bottom: 0; }
  .del-confirm-item input[type=checkbox] { width: auto; }
  .del-confirm-actions { display: flex; gap: 6px; margin-top: 8px; }
  .del-confirm-add { padding: 5px 12px; background: #16a34a; color: #fff; border: none; border-radius: 5px; font-size: 12px; cursor: pointer; }
  .del-confirm-dismiss { padding: 5px 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 5px; font-size: 12px; cursor: pointer; }
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

function readImageFiles(fileList, existing = []) {
  const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
  const remaining = Math.max(0, MAX_REFERENCE_IMAGES - existing.length);
  return Promise.all(files.slice(0, remaining).map((file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ id: uid("REF"), name: file.name, size: file.size, type: file.type, src: reader.result });
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  }))).then((items) => items.filter(Boolean));
}

function RequestPreview({ form, ai, onReview }) {
  const missing = getMissing(form);
  const meta = deadlineMeta(form.deadline);
  const output = ai || generateOutput(form);
  return (
    <div className="card sticky">
      <div className="card-header">Request Preview</div>
      <div className="card-body">
        <div className="field"><div className="field-label">Project</div><strong>{form.title || "—"}</strong></div>
        <div className="field"><div className="field-label">Brand / Type</div><span className="pill purple">{form.brand}</span> <span className="pill blue">{form.outputMode}</span></div>
        <div className="field"><div className="field-label">Requestor Notes</div><p style={{ marginTop: 0 }}>{summarizeRequestDetails(form)}</p></div>
        <div className="field"><div className="field-label">Deliverables</div>{form.deliverables.length ? form.deliverables.map((d) => <div key={d.id} className="small">• {d.label} — {formatSize(d)}</div>) : <div className="muted small">No deliverables added.</div>}</div>
        <div className="field"><div className="field-label">Schedule</div><span className={`pill ${meta.badge}`}>{meta.label}</span> <span className="small muted">Due {formatDate(form.deadline)}</span></div>
        <div className="field"><div className="field-label">Missing / Needs Confirmation</div>{missing.length ? missing.map((m) => <div className="warning" key={m}>{m}</div>) : output.missing.map((m) => <div className="success" key={m}>{m}</div>)}</div>
        <button className="btn purple" style={{ width: "100%" }} onClick={onReview}>Review Request</button>
      </div>
    </div>
  );
}

function DeliverableComposer({ form, setForm }) {
  const [input, setInput] = React.useState("")
  const [suggestions, setSuggestions] = React.useState([])
  const [detectedItems, setDetectedItems] = React.useState(null)
  const [selectedDetected, setSelectedDetected] = React.useState([])
  const [expandedNotes, setExpandedNotes] = React.useState({})
  const [expandedDims, setExpandedDims] = React.useState({})
  const [openMenu, setOpenMenu] = React.useState(null)
  const inputRef = React.useRef(null)

  React.useEffect(() => {
    if (!openMenu) return
    function handleClickOutside() { setOpenMenu(null) }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [openMenu])

  const briefText = form.requestDetails || ""
  const hasBriefText = briefText.trim().length > 0
  const deliverables = form.deliverables || []

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
    setForm(prev => ({ ...prev, deliverables: [...prev.deliverables, newDel] }))
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
    setForm(prev => ({ ...prev, deliverables: [...prev.deliverables, newDel] }))
    setInput("")
    setSuggestions([])
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") { e.preventDefault(); addCustom() }
    if (e.key === "Escape") setSuggestions([])
  }

  function removeDeliverable(id) {
    setForm(prev => ({ ...prev, deliverables: prev.deliverables.filter(d => d.id !== id) }))
  }

  function updateDeliverable(id, patch) {
    setForm(prev => ({ ...prev, deliverables: prev.deliverables.map(d => d.id === id ? { ...d, ...patch } : d) }))
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
    setForm(prev => ({ ...prev, deliverables: [...prev.deliverables, ...toAdd] }))
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
                {d.width && d.height && d.unit !== "N/A" && (
                  <span className="del-row-dim">{d.width}×{d.height} {d.unit}</span>
                )}
                <select
                  className={`del-status-select ${statusPillColor(d.status)}`}
                  value={d.status || "To Do"}
                  onChange={e => updateDeliverable(d.id, { status: e.target.value })}
                >
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <div className="del-menu-wrap">
                  <button className="del-menu-btn" type="button" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === d.id ? null : d.id) }}>···</button>
                  {openMenu === d.id && (
                    <div className="del-dropdown">
                      <button className="del-dropdown-item" type="button" onClick={() => { toggleDims(d.id); setOpenMenu(null) }}>Edit dimensions</button>
                      <button className="del-dropdown-item" type="button" onClick={() => { toggleNotes(d.id); setOpenMenu(null) }}>Notes</button>
                      <button className="del-dropdown-item danger" type="button" onClick={() => { removeDeliverable(d.id); setOpenMenu(null) }}>Remove</button>
                    </div>
                  )}
                </div>
              </div>
              {expandedDims[d.id] && (
                <div className="del-inline-dims">
                  <input placeholder="W" value={d.width} onChange={e => updateDeliverable(d.id, { width: e.target.value })} />
                  <span>×</span>
                  <input placeholder="H" value={d.height} onChange={e => updateDeliverable(d.id, { height: e.target.value })} />
                  <select value={d.unit || "px"} onChange={e => updateDeliverable(d.id, { unit: e.target.value })}>
                    {["px","mm","cm","in","ft","N/A"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              )}
              {expandedNotes[d.id] && (
                <textarea
                  className="del-notes-area"
                  placeholder="Specific notes for this size only..."
                  value={d.notes || ""}
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
          <button className="del-add-btn" type="button" onClick={addCustom}>+ Add</button>
          {hasBriefText && (
            <button className="del-detect-btn" type="button" onClick={handleDetect}>Detect from brief</button>
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
                {d.label}{d.width && d.unit !== "N/A" ? ` — ${d.width}×${d.height} ${d.unit}` : ""}
              </label>
            </div>
          ))}
          <div className="del-confirm-actions">
            <button className="del-confirm-add" type="button" onClick={confirmDetected}>Add Selected</button>
            <button className="del-confirm-dismiss" type="button" onClick={() => setDetectedItems(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ReferenceUploader({ form, setForm }) {
  const [open, setOpen] = useState(false);
  const [draftImages, setDraftImages] = useState(form.referenceImages || []);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (open) setDraftImages(form.referenceImages || []);
  }, [open, form.referenceImages]);

  const addFiles = async (files) => {
    const next = await readImageFiles(files, draftImages);
    setDraftImages((prev) => [...prev, ...next].slice(0, MAX_REFERENCE_IMAGES));
  };

  const removeImage = (id) => setDraftImages((prev) => prev.filter((img) => img.id !== id));

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
      <Field label="Reference notes"><textarea value={form.referenceNotes} onChange={(e) => setForm((prev) => ({ ...prev, referenceNotes: e.target.value }))} placeholder="What should we borrow from the references? Example: Use layout and hierarchy only. Keep colors LakiWin-branded." /></Field>

      {open && <div className="modal-bg">
        <div className="modal">
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
                <strong>Drag images here</strong>
                <p className="muted">or choose screenshots / downloaded reference images</p>
                <label className="btn secondary" style={{ display: "inline-flex", cursor: "pointer", textTransform: "none", letterSpacing: 0, color: "#18181b" }}>
                  Choose files
                  <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
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
    <div className="modal-bg">
      <div className="modal large">
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

function TaskCard({ request, onOpen, onDragStart }) {
  const meta = deadlineMeta(request.form.deadline);
  const deliverables = request.form.deliverables || [];
  const done = deliverables.filter((d) => d.status === "Done").length;
  const total = deliverables.length;
  return (
    <div
      className="task-card"
      draggable
      onDragStart={(e) => onDragStart(e, request.id)}
      onClick={() => onOpen(request.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(request.id); }}
    >
      <span className={`deadline-strip ${meta.strip}`} />
      <div className="task-top">
        <span className="pill purple">{request.form.outputMode}</span>
        <button className="btn ghost" type="button" onClick={(e) => e.stopPropagation()}>•••</button>
      </div>
      <h3 className="task-title">{request.form.title || "Untitled Request"}</h3>
      <div className="task-meta">
        <span>◷ {formatDateTime(request.createdAt)} → {formatDate(request.form.deadline)}</span>
        <span className="task-icon">☑ {done}/{total || 0}</span>
        <span className="task-icon">💬 {request.comments?.length || 0}{request.unreadComments > 0 && <span className="comment-badge">{request.unreadComments}</span>}</span>
      </div>
    </div>
  );
}

function TaskModal({ request, setRequests, onClose, onDelete, showToast }) {
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState("General");
  const [assetType, setAssetType] = useState("Key Visual");
  const [delExpandedNotes, setDelExpandedNotes] = useState({});
  const [addingDeliverable, setAddingDeliverable] = useState(false);
  const [newDelInput, setNewDelInput] = useState("");
  const [newDelSuggestions, setNewDelSuggestions] = useState([]);
  const [modalRevisionTarget, setModalRevisionTarget] = useState(null); // { requestId: string } | null
  if (!request) return null;
  const ai = request.ai || generateOutput(request.form);
  const meta = deadlineMeta(request.form.deadline);
  const assetPrompt = buildAssetPrompt(request.form, ai, assetType);
  const deliverables = request.form.deliverables || [];
  const doneCount = deliverables.filter((d) => d.status === "Done").length;

  const appendActivityToRequest = (r, action, detail = "") => ({
    ...r,
    activity: [makeActivity(action, detail), ...(r.activity || [])],
  });

  const changeTaskStatus = (status) => {
    if (status === request.status) return;
    setRequests((prev) => prev.map((r) => {
      if (r.id !== request.id) return r;
      const next = appendActivityToRequest({ ...r, status }, `Request moved from ${r.status} → ${status}`);
      supabase.from("requests").upsert({ id: next.id, data: next })
        .then(({ error }) => { if (error) console.error("[Supabase] status sync failed:", error.message); });
      return next;
    }));
    if (status === "For Revision") {
      setModalRevisionTarget({ requestId: request.id });
    }
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

  return (
    <div className="modal-bg">
      <div className="modal large">
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>{request.form.title || "Untitled Request"}</h2>
            <div className="muted small">{request.form.brand} • {request.form.outputMode} • {formatDateTime(request.createdAt)} → {formatDate(request.form.deadline)} • {meta.label}</div>
          </div>
          <button className="btn ghost" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <main>
              <div className="info-box">
                <div className="field-label">AI Project Brief</div>
                <p style={{ marginBottom: 0 }}>{ai.brief}</p>
              </div>

              <div className="info-box">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div className="field-label" style={{ marginBottom: 0 }}>Deliverables</div>
                  <button className="del-detect-btn" type="button" onClick={() => setAddingDeliverable(v => !v)}>
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
                        <button
                          className="del-menu-btn"
                          type="button"
                          title="Toggle notes"
                          onClick={() => setDelExpandedNotes(prev => ({ ...prev, [d.id]: !prev[d.id] }))}
                        >✎</button>
                        <button
                          className="del-menu-btn"
                          type="button"
                          title="Remove deliverable"
                          onClick={() => removeModalDeliverable(d.id)}
                        >✕</button>
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
                  <p style={{ color: "#9ca3af", fontSize: 13, margin: "4px 0" }}>No deliverables yet.</p>
                )}
              </div>

              <div className="info-box">
                <div className="field-label">Key Visual Direction</div>
                <p><strong>Mood:</strong> {ai.visualDirection?.mood}</p>
                <p><strong>Color Balance:</strong> {ai.visualDirection?.colorBalance}</p>
                <p><strong>Core Idea:</strong> {ai.visualDirection?.coreIdea}</p>
                <div>{ai.visualDirection?.imagery?.map((tag) => <span className="pill" key={tag} style={{ margin: 3 }}>{tag}</span>)}</div>
              </div>

              <div className="info-box">
                <div className="field-label">AI Asset Prompt Generator</div>
                <p className="muted small" style={{ marginTop: 0 }}>Generate copy-paste prompts for AI asset creation, not final artwork.</p>
                <div className="asset-type-grid">
                  {ASSET_PROMPT_TYPES.map((type) => <button key={type} type="button" className={`asset-type ${assetType === type ? "active" : ""}`} onClick={() => setAssetType(type)}>{type}</button>)}
                </div>
                <textarea readOnly style={{ minHeight: 190 }} value={assetPrompt} />
                <button className="btn secondary" onClick={() => navigator.clipboard?.writeText(assetPrompt)}>Copy asset prompt</button>
              </div>

              <div className="info-box">
                <div className="field-label">Original Request Details</div>
                <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{request.form.requestDetails || "—"}</p>
              </div>
            </main>

            <aside>
              <div className="info-box">
                <div className="field-label">Task Controls</div>
                <span className={`pill ${meta.badge}`}>{meta.label}</span>
                <div style={{ marginTop: 12 }}><label>Status</label><select value={request.status} onChange={(e) => changeTaskStatus(e.target.value)}>{STATUS_COLUMNS.map((s) => <option key={s}>{s}</option>)}</select></div>
                <div style={{ marginTop: 12 }}><label>Assigned To</label><select value={request.form.assignedTo || "Unassigned"} onChange={(e) => changeAssignee(e.target.value)}>{DESIGNERS.map((d) => <option key={d}>{d}</option>)}</select></div>
                <p className="small muted">Requested by: <strong>{request.form.requestor || "—"}</strong></p>
              </div>

              <div className="info-box">
                <div className="field-label">References / Attachments</div>
                {request.form.referenceImages?.length ? <div className="thumb-strip">{request.form.referenceImages.map((img) => <img className="thumb" src={img.src} alt={img.name} key={img.id} />)}</div> : <p className="muted">No reference images.</p>}
                <p className="small muted" style={{ whiteSpace: "pre-wrap" }}>{request.form.referenceNotes || "No reference notes."}</p>
              </div>

              <div className="info-box">
                <div className="field-label">Comments / Clarifications</div>
                {request.comments?.length ? request.comments.map((c) => <div className="comment" key={c.id}><strong>{c.author}</strong><span className="comment-type">{c.type || "General"}</span><br /><span>{c.body}</span><br /><small className="muted">{formatActivityTime(c.createdAt)}</small></div>) : <p className="muted">No comments yet.</p>}
                <div className="row" style={{ marginTop: 10 }}>
                  <select value={commentType} onChange={(e) => setCommentType(e.target.value)}>{COMMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
                  <button className="btn secondary" onClick={() => setCommentType("Revision")}>Revision note</button>
                </div>
                <textarea style={{ minHeight: 72, marginTop: 8 }} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add comment, clarification, revision note, or approval note..." />
                <button className="btn" style={{ width: "100%" }} onClick={addComment}>Add Comment</button>
              </div>

              <div className="info-box">
                <div className="field-label">Activity History</div>
                {request.activity?.length ? request.activity.map((item) => <div className="activity-item" key={item.id}>
                  <small className="muted">{formatActivityTime(item.createdAt)}</small>
                  <div><strong>{item.action}</strong>{item.detail ? <><br /><span className="muted">{item.detail}</span></> : null}</div>
                </div>) : <p className="muted">No activity yet.</p>}
              </div>

              <button className="btn danger" style={{ width: "100%" }} onClick={() => onDelete(request.id)}>Delete Request</button>
            </aside>
          </div>
        </div>
      </div>
      <InputModal
        isOpen={modalRevisionTarget !== null}
        title="Add Revision Note"
        placeholder="Describe what needs to be revised..."
        onCancel={() => setModalRevisionTarget(null)}
        onSubmit={(note) => {
          setRequests((prev) => prev.map((r) => {
            if (r.id !== modalRevisionTarget.requestId) return r;
            const revisionComment = {
              id: uid("COM"),
              type: "Revision",
              // TODO: replace "Current User" with real user identity from partner system profile
              author: "Current User",
              body: note,
              createdAt: new Date().toISOString(),
            };
            return {
              ...r,
              comments: [...(r.comments || []), revisionComment],
              unreadComments: (r.unreadComments || 0) + 1,
              activity: [makeActivity("Revision note added", note), ...(r.activity || [])],
            };
          }));
          setModalRevisionTarget(null);
          if (showToast) showToast('Revision note added');
        }}
      />
    </div>
  );
}

export default function CreativeBriefBuilderPrototype() {
  const [view, setView] = useState("builder");
  const [form, setForm] = useState(blankForm);
  const [requests, setRequests] = useState([]);
  const [ai, setAi] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [filters, setFilters] = useState({ search: "", assignedTo: "" });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [deletingRequest, setDeletingRequest] = useState(null);
  const [revisionTarget, setRevisionTarget] = useState(null); // { requestId: string } | null

  const showToast = (message, variant = 'success') => {
    setToast({ message, variant })
  }

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
        .then(({ error }) => { if (error) showToast(error.message ?? 'Sync failed', 'error'); });
    }
    toDelete.forEach((r) => {
      supabase.from("requests").delete().eq("id", r.id)
        .then(({ error }) => { if (error) showToast(error.message ?? 'Sync failed', 'error'); });
    });
  }, [requests]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const output = useMemo(() => generateOutput(form), [form]);
  const selectedRequest = useMemo(() => requests.find((r) => r.id === selectedId) || null, [requests, selectedId]);

  const resetBuilder = () => {
    setForm(blankForm);
    setAi(null);
    setReviewOpen(false);
    setSelectedId(null);
    setView("builder");
  };

  const submitRequest = () => {
    const nextAi = ai || output;
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
    setForm(blankForm);
    setAi(null);
    setReviewOpen(false);
    setView("dashboard");
    showToast('Request submitted successfully');
  };

  const openReview = () => {
    setAi(output);
    setReviewOpen(true);
  };

  const filteredRequests = requests.filter((r) => {
    const q = filters.search.toLowerCase();
    const matchesSearch = !q || `${r.form.title} ${r.form.requestor} ${r.form.brand} ${r.form.requestDetails}`.toLowerCase().includes(q);
    const matchesAssignee = !filters.assignedTo || r.form.assignedTo === filters.assignedTo;
    return matchesSearch && matchesAssignee;
  });

  const grouped = STATUS_COLUMNS.reduce((acc, status) => {
    acc[status] = filteredRequests.filter((r) => normalizeStatus(r.status) === status);
    return acc;
  }, {});

  const handleDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const dropOnStatus = (status) => {
    const id = dragId;
    if (!id) return;
    // Apply status change immediately; prompt for revision note via modal if needed
    setRequests((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id || r.status === status) return r;
        const updated = { ...r, status, activity: [makeActivity(`Request moved from ${r.status} → ${status}`), ...(r.activity || [])] };
        supabase.from("requests").upsert({ id: updated.id, data: updated })
          .then(({ error }) => { if (error) console.error("[Supabase] status sync failed:", error.message); });
        return updated;
      });
      return next;
    });
    if (status === "For Revision") {
      setRevisionTarget({ requestId: id });
    }
    setDragId(null);
    setDragOverStatus(null);
  };

  const openTask = (id) => {
    setSelectedId(id);
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, unreadComments: 0 } : r));
  };

  const deleteRequest = (id) => {
    const target = requests.find((r) => r.id === id) || null;
    setDeletingRequest(target);
  };

  const Header = () => (
    <div className="header">
      <div className="header-inner">
        <div>
          <h2 style={{ margin: 0 }}>Creative Request Builder</h2>
          <div className="muted small">Request intake → AI organized brief → draggable task dashboard</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className={`btn ${view === "builder" ? "" : "secondary"}`} onClick={resetBuilder}>Create Request</button>
          <button className={`btn ${view === "dashboard" ? "" : "secondary"}`} onClick={() => setView("dashboard")}>Dashboard</button>
        </div>
      </div>
    </div>
  );

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
      <Header />

      {view === "builder" && <div className="container">
        <div className="card"><div className="card-body"><h1 style={{ marginTop: 0 }}>Create a request</h1><p className="muted">Request details come first. Add deliverables after, then use per-deliverable notes only when a material needs special handling.</p></div></div>
        <div className="grid">
          <main>
            <Section n="1" title="Project basics">
              <div className="row">
                <Field label="Project title"><input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Example: Monitor Topper for KonKon" /></Field>
                <Field label="Brand / account"><select value={form.brand} onChange={(e) => update("brand", e.target.value)}><option>LakiWin</option><option>VikingFunLand</option><option>RAC PH</option><option>Other Brand</option></select></Field>
              </div>
              <Field label="Static or motion"><div className="choice-grid">{["Static", "Motion"].map((m) => <button key={m} type="button" className={`choice ${form.outputMode === m ? "active" : ""}`} onClick={() => update("outputMode", m)}>{m}</button>)}</div></Field>
            </Section>

            <Section n="2" title="Request Details / Full Brief">
              <p className="muted" style={{ marginTop: 0 }}>Paste all promo details, copy, mechanics, mandatories, references, and notes here.</p>
              <textarea value={form.requestDetails} onChange={(e) => update("requestDetails", e.target.value)} placeholder={`Example:\nput KonKon's QR code.\nfeature SuperAce by JILI.\nput PAGCOR mandatories.\nshowcase LakiWin logo.`} style={{ minHeight: 155 }} />
            </Section>

            <Section n="3" title="What size/s do you need?">
              <DeliverableComposer form={form} setForm={setForm} />
            </Section>

            <Section n="4" title="Visual references / moodboard" optional>
              <p className="muted" style={{ marginTop: 0 }}>Optional. Use this when requestors have screenshots, pegs, or downloaded references.</p>
              <ReferenceUploader form={form} setForm={setForm} />
            </Section>

            <Section n="5" title="Deadline and requestor">
              <div className="row">
                <Field label="Date needed"><input type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} /></Field>
                <Field label="Requested by"><select value={form.requestor} onChange={(e) => update("requestor", e.target.value)}><option value="">Select requestor</option>{REQUESTORS.map((person) => <option key={person}>{person}</option>)}</select></Field>
              </div>
              <Field label="Assign to"><select value={form.assignedTo} onChange={(e) => update("assignedTo", e.target.value)}>{DESIGNERS.map((designer) => <option key={designer}>{designer}</option>)}</select></Field>
            </Section>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 30 }}><button className="btn purple" onClick={openReview}>Review Request</button></div>
          </main>
          <aside><RequestPreview form={form} ai={ai} onReview={openReview} /></aside>
        </div>
      </div>}

      {view === "dashboard" && <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div><h1 style={{ margin: 0 }}>Dashboard</h1><p className="muted">Drag cards between columns. New submitted requests land in To Do.</p></div>
        </div>
        <div className="dashboard-toolbar">
          <input placeholder="Search title, requestor, brand, details..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select value={filters.assignedTo} onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}><option value="">All assignees</option>{DESIGNERS.map((d) => <option key={d}>{d}</option>)}</select>
          <button className="btn secondary" onClick={() => setFilters({ search: "", assignedTo: "" })}>Clear filters</button>
        </div>

        <div className="board">
          {STATUS_COLUMNS.map((status) => (
            <section
              key={status}
              className={`board-column ${dragOverStatus === status ? "drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status); }}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={(e) => { e.preventDefault(); dropOnStatus(status); }}
            >
              <div className="column-header">
                <div className="column-title">{status} <span className="count">{grouped[status]?.length || 0}</span></div>
                {status === "To Do" && <button className="btn ghost" title="Create request" onClick={resetBuilder}>＋</button>}
              </div>
              {grouped[status]?.map((request) => <TaskCard key={request.id} request={request} onOpen={openTask} onDragStart={handleDragStart} />)}
            </section>
          ))}
        </div>
      </div>}

      {reviewOpen && <RequestReviewModal form={form} ai={ai || output} onCancel={() => setReviewOpen(false)} onSubmit={submitRequest} />}
      {selectedRequest && <TaskModal request={selectedRequest} setRequests={setRequests} onClose={() => setSelectedId(null)} onDelete={deleteRequest} showToast={showToast} />}

      <ConfirmModal
        isOpen={deletingRequest !== null}
        title={`Delete "${deletingRequest?.form?.title || 'this request'}"?`}
        message="This cannot be undone. All deliverables and comments will be permanently removed."
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setDeletingRequest(null)}
        onConfirm={async () => {
          try {
            const { error } = await supabase
              .from('requests')
              .delete()
              .eq('id', deletingRequest.id);
            if (error) throw error;
            setRequests((prev) => prev.filter((r) => r.id !== deletingRequest.id));
            setSelectedId(null);
            setDeletingRequest(null);
            showToast('Request deleted');
          } catch (err) {
            showToast(err.message ?? 'Failed to delete request', 'error');
            setDeletingRequest(null);
          }
        }}
      />

      <InputModal
        isOpen={revisionTarget !== null}
        title="Add Revision Note"
        placeholder="Describe what needs to be revised..."
        onCancel={() => setRevisionTarget(null)}
        onSubmit={(note) => {
          setRequests((prev) => prev.map((r) => {
            if (r.id !== revisionTarget.requestId) return r;
            const revisionComment = {
              id: uid("COM"),
              type: "Revision",
              // TODO: replace "Current User" with real user identity from partner system profile
              author: "Current User",
              body: note,
              createdAt: new Date().toISOString(),
            };
            return {
              ...r,
              comments: [...(r.comments || []), revisionComment],
              unreadComments: (r.unreadComments || 0) + 1,
              activity: [makeActivity("Revision note added", note), ...(r.activity || [])],
            };
          }));
          setRevisionTarget(null);
          showToast('Revision note added');
        }}
      />

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
