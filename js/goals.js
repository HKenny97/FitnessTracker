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

// For each muscle group in the plan: its weekly target (MAV mid) and the per-day
// split across the days that include it. Returns
//   { [muscle]: { target, dayCount, perDay: { [weekday]: sets } } }
export function distributeWeeklyGoal(planDays, landmarks) {
  const daysByMuscle = {};
  for (const day of planDays || []) {
    for (const g of day.groups || []) (daysByMuscle[g] ||= []).push(day.weekday);
  }
  const out = {};
  for (const [muscle, weekdays] of Object.entries(daysByMuscle)) {
    const sorted = weekdays.slice().sort((a, b) => a - b);
    const target = mavMidTarget(landmarks && landmarks[muscle]);
    const split = distributeSets(target, sorted.length);
    const perDay = {};
    sorted.forEach((wd, i) => { perDay[wd] = split[i]; });
    out[muscle] = { target, dayCount: sorted.length, perDay };
  }
  return out;
}

// Per-day session prescription: pivots distributeWeeklyGoal so each training
// day lists its muscles with the prescribed sets and the daily total. Sorted by
// weekday. Returns [{ weekday, dayName, muscles:[{muscle,sets}], totalSets }].
export function dailyVolume(planDays, landmarks) {
  const dist = distributeWeeklyGoal(planDays, landmarks);
  return (planDays || []).slice()
    .sort((a, b) => a.weekday - b.weekday)
    .map((day) => {
      const muscles = (day.groups || []).map((m) => ({
        muscle: m,
        sets: (dist[m] && dist[m].perDay[day.weekday]) || 0,
      }));
      const totalSets = muscles.reduce((s, x) => s + x.sets, 0);
      return { weekday: day.weekday, dayName: day.dayName || "", muscles, totalSets };
    });
}

// Soft ceiling on a single session's total working sets — past this, the day is
// hard to recover from and to fit in one session. Used by weeklyGoalWarnings.
export const MAX_SESSION_SETS = 30;

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

  // High session volume: a single day's total working sets is excessive.
  const totalsByWd = {};
  for (const info of Object.values(dist)) {
    for (const [wd, n] of Object.entries(info.perDay)) totalsByWd[wd] = (totalsByWd[wd] || 0) + n;
  }
  for (const day of planDays || []) {
    const t = totalsByWd[day.weekday] || 0;
    if (t > MAX_SESSION_SETS) {
      const suffix = day.dayName ? ` (${day.dayName})` : "";
      warnings.push({
        level: "warn",
        msg: `${WEEKDAYS[day.weekday]}${suffix}: ${t} sets in one session — high volume, consider splitting across more days.`,
      });
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
