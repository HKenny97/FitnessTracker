// Truth table for performance-vs-normal engine functions.
//   node tools/check-performance.mjs   (or: npm run check:performance)
import {
  performanceVsNormal,
  performanceReason,
  sessionVerdict,
  e1rmTrend,
  sessionBestE1RMs,
} from "../js/adaptive.js";

let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.error(`FAIL  ${msg}`); } };

// Build a session's worth of sets for a given date at a given weight×reps.
const sess = (date, weight, reps = 5, n = 3) =>
  Array.from({ length: n }, (_, i) => ({
    date, dayIndex: 0, setNumber: i + 1, weight, reps, rir: 2,
  }));

// ── performanceVsNormal ──────────────────────────────────────

// No prior history → "new".
{
  const r = performanceVsNormal([], sess("2026-05-24", 200));
  ok(r.level === "new", `new lifter → new (got ${r.level})`);
}

// Only one prior session → still "new" (need >= 2 for a baseline).
{
  const prior = sess("2026-05-10", 200);
  const r = performanceVsNormal(prior, sess("2026-05-24", 210));
  ok(r.level === "new", `one prior session → new (got ${r.level})`);
}

// Steady baseline, big jump today → "above".
{
  const prior = [
    ...sess("2026-05-01", 200),
    ...sess("2026-05-08", 200),
    ...sess("2026-05-15", 200),
  ];
  const r = performanceVsNormal(prior, sess("2026-05-22", 220));
  ok(r.level === "above", `+10% → above (got ${r.level})`);
  ok(r.deltaPct >= 8 && r.deltaPct <= 12, `delta ~+10% (got ${r.deltaPct})`);
}

// Today matches baseline → "on".
{
  const prior = [
    ...sess("2026-05-01", 200),
    ...sess("2026-05-08", 200),
    ...sess("2026-05-15", 200),
  ];
  const r = performanceVsNormal(prior, sess("2026-05-22", 200));
  ok(r.level === "on", `flat → on (got ${r.level})`);
}

// Clear drop today → "below".
{
  const prior = [
    ...sess("2026-05-01", 200),
    ...sess("2026-05-08", 200),
    ...sess("2026-05-15", 200),
  ];
  const r = performanceVsNormal(prior, sess("2026-05-22", 180));
  ok(r.level === "below", `-10% → below (got ${r.level})`);
}

// Median resists a single fluke (one freakishly heavy session shouldn't
// drag the baseline up so much that a normal day reads "below").
{
  const prior = [
    ...sess("2026-05-01", 200),
    ...sess("2026-05-08", 320), // fluke / mis-log
    ...sess("2026-05-15", 200),
  ];
  const r = performanceVsNormal(prior, sess("2026-05-22", 200));
  ok(r.level === "on", `median ignores fluke → on (got ${r.level}, exp ${r.expectedE1RM})`);
}

// Nothing logged today → "new".
{
  const prior = [...sess("2026-05-01", 200), ...sess("2026-05-08", 200)];
  const r = performanceVsNormal(prior, []);
  ok(r.level === "new", `no sets today → new (got ${r.level})`);
}

// ── e1rmTrend ────────────────────────────────────────────────
ok(e1rmTrend([100, 110, 120]) === "rising", "trend rising");
ok(e1rmTrend([120, 110, 100]) === "falling", "trend falling");
ok(e1rmTrend([100, 100.5, 100]) === "flat", "trend flat");
ok(e1rmTrend([100]) === null, "trend null with one point");

// sessionBestE1RMs groups by session and returns chronological bests.
{
  const sets = [
    ...sess("2026-05-01", 100, 5, 2),
    ...sess("2026-05-08", 120, 5, 2),
  ];
  const bests = sessionBestE1RMs(sets);
  ok(bests.length === 2, `two session bests (got ${bests.length})`);
  ok(bests[0] < bests[1], "chronological order ascending");
}

// ── sessionVerdict ───────────────────────────────────────────

// No rated exercises → null.
ok(sessionVerdict([{ level: "new", expectedE1RM: 0, actualE1RM: 0 }]) === null,
  "verdict null when nothing rated");

// Mixed but net above → "above".
{
  const v = sessionVerdict([
    { level: "above", expectedE1RM: 100, actualE1RM: 110 },
    { level: "on", expectedE1RM: 100, actualE1RM: 101 },
    { level: "new", expectedE1RM: 0, actualE1RM: 0 },
  ]);
  ok(v && v.level === "above", `net above (got ${v && v.level})`);
}

// Net below → "below".
{
  const v = sessionVerdict([
    { level: "below", expectedE1RM: 100, actualE1RM: 88 },
    { level: "below", expectedE1RM: 100, actualE1RM: 92 },
  ]);
  ok(v && v.level === "below", `net below (got ${v && v.level})`);
}

// ── performanceReason (qualitative driver phrase) ────────────

const threePrior = (w, r) => [
  ...sess("2026-05-01", w, r),
  ...sess("2026-05-08", w, r),
  ...sess("2026-05-15", w, r),
];

// No baseline → no phrase / driver / detail.
{
  const r = performanceReason([], sess("2026-05-24", 200));
  ok(r.phrase === null && r.driver === null && r.detail === null,
    "reason: new lifter → phrase/driver/detail null");
}

// Heavier today, same reps → weight driver + detail numbers.
{
  const r = performanceReason(threePrior(200, 5), sess("2026-05-22", 220, 5));
  ok(r.level === "above" && r.phrase === "Heavier top set than usual",
    `reason heavier (got ${r.level} / ${r.phrase})`);
  ok(r.driver === "weight" && r.detail.todayWeight === 220 && r.detail.normalWeight === 200,
    `heavier detail (got ${r.driver} / ${JSON.stringify(r.detail)})`);
}

// Same weight, more reps → reps driver + detail numbers.
{
  const r = performanceReason(threePrior(200, 5), sess("2026-05-22", 200, 8));
  ok(r.level === "above" && r.phrase === "More reps than usual",
    `reason more reps (got ${r.level} / ${r.phrase})`);
  ok(r.driver === "reps" && r.detail.todayReps === 8 && r.detail.normalReps === 5,
    `more-reps detail (got ${r.driver} / ${JSON.stringify(r.detail)})`);
}

// Lighter today → weight driver, below.
{
  const r = performanceReason(threePrior(200, 5), sess("2026-05-22", 180, 5));
  ok(r.level === "below" && r.phrase === "Lighter top set than usual" && r.driver === "weight",
    `reason lighter (got ${r.level} / ${r.phrase} / ${r.driver})`);
}

// Same weight, fewer reps → reps driver, below.
{
  const r = performanceReason(threePrior(200, 6), sess("2026-05-22", 200, 4));
  ok(r.level === "below" && r.phrase === "Fewer reps than usual" && r.driver === "reps",
    `reason fewer reps (got ${r.level} / ${r.phrase} / ${r.driver})`);
}

// Essentially identical → on par, generic driver.
{
  const r = performanceReason(threePrior(200, 5), sess("2026-05-22", 201, 5));
  ok(r.level === "on" && r.phrase === "On par with your usual" && r.driver === "generic",
    `reason on par (got ${r.level} / ${r.phrase} / ${r.driver})`);
}

if (failures) { console.error(`\n${failures} performance check failure(s).`); process.exit(1); }
console.log("OK: all performance-vs-normal cases pass.");
