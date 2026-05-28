// Truth table for suggestSetAdjustment (RP feedback-driven set progression).
//   node tools/check-autoreg.mjs   (or: npm run check:autoreg)
import { suggestSetAdjustment } from "../js/rp.js";

const LM = { MEV: 10, MRV: 22 };
let failures = 0;

const CASES = [
  { name: "not enough data",
    in: { feedback: { pump: 3, soreness: 0 }, performedSets: 1, targetSets: 10, landmark: LM },
    action: "hold" },
  { name: "joint pain → reduce",
    in: { feedback: { jointPain: 2, soreness: 0, pump: 2, performance: 2 }, performedSets: 10, targetSets: 12, landmark: LM },
    action: "reduce", delta: -1 },
  { name: "high soreness → reduce",
    in: { feedback: { soreness: 3, pump: 2, performance: 2 }, performedSets: 12, targetSets: 12, landmark: LM },
    action: "reduce", delta: -1 },
  { name: "at MRV → deload",
    in: { feedback: { soreness: 1, pump: 2, performance: 2 }, performedSets: 22, targetSets: 22, landmark: LM },
    action: "deload" },
  { name: "moderate soreness → hold",
    in: { feedback: { soreness: 2, pump: 2, performance: 2 }, performedSets: 12, targetSets: 12, landmark: LM },
    action: "hold", delta: 0 },
  { name: "recovered + good stimulus → add 1",
    in: { feedback: { soreness: 1, pump: 2, performance: 2 }, performedSets: 12, targetSets: 12, landmark: LM },
    action: "add", delta: 1 },
  { name: "no pump (very low stimulus) → add 3",
    in: { feedback: { soreness: 0, pump: 0, performance: 2 }, performedSets: 12, targetSets: 12, landmark: LM },
    action: "add", delta: 3 },
  { name: "low pump (pump=1) → add 2",
    in: { feedback: { soreness: 0, pump: 1, performance: 2 }, performedSets: 12, targetSets: 12, landmark: LM },
    action: "add", delta: 2 },
  { name: "poor performance, no soreness → hold",
    in: { feedback: { soreness: 1, pump: 1, performance: 0 }, performedSets: 12, targetSets: 12, landmark: LM },
    action: "hold", delta: 0 },
  { name: "add capped near MRV",
    in: { feedback: { soreness: 0, pump: 0, performance: 2 }, performedSets: 21, targetSets: 21, landmark: LM },
    action: "add", delta: 1 },
  // New rules:
  { name: "junk volume: low pump + soreness → reduce",
    in: { feedback: { soreness: 2, pump: 1, performance: 2 }, performedSets: 12, targetSets: 12, landmark: LM },
    action: "reduce", delta: -1 },
  { name: "productive overreach: high pump + sore + on-target → hold (not reduce)",
    in: { feedback: { soreness: 3, pump: 3, performance: 2 }, performedSets: 12, targetSets: 12, landmark: LM },
    action: "hold", delta: 0 },
  { name: "rirDrift bumps soreness into reduce territory",
    in: { feedback: { soreness: 2, pump: 2, performance: 2 }, rirDrift: 1, performedSets: 12, targetSets: 12, landmark: LM },
    action: "reduce", delta: -1 },
  { name: "rirDrift alone with mild soreness → hold",
    in: { feedback: { soreness: 1, pump: 2, performance: 2 }, rirDrift: 1, performedSets: 12, targetSets: 12, landmark: LM },
    action: "hold", delta: 0 },
  { name: "deload override: even add candidates hold",
    in: { feedback: { soreness: 0, pump: 0, performance: 2 }, isDeload: true, performedSets: 12, targetSets: 12, landmark: LM },
    action: "hold", delta: 0 },
];

for (const c of CASES) {
  const r = suggestSetAdjustment(c.in);
  if (r.action !== c.action) { failures++; console.error(`FAIL  ${c.name}: action ${r.action} (expected ${c.action})`); continue; }
  if (c.delta != null && r.deltaSets !== c.delta) { failures++; console.error(`FAIL  ${c.name}: delta ${r.deltaSets} (expected ${c.delta})`); }
}

if (failures) { console.error(`\n${failures} autoreg check failure(s).`); process.exit(1); }
console.log(`OK: all ${CASES.length} autoregulation cases pass.`);
