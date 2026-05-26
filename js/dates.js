// Normalize any stored date value to canonical ISO "YYYY-MM-DD".
//
// Google Sheets, when written with valueInputOption "USER_ENTERED", parses an
// ISO date string into a serial number (e.g. "2026-05-22" -> 46164). If the
// cell isn't date-formatted it reads back as that serial, which new Date()
// then misreads as a far-future year. This converts serials (and locale date
// strings) back to ISO so display and date-equality filters behave.
const pad = (n) => String(n).padStart(2, "0");

export function toIsoDate(v) {
  if (v === "" || v == null) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // Sheets serial number (1900 date system; 25569 = days from its epoch to
  // the Unix epoch). Use UTC so the calendar date doesn't shift by timezone.
  if (typeof v === "number" || (typeof v === "string" && /^\d+(\.\d+)?$/.test(v))) {
    const d = new Date(Math.round((Number(v) - 25569) * 86400000));
    if (!isNaN(d)) return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }

  // A formatted date string like "5/22/2026"; keep its local calendar date.
  const d = new Date(v);
  if (!isNaN(d)) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return String(v);
}

// Normalize a stored clock-time value to "HH:MM". Times written with
// valueInputOption "USER_ENTERED" are coerced by Sheets into a time serial
// (fraction of a day, e.g. "17:19" -> 0.7215277778), which reads back as that
// decimal. Already-formatted "HH:MM" strings and empty values pass through.
export function toClockTime(v) {
  if (v === "" || v == null) return "";
  if (typeof v === "string" && /^\d{1,2}:\d{2}/.test(v)) return v;
  if (typeof v === "number" || (typeof v === "string" && /^\d*\.?\d+$/.test(v))) {
    const mins = Math.round((Number(v) % 1) * 1440) % 1440;
    if (Number.isFinite(mins)) return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  }
  return String(v);
}
