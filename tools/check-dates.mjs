// Verifies date normalization (Sheets serial / locale string -> ISO).
//   node tools/check-dates.mjs   (or: npm run check:dates)
import { toIsoDate, toClockTime } from "../js/dates.js";

let failures = 0;
const eq = (got, want, label) => {
  if (got !== want) { failures++; console.error(`FAIL  ${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
};

eq(toIsoDate(46164), "2026-05-22", "serial number");
eq(toIsoDate("46164"), "2026-05-22", "serial string");
eq(toIsoDate("2026-05-24"), "2026-05-24", "ISO passthrough");
eq(toIsoDate("5/22/2026"), "2026-05-22", "locale string");
eq(toIsoDate(""), "", "empty");
eq(toIsoDate(null), "", "null");
eq(toIsoDate(undefined), "", "undefined");

// Clock-time serials (fraction of a day) -> "HH:MM".
eq(toClockTime("0.7215277778"), "17:19", "time serial start");
eq(toClockTime("0.7298611111"), "17:31", "time serial end");
eq(toClockTime(0.5), "12:00", "noon serial");
eq(toClockTime("17:19"), "17:19", "HH:MM passthrough");
eq(toClockTime(""), "", "empty time");
eq(toClockTime(null), "", "null time");

if (failures) { console.error(`\n${failures} date check failure(s).`); process.exit(1); }
console.log("OK: date + time normalization passes.");
