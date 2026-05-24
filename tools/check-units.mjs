// Checks weight unit conversion. units.js imports config.js, which reads
// localStorage at module load, so we shim it before importing. Run with:
//   node tools/check-units.mjs   (or: npm run check:units)
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const { config } = await import("../js/config.js");
const { toDisplay, fromDisplay, formatWeight, KG_PER_LB } = await import("../js/units.js");

let failures = 0;
const fail = (msg) => { failures++; console.error(`FAIL  ${msg}`); };
const approx = (a, b, tol = 0.2) => Math.abs(a - b) <= tol;

// lb mode: identity, exact round-trip.
config.displayUnit = "lb";
if (toDisplay(225) !== 225) fail(`lb toDisplay(225) → ${toDisplay(225)}`);
if (fromDisplay(225) !== 225) fail(`lb fromDisplay(225) → ${fromDisplay(225)}`);
if (formatWeight(100) !== "100 lb") fail(`lb formatWeight(100) → ${formatWeight(100)}`);

// kg mode: conversion + round-trip within tolerance.
config.displayUnit = "kg";
if (!approx(toDisplay(220.462), 100)) fail(`kg toDisplay(220.462) → ${toDisplay(220.462)} (expected ~100)`);
if (!approx(fromDisplay(100), 220.462, 0.3)) fail(`kg fromDisplay(100) → ${fromDisplay(100)} (expected ~220.46)`);
for (const lbs of [45, 135, 225, 315]) {
  const rt = fromDisplay(toDisplay(lbs));
  if (!approx(rt, lbs, 0.3)) fail(`kg round-trip ${lbs} → ${rt}`);
}
if (!formatWeight(225).endsWith(" kg")) fail(`kg formatWeight(225) → ${formatWeight(225)}`);

config.displayUnit = "lb";
if (failures) { console.error(`\n${failures} unit check failure(s).`); process.exit(1); }
console.log(`OK: unit conversions pass (KG_PER_LB=${KG_PER_LB}).`);
