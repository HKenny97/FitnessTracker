// Checks the workout-name suggestion helpers. Run with:
//   node tools/check-workout-name.mjs   (or: npm run check:workout-name)
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const { timeOfDay, detectWorkoutType, suggestWorkoutNames } = await import("../js/workout-name.js");

let failures = 0;
const fail = (msg) => { failures++; console.error(`FAIL  ${msg}`); };
const eq = (got, want, label) => { if (got !== want) fail(`${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };

// timeOfDay buckets.
eq(timeOfDay("06:30"), "Morning", "06:30");
eq(timeOfDay("13:00"), "Afternoon", "13:00");
eq(timeOfDay("18:45"), "Evening", "18:45");
eq(timeOfDay("23:10"), "Night", "23:10");
eq(timeOfDay("03:00"), "Night", "03:00");
eq(timeOfDay(""), "", "empty");
eq(timeOfDay(null), "", "null");

// detectWorkoutType matches a preset that contains the trained groups.
eq(detectWorkoutType(["Chest", "Shoulders (front delts)", "Triceps"]), "Push", "push groups");
eq(detectWorkoutType(["Quads", "Hamstrings", "Glutes", "Calves"]), "Legs", "legs groups");
eq(detectWorkoutType([]), "", "no groups");
// A lone group with no covering preset still returns a non-empty label.
if (!detectWorkoutType(["Chest"])) fail("single group should produce a label");

// suggestWorkoutNames produces varied, de-duplicated, non-empty entries.
const names = suggestWorkoutNames({
  startTime: "07:15",
  location: "Iron Temple",
  groups: ["Chest", "Shoulders (front delts)", "Triceps"],
});
if (!names.length) fail("expected suggestions");
if (new Set(names).size !== names.length) fail("suggestions should be unique");
if (names.some((n) => !n || !n.trim())) fail("no empty suggestions");
if (!names.includes("Morning Push at Iron Temple")) fail(`expected full variant, got ${JSON.stringify(names)}`);
if (!names.includes("Push at Iron Temple")) fail("expected type+location variant");

// Missing inputs are skipped without producing junk.
const sparse = suggestWorkoutNames({ groups: ["Back"] });
if (!sparse.length) fail("expected at least a type-based suggestion");
if (sparse.some((n) => /\bat\b\s*$/.test(n) || n.startsWith("at "))) fail("no dangling location text");

if (failures) { console.error(`\n${failures} workout-name check failure(s).`); process.exit(1); }
console.log("OK: workout-name suggestion helpers pass.");
