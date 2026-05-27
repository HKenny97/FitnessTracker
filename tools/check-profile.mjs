// Verifies the training-profile → volume-landmark computation: invariant
// ordering for every muscle/level, experience monotonicity, and that
// prioritize/careful emphasis (and their precedence) move targets the right way.
//   node tools/check-profile.mjs   (or: npm run check:profile)
import { MUSCLE_GROUPS, DEFAULT_LANDMARKS } from "../js/rp.js";
import { EXPERIENCE_LEVELS, computeLandmarks, defaultProfile } from "../js/profile.js";

let failures = 0;
const fail = (m) => { failures++; console.error(`FAIL  ${m}`); };

const ordered = (lm) => lm.MV <= lm.MEV && lm.MEV <= lm.MAV_lo && lm.MAV_lo <= lm.MAV_hi && lm.MAV_hi <= lm.MRV;

// Invariant holds for every muscle at every experience level, with no emphasis.
for (const level of EXPERIENCE_LEVELS) {
  const out = computeLandmarks({ experience: level, prioritize: [], careful: [] });
  for (const g of MUSCLE_GROUPS) {
    const lm = out[g];
    if (!lm) { fail(`${level}: missing ${g}`); continue; }
    if (!ordered(lm)) fail(`${level} ${g}: order violated ${JSON.stringify(lm)}`);
    if (lm.MV !== DEFAULT_LANDMARKS[g].MV) fail(`${level} ${g}: MV should be unchanged`);
  }
}

// defaultProfile (intermediate, no emphasis) reproduces the base table.
{
  const out = computeLandmarks(defaultProfile());
  for (const g of MUSCLE_GROUPS) {
    const b = DEFAULT_LANDMARKS[g];
    const lm = out[g];
    for (const k of ["MV", "MEV", "MAV_lo", "MAV_hi", "MRV"]) {
      if (lm[k] !== b[k]) fail(`intermediate ${g}.${k}: ${lm[k]} ≠ base ${b[k]}`);
    }
  }
}

// Experience monotonicity: beginner < intermediate < advanced (MRV, Chest).
{
  const beg = computeLandmarks({ experience: "beginner" }).Chest.MRV;
  const int = computeLandmarks({ experience: "intermediate" }).Chest.MRV;
  const adv = computeLandmarks({ experience: "advanced" }).Chest.MRV;
  if (!(beg < int && int < adv)) fail(`Chest MRV not monotonic: ${beg} / ${int} / ${adv}`);
}

// Prioritize raises a muscle's MRV above the plain level.
{
  const plain = computeLandmarks({ experience: "intermediate" }).Back.MRV;
  const prio = computeLandmarks({ experience: "intermediate", prioritize: ["Back"] }).Back.MRV;
  if (!(prio > plain)) fail(`prioritize Back MRV not raised: ${prio} ≤ ${plain}`);
}

// Careful lowers a muscle's MRV below the plain level.
{
  const plain = computeLandmarks({ experience: "intermediate" }).Chest.MRV;
  const careful = computeLandmarks({ experience: "intermediate", careful: ["Chest"] }).Chest.MRV;
  if (!(careful < plain)) fail(`careful Chest MRV not lowered: ${careful} ≥ ${plain}`);
}

// Careful beats prioritize when a muscle is flagged both.
{
  const both = computeLandmarks({ experience: "intermediate", prioritize: ["Chest"], careful: ["Chest"] }).Chest.MRV;
  const carefulOnly = computeLandmarks({ experience: "intermediate", careful: ["Chest"] }).Chest.MRV;
  if (both !== carefulOnly) fail(`careful should win over prioritize: ${both} ≠ ${carefulOnly}`);
}

// Idempotent: same profile → same result.
{
  const p = { experience: "advanced", prioritize: ["Back"], careful: ["Hamstrings"] };
  if (JSON.stringify(computeLandmarks(p)) !== JSON.stringify(computeLandmarks(p))) fail("not idempotent");
}

if (failures) { console.error(`\n${failures} profile check failure(s).`); process.exit(1); }
console.log("OK: training-profile landmark computation passes.");
