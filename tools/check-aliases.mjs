// Verifies exercise-name aliases and the fuzzy matcher. No test runner here, so
// this is a standalone Node script (package.json is "type":"module"). Run with
//   node tools/check-aliases.mjs   (or: npm run check:aliases)
import { EXERCISE_LIBRARY, EXERCISE_ALIASES } from "../js/rp.js";
import { resolveExerciseName } from "../js/exercise-match.js";

const normalize = (s) => (s || "").trim().toLowerCase();
const known = new Set(EXERCISE_LIBRARY.map((e) => normalize(e.name)));

let failures = 0;

// 1. Every alias target must resolve to a real library exercise.
const missing = Object.entries(EXERCISE_ALIASES).filter(([, v]) => !known.has(normalize(v)));
if (missing.length) {
  failures += missing.length;
  console.error(`Alias targets not in EXERCISE_LIBRARY (${missing.length}):`);
  for (const [k, v] of missing) console.error(`  - ${k} -> ${v}`);
}

// 2. Resolution table: query -> expected library name (or null).
const CASES = [
  { q: "ohp", expect: "Overhead Press" },
  { q: "rdl", expect: "Romanian Deadlift" },
  { q: "bss", expect: "Bulgarian Split Squat" },
  { q: "oh press", expect: "Overhead Press" },
  { q: "db bench", expect: "Dumbbell Bench Press" },
  { q: "bb row", expect: "Barbell Row" },
  { q: "barbell bench press", expect: "Barbell Bench Press" },
  { q: "press", expect: null },        // ambiguous → picker
  { q: "zzzznope", expect: null },     // no match
];

for (const c of CASES) {
  const got = resolveExerciseName(c.q, EXERCISE_LIBRARY);
  const gotName = got ? got.name : null;
  if (gotName !== c.expect) {
    failures++;
    console.error(`FAIL  resolve(${JSON.stringify(c.q)}) → ${JSON.stringify(gotName)} (expected ${JSON.stringify(c.expect)})`);
  }
}

if (failures) {
  console.error(`\n${failures} alias check failure(s).`);
  process.exit(1);
}
console.log(`OK: ${Object.keys(EXERCISE_ALIASES).length} aliases resolve, ${CASES.length} matcher cases pass.`);
