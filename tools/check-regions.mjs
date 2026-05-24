// Verifies the picker's region map: every muscle group belongs to exactly one
// region, and every region member is a real muscle group. No test runner here,
// so this is a standalone Node script (package.json is "type":"module").
//   node tools/check-regions.mjs   (or: npm run check:regions)
import { MUSCLE_GROUPS, MUSCLE_REGIONS } from "../js/rp.js";

let failures = 0;
const groups = new Set(MUSCLE_GROUPS);

// Region members must be real muscle groups.
for (const [region, members] of Object.entries(MUSCLE_REGIONS)) {
  for (const m of members) {
    if (!groups.has(m)) {
      failures++;
      console.error(`Region "${region}" references unknown muscle group "${m}"`);
    }
  }
}

// Every muscle group must appear in exactly one region.
const counts = new Map(MUSCLE_GROUPS.map((g) => [g, 0]));
for (const members of Object.values(MUSCLE_REGIONS)) {
  for (const m of members) if (counts.has(m)) counts.set(m, counts.get(m) + 1);
}
for (const [g, n] of counts) {
  if (n !== 1) {
    failures++;
    console.error(`Muscle group "${g}" is in ${n} regions (expected exactly 1)`);
  }
}

if (failures) {
  console.error(`\n${failures} region check failure(s).`);
  process.exit(1);
}
console.log(`OK: ${MUSCLE_GROUPS.length} muscle groups map cleanly across ${Object.keys(MUSCLE_REGIONS).length} regions.`);
