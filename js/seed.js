// Demo data generator.
//
// Builds a realistic, fully-logged hypertrophy mesocycle (plus cardio) so the
// app can be seen with rich data. Reuses the real PPL template and exercise
// profiles, and writes in bulk via sheets.appendRows so it's a handful of API
// calls rather than hundreds. Everything it creates is tagged so it can be
// removed again (delete the demo mesocycle from the Meso view).

import * as data from "./data.js";
import * as sheets from "./sheets.js";
import { PROGRAM_TEMPLATES, getProfile, progressRIR } from "./rp.js";

export const DEMO_MESO_NAME = "Demo — Hypertrophy Block";

// Reasonable starting working weights (lbs) for the PPL-3 template lifts.
const BASE_WEIGHT = {
  "Barbell Bench Press": 135,
  "Incline Dumbbell Press": 50,
  "Cable Fly": 25,
  "Dumbbell Shoulder Press": 40,
  "Dumbbell Lateral Raise": 15,
  "Triceps Rope Pushdown": 40,
  "Overhead Cable Triceps Extension": 35,
  "Barbell Row": 135,
  "Lat Pulldown": 120,
  "Seated Cable Row": 130,
  "Face Pull": 40,
  "Barbell Curl": 65,
  "Incline Dumbbell Curl": 25,
  "Barbell Shrug": 185,
  "Back Squat": 185,
  "Leg Press": 270,
  "Leg Extension": 120,
  "Romanian Deadlift": 155,
  "Lying Leg Curl": 90,
  "Hip Thrust": 225,
  "Standing Calf Raise": 160,
};

const rint = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function isoNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function baseFor(name, profile) {
  if (BASE_WEIGHT[name]) return BASE_WEIGHT[name];
  if (profile.type === "compound") return profile.tier === "heavy" ? 135 : 90;
  return 30;
}

function roundWeight(w, profile) {
  const step = profile.type === "compound" && profile.tier === "heavy" ? 5 : 2.5;
  return Math.round(w / step) * step;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

// Demo block shape. The deload (last) week is left unlogged so the block reads
// as an in-progress active mesocycle.
export const DEMO_TEMPLATE = PROGRAM_TEMPLATES[0]; // Push / Pull / Legs (3-Day)
export const DEMO_WEEKS = 6;        // 5 accumulation + 1 deload
export const DEMO_LOGGED_WEEKS = 5; // logged through today
const DEMO_OFFSETS = [0, 2, 4];     // three training days per week
export const DEMO_START_OFFSET =
  (DEMO_LOGGED_WEEKS - 1) * 7 + DEMO_OFFSETS[DEMO_OFFSETS.length - 1]; // 32

// Pure row generator (no I/O) — used by seedDemoData and unit-tested. newId is
// injected so tests can supply a deterministic stub.
export function generateDemoRows(mesoId, newId) {
  const rirByWeek = progressRIR(DEMO_WEEKS); // e.g. [3,2,2,1,0,4]
  const setRows = [];
  const sessionRows = [];
  const feedbackRows = [];

  for (let w = 1; w <= DEMO_LOGGED_WEEKS; w++) {
    DEMO_TEMPLATE.days.forEach((day, dayIndex) => {
      const daysAgo = DEMO_START_OFFSET - ((w - 1) * 7 + DEMO_OFFSETS[dayIndex]);
      const date = isoNDaysAgo(daysAgo);

      const startMin = rint(16, 18) * 60 + [0, 15, 30, 45][rint(0, 3)];
      const endMin = startMin + rint(55, 80);
      sessionRows.push({
        id: newId(), mesoId, week: w, dayIndex, date,
        startTime: `${pad(Math.floor(startMin / 60))}:${pad(startMin % 60)}`,
        endTime: `${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`,
        location: "Iron Temple",
        totalRPE: String(rint(7, 9)),
        leafStatus: Math.random() < 0.15 ? "Yes" : "No",
        notes: "",
      });

      const targetRIR = rirByWeek[w - 1];
      const muscles = new Set();
      for (const ex of day.exercises) {
        const profile = getProfile(ex.exercise);
        const base = baseFor(ex.exercise, profile);
        const weekFactor = 1 + 0.022 * (w - 1);          // ~2.2%/week
        const noise = 1 + (Math.random() - 0.5) * 0.02;  // ±1%
        const weight = roundWeight(base * weekFactor * noise, profile);
        const { min, max } = profile.repRange;
        const repsBase = clamp(Math.round(min + (max - min) * 0.35), 1, 30);
        for (let s = 0; s < 3; s++) {
          setRows.push({
            id: newId(), mesoId, week: w, dayIndex, date,
            exercise: ex.exercise, muscleGroup: ex.muscleGroup,
            setNumber: s + 1,
            weight,
            reps: clamp(repsBase - rint(0, 1), 1, 40),
            rir: clamp(targetRIR + rint(-1, 0), 0, 5),
            notes: "",
          });
        }
        muscles.add(ex.muscleGroup);
      }

      for (const m of muscles) {
        feedbackRows.push({
          id: newId(), mesoId, week: w, dayIndex, date, muscleGroup: m,
          pump: rint(1, 3), soreness: rint(0, 2),
          jointPain: Math.random() < 0.1 ? 1 : 0, performance: rint(1, 3),
        });
      }
    });
  }

  const cardioTypes = ["Running", "Cycling", "Rowing", "Walking", "HIIT", "Stair Climber"];
  const cardioRows = [];
  for (let i = 0; i < 10; i++) {
    const type = cardioTypes[rint(0, cardioTypes.length - 1)];
    const dur = rint(20, 50);
    const hasDistance = type === "Running" || type === "Cycling" || type === "Walking";
    cardioRows.push({
      id: newId(), date: isoNDaysAgo(rint(0, DEMO_START_OFFSET)), cardioType: type,
      duration: String(dur),
      distance: hasDistance ? (dur / 10 + Math.random()).toFixed(2) : "",
      avgHeartRate: String(rint(120, 165)),
      perceivedDifficulty: String(rint(3, 8)),
      notes: "demo",
    });
  }

  return { setRows, sessionRows, feedbackRows, cardioRows };
}

// Generate a full demo block and write it. onProgress(msg) reports status.
// Returns counts of what was written.
export async function seedDemoData(onProgress = () => {}) {
  onProgress("Preparing landmarks…");
  await data.getLandmarks(); // seeds defaults if empty

  onProgress("Archiving any active mesocycle…");
  const existing = await data.listMesocycles();
  for (const m of existing) {
    if (m.status === "active") await data.setMesocycleStatus(m.id, "completed");
  }

  onProgress("Creating mesocycle…");
  const mesoId = await data.createMesocycle({
    name: DEMO_MESO_NAME,
    startDate: isoNDaysAgo(DEMO_START_OFFSET),
    weeks: DEMO_WEEKS,
    days: DEMO_TEMPLATE.days,
    notes: "Auto-generated demo data.",
  });

  const { setRows, sessionRows, feedbackRows, cardioRows } =
    generateDemoRows(mesoId, data.newId);

  onProgress(`Writing ${setRows.length} sets…`);
  await sheets.appendRows("sets", setRows);
  onProgress("Writing sessions…");
  await sheets.appendRows("sessions", sessionRows);
  onProgress("Writing feedback…");
  await sheets.appendRows("sessionFeedback", feedbackRows);
  onProgress("Adding cardio…");
  await sheets.appendRows("cardio", cardioRows);

  data.clearCaches();
  return {
    mesoId,
    sets: setRows.length,
    sessions: sessionRows.length,
    feedback: feedbackRows.length,
    cardio: cardioRows.length,
  };
}
