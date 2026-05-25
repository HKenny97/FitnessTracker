// Mock of data.js for the preview harness. Returns seeded sample data so the
// dashboard / custom / summary views render without Google auth.

export const CUSTOM_MESO_ID = "_custom";

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

const START = daysAgo(17); // → current week 3 of a 6-week meso

const MESO = { id: "m1", name: "Upper / Lower Hypertrophy", status: "active", startDate: START, weeks: "6" };

// Build a spread of sets across the meso weeks + a custom session today.
const SETS = [];
let sid = 0;
function push(date, mesoId, exercise, mg, sets) {
  sets.forEach((s, i) => SETS.push({
    id: "s" + (sid++), date, mesoId, week: 0, dayIndex: 0,
    exercise, muscleGroup: mg, setNumber: i + 1, weight: s[0], reps: s[1], rir: s[2],
  }));
}
// week 1..3 sessions
push(daysAgo(16), "m1", "Barbell Bench Press", "chest", [[80, 8, 3], [80, 8, 3], [80, 7, 2]]);
push(daysAgo(16), "m1", "Lat Pulldown", "back", [[60, 10, 3], [60, 10, 2]]);
push(daysAgo(13), "m1", "Back Squat", "quads", [[100, 8, 3], [100, 8, 2]]);
push(daysAgo(9), "m1", "Barbell Bench Press", "chest", [[82.5, 8, 2], [82.5, 8, 2], [82.5, 7, 1]]);
push(daysAgo(9), "m1", "Barbell Row", "back", [[70, 9, 2], [70, 9, 2], [70, 8, 1]]);
push(daysAgo(6), "m1", "Back Squat", "quads", [[102.5, 8, 2], [102.5, 8, 1]]);
push(daysAgo(2), "m1", "Barbell Bench Press", "chest", [[85, 8, 2], [85, 8, 1], [85, 6, 0]]);
push(daysAgo(2), "m1", "Lat Pulldown", "back", [[65, 10, 2], [65, 10, 1]]);
// custom session today
push(daysAgo(0), "_custom", "Leg Press", "quads", [[180, 12, 2], [180, 12, 1]]);
push(daysAgo(0), "_custom", "Leg Curl", "hamstrings", [[55, 12, 2]]);

const SESSIONS = [
  { id: "se1", mesoId: "m1", week: 3, dayIndex: 0, date: daysAgo(2), startTime: "17:30", endTime: "18:35", location: "Home gym", totalRPE: "8", leafStatus: "No", notes: "" },
  { id: "se2", mesoId: "_custom", week: 0, dayIndex: 0, date: daysAgo(0), startTime: "07:10", endTime: "08:05", location: "Home gym", totalRPE: "7", leafStatus: "Yes", notes: "Quick leg pump" },
];

const CARDIO = [
  { id: "c1", date: daysAgo(3), cardioType: "Incline walk", duration: 30, distance: 2.4, avgHeartRate: 122, perceivedDifficulty: 4 },
  { id: "c2", date: daysAgo(7), cardioType: "Zone 2 bike", duration: 45, distance: 15, avgHeartRate: 134, perceivedDifficulty: 5 },
];

export async function listMesocycles() { return [MESO]; }
export async function listSets() { return SETS.slice(); }
export async function listSessions() { return SESSIONS.slice(); }
export async function listCardio() { return CARDIO.slice(); }

export async function weeklyVolume() { return { chest: 9, back: 12, quads: 5 }; }

export async function getEffectiveWeekPlan() {
  const plan = [];
  const groups = [["chest", 12, 16], ["back", 14, 18], ["quads", 12, 18]];
  for (let week = 1; week <= 6; week++) {
    const rir = Math.max(0, 3 - (week - 1));
    for (const [mg, mev, mrv] of groups) {
      const targetSets = week === 6 ? Math.round(mev / 2) : Math.round(mev + ((mrv - mev) * (week - 1)) / 4);
      plan.push({ week, muscleGroup: mg, targetSets, targetRIR: week === 6 ? 4 : rir });
    }
  }
  return plan;
}

export async function getRecentPRs() {
  return [
    { exercise: "Back Squat", weight: 102.5, reps: 8, type: "e1rm", date: daysAgo(6) },
    { exercise: "Barbell Bench Press", weight: 85, reps: 8, type: "weight", date: daysAgo(2) },
    { exercise: "Barbell Row", weight: 70, reps: 9, type: "weight", date: daysAgo(9) },
  ];
}

export async function getEquipmentMap() { return new Map(); }

export async function saveSession() { return { ok: true }; }
export async function logSet() { return { ok: true }; }
