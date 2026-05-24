// Unit check for the free-text set parser. No test runner in this project, so
// this is a standalone Node script (package.json is "type":"module"). Run with
//   node tools/check-parse-sets.mjs   (or: npm run check:parse)
import { parseSets } from "../js/parse-sets.js";

const s = (weight, reps, rir = null) => ({ weight, reps, rir });

const CASES = [
  { in: "225x5", name: null, sets: [s(225, 5)], errors: 0 },
  { in: "2@225", name: null, sets: [s(225, 2)], errors: 0 },
  { in: "3x8 @185", name: null, sets: [s(185, 8), s(185, 8), s(185, 8)], errors: 0 },
  { in: "225x5, 225x5, 225x4", name: null, sets: [s(225, 5), s(225, 5), s(225, 4)], errors: 0 },
  { in: "225x5/5/4", name: null, sets: [s(225, 5), s(225, 5), s(225, 4)], errors: 0 },
  { in: "5/5/4@225", name: null, sets: [s(225, 5), s(225, 5), s(225, 4)], errors: 0 },
  { in: "225x5 r2", name: null, sets: [s(225, 5, 2)], errors: 0 },
  { in: "2@225 r2", name: null, sets: [s(225, 2, 2)], errors: 0 },
  { in: "3x8 @185 r1", name: null, sets: [s(185, 8, 1), s(185, 8, 1), s(185, 8, 1)], errors: 0 },
  { in: "10x10 @135", name: null, sets: Array.from({ length: 10 }, () => s(135, 10)), errors: 0 },
  { in: "225 x 5", name: null, sets: [s(225, 5)], errors: 0 },
  { in: "182.5x5", name: null, sets: [s(182.5, 5)], errors: 0 },
  { in: "bench 225x5/5/4", name: "bench", sets: [s(225, 5), s(225, 5), s(225, 4)], errors: 0 },
  { in: "incline db press 3x8 @60", name: "incline db press", sets: [s(60, 8), s(60, 8), s(60, 8)], errors: 0 },
  { in: "225x5 @2", name: null, sets: [], errors: 1 },      // 225 sets > MAX_SETS
  { in: "225x5 r12", name: null, sets: [], errors: 1 },     // rir > MAX_RIR
  { in: "225", name: null, sets: [], errors: 1 },           // lone number, unparseable
  { in: "225x5, foo", name: null, sets: [s(225, 5)], errors: 1 },
  { in: "", name: null, sets: [], errors: 0 },
  { in: "bench press", name: "bench press", sets: [], errors: 0 },
];

const eqSet = (a, b) => a.weight === b.weight && a.reps === b.reps && a.rir === b.rir;

let failures = 0;
for (const c of CASES) {
  const got = parseSets(c.in);
  const ok =
    got.name === c.name &&
    got.errors.length === c.errors &&
    got.sets.length === c.sets.length &&
    got.sets.every((set, i) => eqSet(set, c.sets[i]));
  if (!ok) {
    failures++;
    console.error(`FAIL  ${JSON.stringify(c.in)}`);
    console.error(`  expected name=${JSON.stringify(c.name)} sets=${JSON.stringify(c.sets)} errors=${c.errors}`);
    console.error(`  got      name=${JSON.stringify(got.name)} sets=${JSON.stringify(got.sets)} errors=${got.errors.length}`);
  }
}

if (failures) {
  console.error(`\n${failures}/${CASES.length} case(s) failed.`);
  process.exit(1);
}
console.log(`OK: all ${CASES.length} parser cases pass.`);
