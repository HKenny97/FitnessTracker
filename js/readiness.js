// Pre-session readiness score (0–100) that rolls every recovery signal we
// already collect into a single "go hard / normal / back off" indicator.
// Pure / Node-testable: takes plain data, returns
//   { score, level: "go"|"normal"|"back-off", factors: [{label, delta}] }
// Callers pass the planned muscle groups for today plus the relevant slices
// of feedback / cardio / fatigue history; the function does the math.

const DEFAULTS = {
  baseline: 75,
  sorenessWeight: 5,         // per point per planned muscle
  jointWeight: 10,           // per point per planned muscle
  cardio48hMaxPenalty: 15,
  recencyTooFreshPenalty: 15,// muscle hit today / yesterday
  recencyStalePenalty: 5,    // 8+ days since muscle was hit
  rirDriftPenalty: 5,        // per drifted exercise (capped at 10)
  rirDriftMaxPenalty: 10,
  deloadBonus: 20,
  overreachPenalty: 10,
};

function clampPct(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function level(score) {
  if (score > 75) return "go";
  if (score >= 40) return "normal";
  return "back-off";
}

// Pull the most recent per-muscle feedback (within `lookbackDays`) and return
// average soreness / joint pain across all planned muscles.
function aggregatedFeedback(plannedMuscles, recentFeedback, lookbackDays = 7) {
  if (!plannedMuscles.length || !recentFeedback.length) return null;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - lookbackDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const relevant = recentFeedback.filter((f) => plannedMuscles.includes(f.muscleGroup) && f.date >= cutoffStr);
  if (!relevant.length) return null;
  // Weight by recency: more recent rows count more.
  let wSore = 0, wJoint = 0, total = 0;
  for (const f of relevant) {
    const age = (new Date().getTime() - new Date(f.date + "T00:00:00").getTime()) / 86400000;
    const w = 1 / (1 + age);
    wSore += (+f.soreness || 0) * w;
    wJoint += (+f.jointPain || 0) * w;
    total += w;
  }
  return total > 0 ? { soreness: wSore / total, jointPain: wJoint / total } : null;
}

// Cardio load in the last 48h as a 0..30 score (minutes × difficulty factor).
function cardioLoad48h(recentCardio, hours = 48) {
  if (!recentCardio.length) return 0;
  const cutoff = new Date(); cutoff.setHours(cutoff.getHours() - hours);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  let total = 0;
  for (const c of recentCardio) {
    if ((c.date || "") < cutoffStr) continue;
    const mins = +c.duration || 0;
    const diff = +c.perceivedDifficulty || 5; // assume moderate when missing
    // 30 mins at diff 5 → 30 load; 30 mins at diff 10 → 60.
    total += (mins * diff) / 5;
  }
  return total;
}

// Min days since any of plannedMuscles was last hit. Returns null when nothing
// in recent history.
function daysSinceLastHit(plannedMuscles, allSets) {
  if (!plannedMuscles.length || !allSets.length) return null;
  const today = new Date();
  let minDays = null;
  for (const s of allSets) {
    if (!plannedMuscles.includes(s.muscleGroup)) continue;
    if (s.setType === "warmup") continue;
    const age = Math.floor((today.getTime() - new Date(s.date + "T00:00:00").getTime()) / 86400000);
    if (age < 0) continue;
    if (minDays === null || age < minDays) minDays = age;
  }
  return minDays;
}

export function computeReadiness({
  plannedMuscles = [],
  recentFeedback = [],
  recentCardio = [],
  allSets = [],
  rirDriftCount = 0,
  mesoPhase = null,
  opts = {},
} = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  let score = cfg.baseline;
  const factors = [];

  const fb = aggregatedFeedback(plannedMuscles, recentFeedback);
  if (fb) {
    const sorePenalty = Math.round(fb.soreness * cfg.sorenessWeight);
    if (sorePenalty > 0) {
      score -= sorePenalty;
      factors.push({ label: `Soreness ${fb.soreness.toFixed(1)}/3`, delta: -sorePenalty });
    }
    const jointPenalty = Math.round(fb.jointPain * cfg.jointWeight);
    if (jointPenalty > 0) {
      score -= jointPenalty;
      factors.push({ label: `Joint pain ${fb.jointPain.toFixed(1)}/3`, delta: -jointPenalty });
    }
  }

  const load = cardioLoad48h(recentCardio);
  if (load > 0) {
    // Map 0..60 load → 0..maxPenalty.
    const penalty = Math.min(cfg.cardio48hMaxPenalty, Math.round(load / 4));
    if (penalty > 0) {
      score -= penalty;
      factors.push({ label: `Cardio load last 48h`, delta: -penalty });
    }
  }

  const daysSince = daysSinceLastHit(plannedMuscles, allSets);
  if (daysSince != null) {
    if (daysSince <= 1) {
      score -= cfg.recencyTooFreshPenalty;
      factors.push({ label: `Just trained ${daysSince === 0 ? "today" : "yesterday"}`, delta: -cfg.recencyTooFreshPenalty });
    } else if (daysSince >= 8) {
      score -= cfg.recencyStalePenalty;
      factors.push({ label: `${daysSince} days since this muscle was hit`, delta: -cfg.recencyStalePenalty });
    }
  }

  if (rirDriftCount > 0) {
    const penalty = Math.min(cfg.rirDriftMaxPenalty, rirDriftCount * cfg.rirDriftPenalty);
    score -= penalty;
    factors.push({ label: `RIR drift on ${rirDriftCount} planned lift${rirDriftCount === 1 ? "" : "s"}`, delta: -penalty });
  }

  if (mesoPhase) {
    if (mesoPhase.phase === "deload") {
      score += cfg.deloadBonus;
      factors.push({ label: `Deload week`, delta: +cfg.deloadBonus });
    } else if (mesoPhase.phase === "overreach") {
      score -= cfg.overreachPenalty;
      factors.push({ label: `Overreach week`, delta: -cfg.overreachPenalty });
    }
  }

  const finalScore = clampPct(score);
  return { score: finalScore, level: level(finalScore), factors };
}
