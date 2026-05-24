// Evidence-based hypertrophy standards and landmark generation.
//
// Weekly set targets come from each muscle's volume landmarks (MEV/MAV/MRV).
// The remaining standards below summarise the consensus of the hypertrophy
// research (Schoenfeld meta-analyses, Renaissance Periodization / Israetel,
// Helms, Nippard): train each muscle at least twice a week, keep most working
// sets in a ~6–15 rep range, take sets close to failure (0–3 RIR), and run a
// deload roughly every 4–6 weeks.

import { DEFAULT_LANDMARKS, MUSCLE_GROUPS } from "./rp.js";

export const GROWTH_STANDARDS = {
  frequencyTarget: 2, // sessions per muscle group per week
  repRange: { lo: 6, hi: 15 }, // hypertrophy sweet spot (5–30 works to failure)
  rirWindow: { lo: 0, hi: 3 }, // proximity to failure for most sets
  deloadEveryWeeks: 6,
};

// Lower-body groups get a small frequency/volume tolerance bump for women,
// reflecting the typically higher work capacity and faster recovery there.
const LOWER_BODY = new Set([
  "Quads", "Hamstrings", "Glutes", "Calves", "Adductors", "Abductors",
]);

// Experience scales how much volume a lifter can productively use. RP defaults
// are tuned for an intermediate; beginners need less, advanced can handle more.
const EXPERIENCE_MULTIPLIER = {
  beginner: 0.75,
  intermediate: 1.0,
  advanced: 1.15,
};

// Keep a landmark band internally consistent: non-negative integers with
// MV ≤ MEV ≤ MAV_lo ≤ MAV_hi ≤ MRV.
export function enforceBand(lm) {
  let MV = Math.max(0, Math.round(+lm.MV || 0));
  let MEV = Math.max(MV, Math.round(+lm.MEV || 0));
  let MAV_lo = Math.max(MEV, Math.round(+lm.MAV_lo || 0));
  let MAV_hi = Math.max(MAV_lo, Math.round(+lm.MAV_hi || 0));
  let MRV = Math.max(MAV_hi, Math.round(+lm.MRV || 0));
  return { MV, MEV, MAV_lo, MAV_hi, MRV };
}

// Classify a week's set count for a muscle against its landmark band.
// Returns one of: "under-MV" | "maintenance" | "below-MEV" | "productive" |
// "near-MRV" | "over-MRV". "below-MEV" means stimulus is too low to grow;
// "productive" is the MEV–MAV target zone; "over-MRV" risks under-recovery.
export function classifyVolume(sets, lm) {
  if (!lm) return "below-MEV";
  const b = enforceBand(lm);
  if (sets <= 0) return "under-MV";
  if (sets < b.MV) return "under-MV";
  if (sets < b.MEV) return b.MEV === b.MV ? "productive" : "maintenance";
  if (sets > b.MRV) return "over-MRV";
  if (sets >= b.MAV_hi) return "near-MRV";
  return "productive";
}

// Human-friendly label + color token (matches CSS vars used elsewhere).
export function statusMeta(status) {
  switch (status) {
    case "under-MV": return { label: "Under-stimulated", color: "var(--accent)" };
    case "maintenance": return { label: "Maintenance", color: "var(--warn)" };
    case "below-MEV": return { label: "Below target", color: "var(--accent)" };
    case "productive": return { label: "On target", color: "var(--ok)" };
    case "near-MRV": return { label: "Near max", color: "var(--warn)" };
    case "over-MRV": return { label: "Over max", color: "var(--bad, #e5484d)" };
    default: return { label: status, color: "var(--muted)" };
  }
}

// Generate a full per-muscle landmark map from a lifter profile. Scales the RP
// defaults by experience, with a small lower-body bump for women. Every muscle
// is returned in Auto mode by default.
export function generateLandmarks(profile = {}) {
  const exp = EXPERIENCE_MULTIPLIER[profile.experienceLevel] ?? 1.0;
  const female = String(profile.sex || "").toLowerCase() === "female";
  const out = {};
  for (const g of MUSCLE_GROUPS) {
    const base = DEFAULT_LANDMARKS[g] || { MV: 0, MEV: 8, MAV_lo: 12, MAV_hi: 18, MRV: 22 };
    const lower = female && LOWER_BODY.has(g) ? 1.1 : 1.0;
    const m = exp * lower;
    out[g] = enforceBand({
      MV: base.MV * m,
      MEV: base.MEV * m,
      MAV_lo: base.MAV_lo * m,
      MAV_hi: base.MAV_hi * m,
      MRV: base.MRV * m,
    });
  }
  return out;
}
