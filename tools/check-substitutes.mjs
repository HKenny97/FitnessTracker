// Validates the exercise substitute table against the library: every key and
// every substitute name in EXERCISE_SUBSTITUTES must resolve to a real entry in
// EXERCISE_LIBRARY (case/whitespace-insensitive, matching the runtime lookup in
// js/views/meso.js). Exits non-zero with a report on any miss, so the table
// can't silently rot as exercises are renamed or removed.
import { EXERCISE_LIBRARY, EXERCISE_SUBSTITUTES } from "../js/rp.js";

const normalize = (s) => (s || "").trim().toLowerCase();
const known = new Set(EXERCISE_LIBRARY.map((e) => normalize(e.name)));

const missingKeys = [];
const missingSubs = [];

for (const [name, subs] of Object.entries(EXERCISE_SUBSTITUTES)) {
  if (!known.has(normalize(name))) missingKeys.push(name);
  for (const s of subs) {
    if (!known.has(normalize(s))) missingSubs.push(`${name} -> ${s}`);
  }
}

if (missingKeys.length || missingSubs.length) {
  if (missingKeys.length) {
    console.error(`\nSubstitute keys not in EXERCISE_LIBRARY (${missingKeys.length}):`);
    for (const k of missingKeys) console.error(`  - ${k}`);
  }
  if (missingSubs.length) {
    console.error(`\nSubstitute targets not in EXERCISE_LIBRARY (${missingSubs.length}):`);
    for (const m of missingSubs) console.error(`  - ${m}`);
  }
  process.exit(1);
}

console.log(`OK: all ${Object.keys(EXERCISE_SUBSTITUTES).length} substitute entries resolve in the library.`);
