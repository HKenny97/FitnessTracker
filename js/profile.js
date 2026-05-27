// Training profile → personalized volume landmarks. Pure (no DOM, no Sheets),
// Node-testable (see tools/check-profile.mjs). Takes the static RP science base
// (DEFAULT_LANDMARKS) and scales it by the user's experience level and which
// muscles they want to grow vs. protect, producing suggested MV/MEV/MAV/MRV.
import { DEFAULT_LANDMARKS } from "./rp.js";

export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"];

// Per-landmark multipliers. MV (maintenance) is never scaled — it stays roughly
// constant across experience while MEV rises (RP guidance). DEFAULT_LANDMARKS is
// the intermediate baseline, so intermediate = 1.0×.
const EXPERIENCE_FACTORS = {
  beginner:     { MEV: 0.70, MAV_lo: 0.72, MAV_hi: 0.72, MRV: 0.72 },
  intermediate: { MEV: 1.00, MAV_lo: 1.00, MAV_hi: 1.00, MRV: 1.00 },
  advanced:     { MEV: 1.05, MAV_lo: 1.10, MAV_hi: 1.15, MRV: 1.20 },
};

// Per-muscle emphasis, applied on top of the experience factor. "Careful" wins
// over "prioritize" when a muscle is flagged both.
const PRIORITIZE_FACTORS = { MEV: 1.10, MAV_lo: 1.10, MAV_hi: 1.15, MRV: 1.15 };
const CAREFUL_FACTORS    = { MEV: 0.50, MAV_lo: 0.50, MAV_hi: 0.50, MRV: 0.50 };

export function defaultProfile() {
  return { experience: "intermediate", prioritize: [], careful: [] };
}

// Compute suggested landmarks for every muscle in `base`. Always starts from the
// static science table (idempotent / re-runnable), scales, rounds, then clamps
// the invariant MV ≤ MEV ≤ MAV_lo ≤ MAV_hi ≤ MRV.
export function computeLandmarks(profile = defaultProfile(), base = DEFAULT_LANDMARKS) {
  const level = EXPERIENCE_LEVELS.includes(profile?.experience) ? profile.experience : "intermediate";
  const exp = EXPERIENCE_FACTORS[level];
  const careful = new Set(profile?.careful || []);
  const prioritize = new Set(profile?.prioritize || []);

  const out = {};
  for (const [muscle, b] of Object.entries(base)) {
    const emphasis = careful.has(muscle) ? CAREFUL_FACTORS
      : prioritize.has(muscle) ? PRIORITIZE_FACTORS : null;
    const f = (k) => exp[k] * (emphasis ? emphasis[k] : 1);

    const MV = b.MV;
    const MEV = Math.max(MV, Math.round(b.MEV * f("MEV")));
    const MAV_lo = Math.max(MEV, Math.round(b.MAV_lo * f("MAV_lo")));
    const MAV_hi = Math.max(MAV_lo, Math.round(b.MAV_hi * f("MAV_hi")));
    const MRV = Math.max(MAV_hi, Math.round(b.MRV * f("MRV")));
    out[muscle] = { MV, MEV, MAV_lo, MAV_hi, MRV };
  }
  return out;
}
