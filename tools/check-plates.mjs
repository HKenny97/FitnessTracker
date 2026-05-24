// Checks plate math and warm-up ramps. Pure modules, import directly. Run with:
//   node tools/check-plates.mjs   (or: npm run check:plates)
import { platesPerSide, defaultBar, defaultPlates } from "../js/plates.js";
import { warmupSets } from "../js/warmup.js";

let failures = 0;
const fail = (msg) => { failures++; console.error(`FAIL  ${msg}`); };

// 225 lb on a 45 bar = 180/2 = 90 per side = 2×45.
{
  const r = platesPerSide(225, BAR(), defaultPlates("lb"));
  const fortyFives = r.perSide.find((p) => p.plate === 45)?.count;
  if (fortyFives !== 2 || r.leftover !== 0 || r.loadable !== 225) {
    fail(`platesPerSide(225) → ${JSON.stringify(r)}`);
  }
}
function BAR() { return defaultBar("lb"); } // 45

// 135 lb = 45/side = 1×45.
{
  const r = platesPerSide(135, 45, defaultPlates("lb"));
  if (r.perSide.length !== 1 || r.perSide[0].plate !== 45 || r.perSide[0].count !== 1) {
    fail(`platesPerSide(135) → ${JSON.stringify(r)}`);
  }
}

// 100 kg on a 20 kg bar = 40/side = 25+15.
{
  const r = platesPerSide(100, defaultBar("kg"), defaultPlates("kg"));
  if (r.leftover !== 0 || r.loadable !== 100) fail(`platesPerSide(100kg) → ${JSON.stringify(r)}`);
}

// Below/at bar → nothing loaded.
{
  const r = platesPerSide(45, 45, defaultPlates("lb"));
  if (r.perSide.length !== 0 || r.loadable !== 45) fail(`platesPerSide(45 on 45) → ${JSON.stringify(r)}`);
}

// Odd weight leaves a leftover but still loads as much as possible.
{
  const r = platesPerSide(137, 45, defaultPlates("lb")); // 46/side; 45 + 1 leftover (no 1lb plate)
  if (r.leftover <= 0 || r.loadable >= 137) fail(`platesPerSide(137) → ${JSON.stringify(r)}`);
}

// Warm-up ramp: ascending, all below working weight, bar first.
{
  const ramp = warmupSets(225);
  if (!ramp.length) fail("warmupSets(225) empty");
  if (ramp[0].weight !== 45) fail(`warmupSets(225)[0] not bar → ${JSON.stringify(ramp[0])}`);
  for (let i = 0; i < ramp.length; i++) {
    if (ramp[i].weight >= 225) fail(`warmup rung ${ramp[i].weight} >= working 225`);
    if (i && ramp[i].weight <= ramp[i - 1].weight) fail(`warmup not ascending at ${i}: ${JSON.stringify(ramp)}`);
  }
}

// Working weight at/below bar → no warm-up.
if (warmupSets(45).length !== 0) fail("warmupSets(45) should be empty");

if (failures) { console.error(`\n${failures} plate/warm-up check failure(s).`); process.exit(1); }
console.log("OK: plate math and warm-up ramps pass.");
