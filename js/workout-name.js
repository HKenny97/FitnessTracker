// Workout-name suggestions: pure helpers (no DOM) for proposing a name from
// the session's time of day, detected workout type, trained muscle groups, and
// location. Used by the Train view's "Suggest" sheet and the end-of-workout
// prompt.
import { WORKOUT_PRESETS } from "./rp.js";
import { formatMuscle } from "./ui.js";

// "HH:MM" → coarse part of day. Empty/invalid → "".
export function timeOfDay(hhmm) {
  const h = parseInt(String(hhmm || "").split(":")[0], 10);
  if (!Number.isFinite(h)) return "";
  if (h >= 5 && h <= 11) return "Morning";
  if (h >= 12 && h <= 16) return "Afternoon";
  if (h >= 17 && h <= 20) return "Evening";
  return "Night";
}

// Drop the "Shoulders (…)" wrapper for compact labels: "Shoulders (side delts)"
// → "Side Delts".
const shortMuscle = (g) => formatMuscle(String(g || "").replace(/^Shoulders \((.*)\)$/, "$1"));

// Best-matching WORKOUT_PRESETS name for a set of trained groups, or a short
// joined label when nothing fits. Prefers the most specific preset that fully
// contains the trained groups; otherwise the preset with the largest overlap.
export function detectWorkoutType(groups) {
  const trained = [...new Set((groups || []).filter(Boolean))];
  if (!trained.length) return "";

  let covering = null;     // smallest preset whose groups ⊇ trained
  let bestOverlap = null;  // fallback: most overlap, then smallest preset
  for (const [name, presetGroups] of Object.entries(WORKOUT_PRESETS)) {
    const set = new Set(presetGroups);
    const overlap = trained.filter((g) => set.has(g)).length;
    if (trained.every((g) => set.has(g))) {
      if (!covering || presetGroups.length < covering.size) covering = { name, size: presetGroups.length };
    }
    if (overlap > 0 && (!bestOverlap || overlap > bestOverlap.overlap ||
      (overlap === bestOverlap.overlap && presetGroups.length < bestOverlap.size))) {
      bestOverlap = { name, overlap, size: presetGroups.length };
    }
  }
  if (covering) return covering.name;
  if (bestOverlap) return bestOverlap.name;
  return trained.slice(0, 3).map(shortMuscle).join(" & ");
}

// A de-duplicated list of varied name suggestions. Variants whose inputs are
// missing are skipped. `type` is a preset/day-name string; `groups` is the
// trained muscle list (used to derive a type when one isn't supplied).
export function suggestWorkoutNames({ startTime, location, type, groups } = {}) {
  const time = timeOfDay(startTime);
  const loc = (location || "").trim();
  const t = (type || "").trim() || detectWorkoutType(groups);
  const groupLabel = (groups && groups.length)
    ? [...new Set(groups.filter(Boolean))].slice(0, 3).map(shortMuscle).join(" & ")
    : "";

  const out = [];
  const add = (s) => { const v = (s || "").trim(); if (v && !out.includes(v)) out.push(v); };

  if (time && t && loc) add(`${time} ${t} at ${loc}`);
  if (time && t) add(`${time} ${t}`);
  if (t && loc) add(`${t} at ${loc}`);
  if (t) add(`${t} Day`);
  if (groupLabel && groupLabel !== t) add(groupLabel);
  if (loc) add(`${loc} Session`);
  if (time) add(`${time} Workout`);

  return out;
}
