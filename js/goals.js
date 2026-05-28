// Weekly Muscle Goals: a "light meso". Pick which weekdays you train and which
// muscle groups go on each day; each muscle's weekly set target (the midpoint of
// its MAV range, from the user's volume landmarks) is split across the days that
// include it. These helpers are pure (no DOM, no Sheets) and Node-testable — see
// tools/check-goals.mjs.
import { distributeSets } from "./rp.js";
import { sessionZone } from "./suggest.js";

// Our weekday index is 0=Mon … 6=Sun (matches the WeeklyGoals sheet rows).
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// JS Date.getDay() is 0=Sun..6=Sat; convert to our Mon-based index.
export function weekdayIndex(date) {
  const d = (date instanceof Date ? date : new Date(String(date) + "T00:00:00")).getDay();
  return (d + 6) % 7;
}

// ISO date (YYYY-MM-DD) of the Monday on or before `date`, in local time.
export function mondayOf(date) {
  const d = date instanceof Date ? new Date(date) : new Date(String(date) + "T00:00:00");
  d.setDate(d.getDate() - weekdayIndex(d));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Midpoint of the MAV range — the steady weekly working-set target for a muscle.
export function mavMidTarget(landmark) {
  if (!landmark) return 0;
  return Math.round(((+landmark.MAV_lo || 0) + (+landmark.MAV_hi || 0)) / 2);
}

// Light-mesocycle phase template. Each entry scales MAV-mid for one week of the
// cycle, which repeats indefinitely from `anchorWeek`. Defaults to a Mike-
// Israetel-style 4-week block: two accumulation weeks ramping up, an overreach
// week at ~110%, then a deload at ~50%.
export const DEFAULT_PHASE_TEMPLATE = [
  { phase: "accumulation", multiplier: 0.9 },
  { phase: "accumulation", multiplier: 1.0 },
  { phase: "overreach", multiplier: 1.1 },
  { phase: "deload", multiplier: 0.5 },
];

export const PHASE_LABELS = {
  accumulation: "Accumulation",
  overreach: "Overreach",
  deload: "Deload",
};

// Resolve which phase applies to `weekStart` (an ISO Monday) given a cycle
// `{ anchorWeek, template }`. Returns
//   { weekNumber: 1..template.length, phase, multiplier, totalWeeks }
// or null when inputs are missing/invalid. Pure.
export function currentPhase(weekStart, cycle) {
  if (!weekStart || !cycle || !cycle.anchorWeek || !Array.isArray(cycle.template) || !cycle.template.length) return null;
  const a = new Date(String(cycle.anchorWeek) + "T00:00:00");
  const b = new Date(String(weekStart) + "T00:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const weeks = Math.floor((b - a) / (7 * 86400000));
  const n = cycle.template.length;
  const idx = ((weeks % n) + n) % n;
  const entry = cycle.template[idx] || {};
  return {
    weekNumber: idx + 1,
    phase: entry.phase || "accumulation",
    multiplier: Number.isFinite(+entry.multiplier) ? +entry.multiplier : 1.0,
    totalWeeks: n,
  };
}

function parseGroups(g) {
  if (Array.isArray(g)) return g.filter(Boolean);
  return String(g || "").split("|").map((s) => s.trim()).filter(Boolean);
}

// Resolve the ordered training days that apply to a given week. Rows tagged with
// the requested `weekStart` (a per-week override) win; otherwise the recurring
// default rows (weekStart === "") are used. Returns day objects sorted by
// weekday: { weekStart, weekday, dayName, groups[] }.
export function resolvePlanForWeek(rows, weekStart) {
  const all = (rows || []).map((r) => ({
    weekStart: r.weekStart || "",
    weekday: +r.weekday,
    dayName: r.dayName || "",
    groups: parseGroups(r.groups),
  })).filter((r) => Number.isInteger(r.weekday) && r.weekday >= 0 && r.weekday <= 6);
  const override = weekStart ? all.filter((r) => r.weekStart === weekStart) : [];
  const chosen = override.length ? override : all.filter((r) => r.weekStart === "");
  return chosen.sort((a, b) => a.weekday - b.weekday);
}

// For each muscle group in the plan: its weekly target (MAV mid, optionally
// scaled by the current phase multiplier) and the per-day split across the days
// that include it. Pass `{ phase }` or `{ phaseMultiplier }` to scale; default
// multiplier is 1.0 (existing behavior). Returns
//   { [muscle]: { target, dayCount, perDay: { [weekday]: sets } } }
export function distributeWeeklyGoal(planDays, landmarks, options = {}) {
  const mult = Number.isFinite(+options.phaseMultiplier)
    ? +options.phaseMultiplier
    : (options.phase && Number.isFinite(+options.phase.multiplier) ? +options.phase.multiplier : 1.0);
  const daysByMuscle = {};
  for (const day of planDays || []) {
    for (const g of day.groups || []) (daysByMuscle[g] ||= []).push(day.weekday);
  }
  const out = {};
  for (const [muscle, weekdays] of Object.entries(daysByMuscle)) {
    const sorted = weekdays.slice().sort((a, b) => a - b);
    const mid = mavMidTarget(landmarks && landmarks[muscle]);
    const target = mult === 1.0 ? mid : Math.max(0, Math.round(mid * mult));
    const split = distributeSets(target, sorted.length);
    const perDay = {};
    sorted.forEach((wd, i) => { perDay[wd] = split[i]; });
    out[muscle] = { target, dayCount: sorted.length, perDay };
  }
  return out;
}

// Plan-quality warnings: a day overloads a muscle past its per-session cap, or a
// muscle is trained on days less than ~48 h apart, or there's no rest day.
// Returns [{ level: "warn"|"ok", msg }]. `reference` is rp.MUSCLE_REFERENCE.
export function weeklyGoalWarnings(planDays, landmarks, reference) {
  const warnings = [];
  const dist = distributeWeeklyGoal(planDays, landmarks);

  // Per-day overload: a muscle's sets on one day exceed its session cap.
  for (const day of planDays || []) {
    for (const g of day.groups || []) {
      const info = dist[g];
      const ref = reference && reference[g];
      if (!info || !ref || !ref.sessionCap) continue;
      const sets = info.perDay[day.weekday] || 0;
      if (sessionZone(sets, ref.sessionCap) === "over") {
        const [lo, hi] = ref.sessionCap;
        warnings.push({
          level: "warn",
          msg: `${g} on ${WEEKDAYS[day.weekday]}: ${sets} sets exceeds ${lo}–${hi}/session — split across more days.`,
        });
      }
    }
  }

  // Insufficient rest: same muscle on consecutive (circular) days < 2 apart.
  for (const [muscle, info] of Object.entries(dist)) {
    const days = Object.keys(info.perDay).map(Number).sort((a, b) => a - b);
    if (days.length < 2) continue;
    for (let i = 0; i < days.length; i++) {
      const a = days[i];
      const b = days[(i + 1) % days.length];
      const gap = i + 1 < days.length ? b - a : b + 7 - a;
      if (gap < 2) {
        warnings.push({
          level: "warn",
          msg: `${muscle} trained ${WEEKDAYS[a]} & ${WEEKDAYS[b]} — under 48 h recovery.`,
        });
      }
    }
  }

  // Little weekly recovery when training 6+ days.
  if ((planDays || []).length >= 6) {
    warnings.push({
      level: "ok",
      msg: `${planDays.length} training days a week — keep at least one full rest day.`,
    });
  }
  return warnings;
}

// Which plan day the user should do next. Logged sessions consume pending plan
// days in weekday order, so a missed day rolls forward to the next workout.
// `completedCount` is the number of workouts already logged this week. Returns
// the day object, or null when the week's plan is finished or empty.
export function pendingDayForToday(planDays, completedCount) {
  if (!planDays || !planDays.length) return null;
  const done = Math.max(0, completedCount | 0);
  if (done >= planDays.length) return null;
  return planDays[done];
}
