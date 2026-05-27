import * as sheets from "./sheets.js";
import { isoToday } from "./ui.js";
import {
  DEFAULT_LANDMARKS,
  EXERCISE_LIBRARY,
  MUSCLE_GROUPS,
  progressRIR,
  progressSets,
  epley1RM,
  suggestSetAdjustment,
  exerciseSecondary,
} from "./rp.js";
import { resolvePlanForWeek } from "./goals.js";

export const CUSTOM_MESO_ID = "_custom";

const cache = new Map();
function invalidate(key) { cache.delete(key); }
async function cached(key, loader) {
  if (!cache.has(key)) cache.set(key, await loader());
  return cache.get(key);
}
export function clearCaches() { cache.clear(); }

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Volume landmarks: stored per muscle group. If the sheet is empty we
// seed it with RP defaults.
export async function getLandmarks() {
  return cached("landmarks", async () => {
    let rows = await sheets.readAll("landmarks");
    if (!rows.length) {
      const seed = MUSCLE_GROUPS.map((g) => ({
        muscleGroup: g,
        ...DEFAULT_LANDMARKS[g],
      }));
      await sheets.appendRows("landmarks", seed);
      rows = seed;
    }
    const map = {};
    for (const r of rows) {
      map[r.muscleGroup] = {
        MV: +r.MV || 0,
        MEV: +r.MEV || 0,
        MAV_lo: +r.MAV_lo || 0,
        MAV_hi: +r.MAV_hi || 0,
        MRV: +r.MRV || 0,
      };
    }
    return map;
  });
}

export async function saveLandmark(muscleGroup, values) {
  await sheets.upsertRow("landmarks", "muscleGroup", {
    muscleGroup,
    ...values,
  });
  invalidate("landmarks");
}

// ── Training profile ──
// Stored as a JSON blob in the Meta tab (key/value) under "trainingProfile", so
// it syncs across devices alongside the rest of the workbook. computeLandmarks()
// turns it into suggested volume landmarks. Returns null when never set.
export async function getTrainingProfile() {
  return cached("trainingProfile", async () => {
    const rows = await sheets.readAll("meta");
    const row = rows.find((r) => r.key === "trainingProfile");
    if (!row || !row.value) return null;
    try { return JSON.parse(row.value); } catch { return null; }
  });
}

export async function saveTrainingProfile(profile) {
  await sheets.upsertRow("meta", "key", {
    key: "trainingProfile",
    value: JSON.stringify(profile || {}),
  });
  invalidate("trainingProfile");
}

// ── Weekly Muscle Goals ("light meso") ──
// Day rows live in the WeeklyGoals tab. weekStart === "" is the recurring
// default plan; a Monday ISO date is a per-week override for that week.

export async function getWeeklyGoals() {
  return cached("weeklyGoals", () => sheets.readAll("weeklyGoals"));
}

// The ordered training days that apply to the given week (override rows for that
// week, else the recurring default). Returns day objects with parsed groups.
export async function getEffectiveWeeklyPlan(weekStart = "") {
  const rows = await getWeeklyGoals();
  return resolvePlanForWeek(rows, weekStart);
}

// Replace one weekStart bucket (default or a specific week) with `days`, leaving
// other buckets untouched. `days` is [{ weekday, dayName, groups[] }].
export async function saveWeeklyPlan(days, { weekStart = "" } = {}) {
  const all = await sheets.readAll("weeklyGoals");
  const kept = all.filter((r) => (r.weekStart || "") !== weekStart);
  const fresh = (days || []).map((d) => ({
    weekStart,
    weekday: d.weekday,
    dayName: d.dayName || "",
    groups: (d.groups || []).join("|"),
  }));
  await sheets.replaceAll("weeklyGoals", [...kept, ...fresh]);
  invalidate("weeklyGoals");
}

// Mesocycles.
export async function listMesocycles() {
  return cached("mesocycles", () => sheets.readAll("mesocycles"));
}

export async function getMesocycle(id) {
  const all = await listMesocycles();
  return all.find((m) => m.id === id) || null;
}

export async function createMesocycle({ name, startDate, weeks, days, notes }) {
  const id = newId();
  const meso = {
    id,
    name,
    startDate,
    weeks: String(weeks),
    status: "active",
    notes: notes || "",
    createdAt: new Date().toISOString(),
  };
  await sheets.appendRow("mesocycles", meso);
  invalidate("mesocycles");

  // Template days.
  const dayRows = days.map((d, i) => ({
    mesoId: id,
    dayIndex: i,
    dayName: d.name,
  }));
  await sheets.appendRows("templateDays", dayRows);
  invalidate("templateDays");

  // Template exercises.
  const exRows = [];
  for (let di = 0; di < days.length; di++) {
    const ex = days[di].exercises || [];
    ex.forEach((e, ei) => {
      exRows.push({
        mesoId: id,
        dayIndex: di,
        exerciseIndex: ei,
        exercise: e.exercise,
        muscleGroup: e.muscleGroup,
        notes: e.notes || "",
      });
    });
  }
  if (exRows.length) await sheets.appendRows("templateExercises", exRows);
  invalidate("templateExercises");

  // Weekly volume plan per muscle group present in the template.
  const landmarks = await getLandmarks();
  const groupsInPlan = [
    ...new Set(exRows.map((r) => r.muscleGroup).filter(Boolean)),
  ];
  const planRows = [];
  const rirByWeek = progressRIR(weeks);
  for (const g of groupsInPlan) {
    const lm = landmarks[g] || DEFAULT_LANDMARKS[g] || {
      MV: 0, MEV: 8, MAV_lo: 12, MAV_hi: 18, MRV: 22,
    };
    const sets = progressSets(lm.MEV, lm.MRV, weeks);
    for (let w = 0; w < weeks; w++) {
      planRows.push({
        mesoId: id,
        week: w + 1,
        muscleGroup: g,
        targetSets: sets[w],
        targetRIR: rirByWeek[w],
        isDeload: w === weeks - 1,
      });
    }
  }
  if (planRows.length) await sheets.appendRows("weekPlan", planRows);
  invalidate("weekPlan");

  return id;
}

export async function setMesocycleStatus(id, status) {
  if (status === "active") {
    const all = await listMesocycles();
    for (const m of all) {
      if (m.id !== id && m.status === "active") {
        await sheets.upsertRow("mesocycles", "id", { id: m.id, status: "completed" });
      }
    }
  }
  await sheets.upsertRow("mesocycles", "id", { id, status });
  invalidate("mesocycles");
}

export async function getActiveMesocycle() {
  const all = await listMesocycles();
  return all.find((m) => m.status === "active") || null;
}

// Template days + exercises for a meso.
export async function getTemplate(mesoId) {
  const [days, ex] = await Promise.all([
    cached("templateDays", () => sheets.readAll("templateDays")),
    cached("templateExercises", () => sheets.readAll("templateExercises")),
  ]);
  const myDays = days
    .filter((d) => d.mesoId === mesoId)
    .sort((a, b) => +a.dayIndex - +b.dayIndex)
    .map((d) => ({
      index: +d.dayIndex,
      name: d.dayName,
      exercises: ex
        .filter((e) => e.mesoId === mesoId && +e.dayIndex === +d.dayIndex)
        .sort((a, b) => +a.exerciseIndex - +b.exerciseIndex)
        .map((e) => ({
          index: +e.exerciseIndex,
          exercise: e.exercise,
          muscleGroup: e.muscleGroup,
          notes: e.notes,
        })),
    }));
  return myDays;
}

// Weekly plan rows for a meso.
export async function getWeekPlan(mesoId) {
  const rows = await cached("weekPlan", () => sheets.readAll("weekPlan"));
  return rows
    .filter((r) => r.mesoId === mesoId)
    .map((r) => ({
      week: +r.week,
      muscleGroup: r.muscleGroup,
      targetSets: +r.targetSets,
      targetRIR: +r.targetRIR,
      isDeload: String(r.isDeload).toUpperCase() === "TRUE",
    }));
}

// ── RP autoregulation: per-session feedback + weekly set-target overlay ──

// feedback: [{ muscleGroup, pump, soreness, jointPain, performance }] (0–3).
export async function logSessionFeedback({ mesoId, week, dayIndex, date, feedback }) {
  const rows = (feedback || [])
    .filter((f) => f && f.muscleGroup)
    .map((f) => ({
      id: newId(),
      mesoId, week, dayIndex, date: date || isoToday(),
      muscleGroup: f.muscleGroup,
      pump: f.pump ?? "",
      soreness: f.soreness ?? "",
      jointPain: f.jointPain ?? "",
      performance: f.performance ?? "",
    }));
  if (!rows.length) return;
  await sheets.appendRows("sessionFeedback", rows);
  invalidate("sessionFeedback");
}

export async function getSessionFeedback(mesoId) {
  const rows = await cached("sessionFeedback", () => sheets.readAll("sessionFeedback"));
  return rows
    .filter((r) => r.mesoId === mesoId)
    .map((r) => ({
      week: +r.week,
      dayIndex: +r.dayIndex,
      date: r.date,
      muscleGroup: r.muscleGroup,
      pump: +r.pump || 0,
      soreness: +r.soreness || 0,
      jointPain: +r.jointPain || 0,
      performance: r.performance === "" ? null : +r.performance,
    }));
}

const adjustmentId = (mesoId, week, muscleGroup) => `${mesoId}|${week}|${muscleGroup}`;

export async function getWeekPlanAdjustments(mesoId) {
  const rows = await cached("weekPlanAdjustments", () => sheets.readAll("weekPlanAdjustments"));
  return rows
    .filter((r) => r.mesoId === mesoId)
    .map((r) => ({ week: +r.week, muscleGroup: r.muscleGroup, deltaSets: +r.deltaSets || 0, reason: r.reason }));
}

export async function saveWeekPlanAdjustment({ mesoId, week, muscleGroup, deltaSets, reason }) {
  await sheets.upsertRow("weekPlanAdjustments", "id", {
    id: adjustmentId(mesoId, week, muscleGroup),
    mesoId, week, muscleGroup,
    deltaSets, reason: reason || "",
    createdAt: new Date().toISOString(),
  });
  invalidate("weekPlanAdjustments");
}

// Per-muscle volume recommendations for `week`, derived from the prior week's
// feedback, performed volume, and landmarks via suggestSetAdjustment. Excludes
// "hold" outcomes and muscles already adjusted this week. Each item also carries
// the feedback averages + performed/target sets so the UI can explain the call.
// Shared by the workout view and the dashboard.
export async function getVolumeSuggestions(mesoId, week) {
  if (+week < 2) return [];
  const prevWeek = +week - 1;
  const [feedback, landmarks, effPlan, prevVol, adjustments] = await Promise.all([
    getSessionFeedback(mesoId),
    getLandmarks(),
    getEffectiveWeekPlan(mesoId),
    weeklyVolume(mesoId, prevWeek),
    getWeekPlanAdjustments(mesoId),
  ]);
  const acceptedThisWeek = new Set(adjustments.filter((a) => a.week === +week).map((a) => a.muscleGroup));
  const planThis = effPlan.filter((p) => p.week === +week);
  const items = [];
  for (const p of planThis) {
    if (acceptedThisWeek.has(p.muscleGroup)) continue;
    const fb = feedback.filter((f) => f.week === prevWeek && f.muscleGroup === p.muscleGroup);
    if (!fb.length) continue;
    const avg = (k) => Math.round(fb.reduce((n, f) => n + (f[k] || 0), 0) / fb.length);
    const perfVals = fb.map((f) => f.performance).filter((v) => v != null);
    const feedbackAvg = {
      pump: avg("pump"), soreness: avg("soreness"), jointPain: avg("jointPain"),
      performance: perfVals.length ? Math.round(perfVals.reduce((a, b) => a + b, 0) / perfVals.length) : 2,
    };
    const prevTarget = effPlan.find((x) => x.week === prevWeek && x.muscleGroup === p.muscleGroup)?.targetSets ?? p.targetSets;
    const vol = prevVol[p.muscleGroup];
    const performedSets = vol ? vol.direct + vol.indirect : 0;
    const sug = suggestSetAdjustment({
      feedback: feedbackAvg,
      performedSets,
      targetSets: prevTarget,
      landmark: landmarks[p.muscleGroup] || {},
    });
    if (sug.deltaSets === 0 && sug.action !== "deload") continue;
    items.push({ muscleGroup: p.muscleGroup, ...sug, feedback: feedbackAvg, performedSets, prevTarget });
  }
  return items;
}

// ── Per-exercise manual overrides for the adaptive engine ──
// Map keyed by lowercased exercise name. Empty cells mean "use the auto value".

export async function getExerciseOverrides() {
  const rows = await cached("exerciseOverrides", () => sheets.readAll("exerciseOverrides"));
  const map = {};
  for (const r of rows) {
    if (!r.exercise) continue;
    map[r.exercise.toLowerCase()] = {
      exercise: r.exercise,
      progressionRate: r.progressionRate === "" || r.progressionRate == null ? null : +r.progressionRate,
      repMin: r.repMin === "" || r.repMin == null ? null : +r.repMin,
      repMax: r.repMax === "" || r.repMax == null ? null : +r.repMax,
      targetRIR: r.targetRIR === "" || r.targetRIR == null ? null : +r.targetRIR,
    };
  }
  return map;
}

export async function getExerciseOverride(exercise) {
  const map = await getExerciseOverrides();
  return map[(exercise || "").toLowerCase()] || null;
}

// Save (upsert) overrides for one exercise. Pass null/"" for a field to clear it.
export async function saveExerciseOverride(exercise, fields = {}) {
  const cell = (v) => (v == null || v === "" ? "" : v);
  await sheets.upsertRow("exerciseOverrides", "exercise", {
    exercise,
    progressionRate: cell(fields.progressionRate),
    repMin: cell(fields.repMin),
    repMax: cell(fields.repMax),
    targetRIR: cell(fields.targetRIR),
    updatedAt: new Date().toISOString(),
  });
  invalidate("exerciseOverrides");
}

// Week plan with accepted adjustments folded into targetSets (clamped >= 0).
// Single seam used by the workout view, dashboard, and meso preview.
export async function getEffectiveWeekPlan(mesoId) {
  const [plan, adjustments] = await Promise.all([
    getWeekPlan(mesoId),
    getWeekPlanAdjustments(mesoId),
  ]);
  const delta = new Map(adjustments.map((a) => [`${a.week}|${a.muscleGroup}`, a.deltaSets]));
  return plan.map((p) => {
    const d = delta.get(`${p.week}|${p.muscleGroup}`) || 0;
    return d ? { ...p, targetSets: Math.max(0, p.targetSets + d), adjusted: d } : p;
  });
}

// Sets.
export async function listSets() {
  return cached("sets", () => sheets.readAll("sets"));
}

// History for analytics/suggestions — warm-up sets are excluded so they don't
// pollute progression, rep-range, e1RM, or fatigue reads.
export async function getExerciseHistory(exercise) {
  const all = await listSets();
  return all
    .filter(s => s.exercise === exercise && s.setType !== "warmup")
    .sort((a, b) => a.date.localeCompare(b.date) || (+a.setNumber || 0) - (+b.setNumber || 0));
}

export async function logSet(set) {
  const row = {
    id: newId(),
    mesoId: set.mesoId,
    week: set.week,
    dayIndex: set.dayIndex,
    date: set.date || isoToday(),
    exercise: set.exercise,
    muscleGroup: set.muscleGroup,
    setNumber: set.setNumber,
    weight: set.weight,
    reps: set.reps,
    rir: set.rir,
    notes: set.notes || "",
    setType: set.setType || "working",
  };
  await sheets.appendRow("sets", row);
  invalidate("sets");
  return row;
}

// Most recent set for the same exercise *before* the given (week, dayIndex)
// of the same meso. Used to suggest weight for the next session.
export async function previousTopSet(mesoId, dayIndex, exercise, week) {
  const all = await listSets();
  const candidates = all
    .filter(
      (s) =>
        s.mesoId === mesoId &&
        s.exercise === exercise &&
        s.setType !== "warmup" &&
        // strictly earlier in the meso
        (+s.week < +week ||
          (+s.week === +week && +s.dayIndex < +dayIndex)),
    )
    .sort(
      (a, b) =>
        +b.week - +a.week ||
        +b.dayIndex - +a.dayIndex ||
        +b.setNumber - +a.setNumber,
    );
  if (!candidates.length) return null;
  // Among the most recent session, find the top set (highest weight).
  const latest = candidates[0];
  const session = candidates.filter(
    (c) => +c.week === +latest.week && +c.dayIndex === +latest.dayIndex,
  );
  let top = session[0];
  for (const s of session) if (+s.weight > +top.weight) top = s;
  return {
    week: +top.week,
    dayIndex: +top.dayIndex,
    weight: +top.weight,
    reps: +top.reps,
    rir: +top.rir,
  };
}

// Sets already logged for a specific (meso, week, day, exercise).
export async function sessionSets(mesoId, week, dayIndex, exercise) {
  const all = await listSets();
  return all
    .filter(
      (s) =>
        s.mesoId === mesoId &&
        +s.week === +week &&
        +s.dayIndex === +dayIndex &&
        s.exercise === exercise,
    )
    .sort((a, b) => +a.setNumber - +b.setNumber);
}

// Sessions — per-workout metadata (time, location, RPE, leaf).
export async function listSessions() {
  return cached("sessions", () => sheets.readAll("sessions"));
}

// Unique non-empty workout locations from past sessions, most-recent first.
export async function getPastLocations() {
  const all = await listSessions();
  const seen = new Set();
  const out = [];
  for (const s of [...all].sort((a, b) => (b.date || "").localeCompare(a.date || ""))) {
    const loc = (s.location || "").trim();
    if (loc && !seen.has(loc)) { seen.add(loc); out.push(loc); }
  }
  return out;
}

export async function getSession(mesoId, week, dayIndex, date) {
  const all = await listSessions();
  return all.find(
    (s) =>
      s.mesoId === mesoId &&
      String(s.week) === String(week) &&
      String(s.dayIndex) === String(dayIndex) &&
      s.date === date,
  ) || null;
}

export async function saveSession(session) {
  const existing = await getSession(
    session.mesoId, session.week, session.dayIndex, session.date,
  );
  if (existing) {
    await sheets.upsertRow("sessions", "id", { ...existing, ...session, id: existing.id });
  } else {
    const row = { id: newId(), ...session };
    await sheets.appendRow("sessions", row);
  }
  invalidate("sessions");
}

// Delete a mesocycle and all related data.
export async function deleteMesocycle(id) {
  const [allMesos, allDays, allEx, allPlan, allSets, allSessions] = await Promise.all([
    sheets.readAll("mesocycles"),
    sheets.readAll("templateDays"),
    sheets.readAll("templateExercises"),
    sheets.readAll("weekPlan"),
    sheets.readAll("sets"),
    sheets.readAll("sessions"),
  ]);
  await sheets.replaceAll("mesocycles", allMesos.filter((m) => m.id !== id));
  await sheets.replaceAll("templateDays", allDays.filter((d) => d.mesoId !== id));
  await sheets.replaceAll("templateExercises", allEx.filter((e) => e.mesoId !== id));
  await sheets.replaceAll("weekPlan", allPlan.filter((p) => p.mesoId !== id));
  await sheets.replaceAll("sets", allSets.filter((s) => s.mesoId !== id));
  await sheets.replaceAll("sessions", allSessions.filter((s) => s.mesoId !== id));
  for (const k of ["mesocycles", "templateDays", "templateExercises", "weekPlan", "sets", "sessions"]) invalidate(k);
}

// Custom exercises.
export async function listCustomExercises() {
  return cached("customExercises", () => sheets.readAll("customExercises"));
}

export async function addCustomExercise({ name, group, equipment }) {
  const row = { id: newId(), name, group, equipment: equipment || "", createdAt: new Date().toISOString() };
  await sheets.appendRow("customExercises", row);
  invalidate("customExercises");
  return row;
}

export async function deleteCustomExercise(id) {
  const all = await sheets.readAll("customExercises");
  await sheets.replaceAll("customExercises", all.filter((e) => e.id !== id));
  invalidate("customExercises");
}

export async function getFullExerciseLibrary() {
  const custom = await listCustomExercises();
  const byName = new Map();
  for (const e of EXERCISE_LIBRARY) byName.set(e.name.toLowerCase(), e);
  for (const c of custom) byName.set(c.name.toLowerCase(), { name: c.name, group: c.group, equipment: c.equipment });
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Map of exercise name (lowercased) → equipment, across built-ins + custom.
// Sets only store the exercise name, so views use this to recover equipment
// (e.g. to label dumbbell lifts and double their volume).
export async function getEquipmentMap() {
  const lib = await getFullExerciseLibrary();
  const map = new Map();
  for (const e of lib) map.set((e.name || "").toLowerCase(), (e.equipment || "").toLowerCase());
  return map;
}

// Cardio.
export async function listCardio() {
  return cached("cardio", () => sheets.readAll("cardio"));
}

export async function logCardio({ date, cardioType, duration, distance, avgHeartRate, perceivedDifficulty, notes }) {
  const row = {
    id: newId(),
    date: date || isoToday(),
    cardioType,
    duration: String(duration),
    distance: distance ? String(distance) : "",
    avgHeartRate: avgHeartRate ? String(avgHeartRate) : "",
    perceivedDifficulty: perceivedDifficulty ? String(perceivedDifficulty) : "",
    notes: notes || "",
  };
  await sheets.appendRow("cardio", row);
  invalidate("cardio");
  return row;
}

export async function deleteCardioEntry(id) {
  const all = await sheets.readAll("cardio");
  await sheets.replaceAll("cardio", all.filter((c) => c.id !== id));
  invalidate("cardio");
}

// Counts how many sets each muscle group has accumulated in a given week.
// Returns { [group]: { direct, indirect } } where direct = sets targeting
// this group primarily, indirect = fractional credit from compound exercises.
export async function weeklyVolume(mesoId, week) {
  const all = await listSets();
  const out = {};
  const ensure = (g) => (out[g] ||= { direct: 0, indirect: 0 });
  for (const s of all) {
    if (s.mesoId !== mesoId || +s.week !== +week) continue;
    if (s.setType === "warmup") continue;
    ensure(s.muscleGroup).direct += 1;
    for (const sec of exerciseSecondary(s.exercise)) {
      ensure(sec.group).indirect += sec.fraction;
    }
  }
  return out;
}

// ── Set edit/delete ──

export async function deleteSet(id) {
  const all = await sheets.readAll("sets");
  await sheets.replaceAll("sets", all.filter((s) => s.id !== id));
  invalidate("sets");
}

export async function updateSet(id, changes) {
  const all = await sheets.readAll("sets");
  const row = all.find((s) => s.id === id);
  if (!row) return;
  await sheets.upsertRow("sets", "id", { ...row, ...changes, id });
  invalidate("sets");
}

// ── Mesocycle edit + duplicate ──

export async function updateMesocycleInfo(id, changes) {
  await sheets.upsertRow("mesocycles", "id", { id, ...changes });
  invalidate("mesocycles");
}

export async function replaceTemplateDays(mesoId, days) {
  const all = await sheets.readAll("templateDays");
  const other = all.filter((d) => d.mesoId !== mesoId);
  const newRows = days.map((d, i) => ({ mesoId, dayIndex: i, dayName: d.name }));
  await sheets.replaceAll("templateDays", [...other, ...newRows]);
  invalidate("templateDays");
}

export async function replaceTemplateExercises(mesoId, days) {
  const all = await sheets.readAll("templateExercises");
  const other = all.filter((e) => e.mesoId !== mesoId);
  const newRows = [];
  for (let di = 0; di < days.length; di++) {
    (days[di].exercises || []).forEach((e, ei) => {
      newRows.push({
        mesoId, dayIndex: di, exerciseIndex: ei,
        exercise: e.exercise, muscleGroup: e.muscleGroup, notes: e.notes || "",
      });
    });
  }
  await sheets.replaceAll("templateExercises", [...other, ...newRows]);
  invalidate("templateExercises");
}

export async function recalculateWeekPlan(mesoId, weeks, days) {
  const allPlan = await sheets.readAll("weekPlan");
  const other = allPlan.filter((p) => p.mesoId !== mesoId);
  const landmarks = await getLandmarks();
  const groups = [...new Set(days.flatMap((d) => (d.exercises || []).map((e) => e.muscleGroup)).filter(Boolean))];
  const rirByWeek = progressRIR(weeks);
  const newRows = [];
  for (const g of groups) {
    const lm = landmarks[g] || DEFAULT_LANDMARKS[g] || { MV: 0, MEV: 8, MAV_lo: 12, MAV_hi: 18, MRV: 22 };
    const sets = progressSets(lm.MEV, lm.MRV, weeks);
    for (let w = 0; w < weeks; w++) {
      newRows.push({
        mesoId, week: w + 1, muscleGroup: g,
        targetSets: sets[w], targetRIR: rirByWeek[w], isDeload: w === weeks - 1,
      });
    }
  }
  await sheets.replaceAll("weekPlan", [...other, ...newRows]);
  invalidate("weekPlan");
}

export async function duplicateMesocycle(id) {
  const [meso, allDays, allEx, allPlan] = await Promise.all([
    getMesocycle(id),
    sheets.readAll("templateDays"),
    sheets.readAll("templateExercises"),
    sheets.readAll("weekPlan"),
  ]);
  if (!meso) return null;
  const cloneId = newId();
  const clone = { ...meso, id: cloneId, name: `Copy of ${meso.name}`, status: "draft", createdAt: new Date().toISOString() };
  await sheets.appendRow("mesocycles", clone);
  const days = allDays.filter((d) => d.mesoId === id).map((d) => ({ ...d, mesoId: cloneId }));
  const exs = allEx.filter((e) => e.mesoId === id).map((e) => ({ ...e, mesoId: cloneId }));
  const plan = allPlan.filter((p) => p.mesoId === id).map((p) => ({ ...p, mesoId: cloneId }));
  await Promise.all([
    days.length && sheets.appendRows("templateDays", days),
    exs.length && sheets.appendRows("templateExercises", exs),
    plan.length && sheets.appendRows("weekPlan", plan),
  ]);
  invalidate("mesocycles"); invalidate("templateDays"); invalidate("templateExercises"); invalidate("weekPlan");
  return cloneId;
}

// ── Cardio edit ──

export async function updateCardioEntry(id, changes) {
  await sheets.upsertRow("cardio", "id", { id, ...changes });
  invalidate("cardio");
}

// ── Session delete ──

export async function deleteSession(id) {
  const [allSessions, allSets] = await Promise.all([
    sheets.readAll("sessions"),
    sheets.readAll("sets"),
  ]);
  const session = allSessions.find((s) => s.id === id);
  if (!session) return;
  await sheets.replaceAll("sessions", allSessions.filter((s) => s.id !== id));
  await sheets.replaceAll("sets", allSets.filter((s) =>
    s.mesoId !== session.mesoId || s.date !== session.date ||
    String(s.week) !== String(session.week) || String(s.dayIndex) !== String(session.dayIndex)));
  invalidate("sessions"); invalidate("sets");
}

// ── PR tracking (computed) ──

export async function getPersonalRecords(exercise) {
  const all = await listSets();
  const prs = {};
  for (const s of all) {
    if (exercise && s.exercise !== exercise) continue;
    if (s.setType === "warmup") continue;
    if (!prs[s.exercise]) prs[s.exercise] = { maxWeight: 0, maxReps: 0, max1RM: 0 };
    const pr = prs[s.exercise];
    const w = +s.weight, r = +s.reps;
    if (w > pr.maxWeight) { pr.maxWeight = w; pr.maxWeightDate = s.date; pr.maxWeightReps = r; }
    if (r > pr.maxReps) { pr.maxReps = r; pr.maxRepsDate = s.date; }
    const e1 = epley1RM(w, r);
    if (e1 > pr.max1RM) { pr.max1RM = Math.round(e1 * 10) / 10; pr.max1RMDate = s.date; }
  }
  return prs;
}

export async function getRecentPRs(limit = 5) {
  const all = await listSets();
  const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date));
  const bestByEx = {};
  const prs = [];
  for (const s of sorted) {
    if (s.setType === "warmup") continue;
    const w = +s.weight, r = +s.reps;
    const e1 = epley1RM(w, r);
    const prev = bestByEx[s.exercise];
    if (!prev || w > prev.weight || e1 > prev.e1rm) {
      if (prev) prs.push({ ...s, e1rm: Math.round(e1 * 10) / 10, type: w > prev.weight ? "weight" : "e1RM" });
      bestByEx[s.exercise] = { weight: Math.max(w, prev?.weight || 0), e1rm: Math.max(e1, prev?.e1rm || 0) };
    }
  }
  return prs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

// ── Data export ──

export async function exportAllData() {
  const keys = ["mesocycles", "templateDays", "templateExercises", "weekPlan", "sets", "sessions", "customExercises", "cardio", "landmarks", "sessionFeedback", "weekPlanAdjustments", "exerciseOverrides"];
  const result = {};
  await Promise.all(keys.map(async (k) => { result[k] = await sheets.readAll(k); }));
  return result;
}
