// Weight unit display/conversion. Weights are STORED canonically in pounds;
// these helpers convert at the display and input boundaries based on the
// user's preference (config.displayUnit). Pure except for the config read.
import { config } from "./config.js";

export const KG_PER_LB = 0.45359237;

const round1 = (n) => Math.round(n * 10) / 10;

export function unitLabel() {
  return config.displayUnit === "kg" ? "kg" : "lb";
}

// Stored lbs → number in the user's display unit (1 decimal).
export function toDisplay(lbs) {
  const n = Number(lbs);
  if (!Number.isFinite(n)) return n;
  return config.displayUnit === "kg" ? round1(n * KG_PER_LB) : round1(n);
}

// A value the user typed/sees (display unit) → canonical lbs (1 decimal).
export function fromDisplay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return n;
  return config.displayUnit === "kg" ? round1(n / KG_PER_LB) : round1(n);
}

// Format a stored-lbs weight for display, with unit label, e.g. "102.1 kg".
export function formatWeight(lbs) {
  const n = Number(lbs);
  if (!Number.isFinite(n)) return String(lbs);
  return `${toDisplay(n)} ${unitLabel()}`;
}

// Dumbbell weights are logged per dumbbell. These help label them and count
// both implements in tonnage.
export const isDumbbell = (equipment) => (equipment || "").toLowerCase() === "dumbbell";

// Lifts that use a single dumbbell — doubling their volume would overcount.
const SINGLE_IMPLEMENT = /(single[- ]?arm|one[- ]?arm|concentration|goblet|pullover)/i;

// Volume multiplier for a set: 2 for two-dumbbell lifts, else 1.
export function dbVolumeFactor(name, equipment) {
  return isDumbbell(equipment) && !SINGLE_IMPLEMENT.test(name || "") ? 2 : 1;
}
