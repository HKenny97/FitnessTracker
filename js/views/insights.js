import { el, run, withLoading, formatMuscle } from "../ui.js";
import * as data from "../data.js";
import { analyze, adaptiveSuggestWeight, e1rmTrend, sessionBestE1RMs } from "../adaptive.js";
import { toDisplay, unitLabel } from "../units.js";
import { buildVolumeSuggestionCard } from "./workout.js";

// Most recent session's top (heaviest) set from a flat, warm-up-free history.
function lastTopSet(history) {
  if (!history.length) return null;
  const lastDate = [...new Set(history.map((s) => s.date))].sort().pop();
  const day = history.filter((s) => s.date === lastDate);
  let top = day[0];
  for (const s of day) if (+s.weight > +top.weight) top = s;
  return { weight: +top.weight, reps: +top.reps, rir: +top.rir, date: top.date };
}

// Plain-language walkthrough of the weight suggestion math (mirrors
// adaptiveSuggestWeight). Returns an array of lines + the final suggestion.
function explainSuggestion(prev, targetReps, targetRIR, rate, suggested) {
  const u = unitLabel();
  const lines = [];
  if (!prev) { lines.push("No prior set yet — log a session to calibrate a suggestion."); return lines; }
  lines.push(`Last top set: ${toDisplay(prev.weight)} ${u} × ${prev.reps} @ ${prev.rir} RIR.`);
  if (prev.reps < targetReps) {
    lines.push(`Reps (${prev.reps}) were below target (${targetReps}) — hold the weight.`);
    return lines;
  }
  const buffer = prev.rir - targetRIR;
  const mult = buffer >= 2 ? 2 : buffer >= 1 ? 1.5 : buffer >= 0 ? 1 : 0;
  lines.push(`Buffer = last RIR ${prev.rir} − target RIR ${targetRIR} = ${buffer}.`);
  if (mult === 0) lines.push("Buffer is negative (harder than target) — hold the weight.");
  else lines.push(`Buffer applies ${mult}× the progression rate (${(rate * 100).toFixed(1)}%/session).`);
  if (suggested != null) lines.push(`Suggested next: ${toDisplay(suggested)} ${u}.`);
  return lines;
}

// Horizontal MV→MRV landmark band with the current target marked.
function landmarkBar(lm, target) {
  if (!lm || !lm.MRV) return null;
  const max = lm.MRV * 1.1;
  const pct = (v) => Math.min(100, Math.max(0, (v / max) * 100));
  const seg = (from, to, color) => el("div", {
    style: { position: "absolute", left: pct(from) + "%", width: (pct(to) - pct(from)) + "%", top: 0, bottom: 0, background: color },
  });
  return el("div", {},
    el("div", { style: { position: "relative", height: "10px", borderRadius: "5px", overflow: "hidden", background: "var(--panel-2)" } },
      seg(lm.MEV, lm.MAV_hi, "rgba(57,181,74,0.35)"),
      seg(lm.MAV_hi, lm.MRV, "rgba(246,183,60,0.35)"),
      el("div", { style: { position: "absolute", left: pct(target) + "%", top: "-2px", bottom: "-2px", width: "2px", background: "var(--text)" } }),
    ),
    el("div", { class: "muted small" }, `MEV ${lm.MEV} · MAV ${lm.MAV_lo}–${lm.MAV_hi} · MRV ${lm.MRV} · target ${target}`),
  );
}

export async function render(container, params = {}) {
  container.append(el("div", { class: "section-title" }, el("h1", {}, "Insights")));

  const [allSets, activeMeso, overridesMap] = await Promise.all([
    data.listSets(),
    data.getActiveMesocycle(),
    data.getExerciseOverrides(),
  ]);

  // Exercises that have logged history, most-recently-trained first.
  const lastDateByEx = {};
  for (const s of allSets) {
    if (s.setType === "warmup") continue;
    if (!lastDateByEx[s.exercise] || s.date > lastDateByEx[s.exercise]) lastDateByEx[s.exercise] = s.date;
  }
  const exercises = Object.keys(lastDateByEx).sort((a, b) => lastDateByEx[b].localeCompare(lastDateByEx[a]));

  let chosen = params.exercise && decodeURIComponent(params.exercise);
  if (!chosen || !lastDateByEx[chosen]) chosen = exercises[0] || null;

  if (!chosen) {
    container.append(el("div", { class: "empty-state" },
      el("div", { class: "es-icon" }, "📊"),
      el("p", {}, "Log some sets first — then this screen explains how your weights and volume are decided."),
      el("a", { class: "btn primary", href: "#/workout" }, "Start a workout"),
    ));
    return;
  }

  // Exercise picker.
  const picker = el("select", {
    onchange: (e) => { location.hash = `#/insights/${encodeURIComponent(e.target.value)}`; },
  }, ...exercises.map((name) => el("option", { value: name, selected: name === chosen ? "" : null }, name)));
  container.append(el("section", { class: "card" },
    el("label", { class: "muted small" }, "Exercise"), picker));

  const exerciseSection = el("div", {});
  container.append(exerciseSection);
  await renderExerciseInsights(exerciseSection, chosen, overridesMap[chosen.toLowerCase()] || null);

  // Volume decisions (active meso).
  if (activeMeso) {
    await renderVolumeInsights(container, activeMeso);
  }

  // Recent PRs.
  const prs = await data.getRecentPRs(5);
  if (prs.length) {
    const card = el("section", { class: "card" }, el("h3", {}, "Recent PRs"));
    for (const pr of prs) {
      card.append(el("div", { class: "row", style: { justifyContent: "space-between", padding: "0.2rem 0" } },
        el("span", {}, pr.exercise),
        el("span", { class: "muted small" }, `${toDisplay(+pr.weight)} ${unitLabel()} × ${pr.reps} · ${pr.date}`),
      ));
    }
    card.append(el("a", { class: "muted small", href: "#/history" }, "See full history →"));
    container.append(card);
  }
}

async function renderExerciseInsights(root, exercise, override) {
  root.replaceChildren();
  const history = await data.getExerciseHistory(exercise);
  const analysis = analyze(exercise, history, override || {});
  const prev = lastTopSet(history);
  const targetRIR = override && override.targetRIR != null ? override.targetRIR : 2;
  const suggested = prev ? adaptiveSuggestWeight(prev, analysis.repRange.min, targetRIR, exercise, history, override || {}) : null;

  const card = el("section", { class: "card" },
    el("h3", {}, exercise),
    el("div", { class: "exercise-meta" },
      el("span", { class: "pill" }, `${analysis.confidence} · ${analysis.sessionCount} sessions`),
      el("span", { class: "pill" }, `${analysis.repRange.label} reps${analysis.repRange.source === "manual" ? " (manual)" : ""}`),
      el("span", { class: "pill" }, `${analysis.rest.label} rest`),
      el("span", { class: "pill" }, `${targetRIR} RIR${override && override.targetRIR != null ? " (manual)" : ""}`),
    ),
  );

  // Progression breakdown.
  const p = analysis.progression;
  const progLines = [`Progression rate: ${p.label}/session (${p.source}).`];
  if (p.source === "blended" || p.source === "personal") {
    progLines.push(`Your measured rate ${p.personal} blended with the ${p.default} default by session count.`);
  } else if (p.source === "manual") {
    progLines.push("Manually set — overrides the learned rate.");
  } else {
    progLines.push("Using the exercise's default rate until enough sessions are logged.");
  }
  card.append(el("div", { style: { marginTop: "0.5rem" } }, ...progLines.map((t) => el("div", { class: "muted small" }, t))));

  // Weight-suggestion walkthrough.
  card.append(el("h4", { class: "small", style: { marginTop: "0.75rem" } }, "Why this weight"));
  card.append(...explainSuggestion(prev, analysis.repRange.min, targetRIR, p.rate, suggested).map((t) => el("div", { class: "muted small" }, t)));

  // e1RM + trend + fatigue.
  if (analysis.estimatedMax > 0) {
    const trend = e1rmTrend(sessionBestE1RMs(history));
    const arrow = trend === "rising" ? " ↗" : trend === "falling" ? " ↘" : trend === "flat" ? " →" : "";
    card.append(el("div", { class: "muted small", style: { marginTop: "0.5rem" } }, `Est. 1RM ~${toDisplay(analysis.estimatedMax)} ${unitLabel()}${arrow}`));
  }
  if (analysis.fatigueWarning) {
    card.append(el("div", { class: "banner warning", style: { marginTop: "0.5rem" } }, `⚠️ ${analysis.fatigueWarning}`));
  }

  // Adjust controls (per-exercise overrides).
  card.append(el("h4", { class: "small", style: { marginTop: "0.75rem" } }, "Tune this exercise"));
  const ratePct = override && override.progressionRate != null ? +(override.progressionRate * 100).toFixed(2) : "";
  const rateInp = el("input", { type: "number", step: "0.1", min: "0", value: ratePct, placeholder: (analysis.progression.rate * 100).toFixed(1) });
  const minInp = el("input", { type: "number", min: "1", value: override && override.repMin != null ? override.repMin : "", placeholder: analysis.repRange.min });
  const maxInp = el("input", { type: "number", min: "1", value: override && override.repMax != null ? override.repMax : "", placeholder: analysis.repRange.max });
  const rirInp = el("input", { type: "number", min: "0", max: "10", value: override && override.targetRIR != null ? override.targetRIR : "", placeholder: targetRIR });
  const field = (label, inp) => el("div", { class: "field", style: { flex: "1" } }, el("label", { class: "muted small" }, label), inp);

  const saveBtn = el("button", { class: "btn small primary" }, "Save overrides");
  saveBtn.onclick = withLoading(saveBtn, async () => {
    const rate = rateInp.value === "" ? "" : (+rateInp.value) / 100;
    await run(data.saveExerciseOverride(exercise, {
      progressionRate: rate, repMin: minInp.value, repMax: maxInp.value, targetRIR: rirInp.value,
    }), { ok: "Overrides saved" });
    const fresh = await data.getExerciseOverride(exercise);
    await renderExerciseInsights(root, exercise, fresh);
  });
  const resetBtn = el("button", { class: "btn small ghost" }, "Reset to auto");
  resetBtn.onclick = withLoading(resetBtn, async () => {
    await run(data.saveExerciseOverride(exercise, {}), { ok: "Reset to auto" });
    await renderExerciseInsights(root, exercise, null);
  });

  card.append(
    el("div", { class: "field-row", style: { gap: "0.4rem", marginTop: "0.4rem" } },
      field(`Rate %${"/"}session`, rateInp), field("Rep min", minInp), field("Rep max", maxInp), field("Target RIR", rirInp),
    ),
    el("p", { class: "muted small" }, "Leave a field blank to use the automatic value (shown as the placeholder)."),
    el("div", { class: "row", style: { gap: "0.4rem" } }, saveBtn, resetBtn),
  );
  root.append(card);
}

async function renderVolumeInsights(container, activeMeso) {
  const start = new Date(activeMeso.startDate);
  const daysIn = Math.floor((Date.now() - start.getTime()) / 86400000);
  const week = Math.min(+activeMeso.weeks, Math.max(1, Math.floor(daysIn / 7) + 1));

  const [plan, weekVol, landmarks] = await Promise.all([
    data.getEffectiveWeekPlan(activeMeso.id),
    data.weeklyVolume(activeMeso.id, week),
    data.getLandmarks(),
  ]);
  const planThis = plan.filter((p) => p.week === week);
  if (!planThis.length) return;

  const card = el("section", { class: "card" },
    el("h3", {}, "Why this volume"),
    el("p", { class: "muted small" }, `${activeMeso.name} · week ${week}. Targets come from your MEV→MRV landmarks; bars show where each muscle's target sits and what you've logged.`),
  );
  for (const p of planThis) {
    const lm = landmarks[p.muscleGroup];
    const done = weekVol[p.muscleGroup] || 0;
    card.append(el("div", { style: { marginTop: "0.6rem" } },
      el("div", { class: "row", style: { justifyContent: "space-between" } },
        el("strong", {}, formatMuscle(p.muscleGroup)),
        el("span", { class: "muted small" }, `${done}/${p.targetSets} sets · ${p.targetRIR} RIR`),
      ),
      landmarkBar(lm, p.targetSets),
    ));
  }
  card.append(el("a", { class: "muted small", href: "#/settings" }, "Edit landmarks in Settings →"));
  container.append(card);

  // Pending recommendations from last week's feedback (shared card).
  const wrap = el("div", {});
  container.append(wrap);
  const refresh = async () => {
    const items = await data.getVolumeSuggestions(activeMeso.id, week);
    const c = buildVolumeSuggestionCard(items, { mesoId: activeMeso.id, week, onChange: refresh });
    wrap.replaceChildren(...(c ? [c] : []));
  };
  await refresh();
}
