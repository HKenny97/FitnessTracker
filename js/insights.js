// Analytics that compare logged training against the muscle-growth standards.
// Everything here is pure and calendar-date based, so it works whether or not
// a mesocycle is active. A "working set" is one logged set row (matching the
// app's existing weeklyVolume convention).

import { epley1RM } from "./rp.js";
import { GROWTH_STANDARDS, classifyVolume, enforceBand } from "./standards.js";

const DAY_MS = 86400000;

// Monday 00:00 of the week containing `d` (Date or ISO string).
export function mondayOf(d) {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : new Date(d);
  date.setHours(0, 0, 0, 0);
  const dow = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - dow);
  return date;
}

export function isoOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function inRange(iso, startIso, endIso) {
  return iso >= startIso && iso <= endIso;
}

// Per-muscle stats for a single calendar week. `weekStartISO` defaults to the
// current week's Monday.
export function weeklyStats(sets, landmarks, weekStartISO) {
  const startIso = weekStartISO || isoOf(mondayOf(new Date()));
  const endIso = isoOf(new Date(new Date(startIso + "T00:00:00").getTime() + 6 * DAY_MS));
  const weekSets = sets.filter((s) => inRange(s.date, startIso, endIso));

  const groups = {};
  const dates = new Set();
  for (const s of weekSets) {
    dates.add(s.date);
    const g = s.muscleGroup || "Other";
    const bucket = (groups[g] ||= { sets: 0, dates: new Set(), reps: [], rirInWindow: 0, rirCounted: 0 });
    bucket.sets += 1;
    bucket.dates.add(s.date);
    const reps = +s.reps;
    if (reps > 0) bucket.reps.push(reps);
    if (s.rir !== "" && s.rir != null && !Number.isNaN(+s.rir)) {
      bucket.rirCounted += 1;
      const rir = +s.rir;
      if (rir >= GROWTH_STANDARDS.rirWindow.lo && rir <= GROWTH_STANDARDS.rirWindow.hi) bucket.rirInWindow += 1;
    }
  }

  const result = {};
  for (const [g, b] of Object.entries(groups)) {
    const lm = landmarks[g] || null;
    const inRangeReps = b.reps.filter((r) => r >= GROWTH_STANDARDS.repRange.lo && r <= GROWTH_STANDARDS.repRange.hi).length;
    result[g] = {
      sets: b.sets,
      frequency: b.dates.size,
      avgReps: b.reps.length ? b.reps.reduce((a, c) => a + c, 0) / b.reps.length : 0,
      repRangePct: b.reps.length ? Math.round((inRangeReps / b.reps.length) * 100) : null,
      rirInWindowPct: b.rirCounted ? Math.round((b.rirInWindow / b.rirCounted) * 100) : null,
      status: classifyVolume(b.sets, lm),
      landmark: lm ? enforceBand(lm) : null,
    };
  }

  return {
    weekStart: startIso,
    weekEnd: endIso,
    totalSets: weekSets.length,
    totalSessions: dates.size,
    groups: result,
  };
}

// Build, for a single muscle group, an oldest→newest series of weekly buckets
// ending in the week containing `refDate`.
function weekSeries(sets, muscleGroup, weeks, refDate) {
  const endMonday = mondayOf(refDate || new Date());
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(endMonday.getTime() - i * 7 * DAY_MS);
    const startIso = isoOf(start);
    const endIso = isoOf(new Date(start.getTime() + 6 * DAY_MS));
    const wkSets = sets.filter((s) => (muscleGroup ? s.muscleGroup === muscleGroup : true) && inRange(s.date, startIso, endIso));
    let bestE1RM = 0;
    let rirSum = 0, rirN = 0;
    const dates = new Set();
    for (const s of wkSets) {
      dates.add(s.date);
      const e1 = epley1RM(+s.weight, +s.reps);
      if (e1 > bestE1RM) bestE1RM = e1;
      if (s.rir !== "" && s.rir != null && !Number.isNaN(+s.rir)) { rirSum += +s.rir; rirN += 1; }
    }
    out.push({ weekStart: startIso, count: wkSets.length, frequency: dates.size, bestE1RM, avgRIR: rirN ? rirSum / rirN : null });
  }
  return out;
}

// Sign of an e1RM trend across a series: +1 improving, -1 declining, 0 flat.
function trendSign(series) {
  const pts = series.filter((w) => w.bestE1RM > 0);
  if (pts.length < 2) return 0;
  const half = Math.floor(pts.length / 2);
  const early = pts.slice(0, half);
  const late = pts.slice(half);
  const avg = (arr) => arr.reduce((a, c) => a + c.bestE1RM, 0) / arr.length;
  const e = avg(early), l = avg(late);
  if (l > e * 1.01) return 1;
  if (l < e * 0.99) return -1;
  return 0;
}

// Rolling multi-week view (default 4 weeks) for monthly trends.
export function monthlyStats(sets, landmarks, weeks = 4, refDate) {
  const trainedGroups = [...new Set(sets.map((s) => s.muscleGroup).filter(Boolean))];
  const endMonday = mondayOf(refDate || new Date());
  const windowStartIso = isoOf(new Date(endMonday.getTime() - (weeks - 1) * 7 * DAY_MS));
  const windowEndIso = isoOf(new Date(endMonday.getTime() + 6 * DAY_MS));
  const windowSets = sets.filter((s) => inRange(s.date, windowStartIso, windowEndIso));

  const groups = {};
  for (const g of trainedGroups) {
    const series = weekSeries(sets, g, weeks, refDate);
    groups[g] = {
      series,
      totalSets: series.reduce((a, c) => a + c.count, 0),
      avgFrequency: series.reduce((a, c) => a + c.frequency, 0) / weeks,
      trend: trendSign(series),
      landmark: landmarks[g] ? enforceBand(landmarks[g]) : null,
    };
  }

  // Deload due: count trailing consecutive weeks (ending now) with any sets.
  const overall = weekSeries(sets, null, GROWTH_STANDARDS.deloadEveryWeeks + 2, refDate);
  let run = 0;
  for (let i = overall.length - 1; i >= 0; i--) {
    if (overall[i].count > 0) run += 1; else break;
  }

  return {
    windowStart: windowStartIso,
    windowEnd: windowEndIso,
    totalSessions: new Set(windowSets.map((s) => s.date)).size,
    consecutiveWeeks: run,
    deloadDue: run >= GROWTH_STANDARDS.deloadEveryWeeks,
    groups,
  };
}

// Muscle groups that are behind target this week: below MEV in volume, or
// trained less than the frequency standard. Skips groups whose MEV is 0
// (optional/accessory). Sorted most-behind first.
export function findGaps(weekly, landmarks) {
  const gaps = [];
  for (const [g, lm] of Object.entries(landmarks)) {
    const band = enforceBand(lm);
    if (band.MEV <= 0) continue;
    const stat = weekly.groups[g] || { sets: 0, frequency: 0 };
    const volumeGap = band.MEV - stat.sets;
    const freqGap = GROWTH_STANDARDS.frequencyTarget - stat.frequency;
    if (volumeGap > 0 || freqGap > 0) {
      gaps.push({
        group: g,
        sets: stat.sets,
        frequency: stat.frequency,
        targetSets: band.MEV,
        targetFrequency: GROWTH_STANDARDS.frequencyTarget,
        volumeGap: Math.max(0, volumeGap),
        freqGap: Math.max(0, freqGap),
        severity: Math.max(0, volumeGap) + Math.max(0, freqGap) * 2,
      });
    }
  }
  return gaps.sort((a, b) => b.severity - a.severity);
}

// Rank workout modules by how well they cover the target groups. Modules with
// more target-group exercises rank first; ties broken toward more focused
// modules (fewer off-target exercises).
export function rankModules(modules, targetGroups) {
  const targets = new Set(targetGroups);
  return modules
    .map((m) => {
      let onTarget = 0, off = 0;
      for (const [g, n] of Object.entries(m.groups)) {
        if (targets.has(g)) onTarget += n; else off += n;
      }
      return { module: m, onTarget, off, focus: onTarget / Math.max(1, onTarget + off) };
    })
    .filter((r) => r.onTarget > 0)
    .sort((a, b) => b.onTarget - a.onTarget || b.focus - a.focus);
}

// Auto-calibrate landmarks from training response. Only touches groups in Auto
// mode with enough recent data. Bounded ±2 sets per call.
//  - High volume (≥ MAV_hi) + non-improving performance + grinding (low RIR)
//    => fatigue, lower MRV.
//  - Volume regularly reaching the top of the band while still progressing
//    => growing work capacity, raise the band.
// Adherence (training below MEV) is NOT used to lower MEV — MEV is a property
// of the muscle, not of how often the user shows up.
export function calibrateLandmarks(landmarks, sets, { weeks = 8, refDate } = {}) {
  const changes = [];
  const next = {};
  for (const [g, lm] of Object.entries(landmarks)) {
    next[g] = { ...lm };
    if (!lm.auto) continue;
    const band = enforceBand(lm);
    const series = weekSeries(sets, g, weeks, refDate);
    const active = series.filter((w) => w.count > 0);
    if (active.length < 3) continue;

    const recent = active.slice(-3);
    const avgRecentVol = recent.reduce((a, c) => a + c.count, 0) / recent.length;
    const trend = trendSign(active);
    const grindWeeks = recent.filter((w) => w.avgRIR != null && w.avgRIR <= GROWTH_STANDARDS.rirWindow.lo + 0.5).length;

    let proposed = { ...band };
    let reason = null;

    if (avgRecentVol >= band.MAV_hi && trend <= 0 && grindWeeks >= 2) {
      // Pushing high volume but performance isn't responding and effort is
      // maxed — recoverable volume is lower than the current ceiling.
      proposed.MRV = Math.max(band.MAV_hi, band.MRV - 2);
      proposed.MAV_hi = Math.min(proposed.MRV, band.MAV_hi - 1);
      reason = "fatigue: high volume without progress";
    } else if (avgRecentVol >= band.MAV_lo && trend > 0) {
      // Productive and still growing at the upper band — capacity is rising.
      proposed.MRV = band.MRV + 1;
      proposed.MAV_hi = band.MAV_hi + 1;
      reason = "progressing at high volume";
    }

    if (reason) {
      const enforced = enforceBand(proposed);
      for (const f of ["MV", "MEV", "MAV_lo", "MAV_hi", "MRV"]) {
        if (enforced[f] !== band[f]) {
          changes.push({ group: g, field: f, from: band[f], to: enforced[f], reason });
        }
      }
      next[g] = { ...enforced, auto: true };
    }
  }
  return { landmarks: next, changes };
}
