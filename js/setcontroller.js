// Set controller: a singleton sticky bottom bar that is the hub for logging
// sets. It is driven by a registry of per-exercise "context" handles (built in
// the workout view) — the active ctx owns the data; this module is a thin view
// over it. Works for both mesocycle (recommended sets, stats) and freeform
// (open-ended) modes; sections show/hide by ctx capability. Mirrors timer.js as
// a body-appended singleton toggled with a `.show` class.
import { el } from "./ui.js";
import { config } from "./config.js";

const FIELDS = ["weight", "reps", "rir"];
const FIELD_LABEL = { weight: "Weight", reps: "Reps", rir: "RIR" };

// ── Pure value math (exported for tests) ───────────────────────────────────
export function weightStep(unit) { return unit === "kg" ? 2.5 : 5; }
export function clampField(field, n) {
  if (field === "rir") return Math.min(10, Math.max(0, n));
  return Math.max(0, n);
}
// Next string value for a field given the current value, a seed (suggested),
// and a direction. Empty + numeric seed snaps to the seed; otherwise steps.
export function nextValue(field, currentStr, seedStr, dir, unit) {
  if (currentStr === "" || currentStr == null) {
    const s = parseFloat(seedStr);
    if (Number.isFinite(s)) return String(clampField(field, s));
  }
  const base = parseFloat(currentStr) || 0;
  const step = field === "weight" ? weightStep(unit) : 1;
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
let activeField = "weight";
let expanded = false;
let dropdownOpen = false;

const liveCtx = () => (activeCtx && document.contains(activeCtx.cardEl) ? activeCtx : null);

function ensureBar() {
  if (barEl) return barEl;
  const prevBtn = mkBtn("⟸", "Previous exercise", () => step(-1));
  const nextBtn = mkBtn("Next ⟹", "Next exercise", () => step(1), "btn small ghost");
  const nameBtn = el("button", { type: "button", class: "btn small ghost sc-name", onmousedown: pd, onclick: toggleDropdown });
  const progressEl = el("span", { class: "sc-progress" });
  const expandBtn = mkBtn("⌃", "More info", toggleExpand);
  const dropdown = el("div", { class: "sc-dropdown" });

  const fieldLabel = el("span", { class: "sc-field-label" }, "Weight");
  const valueInput = el("input", {
    type: "number", inputmode: "decimal", step: "0.5", class: "sc-value",
    oninput: (e) => { const c = liveCtx(); if (c) { c.setField(activeField, e.target.value); paintPanel(); } },
  });
  const contextEl = el("span", { class: "sc-context muted small" });
  const minusBtn = mkBtn("−", "Decrease", () => bump(-1));
  const plusBtn = mkBtn("+", "Increase", () => bump(1));
  const typeBtn = el("button", { type: "button", class: "btn small ghost sc-type", onmousedown: pd, onclick: () => { const c = liveCtx(); if (c) { c.cycleType(); paint(); } } });
  const logBtn = el("button", { type: "button", class: "btn small primary sc-log", onmousedown: pd, onclick: doCommit }, "Log set");
  const addBtn = mkBtn("+ set", "Add a set", () => { const c = liveCtx(); if (c) { c.addSet(); paint(); } }, "btn small ghost");

  const panel = el("div", { class: "sc-panel" });

  els = { prevBtn, nextBtn, nameBtn, progressEl, expandBtn, dropdown, fieldLabel, valueInput, contextEl, typeBtn, logBtn, addBtn, panel };

  barEl = el("div", { class: "set-controller idle", role: "group", "aria-label": "Set controller" },
    el("div", { class: "sc-row sc-top" }, prevBtn, nameBtn, progressEl, nextBtn, expandBtn),
    dropdown,
    el("div", { class: "sc-row sc-main" },
      mkBtn("◀", "Previous field", () => moveField(-1)),
      el("div", { class: "sc-readout" }, fieldLabel, valueInput, contextEl),
      mkBtn("▶", "Next field", () => moveField(1)),
      minusBtn, plusBtn, typeBtn, addBtn, logBtn,
    ),
    panel,
  );
  document.body.append(barEl);
  return barEl;
}

const pd = (e) => e.preventDefault();
function mkBtn(label, title, onClick, cls = "btn icon") {
  return el("button", { type: "button", class: cls, title, "aria-label": title, onmousedown: pd, onclick: onClick }, label);
}

// ── Actions ─────────────────────────────────────────────────────────────────
function bump(dir) {
  const c = liveCtx();
  if (!c) return;
  c.setField(activeField, nextValue(activeField, c.field(activeField), c.seedFor(activeField), dir, config.displayUnit));
  paint();
}
function moveField(dir) {
  let i = FIELDS.indexOf(activeField);
  if (i === -1) i = 0; // fallback to weight if activeField not found
  i = Math.max(0, Math.min(FIELDS.length - 1, i + dir));
  activeField = FIELDS[i];
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
function paint() {
  if (!barEl) return;
  const c = liveCtx();
  barEl.classList.toggle("idle", !c);
  barEl.classList.toggle("expanded", expanded && !!c);
  if (!c) {
    els.nameBtn.textContent = ctxList.length ? "Select exercise" : "Add an exercise";
    els.progressEl.textContent = "";
    els.valueInput.value = "";
    els.contextEl.textContent = "";
    els.fieldLabel.textContent = "Weight";
    dropdownOpen = false;
    expanded = false; // reset expanded when no context
    paintDropdown();
    els.panel.replaceChildren();
    return;
  }
  els.nameBtn.textContent = c.name + " ▾";
  const p = c.progress();
  els.progressEl.textContent = c.isEditing()
    ? c.activeLabel()
    : (c.hasTarget ? `Set ${p.done + 1} / ${p.target}` : `Set ${p.done + 1}`);

  els.fieldLabel.textContent = FIELD_LABEL[activeField];
  els.valueInput.value = c.field(activeField);
  const others = FIELDS.filter((f) => f !== activeField)
    .map((f) => `${c.field(f) || "–"} ${f === "rir" ? "RIR" : f}`).join(" · ");
  els.contextEl.textContent = others;

  const typeLabel = c.typeLabel();
  els.typeBtn.style.display = typeLabel ? "" : "none";
  if (typeLabel) els.typeBtn.textContent = typeLabel;
  els.logBtn.textContent = c.isEditing() ? "Save" : "Log set";
  els.logBtn.disabled = !c.canLog();

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
  els.dropdown.style.display = dropdownOpen && ctxList.length ? "" : "none";
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
export function setControllerExercises(list, m) {
  mode = m === "custom" ? "custom" : "meso";
  ctxList = list || [];
  ensureBar();
  if (!ctxList.length) {
    activeCtx = null;
    hideSetController();
    return;
  }
  barEl.classList.add("show");
  // Preserve the active exercise across re-registration (ctx objects are
  // rebuilt each render but ids are stable). Only preserve if the old context
  // element is still in the document.
  const keep = activeCtx && document.contains(activeCtx.cardEl) && ctxList.find((c) => c.id === activeCtx.id);
  if (keep) { activeCtx = keep; paint(); }
  else setActiveExercise(firstIncomplete() || ctxList[0]);
}

export function firstIncomplete() {
  return ctxList.find((c) => !c.hasTarget || c.progress().remaining > 0) || null;
}

export function setActiveExercise(ctxOrId) {
  const next = typeof ctxOrId === "string" ? ctxList.find((c) => c.id === ctxOrId) : ctxOrId;
  if (activeCtx && activeCtx !== next && activeCtx.onDeactivate) activeCtx.onDeactivate();
  activeCtx = next || null;
  activeField = "weight";
  ensureBar();
  if (activeCtx) {
    barEl.classList.add("show");
    if (document.contains(activeCtx.cardEl)) activeCtx.cardEl.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  paint();
}

export function refreshSetController() { paint(); }

export function hideSetController() {
  if (barEl) { barEl.classList.remove("show", "expanded"); }
  expanded = false;
  dropdownOpen = false;
}
