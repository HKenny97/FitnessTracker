// Warm-up ramp toward a working weight. Pure / Node-testable.
import { platesPerSide, defaultBar, defaultPlates } from "./plates.js";

// Returns [{ weight, reps }] in the given unit (default lb), each weight
// snapped down to a loadable bar weight, skipping any rung at/above the
// working weight or duplicating a previous rung.
export function warmupSets(workingWeight, unit = "lb") {
  const w = Number(workingWeight);
  const bar = defaultBar(unit);
  if (!Number.isFinite(w) || w <= bar) return [];
  const snap = (x) => platesPerSide(x, bar, defaultPlates(unit)).loadable;
  const ramp = [
    { weight: bar, reps: 10 },
    { weight: snap(w * 0.4), reps: 8 },
    { weight: snap(w * 0.6), reps: 5 },
    { weight: snap(w * 0.8), reps: 3 },
  ];
  const out = [];
  const seen = new Set();
  for (const s of ramp) {
    if (s.weight >= w || seen.has(s.weight)) continue;
    seen.add(s.weight);
    out.push(s);
  }
  return out;
}
