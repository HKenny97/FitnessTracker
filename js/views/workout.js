import { el, isoToday, run, toast, withLoading, defaultSessionState, buildSessionMetaForm, confirmModal, stat, normalizeName, formatMuscle } from "../ui.js";
import * as data from "../data.js";
import { CUSTOM_MESO_ID } from "../data.js";
import { distributeSets, suggestSetAdjustment, WORKOUT_PRESETS, MUSCLE_REFERENCE, MUSCLE_REGIONS, restSecondsFor } from "../rp.js";
import { startRest } from "../timer.js";
import { suggestForGroups, sessionZone } from "../suggest.js";
import { openExercisePicker } from "../exercise-picker.js";
import { analyze, adaptiveSuggestWeight, performanceReason, sessionVerdict, e1rmTrend, sessionBestE1RMs } from "../adaptive.js";
import { parseSets } from "../parse-sets.js";
import { resolveExerciseName } from "../exercise-match.js";
import { config } from "../config.js";
import { toDisplay, fromDisplay, unitLabel, isDumbbell, dbVolumeFactor } from "../units.js";
import { platesPerSide, defaultBar, defaultPlates } from "../plates.js";
import { drawDonut } from "../chart.js";
import { planExercise } from "../warmup.js";

// Per-set intensifier tags. "warmup" is excluded from volume/analytics; every
// other type counts as one working set.
const SET_TYPES = ["working", "warmup", "drop", "myorep", "failure"];
const SET_TYPE_LABEL = { working: "Work", warmup: "Warm", drop: "Drop", myorep: "Myo", failure: "Fail" };
const countsAsWorking = (t) => (t || "working") !== "warmup";

// A small button that cycles a draft row's set type in place (no re-render, so
// input focus is preserved). Mutates `draft.setType`.
function setTypeButton(draft) {
  if (!draft.setType) draft.setType = "working";
  const btn = el("button", { type: "button", class: "btn small ghost set-type-btn", title: "Set type (tap to cycle)" });
  const paint = () => {
    btn.textContent = SET_TYPE_LABEL[draft.setType];
    btn.classList.toggle("warmup", draft.setType === "warmup");
  };
  btn.onclick = () => {
    draft.setType = SET_TYPES[(SET_TYPES.indexOf(draft.setType) + 1) % SET_TYPES.length];
    paint();
  };
  paint();
  return btn;
}

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

// Bottom-sheet plate calculator. `initialDisplay` is a weight in the current
// display unit. Reuses the picker overlay/sheet CSS.
function openPlateModal(initialDisplay) {
  const unit = config.displayUnit;
  const bar = defaultBar(unit);
  const overlay = el("div", { class: "picker-overlay" });
  const close = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  const input = el("input", { type: "number", inputmode: "decimal", step: "0.5", value: initialDisplay || "", style: { flex: "1" } });
  const result = el("div", { style: { marginTop: "0.6rem" } });
  function compute() {
    result.replaceChildren();
    const t = Number(input.value);
    if (!Number.isFinite(t) || t <= 0) return;
    const { perSide, leftover, loadable } = platesPerSide(t, bar, defaultPlates(unit));
    if (!perSide.length) {
      result.append(el("div", {}, `Just the bar (${bar} ${unit}).`));
    } else {
      const perSideWeight = Math.round(((loadable - bar) / 2) * 100) / 100;
      result.append(el("div", {},
        "Per side: " + perSide.map((p) => `${p.count}×${p.plate}`).join(", ") + ` = ${perSideWeight} ${unit}`));
    }
    result.append(el("div", { class: "muted small" },
      `Bar ${bar} ${unit} · total ${loadable} ${unit}`
      + (leftover > 0 ? ` (${leftover} ${unit}/side short of ${t})` : "")));
  }
  input.addEventListener("input", compute);

  overlay.append(
    el("div", { class: "picker-sheet" },
      el("div", { class: "picker-head" },
        el("strong", {}, `Plate calculator (${unit})`),
        el("button", { type: "button", class: "btn icon", title: "Close", onclick: close }, "×"),
      ),
      el("div", { class: "row", style: { gap: "0.4rem" } }, input, el("span", { class: "muted" }, unit)),
      result,
    ),
  );
  document.body.append(overlay);
  compute();
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

  async function loadExistingSession() {
    const existing = await data.getSession(active.id, chosenWeek, chosenDay, isoToday());
    if (existing) {
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

    mesoRoot.replaceChildren();
    mesoRoot.append(
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

    mesoRoot.append(buildSessionMetaForm(session, saveSessionMeta));

    const day = template.find((d) => d.index === chosenDay);
    if (!day) return;
    await renderSession(mesoRoot, active, chosenWeek, day);

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
function buildFeedbackCard(muscles, state) {
  const card = el("section", { class: "card" },
    el("h3", {}, "Session feedback"),
    el("p", { class: "muted small" }, "Rate each muscle 0–3 (pump, soreness, joint pain, performance) to tune next week."),
  );
  const sel = (m, key) => el("select", { onchange: (e) => (state[m][key] = +e.target.value) },
    ...[0, 1, 2, 3].map((v) => el("option", { value: v, selected: state[m][key] === v ? "" : null }, String(v))),
  );
  for (const m of muscles) {
    card.append(
      el("div", { class: "field-row", style: { alignItems: "end", gap: "0.4rem", marginTop: "0.4rem" } },
        el("div", { class: "field", style: { flex: "1" } }, el("label", {}, formatMuscle(m))),
        el("div", { class: "field" }, el("label", { class: "muted small" }, "Pump"), sel(m, "pump")),
        el("div", { class: "field" }, el("label", { class: "muted small" }, "Sore"), sel(m, "soreness")),
        el("div", { class: "field" }, el("label", { class: "muted small" }, "Joint"), sel(m, "jointPain")),
        el("div", { class: "field" }, el("label", { class: "muted small" }, "Perf"), sel(m, "performance")),
      ),
    );
  }
  return card;
}

async function renderSession(container, meso, week, day) {
  const plan = await data.getEffectiveWeekPlan(meso.id);
  const weekPlan = plan.filter((p) => p.week === week);
  const eqMap = await data.getEquipmentMap();

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

  for (const ex of day.exercises) {
    const setTarget = dayShareForExercise.get(ex.exercise + "|" + ex.index) || 0;
    const equipment = eqMap.get((ex.exercise || "").toLowerCase()) || "";
    const block = await renderExercise(meso, week, day, ex, setTarget, targetRIRForGroup(ex.muscleGroup), equipment);
    container.append(block);
  }
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

  const block = el("div", { class: "exercise-block" });
  block.append(
    el("div", { class: "exercise-head" },
      el("div", {},
        el("h3", {}, ex.exercise),
        el("div", { class: "exercise-meta" },
          el("span", { class: "pill" }, ex.muscleGroup),
          setTarget ? el("span", { class: "pill" }, `${setTarget} working sets`) : null,
          el("span", { class: "pill" }, `${analysis.repRange.label} reps`),
          el("span", { class: "pill" }, `${analysis.rest.label} rest`),
          el("span", { class: "pill" }, `${targetRIR} RIR`),
          analysis.confidence !== "new"
            ? el("span", { class: "pill" }, `↑ ${analysis.progression.label}/session`)
            : null,
          perDB ? el("span", { class: "pill" }, "per dumbbell") : null,
        ),
      ),
    ),
  );

  if (analysis.fatigueWarning) {
    block.append(
      el("div", { class: "banner warning" }, `⚠️ ${analysis.fatigueWarning}`),
    );
  }

  if (prev) {
    block.append(
      el("div", { class: "muted small", style: { marginBottom: "0.5rem" } },
        `Last session: ${toDisplay(prev.weight)} ${unitLabel()} × ${prev.reps} @ ${prev.rir} RIR`,
        suggested ? ` · suggested ${toDisplay(suggested)} ${unitLabel()} ` : " ",
        el("a", { class: "small", href: `#/insights/${encodeURIComponent(ex.exercise)}` }, "Why?"),
      ),
    );
  } else {
    block.append(
      el("div", { class: "muted small", style: { marginBottom: "0.5rem" } },
        "First time logging this exercise in this meso."),
    );
  }

  // Est. 1RM + trend (from sessions before today), shown once we have a max.
  const today = isoToday();
  const priorSets = history.filter((s) => s.date < today);
  if (analysis.estimatedMax > 0) {
    const trend = e1rmTrend(sessionBestE1RMs(priorSets));
    const arrow = trend === "rising" ? " ↗" : trend === "falling" ? " ↘" : trend === "flat" ? " →" : "";
    block.append(
      el("div", { class: "muted small", style: { marginBottom: "0.5rem" } },
        `Est. 1RM ~${toDisplay(analysis.estimatedMax)} ${unitLabel()}${arrow}`),
    );
  }

  const setsContainer = el("div", {});
  const drafts = [];

  // Quick entry: type set shorthand (e.g. "225x5/5/4 r2") to fill the draft
  // rows below for review before logging. The exercise is fixed here, so any
  // leading name in the text is ignored.
  const quickInput = el("input", {
    type: "text", autocomplete: "off",
    placeholder: "Quick add — e.g. 225x5/5/4 r2",
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
    renderSets();
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
        for (const s of warmups) drafts.push({ weight: String(s.weight), reps: String(s.reps), rir: "", setType: "warmup" });
        for (const s of working) drafts.push({ weight: s.weight === "" ? "" : String(s.weight), reps: String(s.reps), rir: String(s.rir), setType: "working" });
        renderSets();
      },
    });
  }
  block.append(
    el("div", { class: "row", style: { gap: "0.4rem", marginBottom: "0.5rem" } },
      quickInput,
      el("button", { class: "btn small", onclick: applyQuick }, "Parse"),
      el("button", { type: "button", class: "btn small ghost", title: "Plan warm-ups + working sets", onclick: openPlanner }, "Plan"),
      el("button", { type: "button", class: "btn small ghost", title: "Plate calculator", onclick: () => openPlateModal(suggestedDisplay) }, "Plates"),
    ),
    errorsContainer,
    setsContainer,
  );

  function renderSets() {
    setsContainer.replaceChildren();
    setsContainer.append(
      el("div", { class: "set-row", style: { color: "var(--muted)", fontSize: "0.75rem" } },
        el("div", {}, "#"),
        el("div", {}, `Weight (${unitLabel()}${perDB ? ", per DB" : ""})`),
        el("div", {}, "Reps"),
        el("div", {}, "RIR"),
        el("div", {}, ""),
      ),
    );

    logged.forEach((s, i) => {
      if (editingSetId === s.id) {
        const ed = { weight: toDisplay(s.weight), reps: s.reps, rir: s.rir };
        const saveBtn = el("button", { class: "btn small primary" }, "Save");
        const cancelBtn = el("button", { class: "btn small" }, "Cancel");
        cancelBtn.onclick = () => { editingSetId = null; renderSets(); };
        saveBtn.onclick = withLoading(saveBtn, async () => {
          const weightLbs = fromDisplay(ed.weight);
          await run(data.updateSet(s.id, { weight: weightLbs, reps: ed.reps, rir: ed.rir }), { ok: "Updated" });
          s.weight = weightLbs; s.reps = ed.reps; s.rir = ed.rir;
          editingSetId = null;
          renderSets();
        });
        setsContainer.append(
          el("div", { class: "set-row editing" },
            el("div", { class: "idx" }, i + 1),
            el("input", { type: "number", inputmode: "decimal", step: "0.5", value: ed.weight, oninput: (e) => (ed.weight = e.target.value) }),
            el("input", { type: "number", inputmode: "numeric", value: ed.reps, oninput: (e) => (ed.reps = e.target.value) }),
            el("input", { type: "number", inputmode: "numeric", min: "0", max: "10", value: ed.rir, oninput: (e) => (ed.rir = e.target.value) }),
            el("div", { class: "set-actions" }, saveBtn, cancelBtn),
          ),
        );
      } else {
        setsContainer.append(
          el("div", { class: "set-row set-done" + (s.setType === "warmup" ? " set-warmup" : "") },
            el("div", { class: "idx" }, i + 1),
            el("div", {}, toDisplay(s.weight)),
            el("div", {}, s.reps),
            el("div", {}, s.rir),
            el("div", { class: "set-actions" },
              setTypeTag(s.setType),
              el("button", { class: "btn small ghost", "aria-label": "Edit set", onclick: () => { editingSetId = s.id; renderSets(); } }, "✏"),
              el("button", { class: "btn small danger ghost", "aria-label": "Delete set", onclick: () => {
                confirmModal("Delete this set?", async () => {
                  await run(data.deleteSet(s.id), { ok: "Set deleted" });
                  logged.splice(i, 1);
                  renderSets();
                });
              } }, "×"),
            ),
          ),
        );
      }
    });

    drafts.forEach((d, i) => {
      const setNo = logged.length + i + 1;
      const logBtn = el("button", { class: "btn small primary" }, "Log");
      logBtn.onclick = withLoading(logBtn, () => saveDraft(i));
      setsContainer.append(
        el("div", { class: "set-row" },
          el("div", { class: "idx" }, setNo),
          el("input", {
            type: "number", inputmode: "decimal", step: "0.5",
            placeholder: suggestedDisplay || "wt",
            value: d.weight,
            oninput: (e) => (d.weight = e.target.value),
          }),
          el("input", {
            type: "number", inputmode: "numeric",
            placeholder: prev?.reps || "reps",
            value: d.reps,
            oninput: (e) => (d.reps = e.target.value),
          }),
          el("input", {
            type: "number", inputmode: "numeric", min: "0", max: "10",
            placeholder: targetRIR,
            value: d.rir,
            oninput: (e) => (d.rir = e.target.value),
          }),
          el("div", { class: "set-actions" }, setTypeButton(d), logBtn),
        ),
      );
    });

    const loggedWorking = logged.filter((s) => countsAsWorking(s.setType)).length;
    const draftsWorking = drafts.filter((d) => countsAsWorking(d.setType)).length;
    const remaining = Math.max(0, setTarget - loggedWorking - draftsWorking);
    setsContainer.append(
      el("div", { class: "row", style: { marginTop: "0.6rem", justifyContent: "space-between" } },
        el("button", { class: "btn small", onclick: addDraft }, "+ Add set"),
        el("span", { class: "muted small" },
          remaining > 0 ? `${remaining} target set${remaining === 1 ? "" : "s"} remaining` : "Target met",
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
    const loggedWorking = logged.filter((s) => countsAsWorking(s.setType)).length;
    const draftsWorking = drafts.filter((d) => countsAsWorking(d.setType)).length;
    const remaining = Math.max(0, setTarget - loggedWorking - draftsWorking);
    if (remaining > 0 && !drafts.length) addDraft();
    renderSets();
    setTimeout(() => {
      const inputs = setsContainer.querySelectorAll(".set-row:last-of-type input");
      if (inputs.length) inputs[0].focus();
    }, 0);
  }

  if (!logged.length) addDraft();
  else renderSets();

  return block;
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

  const session = defaultSessionState();

  // Restore existing session metadata for today's custom workout.
  const existingSession = await data.getSession(CUSTOM_MESO_ID, 0, 0, isoToday());
  if (existingSession) {
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

  const toUnsaved = (set) => ({
    weight: set.weight != null ? String(set.weight) : "",
    reps: set.reps != null ? String(set.reps) : "",
    rir: set.rir != null ? String(set.rir) : "",
    saved: false,
  });

  const findEntry = (name) => exercises.find((e) => normalizeName(e.exercise) === normalizeName(name));

  // Freeform "workout focus": targeted muscle groups + per-session feedback.
  const targetGroups = new Set();
  const feedbackState = {};
  const coverageContainer = el("div", {});
  const feedbackContainer = el("div", {});

  const trainedCounts = () => {
    const counts = {};
    for (const ex of exercises) {
      const n = ex.sets.filter((s) => s.saved).length;
      if (n) counts[ex.muscleGroup] = (counts[ex.muscleGroup] || 0) + n;
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
      const sets = counts[g] || 0;
      const ref = MUSCLE_REFERENCE[g] || { sessionCap: [3, 8], repRange: "", rest: "" };
      const [lo, hi] = ref.sessionCap;
      const zone = sessionZone(sets, ref.sessionCap);
      const color = zone === "under" ? "var(--warn)" : zone === "over" ? "var(--accent)" : "var(--ok)";
      const pct = Math.min(100, Math.round((sets / Math.max(1, hi)) * 100));
      card.append(
        el("div", { style: { marginTop: "0.5rem" } },
          el("div", { class: "row", style: { justifyContent: "space-between" } },
            el("span", {}, el("strong", {}, formatMuscle(g)), targetGroups.has(g) ? null : el("span", { class: "muted small" }, " · extra")),
            el("span", { class: "muted small" }, `${sets} / ${lo}–${hi} sets`),
          ),
          el("div", { style: { height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden", marginTop: "0.2rem" } },
            el("div", { style: { width: pct + "%", height: "100%", background: color } }),
          ),
          ref.repRange ? el("div", { class: "muted small" }, `${ref.repRange} reps · ${ref.rest} rest`) : null,
        ),
      );
    }
    coverageContainer.append(card);
  }

  function renderFeedback() {
    feedbackContainer.replaceChildren();
    const muscles = Object.keys(trainedCounts());
    if (!muscles.length) return;
    for (const m of muscles) if (!feedbackState[m]) feedbackState[m] = { pump: 1, soreness: 1, jointPain: 0, performance: 2 };
    feedbackContainer.append(buildFeedbackCard(muscles, feedbackState));
  }

  const refreshLive = () => { renderCoverage(); renderFeedback(); };

  function buildFocusCard() {
    const card = el("section", { class: "card" }, el("h3", {}, "Workout focus"));
    const presetRow = el("div", { class: "chip-row" });
    for (const [name, groups] of Object.entries(WORKOUT_PRESETS)) {
      presetRow.append(el("button", { type: "button", class: "filter-chip", onclick: () => {
        targetGroups.clear();
        groups.forEach((g) => targetGroups.add(g));
        rerender();
      } }, name));
    }
    card.append(el("div", { class: "picker-filter-label" }, "Presets"), presetRow);
    for (const [region, members] of Object.entries(MUSCLE_REGIONS)) {
      const row = el("div", { class: "chip-row" });
      for (const g of members) {
        row.append(el("button", {
          type: "button",
          class: "filter-chip" + (targetGroups.has(g) ? " active" : ""),
          onclick: () => { targetGroups.has(g) ? targetGroups.delete(g) : targetGroups.add(g); rerender(); },
        }, formatMuscle(g.replace(/^Shoulders \((.*)\)$/, "$1"))));
      }
      card.append(el("div", { class: "picker-filter-label" }, region), row);
    }
    if (targetGroups.size) {
      card.append(el("button", { class: "btn small ghost", style: { marginTop: "0.4rem" }, onclick: () => { targetGroups.clear(); rerender(); } }, "Clear focus"));
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

  function rerender() {
    customRoot.replaceChildren();
    customRoot.append(
      el("p", { class: "muted" }, "Log sets for any exercise without a mesocycle plan."),
    );

    customRoot.append(buildSessionMetaForm(session, saveSessionMeta));
    customRoot.append(buildFocusCard());
    const suggestions = buildSuggestions();
    if (suggestions) customRoot.append(suggestions);
    customRoot.append(coverageContainer);

    const quickEx = el("input", {
      type: "text", autocomplete: "off",
      placeholder: "Quick log — e.g. bench 3x8 @185",
      style: { flex: "1" },
    });
    quickEx.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); quickAddExercise(quickEx.value); }
    });
    const addCard = el("section", { class: "card" },
      el("h3", {}, "Add exercise"),
      el("button", {
        class: "btn primary add-exercise-btn",
        onclick: () => openExercisePicker({
          exerciseLib,
          exclude: exercises.map((e) => e.exercise),
          onPick: ({ name, group }) => {
            if (exercises.some((e) => e.exercise === name)) return toast("Already added", "bad");
            exercises.push({ exercise: name, muscleGroup: group || "", sets: [] });
            rerender();
          },
        }),
      }, "+ Add exercise"),
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
      customRoot.append(el("p", { class: "muted" }, "Add exercises above to start logging."));
      renderCoverage();
      return;
    }

    for (const ex of exercises) {
      customRoot.append(buildCustomBlock(ex, refreshLive));
    }

    customRoot.append(feedbackContainer);
    refreshLive();

    const finishBtn = el("button", { class: "btn primary finish-btn" }, "Finish Workout");
    finishBtn.onclick = withLoading(finishBtn, async () => {
      if (!session.endTime) {
        session.endTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      }
      await saveSessionMeta();
      const muscles = Object.keys(trainedCounts());
      if (muscles.length) {
        await run(data.logSessionFeedback({
          mesoId: CUSTOM_MESO_ID, week: 0, dayIndex: 0, date: isoToday(),
          feedback: muscles.map((m) => ({ muscleGroup: m, ...(feedbackState[m] || { pump: 1, soreness: 1, jointPain: 0, performance: 2 }) })),
        }), { ok: "Workout saved" });
      }
      onFinish();
    });
    customRoot.append(finishBtn);
  }

  function buildCustomBlock(ex, refreshLive) {
    let editingSetId = null;
    const equipment = exerciseLib.find((e) => normalizeName(e.name) === normalizeName(ex.exercise))?.equipment || "";
    const perDB = isDumbbell(equipment);
    const block = el("div", { class: "exercise-block" });
    block.append(
      el("div", { class: "exercise-head" },
        el("div", {},
          el("h3", {}, ex.exercise),
          el("div", { class: "exercise-meta" },
            el("span", { class: "pill" }, formatMuscle(ex.muscleGroup)),
            perDB ? el("span", { class: "pill" }, "per dumbbell") : null,
            MUSCLE_REFERENCE[ex.muscleGroup]
              ? el("span", { class: "muted small" }, `${MUSCLE_REFERENCE[ex.muscleGroup].repRange} reps · ${MUSCLE_REFERENCE[ex.muscleGroup].rest} rest`)
              : null,
          ),
        ),
        el("button", {
          class: "btn small danger ghost",
          onclick: () => {
            exercises.splice(exercises.indexOf(ex), 1);
            rerender();
          },
        }, "Remove"),
      ),
    );

    // Est. 1RM + trend from sessions before today.
    const today = isoToday();
    const priorSets = allSets.filter((s) => s.exercise === ex.exercise && s.date < today);
    const priorBests = sessionBestE1RMs(priorSets);
    const estMax = priorBests.length ? Math.max(...priorBests) : 0;
    if (estMax > 0) {
      const trend = e1rmTrend(priorBests);
      const arrow = trend === "rising" ? " ↗" : trend === "falling" ? " ↘" : trend === "flat" ? " →" : "";
      block.append(
        el("div", { class: "muted small", style: { marginBottom: "0.5rem" } },
          `Est. 1RM ~${toDisplay(Math.round(estMax * 10) / 10)} ${unitLabel()}${arrow}`),
      );
    }

    const setsContainer = el("div", {});

    // Quick add for an exercise already in the list: set-only shorthand fills
    // unsaved rows for review (any leading name in the text is ignored here).
    const blockQuick = el("input", {
      type: "text", autocomplete: "off",
      placeholder: "Quick add — e.g. 225x5/5/4 r2",
      style: { flex: "1" },
    });
    const blockErrors = el("div", {});
    const pushBlock = (sets) => {
      for (const set of sets) ex.sets.push(toUnsaved(set));
    };
    const lastSavedWeightLbs = () => {
      const last = ex.sets.filter((s) => s.saved).pop();
      return last ? +last.weight : null;
    };
    function applyBlockQuick() {
      const res = parseSets(blockQuick.value);
      if (!res.sets.length && !res.errors.length) return toast("Nothing to parse", "bad");
      pushBlock(res.sets);
      blockErrors.replaceChildren(buildUnparsedPanel(res.errors, pushBlock, renderSets));
      blockQuick.value = "";
      renderSets();
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
          renderSets();
        },
      });
    }
    block.append(
      el("div", { class: "row", style: { gap: "0.4rem", marginBottom: "0.5rem" } },
        blockQuick,
        el("button", { class: "btn small", onclick: applyBlockQuick }, "Parse"),
        el("button", { type: "button", class: "btn small ghost", title: "Plan warm-ups + working sets", onclick: openPlanner }, "Plan"),
        el("button", { type: "button", class: "btn small ghost", title: "Plate calculator", onclick: () => openPlateModal(lastSavedWeightLbs() ? toDisplay(lastSavedWeightLbs()) : "") }, "Plates"),
      ),
      blockErrors,
      setsContainer,
    );

    function renderSets() {
      setsContainer.replaceChildren();
      setsContainer.append(
        el("div", { class: "set-row", style: { color: "var(--muted)", fontSize: "0.75rem" } },
          el("div", {}, "#"),
          el("div", {}, `Weight (${unitLabel()}${perDB ? ", per DB" : ""})`),
          el("div", {}, "Reps"),
          el("div", {}, "RIR"),
          el("div", {}, ""),
        ),
      );

      ex.sets.forEach((s, i) => {
        if (s.saved && editingSetId === s.id) {
          const ed = { weight: toDisplay(s.weight), reps: s.reps, rir: s.rir };
          const saveBtn = el("button", { class: "btn small primary" }, "Save");
          const cancelBtn = el("button", { class: "btn small" }, "Cancel");
          cancelBtn.onclick = () => { editingSetId = null; renderSets(); };
          saveBtn.onclick = withLoading(saveBtn, async () => {
            const weightLbs = fromDisplay(ed.weight);
            await run(data.updateSet(s.id, { weight: weightLbs, reps: ed.reps, rir: ed.rir }), { ok: "Updated" });
            s.weight = weightLbs; s.reps = ed.reps; s.rir = ed.rir;
            editingSetId = null;
            renderSets();
            refreshLive?.();
          });
          setsContainer.append(
            el("div", { class: "set-row editing" },
              el("div", { class: "idx" }, i + 1),
              el("input", { type: "number", inputmode: "decimal", step: "0.5", value: ed.weight, oninput: (e) => (ed.weight = e.target.value) }),
              el("input", { type: "number", inputmode: "numeric", value: ed.reps, oninput: (e) => (ed.reps = e.target.value) }),
              el("input", { type: "number", inputmode: "numeric", min: "0", max: "10", value: ed.rir, oninput: (e) => (ed.rir = e.target.value) }),
              el("div", { class: "set-actions" }, saveBtn, cancelBtn),
            ),
          );
        } else if (s.saved) {
          setsContainer.append(
            el("div", { class: "set-row set-done" + (s.setType === "warmup" ? " set-warmup" : "") },
              el("div", { class: "idx" }, i + 1),
              el("div", {}, toDisplay(s.weight)),
              el("div", {}, s.reps),
              el("div", {}, s.rir),
              el("div", { class: "set-actions" },
                setTypeTag(s.setType),
                el("button", { class: "btn small ghost", "aria-label": "Edit set", onclick: () => { editingSetId = s.id; renderSets(); } }, "✏"),
                el("button", { class: "btn small danger ghost", "aria-label": "Delete set", onclick: () => {
                  confirmModal("Delete this set?", async () => {
                    await run(data.deleteSet(s.id), { ok: "Set deleted" });
                    ex.sets.splice(i, 1);
                    renderSets();
                    refreshLive?.();
                  });
                } }, "×"),
              ),
            ),
          );
        } else {
          const logBtn = el("button", { class: "btn small primary" }, "Log");
          logBtn.onclick = withLoading(logBtn, async () => {
            if (!s.weight || !s.reps) return toast("Need weight and reps", "bad");
            const saved = await run(
              data.logSet({
                mesoId: CUSTOM_MESO_ID,
                week: 0,
                dayIndex: 0,
                exercise: ex.exercise,
                muscleGroup: ex.muscleGroup,
                setNumber: i + 1,
                weight: fromDisplay(s.weight),
                reps: +s.reps,
                rir: +(s.rir || 0),
                setType: s.setType || "working",
                date: isoToday(),
              }),
              { ok: "Set logged" },
            );
            s.id = saved.id;
            s.weight = fromDisplay(s.weight);
            s.saved = true;
            if (s.setType !== "warmup") startRest(restSecondsFor(ex.muscleGroup));
            renderSets();
            refreshLive?.();
          });
          setsContainer.append(
            el("div", { class: "set-row" },
              el("div", { class: "idx" }, i + 1),
              el("input", {
                type: "number", inputmode: "decimal", step: "0.5",
                placeholder: "wt", value: s.weight,
                oninput: (e) => (s.weight = e.target.value),
              }),
              el("input", {
                type: "number", inputmode: "numeric",
                placeholder: "reps", value: s.reps,
                oninput: (e) => (s.reps = e.target.value),
              }),
              el("input", {
                type: "number", inputmode: "numeric", min: "0", max: "10",
                placeholder: "RIR", value: s.rir,
                oninput: (e) => (s.rir = e.target.value),
              }),
              el("div", { class: "set-actions" }, setTypeButton(s), logBtn),
            ),
          );
        }
      });

      setsContainer.append(
        el("button", {
          class: "btn small", style: { marginTop: "0.6rem" },
          onclick: () => {
            const prev = ex.sets.filter((s) => s.saved).pop();
            ex.sets.push({
              weight: prev ? String(toDisplay(prev.weight)) : "",
              reps: prev?.reps || "",
              rir: prev?.rir || "",
              saved: false,
            });
            renderSets();
          },
        }, "+ Add set"),
      );
    }

    if (!ex.sets.some((s) => !s.saved)) {
      ex.sets.push({ weight: "", reps: "", rir: "", saved: false });
    }
    renderSets();
    return block;
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

  // Muscles
  const muscleMap = {};
  for (const s of todaySets) {
    muscleMap[s.muscleGroup] = (muscleMap[s.muscleGroup] || 0) + 1;
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
  summary.append(el("h2", {}, "Workout Complete"));

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
        ...muscleEntries.map(([g, n]) => el("span", { class: "pill small" }, `${formatMuscle(g)} (${n})`)),
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

