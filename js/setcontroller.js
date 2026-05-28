// Set controller: a singleton sticky bottom bar that is the hub for logging
// sets. It is driven by a registry of per-exercise "context" handles (built in
// the workout view) — the active ctx owns the data; this module is a thin view
// over it. Works for both mesocycle (recommended sets, stats) and freeform
// (open-ended) modes; sections show/hide by ctx capability. Mirrors timer.js as
// a body-appended singleton toggled with a `.show` class.
import { el } from "./ui.js";
import { config, isPerSide } from "./config.js";
import { unitLabel } from "./units.js";

const FIELD_LABEL = { weight: "Weight", reps: "Reps", rir: "RIR" };
// Default (strength) field columns. A ctx may instead supply its own field
// specs via `ctx.fields()` (used by cardio) — each spec is { key, label, unit?,
// step? }. Keeping the strength default here preserves existing behaviour.
const DEFAULT_SPECS = [
  { key: "weight", label: "Weight" },
  { key: "reps", label: "Reps" },
  { key: "rir", label: "RIR" },
];

// ── Pure value math (exported for tests) ───────────────────────────────────
export function weightStep(unit) { return unit === "kg" ? 2.5 : 5; }
export function clampField(field, n) {
  if (field === "rir") return Math.min(10, Math.max(0, n));
  return Math.max(0, n);
}
// Next string value for a field given the current value, a seed (suggested),
// and a direction. Empty + numeric seed snaps to the seed; otherwise steps.
export function nextValue(field, currentStr, seedStr, dir, unit, stepOverride) {
  if (currentStr === "" || currentStr == null) {
    const s = parseFloat(seedStr);
    if (Number.isFinite(s)) return String(clampField(field, s));
  }
  const base = parseFloat(currentStr) || 0;
  const step = stepOverride != null ? stepOverride : (field === "weight" ? weightStep(unit) : 1);
  return String(Math.round(clampField(field, base + dir * step) * 100) / 100);
}
export function remainingSets(loggedWorking, draftsWorking, target) {
  return Math.max(0, target - loggedWorking - draftsWorking);
}

// ── Singleton bar state ─────────────────────────────────────────────────────
let barEl = null;
let els = null;
let mode = "meso";
let ctxList = [];
let activeCtx = null;
let expanded = false;
let dropdownOpen = false;
let fieldsSig = "";   // signature of the currently-rendered field columns
let manualCollapse = false; // user tapped "Done"; stay collapsed across rerenders
let lastSig = "";     // signature of the registered exercise list
let onAddExercise = null; // optional "+ Add exercise" handler for the dropdown

const liveCtx = () => (activeCtx && document.contains(activeCtx.cardEl) ? activeCtx : null);

// Horizontal drag-to-scrub on a value input: slide right to increase, left to
// decrease, stepping by the field's step. A short press (below the threshold)
// is left untouched so a plain tap still focuses the input for typing. Mirrors
// the vertical scrub on the session-feedback cells, adapted for a number input.
const SCRUB_STEP_PX = 22;     // horizontal travel per step
const SCRUB_THRESHOLD = 6;    // px before a drag is recognised (tap below this)
function attachScrub(input, spec) {
  let startX = 0, startY = 0, startVal = 0, armed = false, scrubbing = false;
  const stepFor = () => (spec.step != null ? spec.step : (spec.key === "weight" ? weightStep(config.displayUnit) : 1));
  input.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const c = liveCtx(); if (!c) return;
    armed = true; scrubbing = false;
    startX = e.clientX; startY = e.clientY;
    startVal = parseFloat(c.field(spec.key));
    if (!Number.isFinite(startVal)) startVal = parseFloat(c.seedFor(spec.key)) || 0;
  });
  input.addEventListener("pointermove", (e) => {
    if (!armed) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!scrubbing) {
      // Wait for a clearly horizontal drag; until then leave focus/caret alone.
      if (Math.abs(dx) < SCRUB_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
      scrubbing = true;
      input.blur();
      try { input.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    e.preventDefault();
    const c = liveCtx(); if (!c) return;
    const steps = Math.round(dx / SCRUB_STEP_PX);
    const next = clampField(spec.key, startVal + steps * stepFor());
    const nextStr = String(Math.round(next * 100) / 100);
    c.setField(spec.key, nextStr);
    input.value = nextStr;
    syncActions(c);
  });
  const end = () => { armed = false; scrubbing = false; };
  input.addEventListener("pointerup", end);
  input.addEventListener("pointercancel", end);
}

// One labelled stepper column (label · [− input +] · unit) for a field spec
// { key, label, unit?, step? }. The weight column also carries the plate icon.
function makeField(spec) {
  const stepAttr = spec.step != null ? String(spec.step) : (spec.key === "weight" ? "0.5" : "1");
  const input = el("input", {
    type: "number", inputmode: "decimal", step: stepAttr, class: "sc-value",
    "aria-label": spec.label,
    oninput: (e) => { const c = liveCtx(); if (c) { c.setField(spec.key, e.target.value); syncActions(c); paintPanel(); } },
  });
  attachScrub(input, spec);
  const unit = el("span", { class: "sc-unit muted small" });
  const wrap = el("div", { class: "sc-field", "data-field": spec.key },
    el("span", { class: "sc-field-label" }, spec.label),
    el("div", { class: "sc-stepper" },
      mkBtn("−", `Decrease ${spec.label}`, () => bump(spec, -1)),
      input,
      mkBtn("+", `Increase ${spec.label}`, () => bump(spec, 1)),
    ),
    unit,
  );
  const fo = { wrap, input, unit, spec };
  if (spec.key === "weight") {
    // Plate-calculator shortcut under the Weight value (shown for plate-loaded
    // exercises only — the active ctx decides via `usesPlates`).
    const plateBtn = el("button", {
      type: "button", class: "btn small ghost sc-plate", title: "Plate calculator", "aria-label": "Plate calculator",
      onmousedown: pd, onclick: () => { const c = liveCtx(); if (c && c.openPlates) c.openPlates(); },
    }, plateIcon());
    wrap.append(plateBtn);
    fo.plateBtn = plateBtn;
  }
  return fo;
}

// Build the field columns for a ctx, rebuilding only when the set of fields
// changes (so typing into a stable strength row is never interrupted).
function syncFields(c) {
  const specs = c && typeof c.fields === "function" ? c.fields() : DEFAULT_SPECS;
  const sig = specs.map((s) => s.key).join("|");
  if (sig === fieldsSig && Object.keys(els.fields).length) return;
  fieldsSig = sig;
  els.fields = {};
  const cols = specs.map((spec) => { const fo = makeField(spec); els.fields[spec.key] = fo; return fo.wrap; });
  els.fieldsRow.replaceChildren(...cols);
}

function ensureBar() {
  if (barEl) return barEl;
  const prevBtn = mkBtn("⟸", "Previous exercise", () => step(-1));
  const nextBtn = mkBtn("Next ⟹", "Next exercise", () => step(1), "btn small ghost");
  const nameBtn = el("button", { type: "button", class: "btn small ghost sc-name", onmousedown: pd, onclick: toggleDropdown });
  const progressEl = el("span", { class: "sc-progress" });
  const expandBtn = mkBtn("⌃", "More info", toggleExpand);
  const dropdown = el("div", { class: "sc-dropdown" });

  // Field columns are built lazily per active ctx (see syncFields).
  const fieldsRow = el("div", { class: "sc-fields" });

  const typeBtn = el("button", { type: "button", class: "btn small ghost sc-type", onmousedown: pd, onclick: () => { const c = liveCtx(); if (c) { c.cycleType(); paint(); } } });
  const logBtn = el("button", { type: "button", class: "btn small primary sc-log", onmousedown: pd, onclick: doCommit }, "Log set");
  const addBtn = mkBtn("+ set", "Add a set", () => { const c = liveCtx(); if (c) { c.addSet(); paint(); } }, "btn small ghost");

  const panel = el("div", { class: "sc-panel" });

  els = { prevBtn, nextBtn, nameBtn, progressEl, expandBtn, dropdown, fieldsRow, fields: {}, typeBtn, logBtn, addBtn, panel };

  barEl = el("div", { class: "set-controller idle", role: "group", "aria-label": "Set controller" },
    el("div", { class: "sc-row sc-top" }, prevBtn, nameBtn, progressEl, nextBtn, expandBtn),
    dropdown,
    fieldsRow,
    el("div", { class: "sc-row sc-actions" }, typeBtn, addBtn, logBtn),
    panel,
  );
  document.body.append(barEl);
  return barEl;
}

const pd = (e) => e.preventDefault();
function mkBtn(label, title, onClick, cls = "btn icon") {
  return el("button", { type: "button", class: cls, title, "aria-label": title, onmousedown: pd, onclick: onClick }, label);
}

// Small weight-plate glyph (disc with a center hole), inherits text colour.
function plateIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = '<circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="2.4" fill="currentColor"/>';
  return svg;
}

// ── Actions ─────────────────────────────────────────────────────────────────
function bump(spec, dir) {
  const c = liveCtx();
  if (!c) return;
  c.setField(spec.key, nextValue(spec.key, c.field(spec.key), c.seedFor(spec.key), dir, config.displayUnit, spec.step));
  paint();
}
function step(dir) {
  if (!ctxList.length) return;
  let i = activeCtx ? ctxList.indexOf(activeCtx) : -1;
  // If no active context, start at first; otherwise calculate next index
  if (i === -1) {
    i = dir > 0 ? 0 : ctxList.length - 1;
  } else {
    i = Math.max(0, Math.min(ctxList.length - 1, i + dir));
  }
  const target = ctxList[i];
  if (target) setActiveExercise(target);
}
async function doCommit() {
  const c = liveCtx();
  if (!c || !c.canLog()) return;
  await c.commit();
  paint();
}
function toggleExpand() { expanded = !expanded; paint(); }
function toggleDropdown() { dropdownOpen = !dropdownOpen; paintDropdown(); }

// ── Painting ─────────────────────────────────────────────────────────────────
// Action-row + progress state that depends on the active ctx's current draft
// (canLog / set type / progress). Split out so field handlers can refresh it
// live without a full paint() — which would rewrite the input the user is
// typing into. Never touches the field inputs themselves.
function syncActions(c) {
  if (!barEl || !c) return;
  const cardio = !!c.cardio;
  const p = c.progress();
  els.progressEl.textContent = c.isEditing()
    ? c.activeLabel()
    : cardio ? (c.activeLabel ? c.activeLabel() : "")
    : (c.hasTarget ? `Set ${p.done + 1} / ${p.target}` : `Set ${p.done + 1}`);
  const typeLabel = cardio ? null : c.typeLabel();
  els.typeBtn.style.display = typeLabel ? "" : "none";
  if (typeLabel) els.typeBtn.textContent = typeLabel;
  els.logBtn.textContent = c.isEditing() ? (cardio ? "Update" : "Save") : (cardio ? "Log" : "Log set");
  els.logBtn.disabled = !c.canLog();
}

function paint() {
  if (!barEl) return;
  const c = liveCtx();
  // Expand only the active card; everything else collapses to a pill.
  for (const x of ctxList) {
    if (x.cardEl) x.cardEl.classList.toggle("exercise-active", x === activeCtx && document.contains(x.cardEl));
  }
  barEl.classList.toggle("idle", !c);
  barEl.classList.toggle("expanded", expanded && !!c);
  if (!c) {
    els.nameBtn.textContent = ctxList.length ? "Select exercise" : "Add an exercise";
    els.progressEl.textContent = "";
    for (const k in els.fields) els.fields[k].input.value = "";
    dropdownOpen = false;
    expanded = false; // reset expanded when no context
    paintDropdown();
    els.panel.replaceChildren();
    return;
  }
  const cardio = !!c.cardio;
  els.nameBtn.textContent = c.name + " ▾";
  syncActions(c);

  syncFields(c);
  for (const k in els.fields) {
    const fo = els.fields[k];
    fo.input.value = c.field(k);
    if (k === "weight") fo.unit.textContent = unitLabel() + (isPerSide(c.name) ? " /side" : "");
    else fo.unit.textContent = fo.spec.unit || "";
    if (fo.plateBtn) fo.plateBtn.style.display = c.usesPlates ? "" : "none";
  }
  // RIR only applies inside a mesocycle; hide it for freeform strength (the
  // default field set). Cardio supplies its own fields, so this never hits it.
  if (els.fields.rir && !c.fields) els.fields.rir.wrap.style.display = mode === "custom" ? "none" : "";

  els.addBtn.style.display = cardio ? "none" : "";

  paintDropdown();
  paintPanel();
}

function paintPanel() {
  const c = liveCtx();
  if (!c || !expanded) { els.panel.replaceChildren(); return; }
  const content = c.buildPanel ? c.buildPanel() : null;
  els.panel.replaceChildren(buildLegend(), content || el("div", {}));
}

function paintDropdown() {
  els.dropdown.replaceChildren();
  els.dropdown.style.display = dropdownOpen && (ctxList.length || onAddExercise) ? "" : "none";
  if (!dropdownOpen) return;
  for (const c of ctxList) {
    const p = c.progress();
    const status = c.hasTarget
      ? (p.remaining <= 0 ? "✓ done" : `${p.remaining} left`)
      : (p.done ? `${p.done} set${p.done === 1 ? "" : "s"}` : "—");
    els.dropdown.append(
      el("button", {
        type: "button",
        class: "sc-dropdown-item" + (c === activeCtx ? " active" : ""),
        onmousedown: pd,
        onclick: () => { dropdownOpen = false; setActiveExercise(c); },
      }, el("span", {}, c.name), el("span", { class: "muted small" }, status)),
    );
  }
  if (onAddExercise) {
    els.dropdown.append(
      el("button", {
        type: "button",
        class: "sc-dropdown-item sc-dropdown-add",
        onmousedown: pd,
        onclick: () => { dropdownOpen = false; paintDropdown(); onAddExercise(); },
      }, el("span", {}, "+ Add exercise")),
    );
  }
}

let legendOpen = false;
function buildLegend() {
  const head = el("div", { class: "sc-panel-head" },
    el("strong", {}, "This exercise"),
    el("button", { type: "button", class: "btn small ghost", onmousedown: pd, onclick: () => { legendOpen = !legendOpen; paintPanel(); } }, "? set types"),
  );
  if (!legendOpen) return head;
  return el("div", {}, head,
    el("div", { class: "sc-legend muted small" },
      el("div", {}, el("strong", {}, "Work"), " — normal working set (counts toward volume)"),
      el("div", {}, el("strong", {}, "Warm"), " — warm-up; excluded from volume & rest timer"),
      el("div", {}, el("strong", {}, "Drop"), " — strip weight and immediately rep again"),
      el("div", {}, el("strong", {}, "Myo"), " — myo-reps: mini-clusters near failure"),
      el("div", {}, el("strong", {}, "Fail"), " — taken to true failure (0 reps left)"),
    ),
  );
}

// ── Public API ───────────────────────────────────────────────────────────────
export function setControllerExercises(list, m, opts = {}) {
  mode = m === "custom" ? "custom" : "meso";
  ctxList = list || [];
  onAddExercise = opts.onAddExercise || null;
  ensureBar();
  if (!ctxList.length) {
    activeCtx = null;
    lastSig = "";
    manualCollapse = false;
    hideSetController();
    return;
  }
  barEl.classList.add("show");
  // A changed exercise set (added/removed) clears a manual collapse so a newly
  // added exercise can auto-focus; an unchanged list keeps the collapsed state.
  const sig = ctxList.map((c) => c.id).join("|");
  const sameList = sig === lastSig;
  lastSig = sig;
  if (!sameList) manualCollapse = false;
  // Preserve the active exercise across re-registration (ctx objects are
  // rebuilt each render but ids are stable). Only preserve if the old context
  // element is still in the document.
  const keep = activeCtx && document.contains(activeCtx.cardEl) && ctxList.find((c) => c.id === activeCtx.id);
  if (keep) { activeCtx = keep; paint(); }
  else if (manualCollapse && sameList) { activeCtx = null; paint(); }
  else setActiveExercise(firstIncomplete() || ctxList[0]);
}

// Collapse the active exercise back to a pill (the controller goes idle) and
// remember the choice so a rerender doesn't re-expand it.
export function collapseActive() {
  manualCollapse = true;
  setActiveExercise(null);
}

export function firstIncomplete() {
  return ctxList.find((c) => !c.hasTarget || c.progress().remaining > 0) || null;
}

export function setActiveExercise(ctxOrId) {
  const next = typeof ctxOrId === "string" ? ctxList.find((c) => c.id === ctxOrId) : ctxOrId;
  if (activeCtx && activeCtx !== next && activeCtx.onDeactivate) activeCtx.onDeactivate();
  // Explicitly activating an exercise clears any prior manual collapse.
  if (next) manualCollapse = false;
  activeCtx = next || null;
  ensureBar();
  if (activeCtx) barEl.classList.add("show");
  // paint() expands the new card and collapses the others; scroll only after
  // that layout is applied so the chosen exercise lands at the top.
  paint();
  if (activeCtx && document.contains(activeCtx.cardEl)) {
    const card = activeCtx.cardEl;
    requestAnimationFrame(() => card.scrollIntoView({ block: "start", behavior: "smooth" }));
  }
}

export function refreshSetController() { paint(); }

export function hideSetController() {
  if (barEl) { barEl.classList.remove("show", "expanded"); }
  expanded = false;
  dropdownOpen = false;
}
