import { getProfile, EXERCISE_PROFILES, epley1RM } from "./rp.js";


// ── Constants ────────────────────────────────────────────────

// Minimum sessions needed before we trust adaptive data
const MIN_SESSIONS_LEARNING  = 3;   // "learning" — blend adaptive + defaults
const MIN_SESSIONS_CALIBRATED = 8;  // "calibrated" — fully adaptive

// Fatigue detection thresholds
const FATIGUE_RIR_DEFICIT_WARN = 1.0;  // avg RIR undershoot to warn
const FATIGUE_STALL_SESSIONS   = 3;    // sessions without weight increase
const FATIGUE_REGRESSION_SESSIONS = 2; // sessions with declining weight


// ═══════════════════════════════════════════════════════════════
// CORE: analyze()
// ═══════════════════════════════════════════════════════════════
//
// Takes an exercise name and ALL logged sets for that exercise
// (across all mesos). Returns a full adaptive profile.
//
// Returns: {
//   confidence:      "new" | "learning" | "calibrated",
//   sessionCount:    number,
//   progression:     { rate, label },          // personal % per session
//   repRange:        { min, max, label },      // calibrated rep window
//   rest:            { min, max, label },       // recommended seconds
//   fatigueWarning:  null | string,            // human-readable alert
//   topSet:          { weight, reps, rir, date } | null,
//   estimatedMax:    number,                    // best Epley e1RM ever
//   profile:         { ... },                   // static fallback profile
//   stats:           { ... },                   // raw computed stats
// }

export function analyze(exerciseName, allSets) {
  const profile = getProfile(exerciseName);
  const sessions = groupIntoSessions(allSets);
  const sessionCount = sessions.length;

  let confidence;
  if (sessionCount < MIN_SESSIONS_LEARNING) confidence = "new";
  else if (sessionCount < MIN_SESSIONS_CALIBRATED) confidence = "learning";
  else confidence = "calibrated";

  // Compute everything we can from history
  const stats = {};
  stats.topSets = sessions.map(topSetOfSession);
  stats.progressionRate = computeProgressionRate(stats.topSets);
  stats.bestRepRange = computeBestRepRange(allSets);
  stats.fatigue = detectFatigue(stats.topSets, allSets);
  stats.bestE1RM = computeBestE1RM(allSets);

  // Blend adaptive results with defaults based on confidence
  const progression = blendProgression(profile, stats, confidence);
  const repRange = blendRepRange(profile, stats, confidence);
  const rest = blendRest(profile, stats, confidence);
  const fatigueWarning = formatFatigueWarning(stats.fatigue);

  const lastTop = stats.topSets.length
    ? stats.topSets[stats.topSets.length - 1]
    : null;

  return {
    confidence,
    sessionCount,
    progression,
    repRange,
    rest,
    fatigueWarning,
    topSet: lastTop,
    estimatedMax: stats.bestE1RM,
    profile,
    stats,
  };
}


// ═══════════════════════════════════════════════════════════════
// ADAPTIVE WEIGHT SUGGESTION
// ═══════════════════════════════════════════════════════════════
//
// Drop-in replacement for suggestWeight(). Uses personal
// progression rate when available.

export function adaptiveSuggestWeight(prev, targetReps, targetRIR, exerciseName, allSets) {
  if (!prev || !prev.weight) return null;

  const profile = getProfile(exerciseName);

  // Bodyweight / band exercises: can't suggest weight
  if (profile.progression === 0) return null;

  const { weight, reps, rir } = prev;

  // Missed reps: hold weight
  if (reps < targetReps) return smartRound(weight, profile);

  // Get personal progression rate if enough data
  const sessions = groupIntoSessions(allSets);
  const topSets = sessions.map(topSetOfSession);
  const personalRate = computeProgressionRate(topSets);

  // Pick rate: personal if calibrated, else static default
  const baseRate = (sessions.length >= MIN_SESSIONS_LEARNING && personalRate !== null)
    ? blendValues(profile.progression, personalRate, sessions.length)
    : profile.progression;

  const buffer = rir - targetRIR;
  let factor;

  if (buffer >= 2) {
    // Way too easy — jump at 2× rate
    factor = 1 + baseRate * 2;
  } else if (buffer >= 1) {
    // Slightly easy — 1.5× rate
    factor = 1 + baseRate * 1.5;
  } else if (buffer >= 0) {
    // On target — base rate
    factor = 1 + baseRate;
  } else {
    // Too hard — hold
    factor = 1.0;
  }

  const result = smartRound(weight * factor, profile);
  return Number.isFinite(result) ? result : null;
}


// ═══════════════════════════════════════════════════════════════
// ADAPTIVE REP RANGE
// ═══════════════════════════════════════════════════════════════

export function adaptiveSuggestReps(exerciseName, allSets, isDeload = false) {
  const profile = getProfile(exerciseName);
  const sessions = groupIntoSessions(allSets);

  let range;
  if (sessions.length >= MIN_SESSIONS_LEARNING) {
    const best = computeBestRepRange(allSets);
    if (best) {
      range = blendRepRange(profile, { bestRepRange: best },
        sessions.length >= MIN_SESSIONS_CALIBRATED ? "calibrated" : "learning");
    } else {
      range = { min: profile.repRange.min, max: profile.repRange.max };
    }
  } else {
    range = { min: profile.repRange.min, max: profile.repRange.max };
  }

  if (isDeload) {
    range = { min: range.min + 5, max: range.max + 5 };
  }

  return { ...range, label: `${range.min}–${range.max}` };
}


// ═══════════════════════════════════════════════════════════════
// ADAPTIVE REST
// ═══════════════════════════════════════════════════════════════

export function adaptiveSuggestRest(exerciseName, allSets) {
  const profile = getProfile(exerciseName);
  const sessions = groupIntoSessions(allSets);

  // If we can detect intra-session performance drop-off, adjust
  if (sessions.length >= MIN_SESSIONS_LEARNING) {
    const dropoff = computeIntraSessionDropoff(sessions);
    if (dropoff !== null) {
      // High drop-off (>15% weight decline set-over-set) → suggest more rest
      if (dropoff > 0.15) {
        return {
          min: Math.round(profile.restRange.max),
          max: Math.round(profile.restRange.max * 1.3),
          label: formatRestLabel(profile.restRange.max, profile.restRange.max * 1.3),
          note: "Performance drops significantly between sets — try longer rest",
        };
      }
      // Very low drop-off (<5%) → can rest less
      if (dropoff < 0.05) {
        return {
          min: Math.round(profile.restRange.min * 0.8),
          max: profile.restRange.min,
          label: formatRestLabel(profile.restRange.min * 0.8, profile.restRange.min),
          note: "Consistent set-to-set performance — shorter rest is fine",
        };
      }
    }
  }

  // Default
  return {
    min: profile.restRange.min,
    max: profile.restRange.max,
    label: formatRestLabel(profile.restRange.min, profile.restRange.max),
    note: null,
  };
}


// ═══════════════════════════════════════════════════════════════
// FATIGUE CHECK
// ═══════════════════════════════════════════════════════════════
//
// Can be called per-muscle-group with all sets for that group
// in the current meso to detect systemic fatigue.

export function fatigueCheck(muscleGroup, mesoSets, weekPlan) {
  const warnings = [];

  // Group sets by week
  const byWeek = {};
  for (const s of mesoSets) {
    if (s.muscleGroup !== muscleGroup) continue;
    const w = +s.week;
    (byWeek[w] ||= []).push(s);
  }

  const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);
  if (weeks.length < 2) return null;

  // Check RIR trend: are we consistently undershooting target?
  for (const w of weeks) {
    const sets = byWeek[w];
    const target = weekPlan.find(p => p.week === w && p.muscleGroup === muscleGroup);
    if (!target) continue;

    const avgRIR = sets.reduce((s, x) => s + (+x.rir || 0), 0) / sets.length;
    const deficit = target.targetRIR - avgRIR;

    if (deficit >= FATIGUE_RIR_DEFICIT_WARN) {
      warnings.push(
        `Week ${w}: Average RIR was ${avgRIR.toFixed(1)} vs target ${target.targetRIR} ` +
        `for ${muscleGroup} — fatigue is outpacing the plan`
      );
    }
  }

  // Check volume completion: are we logging fewer sets than planned?
  for (const w of weeks) {
    const sets = byWeek[w];
    const target = weekPlan.find(p => p.week === w && p.muscleGroup === muscleGroup);
    if (!target) continue;

    const logged = sets.length;
    const planned = target.targetSets;
    if (planned > 0 && logged < planned * 0.75) {
      warnings.push(
        `Week ${w}: Only ${logged}/${planned} sets completed for ${muscleGroup} — ` +
        `consider reducing volume next meso`
      );
    }
  }

  return warnings.length ? warnings : null;
}


// ═══════════════════════════════════════════════════════════════
// PERFORMANCE vs. NORMAL
// ═══════════════════════════════════════════════════════════════
//
// Answers "is today above / on par / below my normal for this lift?"
// using Epley e1RM as a rep-scheme-agnostic performance metric. The
// baseline ("normal") is the median of the last few session-best e1RMs,
// which resists a single fluke or deload week.

// How far from baseline counts as a meaningful swing (±2%).
const PERF_ABOVE_RATIO = 1.02;
const PERF_BELOW_RATIO = 0.98;
// Sessions of baseline history needed before we'll render a verdict.
const PERF_MIN_BASELINE_SESSIONS = 2;
// How many recent sessions form the baseline window.
const PERF_BASELINE_WINDOW = 3;

// Best (highest) Epley e1RM across a flat set list. 0 if none usable.
function bestE1RMOf(sets) {
  let best = 0;
  for (const s of sets || []) {
    const e1 = epley1RM(+s.weight, +s.reps);
    if (Number.isFinite(e1) && e1 > best) best = e1;
  }
  return best;
}

// Per-session best e1RM, chronological. Reuses session grouping.
export function sessionBestE1RMs(sets) {
  return groupIntoSessions(sets || [])
    .map(bestE1RMOf)
    .filter((v) => v > 0);
}

function median(nums) {
  if (!nums.length) return 0;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

// Compare today's performance on one exercise to its recent normal.
//   priorSets  — all sets for this exercise STRICTLY before today
//   todaySets  — this exercise's sets logged today
// Returns { level: "above"|"on"|"below"|"new", expectedE1RM,
//           actualE1RM, deltaPct }.
export function performanceVsNormal(priorSets, todaySets) {
  const none = { level: "new", expectedE1RM: 0, actualE1RM: 0, deltaPct: 0 };
  const actualE1RM = bestE1RMOf(todaySets);
  if (!actualE1RM) return none;

  const priorBests = sessionBestE1RMs(priorSets);
  if (priorBests.length < PERF_MIN_BASELINE_SESSIONS) {
    return { ...none, actualE1RM: round1(actualE1RM) };
  }

  const expectedE1RM = median(priorBests.slice(-PERF_BASELINE_WINDOW));
  if (!expectedE1RM) return { ...none, actualE1RM: round1(actualE1RM) };

  const ratio = actualE1RM / expectedE1RM;
  const level = ratio >= PERF_ABOVE_RATIO ? "above"
    : ratio <= PERF_BELOW_RATIO ? "below" : "on";

  return {
    level,
    expectedE1RM: round1(expectedE1RM),
    actualE1RM: round1(actualE1RM),
    deltaPct: Math.round((ratio - 1) * 100),
  };
}

// Direction of the e1RM trend over the recent baseline window.
// Returns "rising" | "flat" | "falling" | null (not enough data).
export function e1rmTrend(sessionBests) {
  const w = (sessionBests || []).slice(-PERF_BASELINE_WINDOW);
  if (w.length < 2) return null;
  const first = w[0], last = w[w.length - 1];
  if (!first) return null;
  const change = (last - first) / first;
  if (change > 0.01) return "rising";
  if (change < -0.01) return "falling";
  return "flat";
}

// Aggregate per-exercise performanceVsNormal results into one session
// verdict. Ignores exercises without a baseline ("new").
// Returns { level: "above"|"on"|"below", deltaPct, text } or null.
export function sessionVerdict(results) {
  const rated = (results || []).filter(
    (r) => r && r.level !== "new" && r.expectedE1RM > 0,
  );
  if (!rated.length) return null;

  const avgRatio = rated.reduce(
    (sum, r) => sum + r.actualE1RM / r.expectedE1RM, 0,
  ) / rated.length;

  const level = avgRatio >= PERF_ABOVE_RATIO ? "above"
    : avgRatio <= PERF_BELOW_RATIO ? "below" : "on";

  const text = level === "above" ? "Strong session — above your normal"
    : level === "below" ? "Below par — likely fatigue or an off day"
    : "Right on par with your normal";

  return { level, deltaPct: Math.round((avgRatio - 1) * 100), text };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// Like performanceVsNormal, but also adds a plain-language `phrase` saying WHAT
// drove the above/below read — comparing today's top set (heaviest, tie-broken
// by reps) to the average top set of the recent baseline sessions. Returns the
// full perf object plus `phrase` (null when there's no baseline).
export function performanceReason(priorSets, todaySets) {
  const perf = performanceVsNormal(priorSets, todaySets);
  if (perf.level === "new") return { ...perf, phrase: null, driver: null, detail: null };

  const todayTop = todaySets && todaySets.length ? topSetOfSession(todaySets) : null;
  const recentTops = groupIntoSessions(priorSets)
    .slice(-PERF_BASELINE_WINDOW)
    .map(topSetOfSession);

  if (!todayTop || !recentTops.length) {
    return { ...perf, phrase: levelFallbackPhrase(perf.level), driver: "generic", detail: null };
  }

  const avgW = recentTops.reduce((s, t) => s + t.weight, 0) / recentTops.length;
  const avgR = recentTops.reduce((s, t) => s + t.reps, 0) / recentTops.length;
  const wThresh = Math.max(2.5, avgW * 0.01);
  const wDir = todayTop.weight - avgW > wThresh ? 1 : avgW - todayTop.weight > wThresh ? -1 : 0;
  const rDir = todayTop.reps - avgR > 0.5 ? 1 : avgR - todayTop.reps > 0.5 ? -1 : 0;

  const driver = wDir !== 0 && rDir !== 0 ? "both" : wDir !== 0 ? "weight" : rDir !== 0 ? "reps" : "generic";
  const detail = {
    todayWeight: todayTop.weight,
    todayReps: todayTop.reps,
    normalWeight: Math.round(avgW),
    normalReps: Math.round(avgR),
  };

  return { ...perf, phrase: driverPhrase(perf.level, wDir, rDir), driver, detail };
}

function levelFallbackPhrase(level) {
  return level === "above" ? "Stronger than usual"
    : level === "below" ? "Below your usual"
    : "On par with your usual";
}

function driverPhrase(level, wDir, rDir) {
  if (level === "on") return "On par with your usual";
  if (level === "above") {
    if (wDir > 0 && rDir > 0) return "Heavier and more reps than usual";
    if (wDir > 0) return "Heavier top set than usual";
    if (rDir > 0) return "More reps than usual";
    return "Stronger than usual";
  }
  // below
  if (wDir < 0 && rDir < 0) return "Lighter and fewer reps than usual";
  if (wDir < 0) return "Lighter top set than usual";
  if (rDir < 0) return "Fewer reps than usual";
  return "Below your usual";
}


// ═══════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════

// Group flat set array into sessions by (date + dayIndex).
// Returns array of arrays, sorted chronologically.
function groupIntoSessions(sets) {
  const map = {};
  for (const s of sets) {
    const key = `${s.date}|${s.dayIndex ?? 0}`;
    (map[key] ||= []).push(s);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, arr]) => arr.sort((a, b) => (+a.setNumber || 0) - (+b.setNumber || 0)));
}

// Extract the top set (highest weight) from a session.
function topSetOfSession(session) {
  let top = session[0];
  for (const s of session) {
    if (+s.weight > +top.weight) top = s;
    else if (+s.weight === +top.weight && +s.reps > +top.reps) top = s;
  }
  return {
    weight: +top.weight,
    reps: +top.reps,
    rir: +top.rir,
    date: top.date,
    setCount: session.length,
  };
}

// Compute personal progression rate as median session-over-session
// % weight increase on top sets. Returns null if not enough data.
function computeProgressionRate(topSets) {
  if (topSets.length < 2) return null;

  const changes = [];
  for (let i = 1; i < topSets.length; i++) {
    const prev = topSets[i - 1].weight;
    const curr = topSets[i].weight;
    if (prev > 0 && curr > 0) {
      changes.push((curr - prev) / prev);
    }
  }

  if (!changes.length) return null;

  // Use median to resist outliers (e.g., deload weeks)
  changes.sort((a, b) => a - b);
  const mid = Math.floor(changes.length / 2);
  const median = changes.length % 2
    ? changes[mid]
    : (changes[mid - 1] + changes[mid]) / 2;

  // Clamp to reasonable range: 0% to 5% per session
  return Math.max(0, Math.min(0.05, median));
}

// Find the rep range that produced the best e1RM results.
// Buckets sets into ranges and finds which bucket has the highest
// average e1RM performance.
function computeBestRepRange(allSets) {
  if (allSets.length < 5) return null;

  // Bucket into rep range tiers
  const buckets = {
    heavy:    { sets: [], e1rms: [] },  // 1-10 reps
    moderate: { sets: [], e1rms: [] },  // 11-20 reps
    light:    { sets: [], e1rms: [] },  // 21+ reps
  };

  for (const s of allSets) {
    const r = +s.reps;
    const w = +s.weight;
    if (!r || !w) continue;
    const e1 = epley1RM(w, r);
    if (r <= 10)     { buckets.heavy.sets.push(s); buckets.heavy.e1rms.push(e1); }
    else if (r <= 20) { buckets.moderate.sets.push(s); buckets.moderate.e1rms.push(e1); }
    else              { buckets.light.sets.push(s); buckets.light.e1rms.push(e1); }
  }

  // Find which bucket has the highest top-end e1RM (90th percentile)
  let best = null;
  let bestVal = 0;

  for (const [tier, data] of Object.entries(buckets)) {
    if (data.e1rms.length < 3) continue; // need enough data
    data.e1rms.sort((a, b) => b - a);
    const p90 = data.e1rms[Math.floor(data.e1rms.length * 0.1)] || data.e1rms[0];
    if (p90 > bestVal) {
      bestVal = p90;
      best = tier;
    }
  }

  if (!best) return null;

  // Now find the actual rep range within that bucket where PRs happened
  const bucket = buckets[best];
  const reps = bucket.sets.map(s => +s.reps).sort((a, b) => a - b);
  const lo = reps[Math.floor(reps.length * 0.25)]; // 25th percentile
  const hi = reps[Math.floor(reps.length * 0.75)]; // 75th percentile

  return { min: lo, max: hi, tier: best };
}

// Compute best-ever estimated 1RM across all sets.
function computeBestE1RM(allSets) {
  let best = 0;
  for (const s of allSets) {
    const e1 = epley1RM(+s.weight, +s.reps);
    if (e1 > best) best = e1;
  }
  return Math.round(best * 10) / 10;
}

// Detect fatigue from the most recent sessions.
function detectFatigue(topSets, allSets) {
  const result = { stalling: false, regressing: false, rirDrift: false, message: null };
  if (topSets.length < 3) return result;

  const recent = topSets.slice(-FATIGUE_STALL_SESSIONS);

  // Stalling: no weight increase across last N sessions
  const weights = recent.map(t => t.weight);
  const isStalling = weights.every(w => w <= weights[0]);
  if (isStalling) {
    result.stalling = true;
    result.message = `Weight has not increased in ${recent.length} sessions`;
  }

  // Regressing: weight declining
  if (topSets.length >= FATIGUE_REGRESSION_SESSIONS) {
    const tail = topSets.slice(-FATIGUE_REGRESSION_SESSIONS);
    const declining = tail.every((t, i) => i === 0 || t.weight < tail[i - 1].weight);
    if (declining) {
      result.regressing = true;
      result.message = `Weight has declined for ${FATIGUE_REGRESSION_SESSIONS} consecutive sessions — consider a deload`;
    }
  }

  // RIR drift: recent sessions showing lower RIR than earlier ones
  // (i.e., sets are feeling harder even at same weight)
  if (topSets.length >= 4) {
    const firstHalf = topSets.slice(0, Math.floor(topSets.length / 2));
    const secondHalf = topSets.slice(Math.floor(topSets.length / 2));
    const avgFirst = firstHalf.reduce((s, t) => s + t.rir, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, t) => s + t.rir, 0) / secondHalf.length;

    if (avgFirst - avgSecond >= FATIGUE_RIR_DEFICIT_WARN) {
      result.rirDrift = true;
      result.message = (result.message ? result.message + ". " : "") +
        `RIR has dropped from avg ${avgFirst.toFixed(1)} to ${avgSecond.toFixed(1)} — fatigue is accumulating`;
    }
  }

  return result;
}

// Compute average intra-session performance drop-off.
// Measures how much weight drops from set 1 to last set within sessions.
function computeIntraSessionDropoff(sessions) {
  const dropoffs = [];

  for (const session of sessions) {
    if (session.length < 2) continue;
    const sorted = [...session].sort((a, b) => (+a.setNumber || 0) - (+b.setNumber || 0));
    const first = +sorted[0].weight;
    const last = +sorted[sorted.length - 1].weight;
    if (first > 0 && last > 0 && last <= first) {
      dropoffs.push((first - last) / first);
    }
  }

  if (!dropoffs.length) return null;

  // Return average drop-off
  return dropoffs.reduce((s, d) => s + d, 0) / dropoffs.length;
}


// ── Blending helpers ─────────────────────────────────────────

// Blend a personal value with the default based on session count.
// At MIN_SESSIONS_LEARNING sessions: 50/50 blend.
// At MIN_SESSIONS_CALIBRATED+: 90% personal, 10% default.
function blendValues(defaultVal, personalVal, sessionCount) {
  if (sessionCount < MIN_SESSIONS_LEARNING) return defaultVal;
  const t = Math.min(1, (sessionCount - MIN_SESSIONS_LEARNING) /
    (MIN_SESSIONS_CALIBRATED - MIN_SESSIONS_LEARNING));
  const personalWeight = 0.5 + t * 0.4; // 0.5 → 0.9
  return defaultVal * (1 - personalWeight) + personalVal * personalWeight;
}

function blendProgression(profile, stats, confidence) {
  if (confidence === "new" || stats.progressionRate === null) {
    return {
      rate: profile.progression,
      label: `${(profile.progression * 100).toFixed(1)}%`,
      source: "default",
    };
  }

  const blended = blendValues(
    profile.progression,
    stats.progressionRate,
    stats.topSets.length,
  );

  return {
    rate: blended,
    label: `${(blended * 100).toFixed(1)}%`,
    source: confidence === "calibrated" ? "personal" : "blended",
    personal: `${(stats.progressionRate * 100).toFixed(1)}%`,
    default: `${(profile.progression * 100).toFixed(1)}%`,
  };
}

function blendRepRange(profile, stats, confidence) {
  const def = profile.repRange;

  if (confidence === "new" || !stats.bestRepRange) {
    return { min: def.min, max: def.max, label: `${def.min}–${def.max}` };
  }

  const p = stats.bestRepRange;

  if (confidence === "calibrated") {
    // Mostly personal, but clamp to within ±3 of default boundaries
    const min = Math.max(def.min - 3, Math.min(def.max, p.min));
    const max = Math.max(min + 2, Math.min(def.max + 5, p.max));
    return { min, max, label: `${min}–${max}` };
  }

  // Learning: average of default and personal
  const min = Math.round((def.min + p.min) / 2);
  const max = Math.round((def.max + p.max) / 2);
  return { min, max, label: `${min}–${max}` };
}

function blendRest(profile, stats, confidence) {
  // Rest is harder to personalize without timestamps between sets,
  // so we mostly use the static profile with adjustments from
  // intra-session drop-off analysis (handled in adaptiveSuggestRest).
  return {
    min: profile.restRange.min,
    max: profile.restRange.max,
    label: formatRestLabel(profile.restRange.min, profile.restRange.max),
  };
}


// ── Formatting helpers ───────────────────────────────────────

function formatRestLabel(minSec, maxSec) {
  const fmt = (s) => {
    if (s < 60) return `${Math.round(s)}s`;
    const m = Math.round(s / 60 * 10) / 10;
    return m === Math.floor(m) ? `${m} min` : `${m} min`;
  };
  return `${fmt(minSec)}–${fmt(maxSec)}`;
}

function formatFatigueWarning(fatigue) {
  if (!fatigue || !fatigue.message) return null;
  return fatigue.message;
}

// Round weight intelligently based on exercise profile.
function smartRound(weight, profile) {
  if (profile.type === "compound" && profile.tier === "heavy") {
    // Barbell increments: nearest 2.5
    return Math.round(weight / 2.5) * 2.5;
  }
  // Everything else: nearest 0.5
  return Math.round(weight * 2) / 2;
}

