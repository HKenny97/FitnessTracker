// Validates the demo-data generator's shape (counts, dates, progression).
//   node tools/check-seed.mjs   (or: npm run check:seed)

// Browser-global stubs so the module graph (seed → data → sheets → auth →
// config) imports cleanly under Node.
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
globalThis.window = { addEventListener() {} };
globalThis.document = {
  createElement: () => ({ append() {}, setAttribute() {}, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} }, style: {} }),
  getElementById: () => null, querySelectorAll: () => [], addEventListener() {},
};

const { generateDemoRows, DEMO_TEMPLATE, DEMO_LOGGED_WEEKS, DEMO_START_OFFSET } =
  await import("../js/seed.js");

let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.error(`FAIL  ${msg}`); } };

let counter = 0;
const newId = () => `id-${counter++}`;
const { setRows, sessionRows, feedbackRows, cardioRows } = generateDemoRows("meso-demo", newId);

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();
const earliest = (() => {
  const d = new Date();
  d.setDate(d.getDate() - DEMO_START_OFFSET);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

// ── Counts ──
const exPerDay = DEMO_TEMPLATE.days.map((d) => d.exercises.length);
const totalEx = exPerDay.reduce((a, b) => a + b, 0);
ok(setRows.length === totalEx * 3 * DEMO_LOGGED_WEEKS,
  `set count = ${totalEx * 3 * DEMO_LOGGED_WEEKS} (got ${setRows.length})`);
ok(sessionRows.length === DEMO_TEMPLATE.days.length * DEMO_LOGGED_WEEKS,
  `session count = ${DEMO_TEMPLATE.days.length * DEMO_LOGGED_WEEKS} (got ${sessionRows.length})`);

const distinctPerDay = DEMO_TEMPLATE.days.map((d) => new Set(d.exercises.map((e) => e.muscleGroup)).size);
const expectedFeedback = distinctPerDay.reduce((a, b) => a + b, 0) * DEMO_LOGGED_WEEKS;
ok(feedbackRows.length === expectedFeedback, `feedback count = ${expectedFeedback} (got ${feedbackRows.length})`);
ok(cardioRows.length === 10, `cardio count = 10 (got ${cardioRows.length})`);

// ── Unique ids ──
const allIds = [...setRows, ...sessionRows, ...feedbackRows, ...cardioRows].map((r) => r.id);
ok(new Set(allIds).size === allIds.length, "all ids unique");

// ── Dates within [earliest, today] ──
const dated = [...setRows, ...sessionRows, ...cardioRows];
ok(dated.every((r) => r.date <= today && r.date >= earliest),
  "all dates fall within the block window (no future dates)");
ok(sessionRows.some((s) => s.date === today), "the latest session is today");

// ── Value sanity ──
ok(setRows.every((s) => s.weight > 0 && s.reps >= 1 && s.rir >= 0 && s.rir <= 5),
  "every set has positive weight, >=1 rep, RIR in 0..5");
ok(setRows.every((s) => [1, 2, 3].includes(s.setNumber)), "set numbers are 1..3");
ok(setRows.every((s) => s.exercise && s.muscleGroup), "every set names an exercise + muscle");

// ── Weight progression: week 5 heavier than week 1 for a staple lift ──
const benchW1 = setRows.find((s) => s.exercise === "Barbell Bench Press" && s.week === 1);
const benchW5 = setRows.find((s) => s.exercise === "Barbell Bench Press" && s.week === 5);
ok(benchW1 && benchW5 && benchW5.weight > benchW1.weight,
  `bench progresses wk1 ${benchW1?.weight} -> wk5 ${benchW5?.weight}`);

if (failures) { console.error(`\n${failures} seed check failure(s).`); process.exit(1); }
console.log(`OK: demo generator produces ${setRows.length} sets, ${sessionRows.length} sessions, ${feedbackRows.length} feedback, ${cardioRows.length} cardio.`);
