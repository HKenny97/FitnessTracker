// Checks that per-exercise manual overrides win in the adaptive engine. Run:
//   node tools/check-overrides.mjs   (or: npm run check:overrides)
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const { analyze, adaptiveSuggestWeight } = await import("../js/adaptive.js");

let failures = 0;
const fail = (msg) => { failures++; console.error(`FAIL  ${msg}`); };

const EX = "Barbell Bench Press"; // compound, non-zero default progression

// analyze(): manual progression + rep range override wins, marked as manual.
{
  const a = analyze(EX, [], { progressionRate: 0.1, repMin: 6, repMax: 10 });
  if (a.progression.source !== "manual") fail(`progression.source = ${a.progression.source}`);
  if (Math.abs(a.progression.rate - 0.1) > 1e-9) fail(`progression.rate = ${a.progression.rate}`);
  if (a.repRange.min !== 6 || a.repRange.max !== 10) fail(`repRange = ${a.repRange.label}`);
}

// adaptiveSuggestWeight(): override rate drives the jump (buffer 2 → 2× rate).
{
  const prev = { weight: 100, reps: 10, rir: 3 };
  const s = adaptiveSuggestWeight(prev, 8, 1, EX, [], { progressionRate: 0.1 });
  // 100 * (1 + 0.1*2) = 120, snapped to 2.5 → 120.
  if (s !== 120) fail(`override suggestion = ${s} (expected 120)`);
}

// No override → still returns a finite suggestion from defaults.
{
  const prev = { weight: 100, reps: 10, rir: 3 };
  const s = adaptiveSuggestWeight(prev, 8, 1, EX, []);
  if (!Number.isFinite(s) || s <= 100) fail(`default suggestion = ${s} (expected > 100)`);
}

// Empty override object behaves like no override.
{
  const a1 = analyze(EX, []);
  const a2 = analyze(EX, [], {});
  if (a1.progression.label !== a2.progression.label) fail(`empty override changed progression`);
}

if (failures) { console.error(`\n${failures} override check failure(s).`); process.exit(1); }
console.log("OK: per-exercise overrides win in analyze + adaptiveSuggestWeight.");
