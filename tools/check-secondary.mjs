// Validates secondary muscle-group entries in the exercise library:
//   - every secondary group is a real MUSCLE_GROUPS member
//   - fractions are numbers in (0, 1]
//   - no exercise lists its own primary group as a secondary
//   - movement-pattern invariants (rows credit Traps, presses credit
//     Triceps + a delts head, hinges credit Glutes, etc.)
//   node tools/check-secondary.mjs   (or: npm run check:secondary)
import { MUSCLE_GROUPS, EXERCISE_LIBRARY } from "../js/rp.js";

let failures = 0;
let secondaryCount = 0;
const groups = new Set(MUSCLE_GROUPS);

const hasSecondary = (ex, group) =>
  Array.isArray(ex.secondary) && ex.secondary.some((s) => s.group === group);
const hasSecondaryMatching = (ex, pred) =>
  Array.isArray(ex.secondary) && ex.secondary.some((s) => pred(s.group));

for (const ex of EXERCISE_LIBRARY) {
  if (ex.secondary) {
    if (!Array.isArray(ex.secondary)) {
      failures++;
      console.error(`"${ex.name}": secondary is not an array`);
      continue;
    }
    for (const sec of ex.secondary) {
      secondaryCount++;
      if (!groups.has(sec.group)) {
        failures++;
        console.error(`"${ex.name}": unknown secondary group "${sec.group}"`);
      }
      if (sec.group === ex.group) {
        failures++;
        console.error(`"${ex.name}": secondary lists own primary group "${sec.group}"`);
      }
      if (typeof sec.fraction !== "number" || sec.fraction <= 0 || sec.fraction > 1) {
        failures++;
        console.error(`"${ex.name}" → "${sec.group}": fraction ${sec.fraction} not in (0, 1]`);
      }
    }
  }

  // Pattern invariants. Each rule checks "if primary is X and name looks
  // like pattern Y, secondary must include Z" — catches future entries
  // that forget the standard secondary contributions for their family.
  const name = ex.name;

  // Back-primary rows credit Traps (middle trap drives scapular retraction).
  if (ex.group === "Back" && /\bRow\b/i.test(name) && !hasSecondary(ex, "Traps")) {
    failures++;
    console.error(`"${name}": back-primary Row missing Traps in secondary`);
  }

  // Back-primary pulling movements credit Biceps. Straight-arm variants
  // are excluded — arms stay extended, no elbow flexion.
  if (
    ex.group === "Back" &&
    /\bRow\b|Pull-?Up|Pulldown|Chin-?Up/i.test(name) &&
    !/Straight-?Arm/i.test(name) &&
    !hasSecondary(ex, "Biceps")
  ) {
    failures++;
    console.error(`"${name}": back-primary pull missing Biceps in secondary`);
  }

  // Chest-primary presses credit Triceps and one deltoid head.
  if (ex.group === "Chest" && /Bench|Press|Push-?Up|Dip/i.test(name)) {
    if (!hasSecondary(ex, "Triceps")) {
      failures++;
      console.error(`"${name}": chest-primary press missing Triceps in secondary`);
    }
    if (!hasSecondaryMatching(ex, (g) => g.startsWith("Shoulders ("))) {
      failures++;
      console.error(`"${name}": chest-primary press missing a Shoulders (* delts) head in secondary`);
    }
  }

  // Hamstrings-primary hinges credit Glutes.
  if (
    ex.group === "Hamstrings" &&
    /Deadlift|RDL|Good Morning/i.test(name) &&
    !hasSecondary(ex, "Glutes")
  ) {
    failures++;
    console.error(`"${name}": hamstrings-primary hinge missing Glutes in secondary`);
  }
}

const withSecondary = EXERCISE_LIBRARY.filter((e) => e.secondary?.length).length;

if (failures) {
  console.error(`\n${failures} secondary check failure(s).`);
  process.exit(1);
}
console.log(`OK: ${withSecondary}/${EXERCISE_LIBRARY.length} exercises have secondary muscles (${secondaryCount} total entries).`);
