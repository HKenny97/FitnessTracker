// Focused set-logging control pad. A single sticky bottom bar that acts on the
// currently-focused set input: − / + step its value, ◀ / ▶ move across the row's
// fields (weight → reps → RIR), and Prev / Next jump to the previous/next
// exercise (mesocycle mode) or set (custom mode). Decoupled from the view — it
// only reads/writes the focused `.set-row input[data-field]` element and fires an
// `input` event so the existing handlers persist the change. Mirrors timer.js.
import { el } from "./ui.js";
import { config } from "./config.js";

let barEl = null;
let labelEl = null;
let valueEl = null;
let mode = "meso";
let activeInput = null;

const FIELD_LABEL = { weight: "Weight", reps: "Reps", rir: "RIR" };
const fieldOf = (input) => input?.getAttribute("data-field") || "";

function stepFor(field) {
  if (field === "weight") return config.displayUnit === "kg" ? 2.5 : 5;
  return 1;
}

function clampValue(field, n) {
  if (field === "rir") return Math.min(10, Math.max(0, n));
  return Math.max(0, n);
}

function live() {
  return activeInput && document.contains(activeInput) ? activeInput : null;
}

function refresh() {
  const input = live();
  if (!barEl) return;
  if (!input) {
    barEl.classList.add("idle");
    labelEl.textContent = "Tap a set";
    valueEl.textContent = "–";
    return;
  }
  barEl.classList.remove("idle");
  labelEl.textContent = FIELD_LABEL[fieldOf(input)] || "Value";
  valueEl.textContent = input.value !== "" ? input.value : "–";
}

function commit(input, value) {
  const rounded = Math.round(value * 100) / 100;
  input.value = String(rounded);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  refresh();
}

function bump(delta) {
  const input = live();
  if (!input) return;
  const field = fieldOf(input);
  // Empty + numeric placeholder → first tap snaps to the suggestion.
  if (input.value === "") {
    const ph = parseFloat(input.placeholder);
    if (Number.isFinite(ph)) { commit(input, clampValue(field, ph)); return; }
  }
  const base = parseFloat(input.value) || 0;
  commit(input, clampValue(field, base + delta * stepFor(field)));
}

function focusInput(input) {
  if (!input) return;
  input.focus({ preventScroll: true });
  input.scrollIntoView({ block: "center", behavior: "smooth" });
  activeInput = input;
  refresh();
}

function moveField(dir) {
  const input = live();
  if (!input) return;
  const row = input.closest(".set-row");
  if (!row) return;
  const fields = [...row.querySelectorAll("input[data-field]")];
  const next = fields[fields.indexOf(input) + dir];
  if (next) focusInput(next);
}

function firstInput(container) {
  return container?.querySelector("input[data-field]") || null;
}

function moveTarget(dir) {
  const input = live();
  if (mode === "meso") {
    const cards = [...document.querySelectorAll(".exercise-block")];
    if (!cards.length) return;
    const cur = input?.closest(".exercise-block");
    const idx = cur ? cards.indexOf(cur) : -1;
    const target = idx === -1 ? cards[0] : cards[idx + dir];
    if (target) focusInput(firstInput(target));
  } else {
    const rows = [...document.querySelectorAll(".set-row")].filter((r) => firstInput(r));
    if (!rows.length) return;
    const cur = input?.closest(".set-row");
    const idx = cur ? rows.indexOf(cur) : -1;
    const target = idx === -1 ? rows[0] : rows[idx + dir];
    if (target) focusInput(firstInput(target));
  }
}

// Keep the bar from stealing focus from the active input on tap; we manage
// focus explicitly in the handlers.
function padBtn(label, title, onClick) {
  return el("button", {
    type: "button",
    class: "btn icon",
    title,
    "aria-label": title,
    onmousedown: (e) => e.preventDefault(),
    onclick: onClick,
  }, label);
}

function ensureBar() {
  if (barEl) return barEl;
  labelEl = el("span", { class: "focus-pad-label" }, "Tap a set");
  valueEl = el("span", { class: "focus-pad-value" }, "–");
  barEl = el("div", { class: "focus-pad idle", role: "group", "aria-label": "Set value control" },
    el("div", { class: "focus-pad-stepper" },
      padBtn("◀", "Previous field", () => moveField(-1)),
      el("div", { class: "focus-pad-readout" }, labelEl, valueEl),
      padBtn("▶", "Next field", () => moveField(1)),
    ),
    el("div", { class: "focus-pad-value-btns" },
      padBtn("−", "Decrease value", () => bump(-1)),
      padBtn("+", "Increase value", () => bump(1)),
    ),
    el("div", { class: "focus-pad-nav" },
      el("button", { type: "button", class: "btn small ghost", onmousedown: (e) => e.preventDefault(), onclick: () => moveTarget(-1) }, "⟸ Prev"),
      el("button", { type: "button", class: "btn small ghost", onmousedown: (e) => e.preventDefault(), onclick: () => moveTarget(1) }, "Next ⟹"),
    ),
  );
  document.body.append(barEl);
  document.addEventListener("focusin", (e) => {
    const t = e.target;
    if (t instanceof Element && t.matches(".set-row input[data-field]")) {
      activeInput = t;
      refresh();
    }
  });
  return barEl;
}

export function showFocusPad(nextMode) {
  ensureBar();
  mode = nextMode === "custom" ? "custom" : "meso";
  barEl.classList.add("show");
  refresh();
}

export function hideFocusPad() {
  if (barEl) barEl.classList.remove("show");
  activeInput = null;
}
