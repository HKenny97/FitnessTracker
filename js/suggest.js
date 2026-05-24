// Freeform helpers: exercise suggestions per muscle group, and per-session
// coverage zones. Pure / Node-testable.

// For each muscle group, the library entries targeting it, ranked by the user's
// past usage (freqMap: exerciseName -> count) then original library order,
// excluding names in `exclude`, capped at `perGroup`.
export function suggestForGroups(groups, exerciseLib, freqMap = {}, { perGroup = 3, exclude = [] } = {}) {
  const excludeSet = new Set(exclude);
  const order = new Map(exerciseLib.map((e, i) => [e.name, i]));
  return groups.map((group) => {
    const candidates = exerciseLib
      .filter((e) => e.group === group && !excludeSet.has(e.name))
      .sort((a, b) => (freqMap[b.name] || 0) - (freqMap[a.name] || 0) || order.get(a.name) - order.get(b.name))
      .slice(0, perGroup);
    return { group, exercises: candidates };
  });
}

// Classify a per-session working-set count against a [lo, hi] target window.
export function sessionZone(sets, range) {
  const [lo, hi] = range || [3, 8];
  if (sets < lo) return "under";
  if (sets > hi) return "over";
  return "target";
}
