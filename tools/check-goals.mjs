// Checks Weekly Muscle Goals math: MAV-mid targets, set distribution across
// days, warnings (overload + insufficient rest), per-week resolution, and
// missed-day rollover.
//   node tools/check-goals.mjs   (or: npm run check:goals)
import {
  mavMidTarget, mondayOf, weekdayIndex, resolvePlanForWeek,
  distributeWeeklyGoal, weeklyGoalWarnings, pendingDayForToday,
  currentPhase, DEFAULT_PHASE_TEMPLATE,
} from "../js/goals.js";
import { MUSCLE_REFERENCE } from "../js/rp.js";

let failures = 0;
const fail = (m) => { failures++; console.error(`FAIL  ${m}`); };

const landmarks = {
  Chest: { MAV_lo: 12, MAV_hi: 20 }, // mid 16
  Back: { MAV_lo: 14, MAV_hi: 22 },  // mid 18
};

// mavMidTarget rounds the MAV midpoint.
if (mavMidTarget(landmarks.Chest) !== 16) fail(`mavMid Chest → ${mavMidTarget(landmarks.Chest)}`);
if (mavMidTarget(landmarks.Back) !== 18) fail(`mavMid Back → ${mavMidTarget(landmarks.Back)}`);
if (mavMidTarget(null) !== 0) fail("mavMid null → not 0");

// mondayOf / weekdayIndex (2026-05-27 is a Wednesday).
if (mondayOf("2026-05-27") !== "2026-05-25") fail(`mondayOf Wed → ${mondayOf("2026-05-27")}`);
if (weekdayIndex("2026-05-27") !== 2) fail(`weekdayIndex Wed → ${weekdayIndex("2026-05-27")}`);
if (mondayOf("2026-05-25") !== "2026-05-25") fail("mondayOf Mon should be itself");

// Distribution: Chest on 2 days @16 → [8,8]; on 3 days → [6,5,5].
{
  const two = distributeWeeklyGoal(
    [{ weekday: 0, groups: ["Chest"] }, { weekday: 3, groups: ["Chest"] }], landmarks);
  if (two.Chest.target !== 16) fail(`2-day target → ${two.Chest.target}`);
  if (two.Chest.perDay[0] !== 8 || two.Chest.perDay[3] !== 8) fail(`2-day split → ${JSON.stringify(two.Chest.perDay)}`);

  const three = distributeWeeklyGoal(
    [{ weekday: 0, groups: ["Chest"] }, { weekday: 2, groups: ["Chest"] }, { weekday: 4, groups: ["Chest"] }], landmarks);
  const vals = [three.Chest.perDay[0], three.Chest.perDay[2], three.Chest.perDay[4]];
  if (JSON.stringify(vals) !== JSON.stringify([6, 5, 5])) fail(`3-day split → ${JSON.stringify(vals)}`);
}

// Overload warning: all 16 Chest sets on one day exceeds the 8–10 session cap.
{
  const w = weeklyGoalWarnings([{ weekday: 0, groups: ["Chest"] }], landmarks, MUSCLE_REFERENCE);
  if (!w.some((x) => x.level === "warn" && /Chest on Mon/.test(x.msg))) fail("overload warning missing");
}

// Insufficient-rest warning: Chest on back-to-back days.
{
  const w = weeklyGoalWarnings(
    [{ weekday: 0, groups: ["Chest"] }, { weekday: 1, groups: ["Chest"] }], landmarks, MUSCLE_REFERENCE);
  if (!w.some((x) => /under 48 h recovery/.test(x.msg))) fail("rest warning missing");
}
// ...but spaced days (Mon & Thu) raise no rest warning.
{
  const w = weeklyGoalWarnings(
    [{ weekday: 0, groups: ["Chest"] }, { weekday: 3, groups: ["Chest"] }], landmarks, MUSCLE_REFERENCE);
  if (w.some((x) => /recovery/.test(x.msg))) fail("rest warning fired on spaced days");
}

// resolvePlanForWeek prefers week-specific rows over the default.
{
  const rows = [
    { weekStart: "", weekday: 0, dayName: "Push", groups: "Chest" },
    { weekStart: "", weekday: 3, dayName: "Pull", groups: "Back" },
    { weekStart: "2026-05-25", weekday: 1, dayName: "Legs", groups: "Quads" },
  ];
  const def = resolvePlanForWeek(rows, "");
  if (def.length !== 2 || def[0].dayName !== "Push") fail(`default plan → ${JSON.stringify(def)}`);
  const wk = resolvePlanForWeek(rows, "2026-05-25");
  if (wk.length !== 1 || wk[0].dayName !== "Legs" || wk[0].groups[0] !== "Quads") fail(`week override → ${JSON.stringify(wk)}`);
  // A week with no override falls back to default.
  const other = resolvePlanForWeek(rows, "2026-06-01");
  if (other.length !== 2) fail(`fallback to default → ${other.length}`);
}

// pendingDayForToday rolls missed days forward by completed count.
{
  const plan = [
    { weekday: 0, dayName: "Push" }, { weekday: 2, dayName: "Pull" }, { weekday: 4, dayName: "Legs" },
  ];
  if (pendingDayForToday(plan, 0).dayName !== "Push") fail("pending @0 ≠ Push");
  if (pendingDayForToday(plan, 1).dayName !== "Pull") fail("pending @1 ≠ Pull");
  if (pendingDayForToday(plan, 2).dayName !== "Legs") fail("pending @2 ≠ Legs");
  if (pendingDayForToday(plan, 3) !== null) fail("pending @3 ≠ null (week done)");
  if (pendingDayForToday([], 0) !== null) fail("empty plan ≠ null");
}

// currentPhase resolves the right template entry for a given Monday.
{
  // Anchor 2026-05-25 (Mon). Default 4-week template: accum/accum/overreach/deload.
  const cycle = { anchorWeek: "2026-05-25", template: DEFAULT_PHASE_TEMPLATE };
  const w1 = currentPhase("2026-05-25", cycle);
  if (!w1 || w1.phase !== "accumulation" || w1.weekNumber !== 1) fail(`phase week1 → ${JSON.stringify(w1)}`);
  const w3 = currentPhase("2026-06-08", cycle);
  if (!w3 || w3.phase !== "overreach" || w3.weekNumber !== 3) fail(`phase week3 → ${JSON.stringify(w3)}`);
  const w4 = currentPhase("2026-06-15", cycle);
  if (!w4 || w4.phase !== "deload" || w4.weekNumber !== 4) fail(`phase week4 → ${JSON.stringify(w4)}`);
  // Wraps back to week 1 after the cycle ends.
  const w5 = currentPhase("2026-06-22", cycle);
  if (!w5 || w5.weekNumber !== 1) fail(`phase wrap → ${JSON.stringify(w5)}`);
  // Weeks before the anchor wrap backward correctly.
  const wPrev = currentPhase("2026-05-18", cycle);
  if (!wPrev || wPrev.weekNumber !== 4) fail(`phase before-anchor → ${JSON.stringify(wPrev)}`);
  if (currentPhase("2026-05-25", null) !== null) fail("phase null cycle → not null");
  if (currentPhase("", cycle) !== null) fail("phase empty week → not null");
}

// distributeWeeklyGoal scales by the phase multiplier when supplied.
{
  const plan = [{ weekday: 0, groups: ["Chest"] }, { weekday: 3, groups: ["Chest"] }];
  const flat = distributeWeeklyGoal(plan, landmarks);
  if (flat.Chest.target !== 16) fail(`phase flat target → ${flat.Chest.target}`);
  const deload = distributeWeeklyGoal(plan, landmarks, { phase: { phase: "deload", multiplier: 0.5 } });
  if (deload.Chest.target !== 8) fail(`phase deload target → ${deload.Chest.target}`);
  // perDay sums to the scaled target.
  const sum = Object.values(deload.Chest.perDay).reduce((a, b) => a + b, 0);
  if (sum !== 8) fail(`phase deload split sums → ${sum}`);
  const overreach = distributeWeeklyGoal(plan, landmarks, { phaseMultiplier: 1.1 });
  if (overreach.Chest.target !== 18) fail(`phase overreach target → ${overreach.Chest.target}`);
}

if (failures) { console.error(`\n${failures} weekly-goals check failure(s).`); process.exit(1); }
console.log("OK: weekly muscle goals math passes.");
