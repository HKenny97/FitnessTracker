// Checks Weekly Muscle Goals math: MAV-mid targets, set distribution across
// days, warnings (overload + insufficient rest), per-week resolution, and
// missed-day rollover.
//   node tools/check-goals.mjs   (or: npm run check:goals)
import {
  mavMidTarget, mondayOf, weekdayIndex, resolvePlanForWeek,
  distributeWeeklyGoal, dailyVolume, MAX_SESSION_SETS,
  weeklyGoalWarnings, pendingDayForToday,
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

// dailyVolume pivots distributeWeeklyGoal into per-day { muscles, totalSets }.
{
  const plan = [
    { weekday: 0, dayName: "Push", groups: ["Chest", "Back"] },
    { weekday: 3, dayName: "Pull", groups: ["Chest", "Back"] },
  ];
  const daily = dailyVolume(plan, landmarks);
  if (daily.length !== 2) fail(`dailyVolume length → ${daily.length}`);
  if (daily[0].weekday !== 0 || daily[1].weekday !== 3) fail("dailyVolume not sorted by weekday");
  const dist = distributeWeeklyGoal(plan, landmarks);
  for (const d of daily) {
    for (const m of d.muscles) {
      const expected = dist[m.muscle].perDay[d.weekday];
      if (m.sets !== expected) fail(`${m.muscle} on ${d.weekday}: ${m.sets} ≠ dist ${expected}`);
    }
    const sum = d.muscles.reduce((s, m) => s + m.sets, 0);
    if (sum !== d.totalSets) fail(`totalSets mismatch on weekday ${d.weekday}: ${d.totalSets} ≠ ${sum}`);
  }
  if (dailyVolume([], landmarks).length !== 0) fail("empty plan → non-empty dailyVolume");
}

// High-session warning fires past MAX_SESSION_SETS and not below it.
{
  // Many muscles all on one day → easily exceeds the cap.
  const heavy = [{ weekday: 0, dayName: "Everything", groups: ["Chest", "Back", "Quads", "Shoulders (side delts)", "Biceps", "Triceps"] }];
  const dailyHeavy = dailyVolume(heavy, landmarks);
  if (!(dailyHeavy[0].totalSets > MAX_SESSION_SETS)) fail(`expected heavy day > ${MAX_SESSION_SETS}, got ${dailyHeavy[0].totalSets}`);
  const w = weeklyGoalWarnings(heavy, landmarks, MUSCLE_REFERENCE);
  if (!w.some((x) => /high volume/.test(x.msg))) fail("high-session warning missing on heavy day");

  // A modest single-muscle day stays quiet.
  const light = [{ weekday: 0, dayName: "Chest only", groups: ["Chest"] }];
  const w2 = weeklyGoalWarnings(light, landmarks, MUSCLE_REFERENCE);
  if (w2.some((x) => /high volume/.test(x.msg))) fail("high-session warning fired on light day");
}

if (failures) { console.error(`\n${failures} weekly-goals check failure(s).`); process.exit(1); }
console.log("OK: weekly muscle goals math passes.");
