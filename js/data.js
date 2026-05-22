import * as sheets from "./sheets.js";
import { isoToday } from "./ui.js";
import {
  DEFAULT_LANDMARKS,
  EXERCISE_LIBRARY,
  MUSCLE_GROUPS,
  progressRIR,
  progressSets,
} from "./rp.js";

export const CUSTOM_MESO_ID = "_custom";

const cache = new Map();
function invalidate(key) { cache.delete(key); }
async function cached(key, loader) {
  if (!cache.has(key)) cache.set(key, await loader());
  return cache.get(key);
}
export function clearCaches() { cache.clear(); }

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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

// Sets.
export async function listSets() {
  return cached("sets", () => sheets.readAll("sets"));
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
  await Promise.all([
    sheets.replaceAll("mesocycles", allMesos.filter((m) => m.id !== id)),
    sheets.replaceAll("templateDays", allDays.filter((d) => d.mesoId !== id)),
    sheets.replaceAll("templateExercises", allEx.filter((e) => e.mesoId !== id)),
    sheets.replaceAll("weekPlan", allPlan.filter((p) => p.mesoId !== id)),
    sheets.replaceAll("sets", allSets.filter((s) => s.mesoId !== id)),
    sheets.replaceAll("sessions", allSessions.filter((s) => s.mesoId !== id)),
  ]);
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
export async function weeklyVolume(mesoId, week) {
  const all = await listSets();
  const out = {};
  for (const s of all) {
    if (s.mesoId !== mesoId || +s.week !== +week) continue;
    out[s.muscleGroup] = (out[s.muscleGroup] || 0) + 1;
  }
  return out;
}
