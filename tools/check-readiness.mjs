// Truth table for computeReadiness — verifies the score collapses correctly
// from feedback / cardio / recency / RIR drift / phase inputs.
//   node tools/check-readiness.mjs   (or: npm run check:readiness)
import { computeReadiness } from "../js/readiness.js";

let failures = 0;
const fail = (m) => { failures++; console.error(`FAIL  ${m}`); };

const today = new Date().toISOString().slice(0, 10);
const isoNDaysAgo = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
};

// Baseline: no signals → 75.
{
  const r = computeReadiness({ plannedMuscles: ["Chest"] });
  if (r.score !== 75) fail(`baseline → ${r.score}`);
  if (r.level !== "normal") fail(`baseline level → ${r.level}`);
}

// Heavy soreness on planned muscle pulls score down.
{
  const r = computeReadiness({
    plannedMuscles: ["Chest"],
    recentFeedback: [{ muscleGroup: "Chest", date: isoNDaysAgo(1), soreness: 3, jointPain: 0 }],
  });
  if (r.score >= 75) fail(`soreness 3 didn't reduce → ${r.score}`);
}

// Joint pain weighed heavier than soreness.
{
  const r = computeReadiness({
    plannedMuscles: ["Chest"],
    recentFeedback: [{ muscleGroup: "Chest", date: isoNDaysAgo(1), soreness: 0, jointPain: 2 }],
  });
  if (r.score >= 60) fail(`joint pain 2 → ${r.score} (expected significant drop)`);
}

// Cardio load in last 48h pulls score down.
{
  const r = computeReadiness({
    plannedMuscles: ["Chest"],
    recentCardio: [{ date: isoNDaysAgo(1), duration: 60, perceivedDifficulty: 8 }],
  });
  if (r.score >= 75) fail(`cardio load didn't reduce → ${r.score}`);
}

// Just trained today → penalty.
{
  const r = computeReadiness({
    plannedMuscles: ["Chest"],
    allSets: [{ muscleGroup: "Chest", date: today, setType: "working" }],
  });
  if (r.score >= 70) fail(`just-trained-today → ${r.score} (expected drop)`);
  if (!r.factors.some((f) => /Just trained today/.test(f.label))) fail("missing today-penalty factor");
}

// Long gap (10 days) → small staleness penalty.
{
  const r = computeReadiness({
    plannedMuscles: ["Chest"],
    allSets: [{ muscleGroup: "Chest", date: isoNDaysAgo(10), setType: "working" }],
  });
  if (r.score >= 75) fail(`stale gap didn't penalize → ${r.score}`);
  if (r.score < 65) fail(`stale gap over-penalized → ${r.score}`);
}

// Deload bonus.
{
  const r = computeReadiness({
    plannedMuscles: ["Chest"],
    mesoPhase: { phase: "deload", multiplier: 0.5 },
  });
  if (r.score < 90) fail(`deload bonus → ${r.score}`);
  if (r.level !== "go") fail(`deload level → ${r.level}`);
}

// Overreach penalty.
{
  const r = computeReadiness({
    plannedMuscles: ["Chest"],
    mesoPhase: { phase: "overreach", multiplier: 1.1 },
  });
  if (r.score !== 65) fail(`overreach → ${r.score}`);
}

// RIR drift on 2+ planned lifts → caps at 10.
{
  const r = computeReadiness({ plannedMuscles: ["Chest"], rirDriftCount: 5 });
  if (r.score !== 65) fail(`rir drift cap → ${r.score}`);
}

// Score is clamped to [0, 100].
{
  const r = computeReadiness({
    plannedMuscles: ["Chest"],
    recentFeedback: [{ muscleGroup: "Chest", date: today, soreness: 3, jointPain: 3 }],
    recentCardio: [{ date: today, duration: 120, perceivedDifficulty: 10 }],
    allSets: [{ muscleGroup: "Chest", date: today, setType: "working" }],
    rirDriftCount: 5,
    mesoPhase: { phase: "overreach", multiplier: 1.1 },
  });
  if (r.score < 0 || r.score > 100) fail(`clamped → ${r.score}`);
  if (r.level !== "back-off") fail(`worst-case level → ${r.level}`);
}

if (failures) { console.error(`\n${failures} readiness check failure(s).`); process.exit(1); }
console.log("OK: readiness score collapses correctly across signals.");
