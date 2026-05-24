// Verifies MUSCLE_REFERENCE + DEFAULT_LANDMARKS cover every muscle group and are
// internally consistent.  node tools/check-reference.mjs (npm run check:reference)
import { MUSCLE_GROUPS, MUSCLE_REFERENCE, DEFAULT_LANDMARKS } from "../js/rp.js";

let failures = 0;
const fail = (m) => { failures++; console.error(`FAIL  ${m}`); };

for (const g of MUSCLE_GROUPS) {
  const ref = MUSCLE_REFERENCE[g];
  if (!ref) { fail(`no MUSCLE_REFERENCE for "${g}"`); continue; }
  if (!Array.isArray(ref.sessionCap) || ref.sessionCap.length !== 2) fail(`${g}: sessionCap not [lo,hi]`);
  else if (ref.sessionCap[0] > ref.sessionCap[1] || ref.sessionCap[0] < 0) fail(`${g}: bad sessionCap ${ref.sessionCap}`);
  if (!ref.repRange || !ref.rest) fail(`${g}: missing repRange/rest`);

  const lm = DEFAULT_LANDMARKS[g];
  if (!lm) { fail(`no DEFAULT_LANDMARKS for "${g}"`); continue; }
  if (!(lm.MV <= lm.MEV && lm.MEV <= lm.MAV_lo && lm.MAV_lo <= lm.MAV_hi && lm.MAV_hi <= lm.MRV)) {
    fail(`${g}: landmark order MV≤MEV≤MAV_lo≤MAV_hi≤MRV violated: ${JSON.stringify(lm)}`);
  }
}

if (failures) { console.error(`\n${failures} reference check failure(s).`); process.exit(1); }
console.log(`OK: ${MUSCLE_GROUPS.length} muscle groups have consistent reference + landmarks.`);
