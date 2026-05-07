import React, { useEffect, useMemo, useState } from "react";

const LS_KEY = "creative_request_builder_kanban_v6";

const STATUSES = [
  { key: "Submitted", title: "Submitted", helper: "New creative requests", color: "#8b5cf6" },
  { key: "In Progress", title: "In Progress", helper: "Currently being designed", color: "#f59e0b" },
  { key: "For Review", title: "For Review", helper: "Awaiting approval", color: "#3b82f6" },
  { key: "Done", title: "Done", helper: "Completed requests", color: "#22c55e" },
];

const UNITS = ["px", "in", "ft", "mm", "m"];
const REFERENCE_TAGS = ["Mood", "Color", "Layout", "Style", "Assets", "Typography"];

const DELIVERABLE_PRESETS = [
  { id: "socmed-portrait", label: "Social Media Portrait", width: "1080", height: "1350", unit: "px", group: "Social Media" },
  { id: "socmed-square", label: "Social Media Square", width: "1080", height: "1080", unit: "px", group: "Social Media" },
  { id: "socmed-story", label: "Social Media Story/Reel", width: "1080", height: "1920", unit: "px", group: "Social Media" },
  { id: "fb-cover", label: "Facebook Cover", width: "820", height: "312", unit: "px", group: "Social Media" },
  { id: "a4", label: "A4 Poster", width: "210", height: "297", unit: "mm", group: "Print" },
  { id: "letter", label: "Letter Flyer", width: "8.5", height: "11", unit: "in", group: "Print" },
  { id: "pullup", label: "Pull-up Banner", width: "3", height: "5", unit: "ft", group: "Print" },
  { id: "web-banner", label: "Web Banner", width: "1440", height: "560", unit: "px", group: "Digital" },
  { id: "mobile-banner", label: "Mobile Banner", width: "390", height: "420", unit: "px", group: "Digital" },
  { id: "tablet-banner", label: "Tablet Banner", width: "1024", height: "480", unit: "px", group: "Digital" },
  { id: "logo", label: "Logo", width: "", height: "", unit: "N/A", group: "Branding" },
];

const DEFAULT_BRAND_PROFILES = [
  {
    id: "brand-lakiwin",
    name: "LakiWin",
    description: "E-casino and land-based outlet brand with a bold, reward-focused retail promo feel.",
    tone: "Energetic, approachable, fun, high-contrast, promotional, easy to understand.",
    colors: "Primary yellows #FAB403 and #FAD403. Support with #221F1F, #404040, white, and controlled warm orange/gold gradients.",
    typography: "Primary: Boontook Mon. Secondary: Gontserrat. Use bold rounded headlines and readable support copy.",
    motifs: "Glow trails, light bursts, reward highlights, carnival/arcade energy, warm golden lighting, controlled casino-adjacent excitement.",
    dos: "Keep yellow dominant. Build clear hierarchy. Make CTA and promo mechanics readable. Use one strong campaign system across sizes.",
    donts: "Do not make layouts messy. Avoid generic stock-casino clutter. Avoid explicit gambling visuals when placement is sensitive. Do not dilute brand yellow.",
    compliance: "Leave room for required PAGCOR/responsible gaming marks when needed. Avoid risky claims or overly literal gambling depictions.",
    aiNotes: "Act like a creative director for a LakiWin promo. Be specific, visual, and opinionated. Prioritize reward anticipation, clarity, and production-ready KV direction.",
  },
  {
    id: "brand-vikingfunland",
    name: "VikingFunLand",
    description: "Arcade-token-meets-casino entertainment concept with playful Viking/funland cues.",
    tone: "Adventurous, playful, nostalgic, arcade-like, bold, slightly fantastical but still commercial.",
    colors: "Warm gold/yellow token colors, deep navy or charcoal support, icy blue accents, white highlights.",
    typography: "Bold display headline with friendly rounded sans support. Avoid medieval fonts that hurt readability.",
    motifs: "Tokens, arcade glow, playful shields, Viking hints, funland lights, treasure/reward cues, stylized game-world atmosphere.",
    dos: "Make it feel like a modern arcade reward world. Use Viking cues as accent, not costume overload. Keep layouts readable and punchy.",
    donts: "Do not overdo horns, weapons, or dark fantasy. Avoid muddy medieval palettes. Do not sacrifice clarity for theme.",
    compliance: "Keep visuals entertainment-focused and safe. Avoid aggressive weapon imagery and explicit gambling mechanics where risky.",
    aiNotes: "Generate a playful but controlled creative direction that merges arcade reward energy with light Viking/funland identity cues.",
  },
];

const blankForm = {
  title: "",
  brandId: "brand-lakiwin",
  outputMode: "Static",
  deliverables: [],
  requestDetails: "",
  deadline: "",
  requestor: "",
  referenceLinks: "",
  referenceTags: [],
  files: [],
};

const blankCustomDeliverable = { label: "", width: "", height: "", unit: "px" };

const css = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  .app { min-height: 100vh; background: #f7f7fb; color: #17171c; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .topbar { height: 58px; position: sticky; top: 0; z-index: 40; background: rgba(255,255,255,.93); backdrop-filter: blur(12px); border-bottom: 1px solid #ececf1; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; gap: 16px; }
  .brand-lockup { display: flex; align-items: center; gap: 12px; min-width: 236px; }
  .logo { width: 34px; height: 34px; border-radius: 12px; background: #17171c; color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: 950; }
  .workspace { border: 1px solid #ececf1; border-radius: 999px; background: white; padding: 8px 12px; font-weight: 800; font-size: 13px; }
  .top-actions { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .global-search { width: min(420px, 34vw); border-radius: 999px; background: #f4f5fb; }
  .shell { display: grid; grid-template-columns: 218px minmax(0, 1fr); min-height: calc(100vh - 58px); }
  .sidebar { background: white; border-right: 1px solid #ececf1; padding: 18px 12px; position: sticky; top: 58px; height: calc(100vh - 58px); }
  .side-item { width: 100%; border: 0; background: transparent; border-radius: 12px; padding: 11px 12px; display: flex; align-items: center; gap: 10px; font-weight: 800; color: #52525b; cursor: pointer; text-align: left; }
  .side-item:hover { background: #f4f4f7; color: #17171c; }
  .side-item.active { background: #7c3aed; color: white; box-shadow: 0 8px 20px rgba(124,58,237,.22); }
  .side-section { color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; font-weight: 950; margin: 18px 12px 8px; }
  .main { min-width: 0; padding: 26px 34px 34px; }
  .main-inner { width: min(1280px, 100%); margin: 0 auto; }
  .page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; flex-wrap: wrap; margin-bottom: 18px; }
  h1, h2, h3, h4 { margin: 0; }
  h1 { font-size: 26px; letter-spacing: -.035em; }
  h2 { font-size: 18px; letter-spacing: -.02em; }
  h3 { font-size: 15px; }
  p { line-height: 1.5; }
  .muted { color: #71717a; }
  .tiny { color: #8a8a96; font-size: 12px; }
  .readable { max-width: 74ch; }
  .btn { border: 0; border-radius: 12px; padding: 10px 14px; font-size: 14px; font-weight: 900; cursor: pointer; background: #17171c; color: #fff; white-space: nowrap; }
  .btn:hover { filter: brightness(.96); }
  .btn.secondary { border: 1px solid #dedee7; background: white; color: #17171c; }
  .btn.ghost { border: 0; background: transparent; color: #52525b; padding: 8px 9px; }
  .btn.purple { background: #7c3aed; }
  .btn.danger { border: 1px solid #fecaca; background: #fff; color: #991b1b; }
  .btn.full { width: 100%; }
  .btn:disabled { opacity: .46; cursor: not-allowed; }
  input, textarea, select { width: 100%; border: 1px solid #dedee7; border-radius: 12px; padding: 9px 11px; font-size: 14px; outline: none; background: white; color: #17171c; font-family: inherit; }
  textarea { min-height: 96px; resize: vertical; line-height: 1.45; }
  label { font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .06em; color: #8a8a96; display: block; margin-bottom: 7px; }
  .field { margin-bottom: 13px; }
  .card { background: white; border: 1px solid #e7e7ee; border-radius: 18px; box-shadow: 0 2px 8px rgba(15,23,42,.04); overflow: hidden; }
  .card-head { padding: 14px 16px; border-bottom: 1px solid #f0f0f5; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .card-body { padding: 16px; }
  .section { margin-bottom: 14px; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .three-row { display: grid; grid-template-columns: 1fr 1fr 88px; gap: 10px; }
  .inline-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .pill { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #dedee7; border-radius: 999px; padding: 5px 9px; font-size: 12px; font-weight: 800; background: white; color: #3f3f46; margin: 2px; }
  .pill.purple { background: #f3e8ff; color: #6d28d9; border-color: #e9d5ff; }
  .pill.blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
  .pill.yellow { background: #fffbeb; color: #92400e; border-color: #fde68a; }
  .pill.green { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
  .pill.red { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
  .pill.gray { background: #f4f4f5; color: #52525b; border-color: #e4e4e7; }
  .tabs { display: inline-flex; align-items: center; gap: 6px; padding: 5px; border-radius: 999px; background: white; border: 1px solid #ececf1; }
  .tab { border: 0; border-radius: 999px; padding: 8px 14px; background: transparent; font-weight: 850; color: #52525b; cursor: pointer; }
  .tab.active { background: #7c3aed; color: white; box-shadow: 0 5px 14px rgba(124,58,237,.20); }
  .filters { display: grid; grid-template-columns: minmax(240px, 1fr) 160px 150px 150px; gap: 10px; align-items: center; margin-bottom: 16px; }
  .stat-row { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .stat-card { background: white; border: 1px solid #ececf1; border-radius: 16px; padding: 14px; }
  .stat-card strong { font-size: 22px; display: block; }
  .board-wrap { overflow-x: auto; padding-bottom: 12px; }
  .board { display: grid; grid-template-columns: repeat(4, minmax(280px, 1fr)); gap: 16px; min-width: 1120px; }
  .column { background: #f0f1f7; border: 1px solid #e5e7ef; border-radius: 18px; padding: 12px; min-height: 64vh; }
  .column-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 2px 4px 10px; }
  .column-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 950; }
  .dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
  .add-task { width: 100%; border: 1px dashed #d5d7e2; background: rgba(255,255,255,.65); border-radius: 14px; padding: 10px; font-weight: 850; color: #6b7280; cursor: pointer; margin-bottom: 10px; }
  .task-card { background: white; border: 1px solid #e6e6ee; border-radius: 16px; padding: 12px; box-shadow: 0 3px 12px rgba(15,23,42,.05); margin-bottom: 10px; cursor: pointer; transition: transform .14s ease, box-shadow .14s ease; }
  .task-card:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(15,23,42,.10); }
  .task-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
  .task-tags { display: flex; gap: 4px; flex-wrap: wrap; min-width: 0; }
  .task-title { font-size: 14px; font-weight: 950; line-height: 1.25; margin: 8px 0 5px; }
  .task-brief { color: #60606c; font-size: 12px; line-height: 1.38; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 33px; }
  .task-footer { display: flex; justify-content: space-between; align-items: center; gap: 10px; border-top: 1px solid #f1f1f5; padding-top: 10px; margin-top: 10px; }
  .task-meta { display: flex; align-items: center; gap: 9px; color: #71717a; font-size: 12px; flex-wrap: wrap; }
  .avatar { width: 24px; height: 24px; border-radius: 999px; background: #17171c; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 950; }
  .builder-layout, .details-layout { display: grid; grid-template-columns: minmax(0, 760px) minmax(360px, 410px); gap: 28px; align-items: start; }
  .builder-main, .detail-main { min-width: 0; }
  .sticky-panel { position: sticky; top: 82px; max-height: calc(100vh - 104px); overflow: auto; }
  .sticky-panel .card { border-radius: 20px; }
  .segmented { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .segment { border: 1px solid #dedee7; background: white; border-radius: 14px; padding: 11px 12px; text-align: left; cursor: pointer; }
  .segment strong { display: block; margin-bottom: 2px; }
  .segment.active { border-color: #7c3aed; background: #f6f0ff; box-shadow: inset 0 0 0 1px #7c3aed; }
  .suggestions { border: 1px solid #e4e4ec; border-radius: 14px; overflow: hidden; margin-top: 8px; background: white; }
  .suggestion { width: 100%; border: 0; background: white; padding: 10px 12px; text-align: left; cursor: pointer; display: flex; justify-content: space-between; gap: 10px; align-items: center; }
  .suggestion:hover { background: #f7f7fb; }
  .deliverable-list { display: grid; gap: 8px; margin-top: 10px; }
  .list-item { border: 1px solid #e6e6ee; border-radius: 14px; padding: 10px; background: #fcfcfd; display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
  .custom-box { border: 1px dashed #d8d8e4; border-radius: 16px; padding: 12px; background: #fbfbff; margin-top: 12px; }
  .note { border-radius: 14px; padding: 10px 11px; font-size: 13px; line-height: 1.4; border: 1px solid #e4e4e7; background: #fafafa; margin-bottom: 8px; }
  .note.warn { background: #fffbeb; color: #92400e; border-color: #fde68a; }
  .note.good { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
  .note.purple { background: #f5f3ff; color: #5b21b6; border-color: #ddd6fe; }
  .read-card { background: white; border: 1px solid #e7e7ee; border-radius: 18px; padding: 18px; margin-bottom: 14px; box-shadow: 0 2px 8px rgba(15,23,42,.04); }
  .read-card h3 { margin-bottom: 12px; }
  .brief-text { max-width: 72ch; font-size: 15px; line-height: 1.55; }
  .kv-stack { display: grid; gap: 14px; max-width: 72ch; }
  .kv-item strong { display: block; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #8a8a96; margin-bottom: 4px; }
  .kv-item p { margin: 0; }
  .hierarchy-grid { display: grid; gap: 10px; max-width: 72ch; }
  .hierarchy-row { border: 1px solid #ededf2; background: #fcfcfd; border-radius: 14px; padding: 10px 11px; }
  .hierarchy-row strong { display: block; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: #8a8a96; margin-bottom: 3px; }
  .prompt-preview { white-space: pre-wrap; max-width: 72ch; color: #3f3f46; font-size: 13px; line-height: 1.5; background: #fafafa; border: 1px solid #e7e7ee; border-radius: 14px; padding: 12px; max-height: 118px; overflow: hidden; }
  .prompt-textarea { min-height: 220px; max-width: 72ch; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 13px; }
  .comment { border: 1px solid #ececf1; border-radius: 14px; padding: 10px; margin-bottom: 8px; background: #fff; }
  .comment.resolved { background: #f0fdf4; border-color: #bbf7d0; }
  details { border: 1px solid #ececf1; border-radius: 14px; background: white; margin-bottom: 10px; overflow: hidden; }
  summary { padding: 12px 14px; cursor: pointer; font-weight: 850; }
  details > div { padding: 0 14px 14px; }
  .brand-grid { display: grid; grid-template-columns: 320px minmax(0, 760px); gap: 22px; align-items: start; }
  .brand-list { display: grid; gap: 8px; }
  .brand-row { border: 1px solid #e6e6ee; background: white; border-radius: 14px; padding: 12px; text-align: left; cursor: pointer; }
  .brand-row.active { border-color: #7c3aed; box-shadow: inset 0 0 0 1px #7c3aed; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .ref-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; margin-top: 10px; }
  .ref-chip { border: 1px solid #ececf1; border-radius: 14px; background: #fcfcfd; padding: 9px; font-size: 12px; overflow: hidden; }
  @media (max-width: 1180px) { .builder-layout, .details-layout, .brand-grid { grid-template-columns: 1fr; } .sticky-panel { position: static; max-height: none; } .global-search { width: 240px; } }
  @media (max-width: 1040px) { .shell { grid-template-columns: 1fr; } .sidebar { display: none; } .main { padding: 22px; } .stat-row { grid-template-columns: repeat(2, minmax(120px, 1fr)); } .filters { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 680px) { .topbar { height: auto; padding: 12px; flex-wrap: wrap; } .brand-lockup { min-width: 0; } .main { padding: 16px; } .row, .three-row, .form-grid, .filters, .stat-row, .segmented { grid-template-columns: 1fr; } .board { min-width: 980px; } }
`;

function uid(prefix = "REQ") {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDeliverable(d) {
  if (!d) return "";
  if (d.unit === "N/A") return d.label;
  if (!d.width || !d.height) return `${d.label} — Custom size`;
  return `${d.label} — ${d.width} × ${d.height} ${d.unit}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "No due date";
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function priorityFromDate(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return { label: "No deadline", cls: "gray" };
  if (days <= 1) return { label: "Urgent", cls: "red" };
  if (days <= 5) return { label: "Soon", cls: "yellow" };
  return { label: "Normal", cls: "green" };
}

function initials(name = "?") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "?";
}

function truncate(text = "", max = 140) {
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function getBrand(brandProfiles, brandId) {
  return brandProfiles.find((b) => b.id === brandId) || brandProfiles[0] || DEFAULT_BRAND_PROFILES[0];
}

function safeForm(form = {}) {
  return {
    ...blankForm,
    ...form,
    requestDetails: form.requestDetails || form.rawRequest || form.ideaDump || "",
    deliverables: Array.isArray(form.deliverables) ? form.deliverables : [],
    referenceTags: Array.isArray(form.referenceTags) ? form.referenceTags : [],
    files: Array.isArray(form.files) ? form.files : [],
  };
}

function getMissing(formInput) {
  const form = safeForm(formInput);
  const arr = [];
  if (!form.title.trim()) arr.push("Project title is missing.");
  if (!form.brandId) arr.push("Brand is not selected.");
  if (!form.deliverables.length) arr.push("No deliverable / size selected.");
  if (!form.deadline) arr.push("Deadline is missing.");
  if (!form.requestor.trim()) arr.push("Requestor name is missing.");
  if (!form.requestDetails.trim()) arr.push("Request details are missing.");
  return arr;
}

function cleanLines(text = "") {
  return text.split(/\n+/).map((line) => line.trim().replace(/^[-•*]\s*/, "")).filter(Boolean);
}

function detectFirst(lines, regexes) {
  return lines.find((line) => regexes.some((r) => r.test(line))) || "Not provided";
}

function extractHierarchy(formInput) {
  const form = safeForm(formInput);
  const lines = cleanLines(form.requestDetails);
  const text = form.requestDetails || "";
  const titleLike = form.title || lines.find((line) => /^[A-Z0-9\s!?,.'-]{6,}$/.test(line) && line.length < 60) || "Not provided";
  const mechanic = detectFirst(lines, [/deposit/i, /register/i, /scan/i, /purchase/i, /spend/i, /get/i, /join/i, /download/i, /visit/i]);
  const rewards = lines.filter((line) => /bonus|free|meal|food|merch|raffle|prize|voucher|reward|cash|₱|php|peso/i.test(line));
  const cta = detectFirst(lines, [/register now/i, /join now/i, /play now/i, /visit/i, /scan/i, /learn more/i, /claim/i, /download/i]);
  const date = detectFirst(lines, [/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, /\d{1,2}[/-]\d{1,2}/, /\d{4}-\d{2}-\d{2}/, /\b(am|pm)\b/i]);
  const location = detectFirst(lines, [/location/i, /venue/i, /branch/i, /outlet/i, /barangay/i, /mall/i, /front of/i, /at\s+/i]);
  const requiredSmallText = lines.filter((line) => /pagcor|responsible|terms|conditions|t&c|permit|approval|valid until/i.test(line));

  return {
    mainMessage: titleLike,
    mechanic,
    rewards: rewards.length ? rewards : ["Not provided"],
    cta,
    date: date !== "Not provided" ? date : form.deadline ? `Deadline / needed by: ${form.deadline}` : "Not provided",
    location,
    requiredSmallText: requiredSmallText.length ? requiredSmallText : ["Not provided"],
    rawNotes: text.trim() || "Not provided",
  };
}

function inferAssets(formInput) {
  const form = safeForm(formInput);
  const text = `${form.title} ${form.requestDetails}`.toLowerCase();
  if (/summer|beach|sea|ocean|sand|sun/i.test(text)) return ["beach ball", "starfish", "seashells", "donut floater", "towel", "icebox", "sun flare", "warm wave highlights"];
  if (/logo|brand identity|mark/i.test(text)) return ["simple symbol exploration", "wordmark lockup", "icon-only mark", "clear negative space"];
  if (/raffle|prize|reward|bonus|voucher/i.test(text)) return ["glowing reward cluster", "voucher cards", "gift/prize highlight", "subtle burst accents"];
  if (/tutorial|register|how to|steps/i.test(text)) return ["phone UI placeholder", "step cards", "pointer arrows", "clean instruction panels"];
  return ["hero focal object", "supporting graphic accents", "clean CTA area", "subtle depth / glow"];
}

function generateAi(formInput, brandProfiles) {
  const form = safeForm(formInput);
  const brand = getBrand(brandProfiles, form.brandId);
  const hierarchy = extractHierarchy(form);
  const missingEssentials = getMissing(form);
  const title = form.title || hierarchy.mainMessage || "Untitled Request";
  const deliverableText = form.deliverables.length ? form.deliverables.map(formatDeliverable).join(", ") : "requested deliverables";
  const text = `${title} ${form.requestDetails}`.toLowerCase();
  const isLogo = form.deliverables.some((d) => /logo/i.test(d.label));
  const isSummer = /summer|beach|sea|ocean|sand|sun/i.test(text);
  const isHowTo = /tutorial|register|how to|steps/i.test(text);
  const assets = inferAssets(form);
  const hasRefs = form.files.length > 0 || form.referenceLinks.trim();
  const refTags = form.referenceTags.length ? form.referenceTags.join(", ") : "mood, color, layout, and style cues";

  const brief = isLogo
    ? `Create a logo / identity direction for "${title}" under ${brand.name}. Focus on a scalable mark system rather than a finished layout.`
    : `Create a ${form.outputMode.toLowerCase()} creative package for "${title}" under ${brand.name}. Build one clear campaign system that can adapt across: ${deliverableText}.`;

  const mood = isLogo
    ? "Clean, scalable, recognizable brand foundation."
    : isSummer
      ? "Energetic summer promo with warm, reward-driven excitement."
      : isHowTo
        ? "Clear instructional material with friendly, simple step-by-step energy."
        : "Direct, promotional, easy-to-scan campaign system.";

  const colorBalance = brand.name === "LakiWin"
    ? isSummer
      ? "70% warm red-orange / sunset gradient, 20% LakiWin yellow as brand anchor, 10% black and white for contrast/readability."
      : "60% LakiWin yellow, 25% white/black structure, 15% controlled warm orange or gold highlights."
    : brand.name === "VikingFunLand"
      ? "55% warm gold/yellow token tones, 25% deep navy/charcoal, 15% icy blue accents, 5% white highlights."
      : "Use the brand's primary color as the anchor, then borrow supporting mood colors from uploaded references without diluting brand recognition.";

  const coreIdea = isLogo
    ? "Define one clear symbol logic first, then test it as icon-only, wordmark, and combined lockup."
    : isHowTo
      ? "Turn the message into a readable visual guide: one strong headline, simple step cards, and a clear CTA path."
      : /raffle|prize|reward|bonus|voucher|deposit/i.test(text)
        ? "Build the KV around a reward moment: the offer or perk cluster should feel like the visual payoff."
        : "Use one dominant focal idea and make all supporting graphics point toward it.";

  const composition = isLogo
    ? "Center the mark exploration with generous negative space. Avoid effects until the base form works in black and white."
    : "Keep one focal cluster slightly off-center, reserve a clean headline / CTA zone, and make sure the composition can crop across the chosen deliverables.";

  const referenceInfluence = hasRefs
    ? `Use uploaded references as visual influence for ${refTags}. Extract dominant palette, lighting mood, composition cues, and reusable visual motifs, but keep ${brand.name}'s brand profile as the anchor.`
    : "No reference images attached. Base the reference prompt on request details and the selected brand profile.";

  const hierarchyMissing = [];
  if (hierarchy.cta === "Not provided") hierarchyMissing.push("Final CTA is not provided.");
  if (hierarchy.location === "Not provided") hierarchyMissing.push("Location / placement is not provided.");
  if (hierarchy.date === "Not provided") hierarchyMissing.push("Date / schedule is not provided.");

  const missing = [...missingEssentials, ...hierarchyMissing].filter((item, index, arr) => arr.indexOf(item) === index);
  const guardrails = [brand.dos, brand.donts, brand.compliance].filter(Boolean);
  const executionNotes = isLogo
    ? ["Test the mark at small sizes before adding detail.", "Prepare icon-only, horizontal, and stacked lockup thinking.", "Keep the first pass focused on form, not effects."]
    : ["Keep the main message readable within 2 seconds.", "Use one campaign system first, then adapt per size.", "Do not add decorative elements if they compete with hierarchy."];

  const visualReferencePrompt = `Generate a visual reference image for a designer, not a final artwork.

Project: ${title}
Brand: ${brand.name}
Output type: ${form.outputMode}
Deliverables: ${deliverableText}

Brief: ${brief}

Detected request structure:
- Main message: ${hierarchy.mainMessage}
- Mechanic: ${hierarchy.mechanic}
- Rewards / benefits: ${hierarchy.rewards.join("; ")}
- CTA: ${hierarchy.cta}
- Date / schedule: ${hierarchy.date}
- Location: ${hierarchy.location}

Visual direction:
- Mood: ${mood}
- Color balance: ${colorBalance}
- Core idea: ${coreIdea}
- Suggested imagery: ${assets.join(", ")}
- Composition: ${composition}

Reference influence:
${referenceInfluence}

Brand guardrails:
- ${guardrails.join("\n- ")}

Important: this is for reference only. Do not create final artwork. Do not create tiny text. Do not overfill the layout. Leave room for designers to add final copy, logos, compliance marks, and production polish.`;

  return {
    brief,
    hierarchy,
    missing: missing.length ? missing : ["No major gaps detected. Final approval and compliance check still required."],
    visualDirection: { mood, colorBalance, coreIdea, suggestedImagery: assets, composition, referenceInfluence, guardrails },
    executionNotes,
    visualReferencePrompt,
  };
}

function createSamples(brandProfiles) {
  const sample1 = {
    title: "LakiSummer Materials",
    brandId: "brand-lakiwin",
    outputMode: "Static",
    deliverables: [DELIVERABLE_PRESETS[0], DELIVERABLE_PRESETS[4], DELIVERABLE_PRESETS[6]],
    requestDetails: `Todo Laki Summer

Deposit ₱50 to get:
- ₱50 bonus
- Food pack
- LakiWin merchandise
- Raffle prizes up to ₱50,000

Beach / summer vibe. Make it bright, fun, and reward-focused.`,
    deadline: todayPlus(2),
    requestor: "ABM",
    referenceLinks: "",
    referenceTags: ["Mood", "Color"],
    files: [{ id: uid("FILE"), name: "summer-moodboard.jpg", size: 928000, tag: "Mood" }],
  };
  const sample2 = {
    title: "How to Register Tutorial Video",
    brandId: "brand-lakiwin",
    outputMode: "Motion",
    deliverables: [DELIVERABLE_PRESETS[2]],
    requestDetails: "Create a simple tutorial direction for registration. Needs to feel clean, trustworthy, and easy to follow.",
    deadline: todayPlus(6),
    requestor: "Claire",
    referenceLinks: "",
    referenceTags: ["Layout", "Style"],
    files: [],
  };
  return [
    { id: uid(), createdAt: new Date().toISOString(), status: "Submitted", form: sample1, ai: generateAi(sample1, brandProfiles), comments: [{ id: uid("COM"), author: "Designer", text: "Please confirm if raffle prize is approved for this layout.", resolved: false, createdAt: new Date().toISOString() }], generatedReference: null },
    { id: uid(), createdAt: new Date().toISOString(), status: "In Progress", form: sample2, ai: generateAi(sample2, brandProfiles), comments: [], generatedReference: null },
  ];
}

function saveState(payload) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
}

function loadState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}

function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function Pill({ children, tone = "gray" }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function Card({ title, children, right }) {
  return <div className="card"><div className="card-head"><h3>{title}</h3>{right}</div><div className="card-body">{children}</div></div>;
}

function HierarchyBlock({ hierarchy }) {
  const h = hierarchy || extractHierarchy({});
  return <div className="hierarchy-grid">
    <div className="hierarchy-row"><strong>Main message / title</strong>{h.mainMessage}</div>
    <div className="hierarchy-row"><strong>Mechanic</strong>{h.mechanic}</div>
    <div className="hierarchy-row"><strong>Rewards / benefits</strong>{h.rewards?.join("; ")}</div>
    <div className="hierarchy-row"><strong>CTA</strong>{h.cta}</div>
    <div className="hierarchy-row"><strong>Date / schedule</strong>{h.date}</div>
    <div className="hierarchy-row"><strong>Location / branch</strong>{h.location}</div>
    <div className="hierarchy-row"><strong>Required small text</strong>{h.requiredSmallText?.join("; ")}</div>
  </div>;
}

function VisualDirectionBlock({ visualDirection, compact = false }) {
  const vd = visualDirection || {};
  return <div className="kv-stack">
    <div className="kv-item"><strong>Mood</strong><p>{vd.mood}</p></div>
    <div className="kv-item"><strong>Color Balance</strong><p>{vd.colorBalance}</p></div>
    <div className="kv-item"><strong>Core Idea</strong><p>{vd.coreIdea}</p></div>
    <div className="kv-item"><strong>Imagery</strong><p>{(vd.suggestedImagery || []).map((x) => <Pill key={x}>{x}</Pill>)}</p></div>
    {!compact && <div className="kv-item"><strong>Composition</strong><p>{vd.composition}</p></div>}
    {!compact && <div className="kv-item"><strong>Reference Influence</strong><p>{vd.referenceInfluence}</p></div>}
    {!compact && <div className="kv-item"><strong>Brand Guardrails</strong><div>{(vd.guardrails || []).map((g) => <div className="note" key={g}>{g}</div>)}</div></div>}
  </div>;
}

export default function CreativeRequestBuilderPrototype() {
  const boot = useMemo(() => loadState(), []);
  const initialBrands = boot.brandProfiles?.length ? boot.brandProfiles : DEFAULT_BRAND_PROFILES;
  const [brandProfiles, setBrandProfiles] = useState(initialBrands);
  const [requests, setRequests] = useState(boot.requests?.length ? boot.requests.map((r) => ({ ...r, form: safeForm(r.form), ai: r.ai || generateAi(safeForm(r.form), initialBrands), comments: r.comments || [] })) : createSamples(initialBrands));
  const [view, setView] = useState("dashboard");
  const [form, setForm] = useState(blankForm);
  const [ai, setAi] = useState(null);
  const [deliverableQuery, setDeliverableQuery] = useState("");
  const [customDeliverable, setCustomDeliverable] = useState(blankCustomDeliverable);
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "", output: "", brandId: "" });
  const [commentText, setCommentText] = useState("");
  const [brandDraft, setBrandDraft] = useState(null);
  const [visualPromptDraft, setVisualPromptDraft] = useState("");
  const [promptExpanded, setPromptExpanded] = useState(false);

  useEffect(() => saveState({ requests, brandProfiles }), [requests, brandProfiles]);

  const selected = requests.find((r) => r.id === selectedId) || null;

  useEffect(() => {
    if (selected) {
      setVisualPromptDraft(selected.ai?.visualReferencePrompt || "");
      setPromptExpanded(false);
    }
  }, [selectedId, selected?.ai?.visualReferencePrompt]);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const currentBrand = getBrand(brandProfiles, form.brandId);
  const missing = getMissing(form);
  const priority = priorityFromDate(form.deadline);

  const deliverableSuggestions = useMemo(() => {
    const q = deliverableQuery.trim().toLowerCase();
    if (!q) return [];
    return DELIVERABLE_PRESETS.filter((d) => `${d.label} ${d.group} ${formatDeliverable(d)}`.toLowerCase().includes(q)).slice(0, 7);
  }, [deliverableQuery]);

  function resetBuilder() {
    setForm(blankForm);
    setAi(null);
    setDeliverableQuery("");
    setCustomDeliverable(blankCustomDeliverable);
    setView("builder");
  }

  function addDeliverable(d) {
    if (form.deliverables.some((x) => formatDeliverable(x) === formatDeliverable(d) || x.id === d.id)) return;
    updateForm("deliverables", [...form.deliverables, { ...d, id: d.id || uid("DEL") }]);
    setDeliverableQuery("");
  }

  function removeDeliverable(id) {
    updateForm("deliverables", form.deliverables.filter((d) => d.id !== id));
  }

  function addCustomDeliverable() {
    const needsSize = customDeliverable.unit !== "N/A";
    if (!customDeliverable.label.trim() || (needsSize && (!customDeliverable.width.trim() || !customDeliverable.height.trim()))) return;
    addDeliverable({ ...customDeliverable, id: uid("CUSTOM"), label: customDeliverable.label.trim(), group: "Custom" });
    setCustomDeliverable(blankCustomDeliverable);
  }

  function toggleReferenceTag(tag) {
    const next = form.referenceTags.includes(tag) ? form.referenceTags.filter((x) => x !== tag) : [...form.referenceTags, tag];
    updateForm("referenceTags", next);
  }

  function handleFiles(files) {
    const list = Array.from(files || []).map((f) => ({ id: uid("FILE"), name: f.name, size: f.size, type: f.type || "file" }));
    updateForm("files", [...form.files, ...list]);
  }

  function generate() {
    setAi(generateAi(form, brandProfiles));
  }

  function submitRequest() {
    const output = ai || generateAi(form, brandProfiles);
    const record = { id: uid(), createdAt: new Date().toISOString(), status: "Submitted", form: safeForm(form), ai: output, comments: [], generatedReference: null };
    setRequests([record, ...requests]);
    setSelectedId(record.id);
    setView("detail");
  }

  function updateRequest(id, updater) {
    setRequests((prev) => prev.map((r) => r.id === id ? updater(r) : r));
  }

  function openRequest(id) {
    setSelectedId(id);
    setView("detail");
  }

  function deleteSelected() {
    if (!selected) return;
    if (window.confirm("Delete request?")) {
      setRequests(requests.filter((r) => r.id !== selected.id));
      setSelectedId(null);
      setView("dashboard");
    }
  }

  const filteredRequests = requests.filter((r) => {
    const formData = safeForm(r.form);
    const q = filters.search.trim().toLowerCase();
    const brand = getBrand(brandProfiles, formData.brandId);
    const matchesSearch = !q || `${formData.title} ${formData.requestor} ${brand.name}`.toLowerCase().includes(q);
    const matchesStatus = !filters.status || r.status === filters.status;
    const matchesOutput = !filters.output || formData.outputMode === filters.output;
    const matchesBrand = !filters.brandId || formData.brandId === filters.brandId;
    return matchesSearch && matchesStatus && matchesOutput && matchesBrand;
  });

  const stats = {
    total: requests.length,
    urgent: requests.filter((r) => priorityFromDate(safeForm(r.form).deadline).label === "Urgent").length,
    needs: requests.filter((r) => (r.ai?.missing || []).some((m) => !/No major gaps/i.test(m))).length,
    progress: requests.filter((r) => r.status === "In Progress").length,
  };

  function navItem(id, label, icon) {
    return <button className={`side-item ${view === id ? "active" : ""}`} onClick={() => setView(id)}><span>{icon}</span>{label}</button>;
  }

  function renderTopbar() {
    return <div className="topbar">
      <div className="brand-lockup"><div className="logo">CR</div><div><strong>Creative Request Builder</strong><div className="tiny">AI-assisted creative intake</div></div></div>
      <button className="workspace">MT WorkSpace⌄</button>
      <div className="top-actions"><input className="global-search" placeholder="Search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /><button className="btn secondary">Sort by⌄</button><button className="btn purple" onClick={resetBuilder}>+ Create</button></div>
    </div>;
  }

  function renderSidebar() {
    return <aside className="sidebar">
      {navItem("dashboard", "Dashboard", "▦")}
      {navItem("notifications", "Notification", "◉")}
      {navItem("notes", "Notes", "≡")}
      {navItem("dashboard", "Tasks", "□")}
      <div className="side-section">Settings</div>
      {navItem("brands", "Brand Profiles", "◇")}
      {navItem("integrations", "Integrations", "⚙")}
      {navItem("help", "Help", "?")}
    </aside>;
  }

  function renderDashboard() {
    return <div className="main-inner">
      <div className="page-head"><div><h1>Tasks</h1><p className="muted">Trello-style designer-side request queue.</p></div><div className="tabs"><button className="tab active">Kanban</button><button className="tab">List</button><button className="tab">Grid</button></div></div>
      <div className="stat-row">
        <div className="stat-card"><strong>{stats.total}</strong><span className="tiny">Total requests</span></div>
        <div className="stat-card"><strong>{stats.urgent}</strong><span className="tiny">Urgent</span></div>
        <div className="stat-card"><strong>{stats.needs}</strong><span className="tiny">Needs info</span></div>
        <div className="stat-card"><strong>{stats.progress}</strong><span className="tiny">In progress</span></div>
      </div>
      <div className="filters">
        <input placeholder="Search title, requestor, or brand..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s.key}>{s.key}</option>)}</select>
        <select value={filters.output} onChange={(e) => setFilters({ ...filters, output: e.target.value })}><option value="">All outputs</option><option>Static</option><option>Motion</option></select>
        <select value={filters.brandId} onChange={(e) => setFilters({ ...filters, brandId: e.target.value })}><option value="">All brands</option>{brandProfiles.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      </div>
      <div className="board-wrap"><div className="board">
        {STATUSES.map((status) => {
          const items = filteredRequests.filter((r) => r.status === status.key);
          return <section className="column" key={status.key}>
            <div className="column-head"><div><div className="column-title"><span className="dot" style={{ background: status.color }} />{status.title}</div><div className="tiny">{items.length} open task{items.length === 1 ? "" : "s"}</div></div></div>
            <button className="add-task" onClick={resetBuilder}>+ Add Task</button>
            {items.map((r) => {
              const formData = safeForm(r.form);
              const brand = getBrand(brandProfiles, formData.brandId);
              const pri = priorityFromDate(formData.deadline);
              const needs = (r.ai?.missing || []).some((m) => !/No major gaps/i.test(m));
              return <article className="task-card" key={r.id} onClick={() => openRequest(r.id)}>
                <div className="task-top"><div className="task-tags"><Pill tone="purple">{brand.name}</Pill><Pill tone="blue">{formData.outputMode}</Pill>{pri.label !== "Normal" && <Pill tone={pri.cls}>{pri.label}</Pill>}{needs && <Pill tone="yellow">Needs info</Pill>}</div><span className="tiny">•••</span></div>
                <div className="task-title">{formData.title || "Untitled request"}</div>
                <div className="task-brief">{r.ai?.brief || "No AI brief yet."}</div>
                <div className="task-footer"><div className="task-meta"><span className="avatar">{initials(formData.requestor)}</span><span>Due {formatDate(formData.deadline)}</span><span>{formData.deliverables.length} size{formData.deliverables.length === 1 ? "" : "s"}</span></div><div className="task-meta"><span>💬 {r.comments?.length || 0}</span><span>📎 {formData.files.length}</span></div></div>
              </article>;
            })}
          </section>;
        })}
      </div></div>
    </div>;
  }

  function renderBuilderReviewPanel() {
    if (!ai) {
      return <aside className="sticky-panel"><div className="card"><div className="card-head"><h3>Request Review</h3><Pill tone={priority.cls}>{priority.label}</Pill></div><div className="card-body">
        <h2 style={{ marginBottom: 8 }}>{form.title || "Untitled request"}</h2>
        <p className="tiny" style={{ marginTop: 0 }}>{currentBrand.name} · {form.outputMode} · {form.deliverables.length} deliverable{form.deliverables.length === 1 ? "" : "s"}</p>
        <hr style={{ border: 0, borderTop: "1px solid #f0f0f5", margin: "14px 0" }} />
        <h3 style={{ marginBottom: 10 }}>Missing essentials</h3>
        {missing.length ? missing.map((m) => <div className="note warn" key={m}>{m}</div>) : <div className="note good">Enough details to generate AI review.</div>}
        <button className="btn purple full" onClick={generate} style={{ marginTop: 10 }}>Generate AI Brief + KV Direction</button>
        <button className="btn full" disabled style={{ marginTop: 8 }}>Submit after AI review</button>
      </div></div></aside>;
    }

    return <aside className="sticky-panel"><div className="card"><div className="card-head"><h3>AI Review</h3><Pill tone="purple">Preview</Pill></div><div className="card-body">
      <h3>AI Brief</h3><p className="brief-text" style={{ fontSize: 13 }}>{ai.brief}</p>
      <h3 style={{ marginTop: 16, marginBottom: 10 }}>Detected request hierarchy</h3><HierarchyBlock hierarchy={ai.hierarchy} />
      <h3 style={{ marginTop: 16, marginBottom: 10 }}>Missing info</h3>{ai.missing.map((m) => <div className={/No major gaps/i.test(m) ? "note good" : "note warn"} key={m}>{m}</div>)}
      <h3 style={{ marginTop: 16, marginBottom: 10 }}>Visual Direction</h3><VisualDirectionBlock visualDirection={ai.visualDirection} compact />
      <div className="inline-actions" style={{ marginTop: 18 }}><button className="btn secondary" onClick={generate}>Regenerate</button><button className="btn purple" onClick={submitRequest}>Submit to Tasks</button></div>
    </div></div></aside>;
  }

  function renderBuilder() {
    return <div className="main-inner">
      <div className="page-head"><div><h1>Create Request</h1><p className="muted">Fast intake first. AI organizes the messy details after.</p></div><button className="btn secondary" onClick={() => setView("dashboard")}>Back to Tasks</button></div>
      <div className="builder-layout">
        <main className="builder-main">
          <Card title="Project basics">
            <div className="row"><Field label="Project title"><input value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="Example: Todo Laki Summer" /></Field><Field label="Brand"><select value={form.brandId} onChange={(e) => updateForm("brandId", e.target.value)}>{brandProfiles.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field></div>
            <Field label="Static or Motion?"><div className="segmented">{[
              { key: "Static", helper: "Posters, banners, images" },
              { key: "Motion", helper: "Videos, reels, animations" },
            ].map((m) => <button key={m.key} className={`segment ${form.outputMode === m.key ? "active" : ""}`} onClick={() => updateForm("outputMode", m.key)}><strong>{m.key}</strong><span className="tiny">{m.helper}</span></button>)}</div></Field>
          </Card>

          <Card title="What size/s do you need?">
            <Field label="Search preset sizes"><input value={deliverableQuery} onChange={(e) => setDeliverableQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && deliverableSuggestions[0]) { e.preventDefault(); addDeliverable(deliverableSuggestions[0]); } }} placeholder="Type Socia, A4, Pull-up, Logo..." />
              {!!deliverableSuggestions.length && <div className="suggestions">{deliverableSuggestions.map((d) => <button className="suggestion" key={d.id} onClick={() => addDeliverable(d)}><span><strong>{d.label}</strong><br /><span className="tiny">{d.group}</span></span><span className="tiny">{formatDeliverable(d).replace(`${d.label} — `, "")}</span></button>)}</div>}
            </Field>
            <div className="deliverable-list">{form.deliverables.length ? form.deliverables.map((d) => <div className="list-item" key={d.id}><div><strong>{formatDeliverable(d)}</strong><div className="tiny">{d.group || "Custom"}</div></div><button className="btn ghost" onClick={() => removeDeliverable(d.id)}>Remove</button></div>) : <div className="note">No deliverables yet. Search a preset or add a custom size.</div>}</div>
            <div className="custom-box"><h3 style={{ marginBottom: 10 }}>Add custom size</h3><Field label="Deliverable name / purpose"><input value={customDeliverable.label} onChange={(e) => setCustomDeliverable({ ...customDeliverable, label: e.target.value })} placeholder="Example: Tarpaulin, LED Screen, Kiosk Banner" /></Field><div className="three-row"><Field label="Width"><input value={customDeliverable.width} onChange={(e) => setCustomDeliverable({ ...customDeliverable, width: e.target.value })} placeholder="2.75" /></Field><Field label="Height"><input value={customDeliverable.height} onChange={(e) => setCustomDeliverable({ ...customDeliverable, height: e.target.value })} placeholder="6.5" /></Field><Field label="Unit"><select value={customDeliverable.unit} onChange={(e) => setCustomDeliverable({ ...customDeliverable, unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}<option>N/A</option></select></Field></div><button className="btn secondary" onClick={addCustomDeliverable}>+ Add Custom Deliverable</button></div>
          </Card>

          <Card title="Request details">
            <p className="tiny" style={{ marginTop: 0 }}>Paste the request exactly how you would normally send it. Messy or incomplete is okay — AI will organize it after.</p>
            <textarea value={form.requestDetails} onChange={(e) => updateForm("requestDetails", e.target.value)} style={{ minHeight: 156 }} placeholder={`Example:\nTodo Laki Summer poster\n\nDeposit ₱50 to get:\n- ₱50 bonus\n- Food pack\n- LakiWin merchandise\n- Raffle prizes up to ₱50,000\n\nBeach / summer vibe`} />
          </Card>

          <Card title="Visual references / moodboard" right={<Pill tone="gray">Optional</Pill>}>
            <p className="tiny" style={{ marginTop: 0 }}>Upload pegs, moodboards, or reference images. Optional tags help AI understand what to borrow.</p>
            <Field label="Reference links"><textarea value={form.referenceLinks} onChange={(e) => updateForm("referenceLinks", e.target.value)} placeholder="Paste Drive, Pinterest, Behance, or sample links here." /></Field>
            <Field label="Reference tags"><div>{REFERENCE_TAGS.map((tag) => <button key={tag} type="button" className={`pill ${form.referenceTags.includes(tag) ? "purple" : "gray"}`} onClick={() => toggleReferenceTag(tag)}>{tag}</button>)}</div></Field>
            <Field label="Attach reference images"><input type="file" multiple accept="image/*" onChange={(e) => handleFiles(e.target.files)} /><div className="ref-grid">{form.files.map((f) => <div className="ref-chip" key={f.id}><strong>{f.name}</strong><div className="tiny">{Math.round((f.size || 0) / 1024)} KB</div></div>)}</div></Field>
          </Card>

          <Card title="Deadline and requestor">
            <div className="row"><Field label="Date needed"><input type="date" value={form.deadline} onChange={(e) => updateForm("deadline", e.target.value)} /></Field><Field label="Requested by"><input value={form.requestor} onChange={(e) => updateForm("requestor", e.target.value)} placeholder="Name / team" /></Field></div>
          </Card>
        </main>
        {renderBuilderReviewPanel()}
      </div>
    </div>;
  }

  function renderPromptSection() {
    if (!selected) return null;
    function copyPrompt() {
      navigator.clipboard?.writeText(visualPromptDraft);
    }
    function generateReference() {
      updateRequest(selected.id, (r) => ({ ...r, generatedReference: { createdAt: new Date().toISOString(), promptPreview: truncate(visualPromptDraft, 220) } }));
    }
    return <div className="read-card">
      <div className="inline-actions" style={{ justifyContent: "space-between", marginBottom: 12 }}><div><h3>AI Visual Reference Prompt</h3><p className="tiny" style={{ margin: "4px 0 0" }}>Reference image only — not final artwork.</p></div><Pill tone="purple">Reference only</Pill></div>
      {!promptExpanded ? <div className="prompt-preview">{visualPromptDraft}</div> : <textarea className="prompt-textarea" value={visualPromptDraft} onChange={(e) => setVisualPromptDraft(e.target.value)} />}
      <div className="inline-actions" style={{ marginTop: 12 }}><button className="btn secondary" onClick={() => setPromptExpanded(!promptExpanded)}>{promptExpanded ? "Hide Prompt" : "Show/Edit Prompt"}</button><button className="btn secondary" onClick={copyPrompt}>Copy Prompt</button><button className="btn purple" onClick={generateReference}>Generate Reference Image</button></div>
      {selected.generatedReference && <div className="note purple" style={{ marginTop: 12 }}>Reference generation prepared: {selected.generatedReference.promptPreview}</div>}
    </div>;
  }

  function renderDetailPanel() {
    if (!selected) return null;
    const formData = safeForm(selected.form);
    const aiData = selected.ai || generateAi(formData, brandProfiles);
    const unresolved = (selected.comments || []).filter((c) => !c.resolved);
    function postComment() {
      if (!commentText.trim()) return;
      updateRequest(selected.id, (r) => ({ ...r, comments: [...(r.comments || []), { id: uid("COM"), author: "You", text: commentText.trim(), resolved: false, createdAt: new Date().toISOString() }] }));
      setCommentText("");
    }
    return <aside className="sticky-panel"><div className="card"><div className="card-head"><h3>Task Panel</h3><Pill tone={priorityFromDate(formData.deadline).cls}>{priorityFromDate(formData.deadline).label}</Pill></div><div className="card-body">
      <Field label="Status"><select value={selected.status} onChange={(e) => updateRequest(selected.id, (r) => ({ ...r, status: e.target.value }))}>{STATUSES.map((s) => <option key={s.key}>{s.key}</option>)}</select></Field>
      <h3 style={{ margin: "14px 0 8px" }}>Deliverables</h3>{formData.deliverables.length ? formData.deliverables.map((d) => <div className="note" key={d.id}>{formatDeliverable(d)}</div>) : <div className="note warn">No deliverables selected.</div>}
      <h3 style={{ margin: "16px 0 8px" }}>Missing Info</h3>{aiData.missing.map((m) => <div className={/No major gaps/i.test(m) ? "note good" : "note warn"} key={m}>{m}</div>)}
      <h3 style={{ margin: "16px 0 8px" }}>Comments / Clarifications</h3>
      <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment or clarification..." style={{ minHeight: 78 }} />
      <button className="btn secondary full" onClick={postComment} style={{ marginTop: 8 }}>Post Comment</button>
      <div style={{ marginTop: 12 }}>{(selected.comments || []).map((c) => <div className={`comment ${c.resolved ? "resolved" : ""}`} key={c.id}><strong>{c.author}</strong><p style={{ margin: "5px 0 8px" }}>{c.text}</p>{c.resolved ? <Pill tone="green">Resolved</Pill> : <button className="btn secondary" onClick={() => updateRequest(selected.id, (r) => ({ ...r, comments: (r.comments || []).map((x) => x.id === c.id ? { ...x, resolved: true } : x) }))}>Resolve</button>}</div>)}</div>
      <hr style={{ border: 0, borderTop: "1px solid #f0f0f5", margin: "16px 0" }} />
      {unresolved.length ? <div className="note warn">{unresolved.length} unresolved clarification{unresolved.length === 1 ? "" : "s"}.</div> : <div className="note good">All clarifications resolved.</div>}
      <button className="btn danger full" onClick={deleteSelected}>Delete Request</button>
    </div></div></aside>;
  }

  function renderDetail() {
    if (!selected) return <div className="main-inner"><div className="note warn">No request selected.</div></div>;
    const formData = safeForm(selected.form);
    const brand = getBrand(brandProfiles, formData.brandId);
    const aiData = selected.ai || generateAi(formData, brandProfiles);
    return <div className="main-inner">
      <div className="page-head"><div><button className="btn secondary" onClick={() => setView("dashboard")}>← Back to Tasks</button><h1 style={{ marginTop: 14 }}>{formData.title || "Untitled request"}</h1><p className="muted">{brand.name} · {formData.outputMode} · Due {formatDate(formData.deadline)} · Requested by {formData.requestor || "—"}</p></div></div>
      <div className="details-layout">
        <main className="detail-main">
          <div className="read-card"><h3>AI Brief</h3><p className="brief-text">{aiData.brief}</p></div>
          <div className="read-card"><h3>Detected Request Hierarchy</h3><HierarchyBlock hierarchy={aiData.hierarchy} /></div>
          <div className="read-card"><h3>Visual Direction (KV)</h3><VisualDirectionBlock visualDirection={aiData.visualDirection} /></div>
          {renderPromptSection()}
          <div className="read-card"><h3>Request Details</h3><p className="brief-text" style={{ whiteSpace: "pre-wrap" }}>{formData.requestDetails || "No request details provided."}</p></div>
          <details><summary>References / Attachments</summary><div>{formData.referenceLinks && <p className="brief-text" style={{ whiteSpace: "pre-wrap" }}>{formData.referenceLinks}</p>}<div>{formData.referenceTags.map((tag) => <Pill key={tag} tone="purple">{tag}</Pill>)}</div><div className="ref-grid">{formData.files.map((f) => <div className="ref-chip" key={f.id || f.name}><strong>{f.name}</strong><div className="tiny">{Math.round((f.size || 0) / 1024)} KB</div></div>)}</div>{!formData.referenceLinks && !formData.files.length && <div className="note">No references attached.</div>}</div></details>
        </main>
        {renderDetailPanel()}
      </div>
    </div>;
  }

  function newBrandDraft() {
    setBrandDraft({ id: uid("BRAND"), name: "New Brand", description: "", tone: "", colors: "", typography: "", motifs: "", dos: "", donts: "", compliance: "", aiNotes: "" });
  }

  function saveBrandDraft() {
    if (!brandDraft?.name?.trim()) return;
    setBrandProfiles((prev) => prev.some((b) => b.id === brandDraft.id) ? prev.map((b) => b.id === brandDraft.id ? brandDraft : b) : [...prev, brandDraft]);
  }

  function deleteBrand(id) {
    if (brandProfiles.length <= 1) return;
    if (window.confirm("Delete this brand profile?")) {
      setBrandProfiles(brandProfiles.filter((b) => b.id !== id));
      if (brandDraft?.id === id) setBrandDraft(null);
    }
  }

  function renderBrands() {
    const draft = brandDraft || brandProfiles[0];
    return <div className="main-inner"><div className="page-head"><div><h1>Brand Profiles</h1><p className="muted">Admin area for adding, editing, and deleting brand guidelines used by AI.</p></div><button className="btn purple" onClick={newBrandDraft}>+ Add Brand Profile</button></div>
      <div className="brand-grid"><aside className="brand-list">{brandProfiles.map((b) => <button key={b.id} className={`brand-row ${draft?.id === b.id ? "active" : ""}`} onClick={() => setBrandDraft({ ...b })}><strong>{b.name}</strong><div className="tiny">{truncate(b.description, 70)}</div></button>)}</aside>
      <main className="card"><div className="card-head"><h3>Edit Brand Guidelines</h3><div className="inline-actions"><button className="btn secondary" onClick={saveBrandDraft}>Save / Update</button><button className="btn danger" onClick={() => deleteBrand(draft.id)}>Delete</button></div></div><div className="card-body">
        {[
          ["name", "Brand name"], ["description", "Brand description"], ["tone", "Tone / personality"], ["colors", "Colors"], ["typography", "Typography"], ["motifs", "Visual motifs"], ["dos", "Do's"], ["donts", "Don'ts"], ["compliance", "Compliance notes"], ["aiNotes", "AI instruction notes"],
        ].map(([key, label]) => <Field label={label} key={key}>{key === "name" ? <input value={draft?.[key] || ""} onChange={(e) => setBrandDraft({ ...draft, [key]: e.target.value })} /> : <textarea value={draft?.[key] || ""} onChange={(e) => setBrandDraft({ ...draft, [key]: e.target.value })} />}</Field>)}
      </div></main></div></div>;
  }

  function renderSimplePage(title, body) {
    return <div className="main-inner"><div className="read-card"><h1>{title}</h1><p className="muted readable">{body}</p></div></div>;
  }

  return <div className="app"><style>{css}</style>{renderTopbar()}<div className="shell">{renderSidebar()}<main className="main">
    {view === "dashboard" && renderDashboard()}
    {view === "builder" && renderBuilder()}
    {view === "detail" && renderDetail()}
    {view === "brands" && renderBrands()}
    {view === "notifications" && renderSimplePage("Notifications", "Prototype placeholder for request updates, mentions, and clarification alerts.")}
    {view === "notes" && renderSimplePage("Notes", "Prototype placeholder for internal creative notes.")}
    {view === "integrations" && renderSimplePage("Integrations", "Prototype placeholder for future integrations like Drive, Slack, or image generation APIs.")}
    {view === "help" && renderSimplePage("Help", "This prototype is designed for fast request intake, AI brief reconstruction, comments, and designer-side task management.")}
  </main></div></div>;
}
