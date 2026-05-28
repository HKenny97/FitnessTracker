import { el, isoToday, run, toast, withLoading, defaultSessionState, buildSessionMetaForm, buildWorkoutNameField, confirmModal, stat, normalizeName, formatMuscle } from "../ui.js";
import * as data from "../data.js";
import { CUSTOM_MESO_ID } from "../data.js";
import { distributeSets, suggestSetAdjustment, WORKOUT_PRESETS, MUSCLE_REFERENCE, MUSCLE_REGIONS, restSecondsFor, CARDIO_TYPES, exerciseSecondary } from "../rp.js";
import { startRest } from "../timer.js";
import { setControllerExercises, setActiveExercise, refreshSetController, hideSetController, firstIncomplete, collapseActive } from "../setcontroller.js";
import { suggestWorkoutNames, detectWorkoutType } from "../workout-name.js";
import { suggestForGroups, sessionZone } from "../suggest.js";
import { mondayOf, pendingDayForToday } from "../goals.js";
import { openExercisePicker, openFocusPicker } from "../exercise-picker.js";
import { analyze, adaptiveSuggestWeight, performanceReason, sessionVerdict, e1rmTrend, sessionBestE1RMs } from "../adaptive.js";
import { parseSets } from "../parse-sets.js";
import { resolveExerciseName } from "../exercise-match.js";
import { config, isPerSide, setPerSide, getFocusGroups, setFocusGroups } from "../config.js";
import { toDisplay, fromDisplay, unitLabel, isDumbbell, dbVolumeFactor, usesPlates } from "../units.js";
import { platesPerSide, defaultBar, stepperPlates, totalFromCounts } from "../plates.js";
import { drawDonut } from "../chart.js";
import { planExercise } from "../warmup.js";

// Cardio controller fields, adapted to the type. All map to columns the cardio
// record already persists (duration / distance / avgHeartRate); distance is
// dropped for types where it doesn't apply.
const NO_DISTANCE_CARDIO = new Set(["Stair Climber", "HIIT", "Jump Rope", "Elliptical"]);
function cardioFields(type) {
  const f = [{ key: "duration", label: "Min", unit: "min", step: 1 }];
  if (!NO_DISTANCE_CARDIO.has(type)) f.push({ key: "distance", label: "Dist", unit: "km", step: 0.1 });
  f.push({ key: "avgHeartRate", label: "HR", unit: "bpm", step: 1 });
  return f;
}

// Per-set intensifier tags. "warmup" is excluded from volume/analytics; every
// other type counts as one working set.
const SET_TYPES = ["working", "warmup", "drop", "myorep", "failure"];
const SET_TYPE_LABEL = { working: "Work", warmup: "Warm", drop: "Drop", myorep: "Myo", failure: "Fail" };
const countsAsWorking = (t) => (t || "working") !== "warmup";

// Small static tag shown on a logged non-working set (null for working sets).
function setTypeTag(setType) {
  if (!setType || setType === "working") return null;
  return el("span", { class: "set-type-tag" + (setType === "warmup" ? " warmup" : "") }, SET_TYPE_LABEL[setType] || setType);
}

// Quantitative tail for a detailed chip, tailored to what drove the read.
function perfQuantText(perf) {
  const u = unitLabel();
  const pct = perf.deltaPct ? ` (${perf.deltaPct > 0 ? "+" : ""}${perf.deltaPct}%)` : "";
  const d = perf.detail;
  if (d && perf.driver === "weight") {
    return `${toDisplay(d.todayWeight)} vs ~${toDisplay(d.normalWeight)} ${u}${pct}`;
  }
  if (d && perf.driver === "reps") {
    return `${d.todayReps} vs ~${d.normalReps} reps${pct}`;
  }
  if (perf.expectedE1RM) {
    return `est. 1RM ${toDisplay(perf.actualE1RM)} vs ${toDisplay(perf.expectedE1RM)} ${u}${pct}`;
  }
  return pct.trim();
}

// Performance-vs-normal pill from a performanceReason() result. The text states
// the qualitative driver (e.g. "Heavier top set than usual"); the arrow + colour
// convey above/below. When `detailed`, a softer quantitative tail (numbers behind
// the read) is appended. Returns null when there's no baseline yet ("new").
function perfPill(perf, detailed = false) {
  if (!perf || perf.level === "new" || !perf.phrase) return null;
  const cls = perf.level === "above" ? "perf-above" : perf.level === "below" ? "perf-below" : "perf-on";
  const arrow = perf.level === "above" ? "▲ " : perf.level === "below" ? "▼ " : "";
  const title = perf.expectedE1RM
    ? `Today's best est. 1RM ${toDisplay(perf.actualE1RM)} vs your normal ${toDisplay(perf.expectedE1RM)} ${unitLabel()}`
    : "";
  const children = [arrow + perf.phrase];
  if (detailed) {
    const tail = perfQuantText(perf);
    if (tail) children.push(el("span", { class: "perf-quant" }, " · " + tail));
  }
  return el("span", { class: "perf-pill " + cls, title }, ...children);
}

// Bottom-sheet plate calculator. Interactive +/- builder: tap each plate
// denomination up/down (counts are per sleeve), on an editable bar/starting
// weight, with a live total and a one-side visualization. `initialDisplay`
// (display unit) auto-loads the nearest achievable load at/below it. For Hammer
// Strength a "per side" toggle switches the math between a single iso-lateral
// arm (×1) and a symmetric/altogether load (×2). Reuses the picker CSS.
function openPlateModal(initialDisplay, { equipment = "", exercise = "" } = {}) {
  const unit = config.displayUnit;
  const isHS = (equipment || "").toLowerCase() === "hammer strength";
  // Barbell/Smith ride on a standard bar; plate-loaded machines start empty.
  const barLike = ["barbell", "smith machine"].includes((equipment || "").toLowerCase());
  const denoms = stepperPlates(unit);
  const overlay = el("div", { class: "picker-overlay" });
  const close = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  const fmt = (x) => (Math.round(x * 100) / 100).toString();

  let base = barLike ? defaultBar(unit) : 0;        // bar / starting weight
  // Hammer Strength loads either per-arm ("perside") or as one shared stack
  // ("both"); other equipment is a normal two-sided bar. Persisted per exercise.
  let loadMode = isHS ? (isPerSide(exercise) ? "perside" : "both") : "total";
  const counts = {};

  // (Re)seed plate counts from a target weight at/below `initialDisplay`. HS
  // steppers are the literal plates entered (divisor 1); a bar splits two sides.
  function seed() {
    for (const d of denoms) counts[d] = 0;
    const divisor = isHS ? 1 : 2;
    for (const { plate, count } of platesPerSide(Number(initialDisplay), base, denoms, divisor).perSide) {
      counts[plate] = count;
    }
  }
  seed();

  const countEls = {};
  const viz = el("div", { class: "plate-bar" });
  const summary = el("div", { class: "plate-summary" });
  const baseLabel = el("span", {});
  const filterLabel = el("div", { class: "picker-filter-label" });
  const vizLabel = el("div", { class: "muted small plate-viz-label" });

  function render() {
    if (isHS) {
      filterLabel.textContent = loadMode === "perside" ? "Plates per arm" : "Plates loaded (both arms)";
      vizLabel.textContent = loadMode === "perside" ? "Each arm" : "Both arms";
    } else {
      filterLabel.textContent = "Plates per side";
      vizLabel.textContent = "Each side";
    }
    for (const d of denoms) countEls[d].textContent = String(counts[d]);

    // One sleeve only: bar stub, then plates largest → smallest, left → right.
    viz.replaceChildren(el("div", { class: "plate-sleeve" }));
    for (const d of denoms) {
      for (let i = 0; i < counts[d]; i++) {
        viz.append(el("div", { class: `plate-block p-${fmt(d)}` }, fmt(d)));
      }
    }

    const loaded = denoms.filter((d) => counts[d] > 0);
    const baseWord = barLike ? "bar" : "start";
    summary.replaceChildren();

    if (isHS) {
      // base + the plates entered; the toggle decides whether that's one arm or
      // the whole machine, and we always show both /side and total.
      const primary = totalFromCounts(counts, base, 1);
      const perSideVal = loadMode === "perside" ? primary : primary / 2;
      const totalVal = loadMode === "perside" ? primary * 2 : primary;
      if (!loaded.length && base <= 0) {
        summary.append(el("span", { class: "plate-summary-main" }, "Empty"));
      } else {
        const word = loadMode === "perside" ? "per arm" : "loaded";
        const breakdown = loaded.length
          ? loaded.map((d) => `${counts[d]}× ${fmt(d)} ${unit}`).join(" + ") + ` ${word}`
          : `Just the ${baseWord}`;
        summary.append(
          el("span", { class: "plate-summary-main" }, `${fmt(perSideVal)} ${unit} /side  ·  ${fmt(totalVal)} ${unit} total`),
          el("div", { class: "muted small" }, breakdown + (base > 0 ? `  ·  + ${fmt(base)} ${unit} ${baseWord}` : "")),
        );
      }
      return;
    }

    const total = totalFromCounts(counts, base, 2);
    if (!loaded.length) {
      summary.append(el("span", { class: "plate-summary-main" },
        base > 0 ? `Just the ${baseWord} — ${fmt(base)} ${unit}` : "Empty"));
    } else {
      summary.append(
        el("span", { class: "plate-summary-main" }, `${fmt(total)} ${unit} total`),
        el("div", { class: "muted small" },
          loaded.map((d) => `${counts[d]}× ${fmt(d)} ${unit}`).join(" + ")
          + " per side" + (base > 0 ? `  ·  + ${fmt(base)} ${unit} ${baseWord}` : "")),
      );
    }
  }

  const rows = denoms.map((d) => {
    const count = el("span", { class: "plate-count" });
    countEls[d] = count;
    return el("div", { class: "plate-row" },
      el("span", { class: "plate-label" }, `${fmt(d)} ${unit}`),
      el("div", { class: "plate-stepper" },
        el("button", { type: "button", class: "btn icon", title: `Remove ${fmt(d)} ${unit}`, onclick: () => { if (counts[d] > 0) { counts[d]--; render(); } } }, "−"),
        count,
        el("button", { type: "button", class: "btn icon", title: `Add ${fmt(d)} ${unit}`, onclick: () => { counts[d]++; render(); } }, "+"),
      ),
    );
  });

  // Editable bar / starting weight.
  const baseInput = el("input", {
    type: "number", inputmode: "decimal", step: "0.5", value: fmt(base),
    style: { width: "6ch" },
    oninput: (e) => { base = Number(e.target.value) || 0; seed(); render(); },
  });
  baseLabel.textContent = barLike ? "Bar weight" : "Starting weight";
  const baseRow = el("div", { class: "plate-row" },
    baseLabel,
    el("div", { class: "plate-stepper" }, baseInput, el("span", { class: "muted small" }, unit)),
  );

  // Hammer Strength: how the plates are loaded (each arm vs the whole machine).
  // Re-interprets the entered plates only; persists the choice per exercise.
  const modeBtns = {};
  const setMode = (m) => {
    loadMode = m;
    if (exercise) setPerSide(exercise, m === "perside");
    for (const k in modeBtns) modeBtns[k].classList.toggle("primary", k === loadMode);
    render();
  };
  const modeRow = isHS
    ? el("div", { class: "plate-row" },
        el("span", {}, "Loaded"),
        el("div", { class: "row", style: { gap: "0.4rem" } },
          (modeBtns.perside = el("button", { type: "button", class: "btn small" + (loadMode === "perside" ? " primary" : ""), onclick: () => setMode("perside") }, "Per side")),
          (modeBtns.both = el("button", { type: "button", class: "btn small" + (loadMode === "both" ? " primary" : ""), onclick: () => setMode("both") }, "Both")),
        ),
      )
    : null;

  overlay.append(
    el("div", { class: "picker-sheet" },
      el("div", { class: "picker-head" },
        el("strong", {}, `Plate calculator (${unit})`),
        el("button", { type: "button", class: "btn icon", title: "Close", onclick: close }, "×"),
      ),
      baseRow,
      modeRow,
      filterLabel,
      ...rows,
      vizLabel,
      viz,
      summary,
    ),
  );
  document.body.append(overlay);
  render();
}

// Bottom-sheet exercise planner. Picks a target working weight from up to three
// sources (profile suggestion, last session, manual), then generates a warm-up
// ramp + working sets. All weights are in display units. `onGenerate` receives
// { warmups, working } rows (weights as numbers). `sources` is
// { profile, last } in display units (either may be null).
function openPlannerModal({ sources = {}, defaultSets = 3, defaultReps = 8, defaultRIR = 2, onGenerate }) {
  const unit = config.displayUnit;
  const overlay = el("div", { class: "picker-overlay" });
  const close = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  const profile = sources.profile != null ? Math.round(sources.profile * 10) / 10 : null;
  const last = sources.last != null ? Math.round(sources.last * 10) / 10 : null;
  let activeSource = profile != null ? "profile" : last != null ? "last" : "manual";

  const weightInput = el("input", {
    type: "number", inputmode: "decimal", step: "0.5",
    value: profile != null ? profile : last != null ? last : "",
    style: { flex: "1" },
  });
  const setsInput = el("input", { type: "number", inputmode: "numeric", min: "0", value: defaultSets, style: { width: "100%" } });
  const repsInput = el("input", { type: "number", inputmode: "numeric", min: "1", value: defaultReps, style: { width: "100%" } });
  const rirInput = el("input", { type: "number", inputmode: "numeric", min: "0", max: "10", value: defaultRIR, style: { width: "100%" } });
  const preview = el("div", { style: { marginTop: "0.6rem" } });

  const sourceRow = el("div", { class: "row", style: { gap: "0.4rem", flexWrap: "wrap" } });
  const srcBtn = (key, label, value) => {
    const disabled = value == null && key !== "manual";
    const b = el("button", {
      type: "button",
      class: "btn small" + (activeSource === key ? " primary" : ""),
      disabled: disabled ? true : null,
    }, value != null ? `${label} ${value} ${unit}` : label);
    b.onclick = () => {
      activeSource = key;
      if (value != null) weightInput.value = value;
      [...sourceRow.children].forEach((c) => c.classList.remove("primary"));
      b.classList.add("primary");
      build();
    };
    return b;
  };
  sourceRow.append(
    srcBtn("profile", "Profile", profile),
    srcBtn("last", "Last", last),
    srcBtn("manual", "Manual", null),
  );
  weightInput.addEventListener("input", () => { activeSource = "manual"; build(); });
  [setsInput, repsInput, rirInput].forEach((i) => i.addEventListener("input", build));

  function currentPlan() {
    return planExercise({
      workingWeight: Number(weightInput.value),
      sets: Number(setsInput.value),
      reps: Number(repsInput.value),
      rir: Number(rirInput.value),
      unit,
    });
  }

  function build() {
    const { warmups, working } = currentPlan();
    preview.replaceChildren(
      el("div", { class: "muted small" }, "Preview"),
      ...warmups.map((s) => el("div", { class: "muted small" }, `Warm-up · ${s.weight} ${unit} × ${s.reps}`)),
      ...working.map((s, i) => el("div", { class: "small" }, `Set ${i + 1} · ${s.weight || "?"} ${unit} × ${s.reps} @ ${s.rir} RIR`)),
    );
  }

  const generateBtn = el("button", { class: "btn primary" }, "Generate");
  generateBtn.onclick = () => { onGenerate(currentPlan()); close(); };

  const field = (label, input) => el("div", { class: "field", style: { flex: "1" } }, el("label", { class: "muted small" }, label), input);

  overlay.append(
    el("div", { class: "picker-sheet" },
      el("div", { class: "picker-head" },
        el("strong", {}, "Plan exercise"),
        el("button", { type: "button", class: "btn icon", title: "Close", onclick: close }, "×"),
      ),
      el("div", { class: "picker-filter-label" }, "Working weight from"),
      sourceRow,
      el("div", { class: "row", style: { gap: "0.4rem", marginTop: "0.5rem" } }, weightInput, el("span", { class: "muted" }, unit)),
      el("div", { class: "field-row", style: { gap: "0.4rem", marginTop: "0.5rem" } },
        field("Working sets", setsInput), field("Reps", repsInput), field("RIR", rirInput),
      ),
      preview,
      el("div", { class: "row", style: { marginTop: "0.75rem", justifyContent: "flex-end" } }, generateBtn),
    ),
  );
  document.body.append(overlay);
  build();
}

// Inline panel listing chunks the parser couldn't resolve, each an editable
// row the user can fix and re-parse. Mutates the passed `errors` array in
// place; `addSets` receives sets from a successfully re-parsed chunk, and
// `afterApply` (optional) refreshes the surrounding set list.
function buildUnparsedPanel(errors, addSets, afterApply) {
  const panel = el("div", { style: { marginBottom: "0.5rem" } });
  function render() {
    panel.replaceChildren();
    if (!errors.length) return;
    panel.append(el("div", { class: "muted small", style: { marginBottom: "0.25rem" } },
      "Couldn't parse — fix & re-parse:"));
    errors.forEach((err, idx) => {
      const input = el("input", { type: "text", value: err.segment, autocomplete: "off", style: { flex: "1" } });
      function reparse() {
        const r = parseSets(input.value);
        if (!r.sets.length) return toast(`Still can't parse "${input.value}"`, "bad");
        addSets(r.sets);
        // Replace this row with any leftover errors from the re-parse.
        errors.splice(idx, 1, ...r.errors);
        if (afterApply) afterApply();
        render();
      }
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); reparse(); } });
      panel.append(
        el("div", { class: "row", style: { gap: "0.4rem", marginBottom: "0.25rem" } },
          input,
          el("button", { class: "btn small", onclick: reparse }, "Re-parse"),
          el("button", { class: "btn small ghost", "aria-label": "Dismiss", onclick: () => { errors.splice(idx, 1); render(); } }, "×"),
        ),
      );
    });
  }
  render();
  return panel;
}

// Bottom-sheet of varied name suggestions (reuses the exercise-picker styles).
// Tapping a suggestion or saving free text sets `session.name` (and syncs the
// optional `nameInput`). Resolves when the user picks, saves, or skips.
function openNameSuggestions({ session, context, nameInput }) {
  return new Promise((resolve) => {
    const overlay = el("div", { class: "picker-overlay" });
    const finish = (name) => {
      if (name != null) {
        session.name = name;
        if (nameInput) nameInput.value = name;
      }
      overlay.remove();
      resolve(name);
    };
    overlay.onclick = (e) => { if (e.target === overlay) finish(null); };

    const suggestions = suggestWorkoutNames(context);
    const chips = el("div", { class: "chip-row" });
    if (suggestions.length) {
      for (const s of suggestions) {
        chips.append(el("button", { type: "button", class: "filter-chip", onclick: () => finish(s) }, s));
      }
    } else {
      chips.append(el("div", { class: "muted small" }, "Log a few sets to get name ideas."));
    }

    const text = el("input", {
      type: "text", class: "workout-name-input", autocomplete: "off",
      value: session.name || "", placeholder: "Name this workout",
    });
    text.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); finish(text.value.trim()); } });

    const sheet = el("div", { class: "picker-sheet" },
      el("div", { class: "picker-head" },
        el("strong", {}, "Name this workout"),
        el("button", { type: "button", class: "btn icon", title: "Close", onclick: () => finish(null) }, "×"),
      ),
      el("div", { class: "picker-filter-label" }, "Suggestions"),
      chips,
      el("div", { class: "picker-filter-label" }, "Or type your own"),
      el("div", { class: "row", style: { gap: "0.4rem" } },
        text,
        el("button", { type: "button", class: "btn small primary", onclick: () => finish(text.value.trim()) }, "Save"),
      ),
      el("button", { type: "button", class: "btn small ghost", style: { marginTop: "0.5rem" }, onclick: () => finish(null) }, "Leave unnamed"),
    );
    overlay.append(sheet);
    document.body.append(overlay);
  });
}

export async function render(container) {
  const active = await data.getActiveMesocycle();
  let mode = active ? "meso" : "custom";
  let summaryMode = false;

  const root = el("div", {});
  container.append(root);

  function onFinish() {
    summaryMode = true;
    fullRender();
  }

  async function fullRender() {
    root.replaceChildren();
    hideSetController();

    if (summaryMode) {
      const mesoId = mode === "meso" ? active.id : CUSTOM_MESO_ID;
      await renderSummary(root, mesoId, isoToday(), () => { summaryMode = false; fullRender(); });
      return;
    }

    root.append(
      el("div", { class: "section-title" },
        el("h1", {}, "Train"),
        el("div", { class: "row" },
          el("button", {
            class: "btn small" + (mode === "meso" ? " primary" : ""),
            onclick: () => { mode = "meso"; fullRender(); },
            disabled: !active ? true : null,
          }, "Mesocycle"),
          el("button", {
            class: "btn small" + (mode === "custom" ? " primary" : ""),
            onclick: () => { mode = "custom"; fullRender(); },
          }, "Custom"),
        ),
      ),
    );

    if (mode === "meso") {
      if (!active) {
        root.append(
          el("div", { class: "banner" },
            "No active mesocycle. ",
            el("a", { href: "#/meso/new" }, "Plan one"),
            " first, or switch to Custom mode.",
          ),
        );
        return;
      }
      await renderMesoMode(root, active, onFinish);
    } else {
      await renderCustomMode(root, onFinish);
    }
  }

  fullRender();
}

// ── Mesocycle mode ──

async function renderMesoMode(root, active, onFinish) {
  const template = await data.getTemplate(active.id);
  const weeks = +active.weeks;

  const start = new Date(active.startDate);
  const daysIn = Math.floor((Date.now() - start.getTime()) / 86400000);
  const defaultWeek = Math.min(weeks, Math.max(1, Math.floor(daysIn / 7) + 1));

  let chosenWeek = defaultWeek;
  let chosenDay = template[0]?.index ?? 0;

  const session = defaultSessionState();
  const pastLocations = await data.getPastLocations();

  // Ad-hoc exercises added to a session on the fly (not in the template), kept
  // per day so switching days doesn't mix them. Used to support "+ Add exercise"
  // in mesocycle mode.
  const exerciseLib = await data.getFullExerciseLibrary();
  const allSetsForFreq = await data.listSets();
  const freqMap = {};
  for (const s of allSetsForFreq) freqMap[s.exercise] = (freqMap[s.exercise] || 0) + 1;
  const adHocByDay = {};

  async function loadExistingSession() {
    const existing = await data.getSession(active.id, chosenWeek, chosenDay, isoToday());
    if (existing) {
      session.name = existing.name || "";
      session.startTime = existing.startTime || session.startTime;
      session.endTime = existing.endTime || "";
      session.location = existing.location || session.location;
      session.totalRPE = existing.totalRPE || "";
      session.leafStatus = existing.leafStatus || "No";
      session.notes = existing.notes || "";
    }
  }

  async function saveSessionMeta() {
    if (!session.endTime) {
      session.endTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (session.location) localStorage.setItem("rp.lastLocation", session.location);
    await run(
      data.saveSession({
        mesoId: active.id,
        week: chosenWeek,
        dayIndex: chosenDay,
        date: isoToday(),
        ...session,
      }),
      { ok: "Session saved" },
    );
  }

  const mesoRoot = el("div", {});
  root.append(mesoRoot);

  async function rerender() {
    await loadExistingSession();

    // Auto-apply pending volume recommendations when the user opted in.
    if (config.autoApplyVolume && chosenWeek >= 2) {
      const pending = await data.getVolumeSuggestions(active.id, chosenWeek);
      if (pending.length) {
        for (const it of pending) {
          await data.saveWeekPlanAdjustment({
            mesoId: active.id, week: chosenWeek, muscleGroup: it.muscleGroup,
            deltaSets: it.deltaSets, reason: it.reason,
          });
        }
        toast(`Auto-applied ${pending.length} volume adjustment${pending.length === 1 ? "" : "s"}`, "ok");
      }
    }

    const nameSuggest = (nameInput) => {
      const d = template.find((x) => x.index === chosenDay);
      const groups = d ? [...new Set(d.exercises.map((e) => e.muscleGroup).filter(Boolean))] : [];
      return openNameSuggestions({
        session,
        context: { startTime: session.startTime, location: session.location, type: d?.name, groups },
        nameInput,
      });
    };

    mesoRoot.replaceChildren();
    mesoRoot.append(
      buildWorkoutNameField(session, { onSuggest: nameSuggest }),
      el("div", { class: "muted", style: { marginBottom: "0.75rem" } }, active.name),
      el("section", { class: "card" },
        el("div", { class: "field-row" },
          el("div", { class: "field" },
            el("label", {}, "Week"),
            el("select", {
              onchange: (e) => { chosenWeek = +e.target.value; rerender(); },
            },
              ...Array.from({ length: weeks }, (_, i) =>
                el("option", {
                  value: i + 1, selected: chosenWeek === i + 1 ? "" : null,
                }, `Week ${i + 1}${i === weeks - 1 ? " (deload)" : ""}`),
              ),
            ),
          ),
          el("div", { class: "field" },
            el("label", {}, "Day"),
            el("select", {
              onchange: (e) => { chosenDay = +e.target.value; rerender(); },
            },
              ...template.map((d) =>
                el("option", { value: d.index, selected: chosenDay === d.index ? "" : null },
                  d.name)),
            ),
          ),
        ),
      ),
    );

    const suggestionPanel = await buildSuggestionPanel();
    if (suggestionPanel) mesoRoot.append(suggestionPanel);

    mesoRoot.append(buildSessionMetaForm(session, saveSessionMeta, { locations: pastLocations }));

    const day = template.find((d) => d.index === chosenDay);
    if (!day) return;
    const adHoc = adHocByDay[day.index] ||= [];
    const onAddExercise = () => {
      const focusGroups = [...new Set([...day.exercises, ...adHoc].map((e) => e.muscleGroup).filter(Boolean))];
      openFocusPicker({
        exerciseLib,
        freqMap,
        focusGroups,
        exclude: [...day.exercises, ...adHoc].map((e) => e.exercise),
        onPick: (pick) => {
          const all = [...day.exercises, ...adHoc];
          if (all.some((e) => normalizeName(e.exercise) === normalizeName(pick.name))) return toast("Already added", "bad");
          adHoc.push({ exercise: pick.name, muscleGroup: pick.group || "", index: "adhoc:" + pick.name });
          rerender();
        },
      });
    };
    await renderSession(mesoRoot, active, chosenWeek, day, { adHoc, onAddExercise });

    // Post-session per-muscle feedback (drives next week's set suggestions).
    const dayMuscles = [...new Set(day.exercises.map((e) => e.muscleGroup).filter(Boolean))];
    const feedbackState = {};
    for (const m of dayMuscles) feedbackState[m] = { pump: 1, soreness: 1, jointPain: 0, performance: 2 };
    if (dayMuscles.length) mesoRoot.append(buildFeedbackCard(dayMuscles, feedbackState));

    const finishBtn = el("button", { class: "btn primary finish-btn" }, "Finish Workout");
    finishBtn.onclick = withLoading(finishBtn, async () => {
      if (!session.endTime) {
        session.endTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      }
      if (!session.name) {
        await openNameSuggestions({
          session,
          context: { startTime: session.startTime, location: session.location, type: day.name, groups: dayMuscles },
        });
      }
      await saveSessionMeta();
      if (dayMuscles.length) {
        await run(data.logSessionFeedback({
          mesoId: active.id, week: chosenWeek, dayIndex: chosenDay, date: isoToday(),
          feedback: dayMuscles.map((m) => ({ muscleGroup: m, ...feedbackState[m] })),
        }), { ok: "Workout saved" });
      }
      onFinish();
    });
    mesoRoot.append(finishBtn);
  }

  // Current-week volume recommendations (computed in the data layer), rendered
  // via the shared card so the dashboard and workout view stay identical.
  async function buildSuggestionPanel() {
    const items = await data.getVolumeSuggestions(active.id, chosenWeek);
    return buildVolumeSuggestionCard(items, { mesoId: active.id, week: chosenWeek, onChange: rerender });
  }

  rerender();
}

// Renders the "Adjust this week" recommendations with per-muscle reasoning and
// accept buttons. Shared by the workout view and the dashboard. Returns null
// when there's nothing to suggest.
export function buildVolumeSuggestionCard(items, { mesoId, week, onChange } = {}) {
  if (!items || !items.length) return null;
  const card = el("section", { class: "card" },
    el("h3", {}, "Adjust this week"),
    el("p", { class: "muted small" }, "Based on last week's feedback. Your original plan is preserved."),
  );
  for (const it of items) {
    const label = it.action === "deload" ? "Apply deload"
      : it.deltaSets > 0 ? `Add ${it.deltaSets}` : `Reduce ${Math.abs(it.deltaSets)}`;
    const acceptBtn = el("button", { class: "btn small primary" }, label);
    acceptBtn.onclick = withLoading(acceptBtn, async () => {
      await run(data.saveWeekPlanAdjustment({
        mesoId, week, muscleGroup: it.muscleGroup, deltaSets: it.deltaSets, reason: it.reason,
      }), { ok: "Adjusted" });
      onChange?.();
    });
    const fb = it.feedback || {};
    const fbText = `pump ${fb.pump}/3 · sore ${fb.soreness}/3 · joint ${fb.jointPain}/3 · perf ${fb.performance}/3`
      + (it.prevTarget != null ? ` · ${it.performedSets}/${it.prevTarget} sets last week` : "");
    card.append(
      el("div", { class: "row", style: { justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" } },
        el("div", {},
          el("strong", {}, formatMuscle(it.muscleGroup)),
          el("div", { class: "muted small" }, it.reason),
          el("div", { class: "muted small" }, fbText),
        ),
        acceptBtn,
      ),
    );
  }
  return card;
}

// 0–3 per-muscle feedback inputs for the just-finished session.
// Feedback metrics in column order: [state key, header label].
const FEEDBACK_METRICS = [["pump", "Pump"], ["soreness", "Sore"], ["jointPain", "Joint"], ["performance", "Perf"]];

function buildFeedbackCard(muscles, state) {
  const card = el("section", { class: "card" },
    el("h3", {}, "Session feedback"),
    el("p", { class: "muted small" }, "Drag a value up/down (or tap) to rate 0–3 — tunes next week."),
  );

  // A compact value cell you scrub vertically (slide up = higher) or tap to bump.
  const STEP_PX = 22;
  const clamp = (v) => Math.max(0, Math.min(3, v));
  const scrubCell = (m, key, label) => {
    const cell = el("div", {
      class: "scrub", role: "slider", tabindex: "0",
      "aria-label": `${formatMuscle(m)} ${label}`,
      "aria-valuemin": "0", "aria-valuemax": "3", "aria-valuenow": String(state[m][key]),
      "data-level": String(state[m][key]),
    }, String(state[m][key]));
    const set = (v) => {
      v = clamp(v);
      state[m][key] = v;
      cell.textContent = String(v);
      cell.setAttribute("aria-valuenow", String(v));
      cell.setAttribute("data-level", String(v));
    };
    let startY = 0, startVal = 0, moved = 0, dragging = false;
    cell.addEventListener("pointerdown", (e) => {
      dragging = true; moved = 0; startY = e.clientY; startVal = state[m][key];
      cell.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    cell.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const delta = startY - e.clientY; // up (smaller Y) → increase
      moved = Math.max(moved, Math.abs(delta));
      set(startVal + Math.round(delta / STEP_PX));
    });
    const end = () => { dragging = false; };
    cell.addEventListener("pointerup", (e) => {
      if (dragging && moved < 6) set((state[m][key] + 1) % 4); // treat as a tap
      end();
    });
    cell.addEventListener("pointercancel", end);
    cell.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowRight") { set(state[m][key] + 1); e.preventDefault(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowLeft") { set(state[m][key] - 1); e.preventDefault(); }
    });
    return cell;
  };

  const grid = el("div", { class: "feedback-grid" });
  // Header row: empty name cell + one label per metric (rendered once).
  grid.append(el("span", {}), ...FEEDBACK_METRICS.map(([, label]) => el("span", { class: "fb-head muted small" }, label)));
  for (const m of muscles) {
    grid.append(
      el("span", { class: "fb-name" }, formatMuscle(m)),
      ...FEEDBACK_METRICS.map(([key, label]) => scrubCell(m, key, label)),
    );
  }
  card.append(grid);
  return card;
}

async function renderSession(container, meso, week, day, { adHoc = [], onAddExercise = null } = {}) {
  const plan = await data.getEffectiveWeekPlan(meso.id);
  const weekPlan = plan.filter((p) => p.week === week);
  const eqMap = await data.getEquipmentMap();

  // Restore ad-hoc exercises (added on the fly, not in the template) from this
  // session's logged sets so they reappear after a refresh.
  const sessionSets = (await data.listSets()).filter(
    (s) => s.mesoId === meso.id && String(s.week) === String(week) && String(s.dayIndex) === String(day.index) && s.date === isoToday(),
  );
  for (const s of sessionSets) {
    const inTemplate = day.exercises.some((e) => normalizeName(e.exercise) === normalizeName(s.exercise));
    const inAdHoc = adHoc.some((e) => normalizeName(e.exercise) === normalizeName(s.exercise));
    if (!inTemplate && !inAdHoc) adHoc.push({ exercise: s.exercise, muscleGroup: s.muscleGroup || "", index: "adhoc:" + s.exercise });
  }

  const byGroup = {};
  for (const ex of day.exercises) {
    (byGroup[ex.muscleGroup] ||= []).push(ex);
  }
  const allDays = await data.getTemplate(meso.id);

  const dayShareForExercise = new Map();
  for (const [group, exs] of Object.entries(byGroup)) {
    const weeklyTarget = weekPlan.find((p) => p.muscleGroup === group)?.targetSets || 0;
    const totalAcrossWeek = allDays.reduce(
      (n, d) => n + d.exercises.filter((e) => e.muscleGroup === group).length,
      0,
    );
    const thisDayCount = exs.length;
    const thisDayShare = totalAcrossWeek
      ? Math.round((weeklyTarget * thisDayCount) / totalAcrossWeek)
      : exs.length * 3;
    const perEx = distributeSets(thisDayShare, exs.length);
    exs.forEach((e, i) => dayShareForExercise.set(e.exercise + "|" + e.index, perEx[i]));
  }

  const targetRIRForGroup = (g) =>
    weekPlan.find((p) => p.muscleGroup === g)?.targetRIR ?? 2;
  const isDeload = weekPlan.some((p) => p.isDeload);

  container.append(
    el("h2", { style: { marginTop: "1.2rem" } },
      day.name,
      isDeload && el("span", { class: "muted small" }, " · deload"),
    ),
  );

  const ctxList = [];
  for (const ex of [...day.exercises, ...adHoc]) {
    const setTarget = dayShareForExercise.get(ex.exercise + "|" + ex.index) || 0;
    const equipment = eqMap.get((ex.exercise || "").toLowerCase()) || "";
    const { block, ctx } = await renderExercise(meso, week, day, ex, setTarget, targetRIRForGroup(ex.muscleGroup), equipment);
    container.append(block);
    ctxList.push(ctx);
  }
  setControllerExercises(ctxList, "meso", { onAddExercise });
  setActiveExercise(firstIncomplete() || ctxList[0]);
}

async function renderExercise(meso, week, day, ex, setTarget, targetRIR, equipment = "") {
  const perDB = isDumbbell(equipment);
  const [logged, prev, history, override] = await Promise.all([
    data.sessionSets(meso.id, week, day.index, ex.exercise),
    data.previousTopSet(meso.id, day.index, ex.exercise, week),
    data.getExerciseHistory(ex.exercise),
    data.getExerciseOverride(ex.exercise),
  ]);

  // A manual target-RIR override (from the Insights screen) wins over the plan.
  if (override && override.targetRIR != null) targetRIR = override.targetRIR;

  const analysis = analyze(ex.exercise, history, override || {});
  const suggested = prev
    ? adaptiveSuggestWeight(prev, analysis.repRange.min, targetRIR, ex.exercise, history, override || {})
    : null;

  let editingSetId = null;
  let editTemp = null;
  let activeDraftIndex = 0;

  // Used by the controller's expandable info panel (built lazily).
  const today = isoToday();
  const priorSets = history.filter((s) => s.date < today);

  const block = el("div", { class: "exercise-block" });
  // Core details surfaced on the card itself (not just the expand panel).
  const metaBits = [formatMuscle(ex.muscleGroup)];
  if (setTarget) metaBits.push(`${setTarget} sets`);
  metaBits.push(`${analysis.repRange.label} reps`, `${targetRIR} RIR`, `${analysis.rest.label} rest`);
  if (perDB) metaBits.push("per dumbbell");
  if (isPerSide(ex.exercise)) metaBits.push("per side");
  const pillSummary = el("div", { class: "exercise-pill-summary muted small" });
  const head = el("div", {},
    el("h3", {}, ex.exercise),
    pillSummary,
  );
  block.append(el("div", { class: "exercise-head", onclick: () => setActiveExercise(ctx) },
    head,
    el("button", { type: "button", class: "btn small ghost exercise-edit-btn", onclick: (e) => { e.stopPropagation(); setActiveExercise(ctx); } }, "Edit"),
  ));

  // Detail (set rows + a Done button) is revealed only when this card is the
  // active exercise; collapsed cards show just the pill summary above.
  const detail = el("div", { class: "exercise-detail" },
    el("div", { class: "exercise-meta muted small" }, metaBits.join(" · ")),
  );
  if (prev) {
    detail.append(el("div", { class: "muted small" },
      `Last ${toDisplay(prev.weight)}×${prev.reps} @ ${prev.rir}`
      + (suggested ? ` · suggested ${toDisplay(suggested)} ${unitLabel()}` : "")));
  }
  block.append(detail);

  // Collapsed pill face: muscle group · top set · set count.
  function renderSummary() {
    const n = logged.length;
    if (n) {
      const top = logged.reduce((b, s) => (+s.weight > +b.weight ? s : b), logged[0]);
      pillSummary.textContent = `${formatMuscle(ex.muscleGroup)} · top ${toDisplay(top.weight)}×${top.reps} · ${n} set${n === 1 ? "" : "s"}`;
    } else {
      pillSummary.textContent = `${formatMuscle(ex.muscleGroup)}${setTarget ? ` · 0/${setTarget} sets` : " · no sets yet"}`;
    }
  }

  const setsContainer = el("div", {});
  const drafts = [];

  // Quick entry: type set shorthand (e.g. "225x5/5/4 r2") to fill the draft
  // rows below for review before logging. The exercise is fixed here, so any
  // leading name in the text is ignored.
  const quickInput = el("input", {
    type: "text", autocomplete: "off",
    placeholder: "Quick add — e.g. 185x8 / 190x6 / 195x5",
    style: { flex: "1" },
  });
  const errorsContainer = el("div", {});
  // Draft weights are held in the user's DISPLAY unit; suggested/prev are
  // stored lbs, so convert when seeding. The parser's numbers are already in
  // display units (the user typed them) and are converted to lbs at save.
  const suggestedDisplay = suggested ? toDisplay(suggested) : "";
  const pushDrafts = (sets) => {
    for (const set of sets) {
      drafts.push({
        weight: set.weight != null ? String(set.weight) : (suggestedDisplay || ""),
        reps: set.reps != null ? String(set.reps) : "",
        rir: set.rir != null ? String(set.rir) : String(targetRIR),
      });
    }
  };
  function applyQuick() {
    const res = parseSets(quickInput.value);
    if (!res.sets.length && !res.errors.length) return toast("Nothing to parse", "bad");
    pushDrafts(res.sets);
    errorsContainer.replaceChildren(buildUnparsedPanel(res.errors, pushDrafts, renderSets));
    quickInput.value = "";
    if (res.sets.length) { editingSetId = null; editTemp = null; activeDraftIndex = Math.max(0, drafts.length - res.sets.length); }
    renderSets();
    refreshSetController();
  }
  quickInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); applyQuick(); }
  });
  function openPlanner() {
    openPlannerModal({
      sources: {
        profile: suggested != null ? toDisplay(suggested) : null,
        last: prev?.weight != null ? toDisplay(prev.weight) : null,
      },
      defaultSets: setTarget || 3,
      defaultReps: analysis.repRange.min,
      defaultRIR: targetRIR,
      onGenerate: ({ warmups, working }) => {
        const before = drafts.length;
        for (const s of warmups) drafts.push({ weight: String(s.weight), reps: String(s.reps), rir: "", setType: "warmup" });
        for (const s of working) drafts.push({ weight: s.weight === "" ? "" : String(s.weight), reps: String(s.reps), rir: String(s.rir), setType: "working" });
        editingSetId = null; editTemp = null; activeDraftIndex = Math.min(before, drafts.length - 1);
        renderSets();
        refreshSetController();
      },
    });
  }
  detail.append(setsContainer);
  detail.append(el("div", { class: "row", style: { marginTop: "0.5rem", justifyContent: "flex-end" } },
    el("button", { type: "button", class: "btn small ghost ex-done", onclick: collapseActive }, "Done")));

  // The exercise metadata + quick-add/Plan/Plates, relocated into the
  // controller's expandable panel. Reuses the persistent quickInput +
  // errorsContainer so parse state survives repaints.
  function buildExercisePanel() {
    const meta = el("div", { class: "exercise-meta" },
      el("span", { class: "pill" }, ex.muscleGroup),
      setTarget ? el("span", { class: "pill" }, `${setTarget} working sets`) : null,
      el("span", { class: "pill" }, `${analysis.repRange.label} reps`),
      el("span", { class: "pill" }, `${analysis.rest.label} rest`),
      el("span", { class: "pill" }, `${targetRIR} RIR`),
      analysis.confidence !== "new" ? el("span", { class: "pill" }, `↑ ${analysis.progression.label}/session`) : null,
      perDB ? el("span", { class: "pill" }, "per dumbbell") : null,
    );
    const lines = el("div", { class: "sc-lines" });
    if (analysis.fatigueWarning) lines.append(el("div", { class: "banner warning" }, `⚠️ ${analysis.fatigueWarning}`));
    if (prev) {
      lines.append(el("div", { class: "muted small" },
        `Last: ${toDisplay(prev.weight)} ${unitLabel()} × ${prev.reps} @ ${prev.rir} RIR`,
        suggested ? ` · suggested ${toDisplay(suggested)} ${unitLabel()} ` : " ",
        el("a", { class: "small", href: `#/insights/${encodeURIComponent(ex.exercise)}` }, "Why?")));
    } else {
      lines.append(el("div", { class: "muted small" }, "First time logging this exercise in this meso."));
    }
    if (analysis.estimatedMax > 0) {
      const trend = e1rmTrend(sessionBestE1RMs(priorSets));
      const arrow = trend === "rising" ? " ↗" : trend === "falling" ? " ↘" : trend === "flat" ? " →" : "";
      lines.append(el("div", { class: "muted small" }, `Est. 1RM ~${toDisplay(analysis.estimatedMax)} ${unitLabel()}${arrow}`));
    }
    const actions = el("div", { class: "row", style: { gap: "0.4rem", marginTop: "0.4rem" } },
      quickInput,
      el("button", { class: "btn small", onclick: applyQuick }, "Parse"),
      el("button", { type: "button", class: "btn small ghost", title: "Plan warm-ups + working sets", onclick: openPlanner }, "Plan"),
    );
    return el("div", {}, meta, lines, errorsContainer, actions);
  }

  const progress = () => {
    const loggedWorking = logged.filter((s) => countsAsWorking(s.setType)).length;
    const draftsWorking = drafts.filter((d) => countsAsWorking(d.setType)).length;
    return { done: loggedWorking, target: setTarget, remaining: Math.max(0, setTarget - loggedWorking - draftsWorking) };
  };

  function selectDraft(i) {
    editingSetId = null; editTemp = null;
    activeDraftIndex = Math.max(0, Math.min(i, drafts.length - 1));
    renderSets(); refreshSetController();
  }
  function editLogged(id) {
    const s = logged.find((x) => x.id === id);
    if (!s) return;
    editingSetId = id;
    editTemp = { weight: String(toDisplay(s.weight)), reps: String(s.reps), rir: String(s.rir) };
    setActiveExercise(ctx);
    renderSets(); refreshSetController();
  }
  function deleteLogged(id) {
    confirmModal("Delete this set?", async () => {
      await run(data.deleteSet(id), { ok: "Set deleted" });
      const i = logged.findIndex((x) => x.id === id);
      if (i >= 0) logged.splice(i, 1);
      if (editingSetId === id) { editingSetId = null; editTemp = null; }
      renderSets(); refreshSetController();
    });
  }

  function renderSets() {
    renderSummary();
    setsContainer.replaceChildren();
    logged.forEach((s, i) => {
      setsContainer.append(
        el("div", { class: "set-row set-status set-done" + (editingSetId === s.id ? " editing" : "") + (s.setType === "warmup" ? " set-warmup" : "") },
          el("div", { class: "sc-dot" }, "✓"),
          el("div", { class: "idx" }, i + 1),
          el("div", { class: "sc-setval" }, `${toDisplay(s.weight)} × ${s.reps} @ ${s.rir}`),
          el("div", { class: "set-actions" },
            setTypeTag(s.setType),
            el("button", { class: "btn small ghost", "aria-label": "Edit set", onclick: () => editLogged(s.id) }, "✏"),
            el("button", { class: "btn small danger ghost", "aria-label": "Delete set", onclick: () => deleteLogged(s.id) }, "×"),
          ),
        ),
      );
    });
    drafts.forEach((d, i) => {
      const active = !editingSetId && i === activeDraftIndex;
      const vals = (d.weight || d.reps || d.rir)
        ? `${d.weight || "–"} × ${d.reps || "–"} @ ${d.rir || "–"}`
        : "—";
      setsContainer.append(
        el("div", { class: "set-row set-status set-draft" + (active ? " active" : ""), onclick: () => selectDraft(i) },
          el("div", { class: "sc-dot" }, active ? "●" : "○"),
          el("div", { class: "idx" }, logged.length + i + 1),
          el("div", { class: "sc-setval" }, vals),
          el("div", { class: "set-actions" }, setTypeTag(d.setType)),
        ),
      );
    });
    const { remaining } = progress();
    setsContainer.append(
      el("div", { class: "row", style: { marginTop: "0.5rem", justifyContent: "space-between" } },
        el("button", { class: "btn small", onclick: () => { addDraft(); selectDraft(drafts.length - 1); } }, "+ Add set"),
        el("span", { class: "muted small" },
          setTarget ? (remaining > 0 ? `${remaining} target set${remaining === 1 ? "" : "s"} remaining` : "Target met") : "",
        ),
      ),
    );
  }

  function addDraft() {
    drafts.push({
      weight: suggestedDisplay || (prev?.weight ? toDisplay(prev.weight) : "") || "",
      reps: prev?.reps || "",
      rir: targetRIR,
    });
    renderSets();
  }

  async function saveDraft(idx) {
    const d = drafts[idx];
    if (!d.weight || !d.reps) return toast("Need weight and reps", "bad");
    const saved = await run(
      data.logSet({
        mesoId: meso.id,
        week,
        dayIndex: day.index,
        exercise: ex.exercise,
        muscleGroup: ex.muscleGroup,
        setNumber: logged.length + idx + 1,
        weight: fromDisplay(d.weight),
        reps: +d.reps,
        rir: +d.rir,
        setType: d.setType || "working",
        date: isoToday(),
      }),
      { ok: "Set logged" },
    );
    logged.push(saved);
    if (saved.setType !== "warmup") startRest(restSecondsFor(ex.muscleGroup));
    drafts.splice(idx, 1);
    if (progress().remaining > 0 && !drafts.length) addDraft();
    activeDraftIndex = drafts.length ? Math.min(idx, drafts.length - 1) : 0;
    renderSets();
    refreshSetController();
  }

  // Active set the controller edits: a logged set's temp copy when editing,
  // else the current draft.
  const cur = () => (editingSetId ? editTemp : (drafts[activeDraftIndex] || null));

  const ctx = {
    id: ex.exercise + "|" + ex.index,
    name: ex.exercise,
    cardEl: block,
    hasTarget: setTarget > 0,
    progress,
    isEditing: () => !!editingSetId,
    activeLabel: () => editingSetId ? `Edit set ${logged.findIndex((s) => s.id === editingSetId) + 1}` : "",
    field: (f) => { const c = cur(); return c ? String(c[f] ?? "") : ""; },
    setField: (f, v) => { const c = cur(); if (!c) return; c[f] = v; renderSets(); },
    seedFor: (f) => {
      if (f === "weight") return suggestedDisplay || (prev?.weight ? String(toDisplay(prev.weight)) : "");
      if (f === "reps") return prev?.reps != null ? String(prev.reps) : String(analysis.repRange.min);
      return String(targetRIR);
    },
    typeLabel: () => { const c = cur(); if (!c || editingSetId) return null; return SET_TYPE_LABEL[c.setType || "working"]; },
    cycleType: () => { const c = cur(); if (!c || editingSetId) return; c.setType = SET_TYPES[(SET_TYPES.indexOf(c.setType || "working") + 1) % SET_TYPES.length]; renderSets(); },
    canLog: () => { const c = cur(); return !!(c && c.weight && c.reps); },
    commit: async () => {
      if (editingSetId) {
        const id = editingSetId;
        const s = logged.find((x) => x.id === id);
        const weightLbs = fromDisplay(editTemp.weight);
        await run(data.updateSet(id, { weight: weightLbs, reps: +editTemp.reps, rir: +editTemp.rir }), { ok: "Updated" });
        if (s) { s.weight = weightLbs; s.reps = +editTemp.reps; s.rir = +editTemp.rir; }
        editingSetId = null; editTemp = null;
        renderSets();
      } else {
        await saveDraft(activeDraftIndex);
      }
    },
    addSet: () => { addDraft(); editingSetId = null; editTemp = null; activeDraftIndex = drafts.length - 1; renderSets(); },
    buildPanel: buildExercisePanel,
    usesPlates: usesPlates(equipment),
    openPlates: () => openPlateModal(ctx.field("weight") || suggestedDisplay, { equipment, exercise: ex.exercise }),
    onDeactivate: () => { if (editingSetId) { editingSetId = null; editTemp = null; renderSets(); } },
  };

  if (!logged.length && setTarget > 0) addDraft();
  else renderSets();

  return { block, ctx };
}

// ── Custom mode ──

async function renderCustomMode(root, onFinish) {
  const exerciseLib = await data.getFullExerciseLibrary();
  const exercises = [];

  // Past usage ranks exercise suggestions; today's custom sets are restored so
  // the user can continue after a refresh.
  const allSets = await data.listSets();
  const freqMap = {};
  for (const s of allSets) freqMap[s.exercise] = (freqMap[s.exercise] || 0) + 1;

  // Weekly Muscle Goals: the day prescribed for today, with missed-day rollover
  // (prior days this week that logged a custom workout consume earlier plan days).
  const todayIso = isoToday();
  const weekStartIso = mondayOf(todayIso);
  const weeklyPlan = await data.getEffectiveWeeklyPlan(weekStartIso);
  const priorDaysThisWeek = new Set(
    allSets.filter((s) => s.mesoId === CUSTOM_MESO_ID && s.date >= weekStartIso && s.date < todayIso).map((s) => s.date),
  );
  const prescribed = pendingDayForToday(weeklyPlan, priorDaysThisWeek.size);

  const todaySets = allSets
    .filter((s) => s.mesoId === CUSTOM_MESO_ID && s.date === isoToday())
    .sort((a, b) => (+a.setNumber || 0) - (+b.setNumber || 0));
  const groupedByExercise = new Map();
  for (const s of todaySets) {
    if (!groupedByExercise.has(s.exercise)) groupedByExercise.set(s.exercise, []);
    groupedByExercise.get(s.exercise).push(s);
  }
  for (const [name, sets] of groupedByExercise) {
    exercises.push({
      exercise: name,
      muscleGroup: sets[0].muscleGroup || "",
      sets: sets.map((s) => ({
        id: s.id,
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
        saved: true,
      })),
    });
  }

  // Restore today's cardio so it shows alongside strength in the same list.
  const todayCardio = (await data.listCardio()).filter((c) => c.date === isoToday());
  for (const c of todayCardio) {
    exercises.push({
      kind: "cardio", id: c.id, cardioType: c.cardioType, saved: true,
      values: { duration: c.duration || "", distance: c.distance || "", avgHeartRate: c.avgHeartRate || "" },
    });
  }

  // Explicit start/end framing. A workout is already "started" if anything was
  // logged today (resuming); otherwise the user taps Start.
  let started = exercises.length > 0;
  let showWarmup = false;

  const session = defaultSessionState();
  const pastLocations = await data.getPastLocations();

  // Restore existing session metadata for today's custom workout.
  const existingSession = await data.getSession(CUSTOM_MESO_ID, 0, 0, isoToday());
  if (existingSession) {
    session.name = existingSession.name || "";
    session.startTime = existingSession.startTime || session.startTime;
    session.endTime = existingSession.endTime || "";
    session.location = existingSession.location || session.location;
    session.totalRPE = existingSession.totalRPE || "";
    session.leafStatus = existingSession.leafStatus || "No";
    session.notes = existingSession.notes || "";
  }

  async function saveSessionMeta() {
    if (!session.endTime) {
      session.endTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (session.location) localStorage.setItem("rp.lastLocation", session.location);
    await run(
      data.saveSession({
        mesoId: CUSTOM_MESO_ID,
        week: 0,
        dayIndex: 0,
        date: isoToday(),
        ...session,
      }),
      { ok: "Session saved" },
    );
  }

  const customRoot = el("div", {});
  root.append(customRoot);

  // Chunks from the most recent quick-log that couldn't be parsed, kept in
  // state so the resolution panel survives a full rerender().
  let pendingParse = null; // { exerciseName, errors:[{segment,reason}] }
  let prevExCount = 0;     // tracks added exercises so the controller auto-selects the new one

  const toUnsaved = (set) => ({
    weight: set.weight != null ? String(set.weight) : "",
    reps: set.reps != null ? String(set.reps) : "",
    rir: set.rir != null ? String(set.rir) : "",
    saved: false,
  });

  const findEntry = (name) => exercises.find((e) => e.kind !== "cardio" && normalizeName(e.exercise) === normalizeName(name));

  // Freeform "workout focus": targeted muscle groups + per-session feedback.
  // Seeded from the persisted selection so focus carries across sessions.
  const persistedFocus = getFocusGroups();
  const targetGroups = new Set(persistedFocus.length ? persistedFocus : (prescribed ? prescribed.groups : []));
  if (!persistedFocus.length && prescribed && prescribed.groups.length) setFocusGroups([...targetGroups]);
  let focusOpen = false;
  const commitFocus = () => { setFocusGroups([...targetGroups]); rerender(); };
  const feedbackState = {};
  const coverageContainer = el("div", {});
  const feedbackContainer = el("div", {});

  const trainedCounts = () => {
    const counts = {};
    const ensure = (g) => (counts[g] ||= { direct: 0, indirect: 0 });
    for (const ex of exercises) {
      if (ex.kind === "cardio") continue;
      const n = ex.sets.filter((s) => s.saved).length;
      if (!n) continue;
      ensure(ex.muscleGroup).direct += n;
      for (const sec of exerciseSecondary(ex.exercise)) {
        ensure(sec.group).indirect += n * sec.fraction;
      }
    }
    return counts;
  };

  function renderCoverage() {
    coverageContainer.replaceChildren();
    const counts = trainedCounts();
    const groups = [...new Set([...targetGroups, ...Object.keys(counts)])];
    if (!groups.length) return;
    groups.sort((a, b) => (targetGroups.has(b) ? 1 : 0) - (targetGroups.has(a) ? 1 : 0));
    const card = el("section", { class: "card" }, el("h3", {}, "Coverage"));
    for (const g of groups) {
      const vol = counts[g] || { direct: 0, indirect: 0 };
      const direct = vol.direct;
      const indirect = vol.indirect;
      const total = direct + indirect;
      const ref = MUSCLE_REFERENCE[g] || { sessionCap: [3, 8], repRange: "", rest: "" };
      const [lo, hi] = ref.sessionCap;
      const zone = sessionZone(total, ref.sessionCap);
      const color = zone === "under" ? "var(--warn)" : zone === "over" ? "var(--accent)" : "var(--ok)";
      const totalPct = Math.min(100, Math.round((total / Math.max(1, hi)) * 100));
      const directPct = Math.min(100, Math.round((direct / Math.max(1, hi)) * 100));
      const setsLabel = indirect > 0
        ? `${direct} + ${Math.round(indirect * 10) / 10} / ${lo}–${hi}`
        : `${direct} / ${lo}–${hi} sets`;
      card.append(
        el("div", { style: { marginTop: "0.5rem" } },
          el("div", { class: "row", style: { justifyContent: "space-between" } },
            el("span", {}, el("strong", {}, formatMuscle(g)), targetGroups.has(g) ? null : el("span", { class: "muted small" }, " · extra")),
            el("span", { class: "muted small" }, setsLabel),
          ),
          el("div", { style: { height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden", marginTop: "0.2rem", position: "relative" } },
            el("div", { style: { width: directPct + "%", height: "100%", background: color, position: "absolute", left: "0", top: "0" } }),
            indirect > 0 ? el("div", { style: { width: totalPct + "%", height: "100%", background: color, opacity: "0.35", position: "absolute", left: "0", top: "0" } }) : null,
          ),
          ref.repRange ? el("div", { class: "muted small" }, `${ref.repRange} reps · ${ref.rest} rest`) : null,
        ),
      );
    }
    coverageContainer.append(card);
  }

  function renderFeedback() {
    feedbackContainer.replaceChildren();
    const counts = trainedCounts();
    const muscles = Object.keys(counts).filter((g) => counts[g].direct > 0);
    if (!muscles.length) return;
    for (const m of muscles) if (!feedbackState[m]) feedbackState[m] = { pump: 1, soreness: 1, jointPain: 0, performance: 2 };
    feedbackContainer.append(buildFeedbackCard(muscles, feedbackState));
  }

  const refreshLive = () => { renderCoverage(); renderFeedback(); };

  const shortMuscle = (g) => formatMuscle(g.replace(/^Shoulders \((.*)\)$/, "$1"));

  // Header announcing today's prescribed day from the Weekly Muscle Goals plan,
  // with an "Apply" affordance when the live focus doesn't already match it.
  function buildTodayPlanCard() {
    if (!prescribed) return null;
    const name = prescribed.dayName || detectWorkoutType(prescribed.groups) || "Today's plan";
    const groupsLabel = prescribed.groups.map(shortMuscle).join(" · ");
    const applied = prescribed.groups.length === targetGroups.size
      && prescribed.groups.every((g) => targetGroups.has(g));
    return el("section", { class: "card", style: { borderColor: "var(--gama-green)" } },
      el("div", { class: "row", style: { justifyContent: "space-between", alignItems: "center" } },
        el("div", {},
          el("div", { class: "muted small" }, "Today’s plan"),
          el("strong", { style: { fontSize: "1.1rem" } }, name),
        ),
        applied ? null : el("button", {
          class: "btn small primary",
          onclick: () => { targetGroups.clear(); prescribed.groups.forEach((g) => targetGroups.add(g)); commitFocus(); },
        }, "Apply"),
      ),
      groupsLabel ? el("div", { class: "muted small", style: { marginTop: "0.3rem" } }, groupsLabel) : null,
    );
  }

  // Collapsible "workout focus" pill: a compact summary that expands into the
  // group selector. Selection persists across sessions (commitFocus). Coverage
  // of the focused groups is tracked in the separate Coverage card.
  function buildFocusCard() {
    if (!focusOpen) {
      const label = targetGroups.size ? "Focus: " + [...targetGroups].map(shortMuscle).join(" · ") : "Set workout focus";
      return el("div", { class: "focus" },
        el("button", { type: "button", class: "focus-pill", onclick: () => { focusOpen = true; rerender(); } },
          el("span", { class: "dot" }, "◎"), el("span", {}, label)));
    }
    const card = el("section", { class: "card" },
      el("div", { class: "row", style: { justifyContent: "space-between", alignItems: "center" } },
        el("h3", { style: { margin: 0 } }, "Workout focus"),
        el("button", { type: "button", class: "btn small ghost", onclick: () => { focusOpen = false; rerender(); } }, "Done"),
      ),
      el("div", { class: "picker-filter-label" }, "Presets"),
    );
    const presetRow = el("div", { class: "chip-row" });
    for (const [name, groups] of Object.entries(WORKOUT_PRESETS)) {
      presetRow.append(el("button", { type: "button", class: "filter-chip", onclick: () => {
        targetGroups.clear();
        groups.forEach((g) => targetGroups.add(g));
        commitFocus();
      } }, name));
    }
    card.append(presetRow);
    for (const [region, members] of Object.entries(MUSCLE_REGIONS)) {
      const row = el("div", { class: "chip-row" });
      for (const g of members) {
        row.append(el("button", {
          type: "button",
          class: "filter-chip" + (targetGroups.has(g) ? " active" : ""),
          onclick: () => { targetGroups.has(g) ? targetGroups.delete(g) : targetGroups.add(g); commitFocus(); },
        }, shortMuscle(g)));
      }
      card.append(el("div", { class: "picker-filter-label" }, region), row);
    }
    if (targetGroups.size) {
      card.append(el("button", { class: "btn small ghost", style: { marginTop: "0.4rem" }, onclick: () => { targetGroups.clear(); commitFocus(); } }, "Clear focus"));
    }
    return card;
  }

  function buildSuggestions() {
    if (!targetGroups.size) return null;
    const exclude = exercises.map((e) => e.exercise);
    const suggested = suggestForGroups([...targetGroups], exerciseLib, freqMap, { perGroup: 3, exclude });
    const card = el("section", { class: "card" }, el("h3", {}, "Suggested exercises"));
    let any = false;
    for (const { group, exercises: list } of suggested) {
      if (!list.length) continue;
      any = true;
      const row = el("div", { class: "chip-row" });
      for (const e of list) {
        row.append(el("button", { type: "button", class: "filter-chip", onclick: () => {
          if (exercises.some((x) => normalizeName(x.exercise) === normalizeName(e.name))) return toast("Already added", "bad");
          exercises.push({ exercise: e.name, muscleGroup: e.group, sets: [] });
          rerender();
        } }, e.name));
      }
      card.append(el("div", { class: "picker-filter-label" }, formatMuscle(group)), row);
    }
    return any ? card : null;
  }

  // Quick-log path: parse "<exercise> <sets>" (e.g. "bench 3x8 @185"), resolve
  // the exercise (with alias/fuzzy matching), and append the parsed sets as
  // unsaved rows for review. Unparseable set chunks surface in a fix-up panel.
  function quickAddExercise(text) {
    const res = parseSets(text);
    if (!res.name) return toast('Lead with an exercise name, e.g. "bench 3x8 @185"', "bad");

    const commit = (name, group) => {
      let entry = findEntry(name);
      if (!entry) {
        entry = { exercise: name, muscleGroup: group || "", sets: [] };
        exercises.push(entry);
      }
      for (const set of res.sets) entry.sets.push(toUnsaved(set));
      pendingParse = res.errors.length ? { exerciseName: entry.exercise, errors: res.errors } : null;
      rerender();
    };

    const match = resolveExerciseName(res.name, exerciseLib);
    if (match) return commit(match.name, match.group);
    toast(`No exact match for "${res.name}" — pick one`, "");
    openExercisePicker({ exerciseLib, onPick: ({ name, group }) => commit(name, group) });
  }

  const nameContext = () => {
    const counts = trainedCounts();
    const groups = Object.keys(counts).filter((g) => counts[g].direct > 0);
    return { startTime: session.startTime, location: session.location, type: detectWorkoutType(groups), groups };
  };

  async function finishWorkout() {
    if (!session.endTime) {
      session.endTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (!session.name) {
      await openNameSuggestions({ session, context: nameContext() });
    }
    await saveSessionMeta();
    const finishCounts = trainedCounts();
    const muscles = Object.keys(finishCounts).filter((g) => finishCounts[g].direct > 0);
    if (muscles.length) {
      await run(data.logSessionFeedback({
        mesoId: CUSTOM_MESO_ID, week: 0, dayIndex: 0, date: isoToday(),
        feedback: muscles.map((m) => ({ muscleGroup: m, ...(feedbackState[m] || { pump: 1, soreness: 1, jointPain: 0, performance: 2 }) })),
      }), { ok: "Workout saved" });
    }
    onFinish();
  }

  function startWorkout() {
    started = true;
    showWarmup = !exercises.some((e) => e.kind === "cardio");
    rerender();
  }

  function addCardioItem(type) {
    exercises.push({ kind: "cardio", cardioType: type, values: {}, saved: false });
    rerender();
  }

  // Focus-narrowed exercise picker: chips for the workout focus groups + fuzzy
  // search + browse-all. Shared by the "Add to workout" card and the set
  // controller's "+ Add exercise" footer.
  function openAddExercise() {
    openFocusPicker({
      exerciseLib,
      freqMap,
      focusGroups: [...targetGroups],
      exclude: exercises.filter((e) => e.kind !== "cardio").map((e) => e.exercise),
      includeCardio: true,
      cardioTypes: CARDIO_TYPES,
      onPick: (pick) => {
        if (pick.cardio) return addCardioItem(pick.cardioType);
        if (exercises.some((e) => e.kind !== "cardio" && e.exercise === pick.name)) return toast("Already added", "bad");
        exercises.push({ exercise: pick.name, muscleGroup: pick.group || "", sets: [] });
        rerender();
      },
    });
  }

  function rerender() {
    customRoot.replaceChildren();

    // Start / End workout bar pinned at the top. The static title is replaced
    // by the editable workout-name field.
    const startBar = el("div", { class: "workout-bar" },
      buildWorkoutNameField(session, {
        onSuggest: (input) => openNameSuggestions({ session, context: nameContext(), nameInput: input }),
      }),
    );
    if (started) {
      const endBtn = el("button", { class: "btn small danger" }, "End workout");
      endBtn.onclick = withLoading(endBtn, finishWorkout);
      startBar.append(endBtn);
    } else {
      startBar.append(el("button", { class: "btn primary", onclick: startWorkout }, "Start workout"));
    }
    customRoot.append(startBar);

    const todayPlanCard = buildTodayPlanCard();
    if (todayPlanCard) customRoot.append(todayPlanCard);

    if (!started) {
      customRoot.append(el("p", { class: "muted", style: { marginTop: "1rem" } },
        "Press Start workout to begin — you'll get a warm-up suggestion, then add exercises and cardio."));
      setControllerExercises([], "custom");
      prevExCount = 0;
      return;
    }

    customRoot.append(buildFocusCard());
    customRoot.append(buildSessionMetaForm(session, saveSessionMeta, { locations: pastLocations }));
    const suggestions = buildSuggestions();
    if (suggestions) customRoot.append(suggestions);
    customRoot.append(coverageContainer);

    // Warm-up cardio suggestion (until cardio is added or it's skipped).
    if (showWarmup && !exercises.some((e) => e.kind === "cardio")) {
      customRoot.append(el("section", { class: "card warmup" },
        el("strong", {}, "Warm up first"),
        el("div", { class: "muted small" }, "5–10 min easy cardio to raise your heart rate."),
        el("div", { class: "row", style: { gap: "0.5rem", marginTop: "0.6rem" } },
          el("button", { class: "btn small primary", onclick: () => { showWarmup = false; addCardioItem("Walking"); } }, "Add warm-up"),
          el("button", { class: "btn small ghost", onclick: () => { showWarmup = false; rerender(); } }, "Skip to strength"),
        ),
      ));
    }

    const quickEx = el("input", {
      type: "text", autocomplete: "off",
      placeholder: "Quick log — e.g. bench 3x8 @185",
      style: { flex: "1" },
    });
    quickEx.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); quickAddExercise(quickEx.value); }
    });
    const addCard = el("section", { class: "card" },
      el("h3", {}, "Add to workout"),
      el("button", {
        class: "btn primary add-exercise-btn",
        onclick: openAddExercise,
      }, "+ Add exercise / cardio"),
      el("div", { class: "row", style: { gap: "0.4rem", marginTop: "0.5rem" } },
        quickEx,
        el("button", { class: "btn", onclick: () => quickAddExercise(quickEx.value) }, "Parse & add"),
      ),
    );
    if (pendingParse) {
      const addToEntry = (sets) => {
        const entry = findEntry(pendingParse.exerciseName);
        if (entry) for (const set of sets) entry.sets.push(toUnsaved(set));
      };
      const afterApply = () => { if (!pendingParse.errors.length) pendingParse = null; rerender(); };
      addCard.append(
        el("div", { class: "muted small", style: { marginTop: "0.5rem" } }, `Unresolved in "${pendingParse.exerciseName}":`),
        buildUnparsedPanel(pendingParse.errors, addToEntry, afterApply),
      );
    }
    customRoot.append(addCard);

    if (!exercises.length) {
      customRoot.append(el("p", { class: "muted" }, "Add exercises or cardio above to start logging."));
      renderCoverage();
      setControllerExercises([], "custom");
      prevExCount = 0;
      return;
    }

    const ctxList = [];
    for (const ex of exercises) {
      const { block, ctx } = ex.kind === "cardio" ? buildCardioBlock(ex) : buildCustomBlock(ex, refreshLive);
      customRoot.append(block);
      ctxList.push(ctx);
    }
    const grew = exercises.length > prevExCount;
    prevExCount = exercises.length;
    setControllerExercises(ctxList, "custom", { onAddExercise: openAddExercise });
    if (grew) setActiveExercise(ctxList[ctxList.length - 1]);

    customRoot.append(feedbackContainer);
    refreshLive();
  }

  // A cardio item rendered as a card + controller context (controller-driven,
  // type-adaptive fields). Logs/updates via the existing cardio data layer.
  function buildCardioBlock(ex) {
    const block = el("div", { class: "exercise-block cardio" });
    function paintCard() {
      const fields = cardioFields(ex.cardioType);
      const has = ex.saved || fields.some((f) => ex.values[f.key]);
      const summary = has ? fields.map((f) => `${ex.values[f.key] || "–"} ${f.unit}`.trim()).join(" · ") : "Not logged yet";
      block.replaceChildren(
        el("div", { class: "exercise-head", onclick: () => setActiveExercise(ctx) },
          el("div", {},
            el("span", { class: "kind-pill" }, "Cardio"),
            el("h3", {}, ex.cardioType),
            el("div", { class: "exercise-pill-summary muted small" }, summary + (ex.saved ? " · ✓ logged" : "")),
          ),
          el("button", { class: "btn small danger ghost", "aria-label": "Remove cardio", onclick: (e) => { e.stopPropagation(); removeCardio(ex); } }, "Remove"),
        ),
        el("div", { class: "exercise-detail" },
          el("div", { class: "muted small" }, "Log duration" + (NO_DISTANCE_CARDIO.has(ex.cardioType) ? "" : " and distance") + "; heart rate optional."),
          el("div", { class: "row", style: { marginTop: "0.5rem", justifyContent: "flex-end" } },
            el("button", { type: "button", class: "btn small ghost ex-done", onclick: collapseActive }, "Done")),
        ),
      );
    }
    paintCard();
    const ctx = {
      id: "cardio|" + ex.cardioType + "|" + (ex.id || exercises.indexOf(ex)),
      name: ex.cardioType,
      cardEl: block,
      cardio: true,
      hasTarget: false,
      progress: () => ({ done: ex.saved ? 1 : 0, target: 0, remaining: 0 }),
      isEditing: () => !!ex.saved,
      activeLabel: () => (ex.saved ? "Logged" : "Cardio"),
      fields: () => cardioFields(ex.cardioType),
      field: (k) => String(ex.values[k] ?? ""),
      setField: (k, v) => { ex.values[k] = v; paintCard(); },
      seedFor: () => "",
      typeLabel: () => null,
      cycleType: () => {},
      canLog: () => !!ex.values.duration,
      commit: async () => {
        if (!ex.values.duration) return toast("Duration required", "bad");
        const payload = { date: isoToday(), cardioType: ex.cardioType, duration: ex.values.duration, distance: ex.values.distance || "", avgHeartRate: ex.values.avgHeartRate || "" };
        if (ex.saved && ex.id) {
          await run(data.updateCardioEntry(ex.id, payload), { ok: "Cardio updated" });
        } else {
          const saved = await run(data.logCardio(payload), { ok: "Cardio logged" });
          ex.id = saved.id; ex.saved = true;
        }
        paintCard();
        refreshSetController();
      },
      addSet: () => {},
      buildPanel: () => el("div", { class: "muted small" }, "Log duration" + (NO_DISTANCE_CARDIO.has(ex.cardioType) ? "" : " and distance") + "; heart rate optional."),
      usesPlates: false,
      onDeactivate: () => {},
    };
    return { block, ctx };
  }

  function removeCardio(ex) {
    const go = async () => {
      if (ex.saved && ex.id) await run(data.deleteCardioEntry(ex.id), { ok: "Cardio removed" });
      const i = exercises.indexOf(ex);
      if (i >= 0) exercises.splice(i, 1);
      rerender();
    };
    if (ex.saved) confirmModal("Remove this cardio entry?", go); else go();
  }

  function buildCustomBlock(ex, refreshLive) {
    let editingSetId = null;
    let editTemp = null;
    let activeIndex = -1;
    const equipment = exerciseLib.find((e) => normalizeName(e.name) === normalizeName(ex.exercise))?.equipment || "";
    const perDB = isDumbbell(equipment);
    const today = isoToday();
    const priorSets = allSets.filter((s) => s.exercise === ex.exercise && s.date < today);
    const priorBests = sessionBestE1RMs(priorSets);
    const estMax = priorBests.length ? Math.max(...priorBests) : 0;

    const block = el("div", { class: "exercise-block" });
    // Core details on the card (freeform has no RIR).
    const ref = MUSCLE_REFERENCE[ex.muscleGroup];
    const metaBits = [formatMuscle(ex.muscleGroup)];
    if (ref) metaBits.push(`${ref.repRange} reps`, `${ref.rest} rest`);
    if (perDB) metaBits.push("per dumbbell");
    if (isPerSide(ex.exercise)) metaBits.push("per side");
    if (estMax > 0) metaBits.push(`est. 1RM ~${toDisplay(Math.round(estMax * 10) / 10)} ${unitLabel()}`);
    const pillSummary = el("div", { class: "exercise-pill-summary muted small" });
    block.append(
      el("div", { class: "exercise-head", onclick: () => setActiveExercise(ctx) },
        el("div", {},
          el("h3", {}, ex.exercise),
          pillSummary,
        ),
        el("div", { class: "row", style: { gap: "0.4rem" } },
          el("button", { type: "button", class: "btn small ghost exercise-edit-btn", onclick: (e) => { e.stopPropagation(); setActiveExercise(ctx); } }, "Edit"),
          el("button", { class: "btn small danger ghost", onclick: (e) => { e.stopPropagation(); exercises.splice(exercises.indexOf(ex), 1); rerender(); } }, "Remove"),
        ),
      ),
    );

    // Collapsed pill face: muscle group · top set · set count.
    function renderSummary() {
      const saved = ex.sets.filter((s) => s.saved);
      if (saved.length) {
        const top = saved.reduce((b, s) => (+s.weight > +b.weight ? s : b), saved[0]);
        pillSummary.textContent = `${formatMuscle(ex.muscleGroup)} · top ${toDisplay(top.weight)}×${top.reps} · ${saved.length} set${saved.length === 1 ? "" : "s"}`;
      } else {
        pillSummary.textContent = `${formatMuscle(ex.muscleGroup)} · no sets yet`;
      }
    }

    const detail = el("div", { class: "exercise-detail" },
      el("div", { class: "exercise-meta muted small" }, metaBits.join(" · ")),
    );
    const setsContainer = el("div", {});
    detail.append(setsContainer);
    detail.append(el("div", { class: "row", style: { marginTop: "0.5rem", justifyContent: "flex-end" } },
      el("button", { type: "button", class: "btn small ghost ex-done", onclick: collapseActive }, "Done")));
    block.append(detail);

    // Quick add for an exercise already in the list: set-only shorthand fills
    // unsaved rows for review (any leading name in the text is ignored here).
    const blockQuick = el("input", {
      type: "text", autocomplete: "off",
      placeholder: "Quick add — e.g. 185x8 / 190x6 / 195x5",
      style: { flex: "1" },
    });
    const blockErrors = el("div", {});
    const pushBlock = (sets) => { for (const set of sets) ex.sets.push(toUnsaved(set)); };
    const lastSavedWeightLbs = () => {
      const last = ex.sets.filter((s) => s.saved).pop();
      return last ? +last.weight : null;
    };
    const firstUnsaved = () => ex.sets.findIndex((s) => !s.saved);
    function applyBlockQuick() {
      const res = parseSets(blockQuick.value);
      if (!res.sets.length && !res.errors.length) return toast("Nothing to parse", "bad");
      pushBlock(res.sets);
      blockErrors.replaceChildren(buildUnparsedPanel(res.errors, pushBlock, renderSets));
      blockQuick.value = "";
      editingSetId = null; editTemp = null; activeIndex = firstUnsaved();
      renderSets();
      refreshSetController();
    }
    blockQuick.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); applyBlockQuick(); }
    });
    // Most recent prior session's top (heaviest, non-warm-up) set — for the
    // planner's profile/last-session weight sources in freeform mode.
    function lastTopFromHistory() {
      const hist = priorSets.filter((s) => s.setType !== "warmup");
      if (!hist.length) return null;
      const lastDate = [...new Set(hist.map((s) => s.date))].sort().pop();
      const day = hist.filter((s) => s.date === lastDate);
      let top = day[0];
      for (const s of day) if (+s.weight > +top.weight) top = s;
      return { weight: +top.weight, reps: +top.reps, rir: +top.rir };
    }
    function openPlanner() {
      const ref = MUSCLE_REFERENCE[ex.muscleGroup] || {};
      const defaultReps = parseInt(ref.repRange, 10) || 8;
      const defaultSets = (ref.sessionCap && ref.sessionCap[0]) || 3;
      const prevTop = lastTopFromHistory();
      const suggested = prevTop ? adaptiveSuggestWeight(prevTop, defaultReps, 2, ex.exercise, priorSets) : null;
      const lastLbs = lastSavedWeightLbs() ?? prevTop?.weight ?? null;
      openPlannerModal({
        sources: {
          profile: suggested != null ? toDisplay(suggested) : null,
          last: lastLbs != null ? toDisplay(lastLbs) : null,
        },
        defaultSets, defaultReps, defaultRIR: 2,
        onGenerate: ({ warmups, working }) => {
          for (const s of warmups) ex.sets.push({ weight: String(s.weight), reps: String(s.reps), rir: "", saved: false, setType: "warmup" });
          for (const s of working) ex.sets.push({ weight: s.weight === "" ? "" : String(s.weight), reps: String(s.reps), rir: String(s.rir), saved: false, setType: "working" });
          editingSetId = null; editTemp = null; activeIndex = firstUnsaved();
          renderSets();
          refreshSetController();
        },
      });
    }

    function buildCustomPanel() {
      const meta = el("div", { class: "exercise-meta" },
        el("span", { class: "pill" }, formatMuscle(ex.muscleGroup)),
        perDB ? el("span", { class: "pill" }, "per dumbbell") : null,
        MUSCLE_REFERENCE[ex.muscleGroup]
          ? el("span", { class: "muted small" }, `${MUSCLE_REFERENCE[ex.muscleGroup].repRange} reps · ${MUSCLE_REFERENCE[ex.muscleGroup].rest} rest`)
          : null,
      );
      const lines = el("div", { class: "sc-lines" });
      if (estMax > 0) {
        const trend = e1rmTrend(priorBests);
        const arrow = trend === "rising" ? " ↗" : trend === "falling" ? " ↘" : trend === "flat" ? " →" : "";
        lines.append(el("div", { class: "muted small" }, `Est. 1RM ~${toDisplay(Math.round(estMax * 10) / 10)} ${unitLabel()}${arrow}`));
      }
      const actions = el("div", { class: "row", style: { gap: "0.4rem", marginTop: "0.4rem" } },
        blockQuick,
        el("button", { class: "btn small", onclick: applyBlockQuick }, "Parse"),
        el("button", { type: "button", class: "btn small ghost", title: "Plan warm-ups + working sets", onclick: openPlanner }, "Plan"),
      );
      return el("div", {}, meta, lines, blockErrors, actions);
    }

    const cur = () => editingSetId ? editTemp : (ex.sets[activeIndex] && !ex.sets[activeIndex].saved ? ex.sets[activeIndex] : null);

    function pushBlank() {
      const prev = ex.sets.filter((s) => s.saved).pop();
      ex.sets.push({
        weight: prev ? String(toDisplay(prev.weight)) : "",
        reps: prev?.reps != null ? String(prev.reps) : "",
        rir: prev?.rir != null ? String(prev.rir) : "",
        saved: false,
      });
    }
    function addBlank() {
      pushBlank();
      editingSetId = null; editTemp = null; activeIndex = ex.sets.length - 1;
      renderSets(); refreshSetController();
    }
    function selectSet(i) {
      editingSetId = null; editTemp = null; activeIndex = i;
      renderSets(); refreshSetController();
    }
    function editLogged(id) {
      const s = ex.sets.find((x) => x.id === id);
      if (!s) return;
      editingSetId = id;
      editTemp = { weight: String(toDisplay(s.weight)), reps: String(s.reps), rir: String(s.rir) };
      setActiveExercise(ctx);
      renderSets(); refreshSetController();
    }
    function deleteSet(id) {
      confirmModal("Delete this set?", async () => {
        await run(data.deleteSet(id), { ok: "Set deleted" });
        const i = ex.sets.findIndex((x) => x.id === id);
        if (i >= 0) ex.sets.splice(i, 1);
        if (editingSetId === id) { editingSetId = null; editTemp = null; }
        renderSets(); refreshSetController(); refreshLive?.();
      });
    }
    async function logActive() {
      const s = ex.sets[activeIndex];
      if (!s || s.saved) return;
      if (!s.weight || !s.reps) return toast("Need weight and reps", "bad");
      const saved = await run(
        data.logSet({
          mesoId: CUSTOM_MESO_ID, week: 0, dayIndex: 0,
          exercise: ex.exercise, muscleGroup: ex.muscleGroup, setNumber: activeIndex + 1,
          weight: fromDisplay(s.weight), reps: +s.reps, rir: +(s.rir || 0),
          setType: s.setType || "working", date: isoToday(),
        }),
        { ok: "Set logged" },
      );
      s.id = saved.id; s.weight = fromDisplay(s.weight); s.saved = true;
      if (s.setType !== "warmup") startRest(restSecondsFor(ex.muscleGroup));
      if (firstUnsaved() < 0) pushBlank();
      activeIndex = firstUnsaved();
      renderSets(); refreshSetController(); refreshLive?.();
    }

    function renderSets() {
      renderSummary();
      setsContainer.replaceChildren();
      if (activeIndex < 0 || activeIndex >= ex.sets.length || ex.sets[activeIndex].saved) activeIndex = firstUnsaved();
      ex.sets.forEach((s, i) => {
        if (s.saved) {
          setsContainer.append(
            el("div", { class: "set-row set-status set-done" + (s.setType === "warmup" ? " set-warmup" : "") },
              el("div", { class: "sc-dot" }, "✓"),
              el("div", { class: "idx" }, i + 1),
              el("div", { class: "sc-setval" }, `${toDisplay(s.weight)} × ${s.reps}`),
              el("div", { class: "set-actions" },
                setTypeTag(s.setType),
                el("button", { class: "btn small ghost", "aria-label": "Edit set", onclick: () => editLogged(s.id) }, "✏"),
                el("button", { class: "btn small danger ghost", "aria-label": "Delete set", onclick: () => deleteSet(s.id) }, "×"),
              ),
            ),
          );
        } else {
          const active = !editingSetId && i === activeIndex;
          const vals = (s.weight || s.reps) ? `${s.weight || "–"} × ${s.reps || "–"}` : "—";
          setsContainer.append(
            el("div", { class: "set-row set-status set-draft" + (active ? " active" : ""), onclick: () => selectSet(i) },
              el("div", { class: "sc-dot" }, active ? "●" : "○"),
              el("div", { class: "idx" }, i + 1),
              el("div", { class: "sc-setval" }, vals),
              el("div", { class: "set-actions" }, setTypeTag(s.setType)),
            ),
          );
        }
      });
      setsContainer.append(
        el("button", { class: "btn small", style: { marginTop: "0.5rem" }, onclick: addBlank }, "+ Add set"),
      );
    }

    const ctx = {
      id: "custom|" + ex.exercise,
      name: ex.exercise,
      cardEl: block,
      hasTarget: false,
      progress: () => ({ done: ex.sets.filter((s) => s.saved).length, target: 0, remaining: 0 }),
      isEditing: () => !!editingSetId,
      activeLabel: () => editingSetId ? `Edit set ${ex.sets.findIndex((s) => s.id === editingSetId) + 1}` : "",
      field: (f) => { const c = cur(); return c ? String(c[f] ?? "") : ""; },
      setField: (f, v) => { const c = cur(); if (!c) return; c[f] = v; renderSets(); },
      seedFor: (f) => {
        const last = ex.sets.filter((s) => s.saved).pop();
        if (f === "weight") return last ? String(toDisplay(last.weight)) : "";
        if (f === "reps") return last?.reps != null ? String(last.reps) : "";
        return last?.rir != null ? String(last.rir) : "";
      },
      typeLabel: () => { const c = cur(); if (!c || editingSetId) return null; return SET_TYPE_LABEL[c.setType || "working"]; },
      cycleType: () => { const c = cur(); if (!c || editingSetId) return; c.setType = SET_TYPES[(SET_TYPES.indexOf(c.setType || "working") + 1) % SET_TYPES.length]; renderSets(); },
      canLog: () => { const c = cur(); return !!(c && c.weight && c.reps); },
      commit: async () => {
        if (editingSetId) {
          const id = editingSetId;
          const s = ex.sets.find((x) => x.id === id);
          const weightLbs = fromDisplay(editTemp.weight);
          await run(data.updateSet(id, { weight: weightLbs, reps: +editTemp.reps, rir: +editTemp.rir }), { ok: "Updated" });
          if (s) { s.weight = weightLbs; s.reps = +editTemp.reps; s.rir = +editTemp.rir; }
          editingSetId = null; editTemp = null;
          renderSets(); refreshLive?.();
        } else {
          await logActive();
        }
      },
      addSet: addBlank,
      buildPanel: buildCustomPanel,
      usesPlates: usesPlates(equipment),
      openPlates: () => openPlateModal(ctx.field("weight") || (lastSavedWeightLbs() ? toDisplay(lastSavedWeightLbs()) : ""), { equipment, exercise: ex.exercise }),
      onDeactivate: () => { if (editingSetId) { editingSetId = null; editTemp = null; renderSets(); } },
    };

    if (firstUnsaved() < 0) pushBlank();
    activeIndex = firstUnsaved();
    renderSets();
    return { block, ctx };
  }

  rerender();
}

// ── Workout summary ──

export async function renderSummary(container, mesoId, date, onBack) {
  const today = date;
  const allSets = await data.listSets();
  const eqMap = await data.getEquipmentMap();
  // Dumbbell tonnage counts both implements; per-set volume helper.
  const setVol = (s) => (s.setType === "warmup" ? 0 : (+s.weight || 0) * (+s.reps || 0) * dbVolumeFactor(s.exercise, eqMap.get((s.exercise || "").toLowerCase())));
  const isDb = (name) => isDumbbell(eqMap.get((name || "").toLowerCase()));
  const todaySets = allSets.filter((s) => s.date === today && s.mesoId === mesoId);

  const allSessions = await data.listSessions();
  const session = allSessions.find((s) => s.date === today && s.mesoId === mesoId);

  if (!todaySets.length) {
    container.append(
      el("section", { class: "card workout-summary" },
        el("h2", {}, "No sets logged"),
        el("button", { class: "btn", style: { marginTop: "1rem" }, onclick: onBack }, "Back"),
      ),
    );
    return;
  }

  // Duration
  let durationStr = "";
  if (session?.startTime && session?.endTime) {
    const [sh, sm] = session.startTime.split(":").map(Number);
    const [eh, em] = session.endTime.split(":").map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins > 0) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
  }

  // Group by exercise
  const byExercise = new Map();
  for (const s of todaySets) {
    if (!byExercise.has(s.exercise)) byExercise.set(s.exercise, []);
    byExercise.get(s.exercise).push(s);
  }

  // Muscles (direct + indirect secondary credits)
  const muscleMap = {};
  for (const s of todaySets) {
    muscleMap[s.muscleGroup] = (muscleMap[s.muscleGroup] || 0) + 1;
    for (const sec of exerciseSecondary(s.exercise)) {
      muscleMap[sec.group] = (muscleMap[sec.group] || 0) + sec.fraction;
    }
  }

  // Volume (dumbbell sets count both implements)
  const totalVolume = todaySets.reduce((sum, s) => sum + setVol(s), 0);

  // Previous session volume
  const prevDates = [...new Set(
    allSets.filter((s) => s.mesoId === mesoId && s.date < today).map((s) => s.date),
  )].sort().reverse();
  let prevVolume = 0;
  if (prevDates.length) {
    prevVolume = allSets
      .filter((s) => s.mesoId === mesoId && s.date === prevDates[0])
      .reduce((sum, s) => sum + setVol(s), 0);
  }

  // Per-exercise highlights
  const highlights = [];
  const perfResults = [];
  for (const [exercise, exSets] of byExercise) {
    const topSet = exSets.reduce((b, s) => (+s.weight > +b.weight ? s : b), exSets[0]);

    const prevExSets = allSets
      .filter((s) => s.exercise === exercise && s.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));

    let comparison = null;
    if (prevExSets.length) {
      const prevDate = prevExSets[0].date;
      const prevSession = prevExSets.filter((s) => s.date === prevDate);
      const prevTop = prevSession.reduce((b, s) => (+s.weight > +b.weight ? s : b), prevSession[0]);
      comparison = {
        wDelta: +topSet.weight - +prevTop.weight,
        rDelta: +topSet.reps - +prevTop.reps,
        prevWeight: +prevTop.weight,
        prevReps: +prevTop.reps,
      };
    }

    // Performance vs. recent normal (more robust than the single-session delta),
    // with a qualitative driver phrase for the pill.
    const perf = performanceReason(
      allSets.filter((s) => s.exercise === exercise && s.date < today),
      exSets,
    );
    perfResults.push(perf);

    highlights.push({
      exercise,
      muscleGroup: topSet.muscleGroup,
      sets: exSets.length,
      topWeight: +topSet.weight,
      topReps: +topSet.reps,
      comparison,
      perf,
    });
  }

  const verdict = sessionVerdict(perfResults);

  // ── Render ──

  const summary = el("section", { class: "card workout-summary" });
  if (session?.name) {
    summary.append(el("h2", {}, session.name), el("p", { class: "muted small" }, "Workout Complete"));
  } else {
    summary.append(el("h2", {}, "Workout Complete"));
  }

  // Overall performance verdict vs. your normal.
  if (verdict) {
    summary.append(
      el("div", { class: `verdict-banner verdict-${verdict.level}` },
        el("span", { class: "verdict-text" }, verdict.text),
        verdict.deltaPct !== 0
          ? el("span", { class: "verdict-delta" }, `${verdict.deltaPct > 0 ? "+" : ""}${verdict.deltaPct}%`)
          : null,
      ),
      el("p", { class: "muted small verdict-caption" },
        "“Normal” is your recent baseline for each lift: the median best estimated 1RM (weight × reps) of your last few sessions. Each pill flags how today's top set compared."),
    );
  }

  // Stats
  const statsRow = el("div", { class: "summary-stats" });
  if (durationStr) statsRow.append(stat(durationStr, "Duration"));
  statsRow.append(stat(String(todaySets.length), "Sets"));
  statsRow.append(stat(String(byExercise.size), "Exercises"));
  statsRow.append(stat(toDisplay(totalVolume).toLocaleString(), `Volume (${unitLabel()})`));
  summary.append(statsRow);

  // Volume comparison
  if (prevVolume > 0) {
    const volDelta = totalVolume - prevVolume;
    const volPct = Math.round((volDelta / prevVolume) * 100);
    const cls = volDelta > 0 ? "delta-up" : volDelta < 0 ? "delta-down" : "delta-same";
    summary.append(
      el("div", { class: `comparison ${cls}`, style: { textAlign: "center", marginBottom: "0.5rem" } },
        `${volDelta > 0 ? "+" : ""}${toDisplay(volDelta).toLocaleString()} ${unitLabel()} (${volDelta > 0 ? "+" : ""}${volPct}%) vs last session`,
      ),
    );
  }

  // Muscles — donut split + pills
  const muscleEntries = Object.entries(muscleMap).sort((a, b) => b[1] - a[1]);
  const DONUT_COLORS = ["#39b54a", "#4da6ff", "#ffb547", "#c97bff", "#ff5a1f", "#36c4b7", "#f06292", "#9ccc65"];
  if (muscleEntries.length > 1) {
    const donutCanvas = el("canvas", {});
    summary.append(el("div", { class: "donut-box" }, donutCanvas));
    requestAnimationFrame(() => drawDonut(
      donutCanvas,
      muscleEntries.map(([g, n], i) => ({ label: formatMuscle(g), value: n, color: DONUT_COLORS[i % DONUT_COLORS.length] })),
    ));
  } else {
    summary.append(
      el("div", { class: "history-muscles", style: { justifyContent: "center", marginBottom: "0.75rem" } },
        ...muscleEntries.map(([g, n]) => el("span", { class: "pill small" }, `${formatMuscle(g)} (${n % 1 ? n.toFixed(1) : n})`)),
      ),
    );
  }

  // Exercise highlights
  summary.append(el("h3", { style: { marginTop: "1rem" } }, "Exercise highlights"));
  for (const h of highlights) {
    let deltaNode = null;
    if (h.comparison) {
      const { wDelta, rDelta } = h.comparison;
      let text, cls;
      if (wDelta > 0) { text = `+${toDisplay(wDelta)} ${unitLabel()}`; cls = "delta-up"; }
      else if (wDelta < 0) { text = `${toDisplay(wDelta)} ${unitLabel()}`; cls = "delta-down"; }
      else if (rDelta > 0) { text = `+${rDelta} reps`; cls = "delta-up"; }
      else if (rDelta < 0) { text = `${rDelta} reps`; cls = "delta-down"; }
      else { text = "="; cls = "delta-same"; }
      deltaNode = el("span", { class: `delta ${cls}` }, text);
    }

    summary.append(
      el("div", { class: "summary-exercise" },
        el("div", { class: "summary-exercise-head" },
          el("strong", {}, h.exercise),
          deltaNode,
        ),
        el("div", { class: "muted small" },
          `${h.sets} sets · Top: ${toDisplay(h.topWeight)} × ${h.topReps}`,
          isDb(h.exercise) ? " per DB" : "",
          h.comparison ? ` (was ${toDisplay(h.comparison.prevWeight)} × ${h.comparison.prevReps})` : " (new)",
        ),
        perfPill(h.perf, true),
      ),
    );
  }

  // Leaf
  if (session?.leafStatus === "Yes") {
    summary.append(
      el("div", { style: { marginTop: "0.75rem", textAlign: "center" } },
        el("span", { class: "pill leaf" }, "Leaf session")),
    );
  }

  // Back
  const backBtn = el("button", { class: "btn", style: { marginTop: "1.25rem" } }, "Back to training");
  backBtn.onclick = onBack;
  summary.append(backBtn);

  container.append(summary);
}

