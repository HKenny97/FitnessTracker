import { config } from "./config.js";
import { ensureToken } from "./auth.js";
import { toIsoDate } from "./dates.js";
import { QUEUEABLE, enqueue, peekRows, pendingCount, drain } from "./outbox.js";

// UI subscriber for the pending-sync count (set by app.js).
let outboxListener = null;
export function onOutboxChange(cb) {
  outboxListener = cb;
  if (cb) cb(pendingCount());
}
function notifyOutbox() {
  if (outboxListener) outboxListener(pendingCount());
}

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

// A thrown Sheets error with no HTTP status is a transport/connectivity
// failure (as opposed to 4xx/5xx, which carry a code).
function isNetworkError(e) {
  if (isOffline()) return true;
  const code = e?.result?.error?.code || e?.status;
  return !code;
}

// Thin wrapper around the Google Sheets v4 REST API via gapi.client.
// Persists a single spreadsheet ID in localStorage so the app finds the
// same workbook on every load.

const STORE_KEY = "rp.spreadsheetId";

const TABS = {
  meta: {
    title: "Meta",
    headers: ["key", "value"],
  },
  landmarks: {
    title: "VolumeLandmarks",
    headers: ["muscleGroup", "MV", "MEV", "MAV_lo", "MAV_hi", "MRV"],
  },
  mesocycles: {
    title: "Mesocycles",
    headers: [
      "id",
      "name",
      "startDate",
      "weeks",
      "status",
      "notes",
      "createdAt",
    ],
  },
  templateDays: {
    title: "TemplateDays",
    headers: ["mesoId", "dayIndex", "dayName"],
  },
  templateExercises: {
    title: "TemplateExercises",
    headers: [
      "mesoId",
      "dayIndex",
      "exerciseIndex",
      "exercise",
      "muscleGroup",
      "notes",
    ],
  },
  weekPlan: {
    title: "WeekPlan",
    headers: [
      "mesoId",
      "week",
      "muscleGroup",
      "targetSets",
      "targetRIR",
      "isDeload",
    ],
  },
  sets: {
    title: "Sets",
    headers: [
      "id",
      "mesoId",
      "week",
      "dayIndex",
      "date",
      "exercise",
      "muscleGroup",
      "setNumber",
      "weight",
      "reps",
      "rir",
      "notes",
      "setType",
    ],
  },
  sessions: {
    title: "Sessions",
    headers: [
      "id",
      "mesoId",
      "week",
      "dayIndex",
      "date",
      "startTime",
      "endTime",
      "location",
      "totalRPE",
      "leafStatus",
      "notes",
    ],
  },
  customExercises: {
    title: "CustomExercises",
    headers: ["id", "name", "group", "equipment", "createdAt"],
  },
  cardio: {
    title: "Cardio",
    headers: ["id", "date", "cardioType", "duration", "distance", "avgHeartRate", "perceivedDifficulty", "notes"],
  },
  sessionFeedback: {
    title: "SessionFeedback",
    headers: ["id", "mesoId", "week", "dayIndex", "date", "muscleGroup", "pump", "soreness", "jointPain", "performance"],
  },
  weekPlanAdjustments: {
    title: "WeekPlanAdjustments",
    headers: ["id", "mesoId", "week", "muscleGroup", "deltaSets", "reason", "createdAt"],
  },
};

export function getSpreadsheetId() {
  return localStorage.getItem(STORE_KEY) || "";
}

export function setSpreadsheetId(id) {
  if (id) localStorage.setItem(STORE_KEY, id);
  else localStorage.removeItem(STORE_KEY);
}

function api() {
  if (!window.gapi?.client?.sheets) {
    throw new Error("Google Sheets API not loaded");
  }
  return window.gapi.client.sheets;
}

// Resolve the workbook ID, creating one on first use. Idempotent and
// concurrency-safe: simultaneous first writes share a single create.
let pendingWorkbook = null;
export async function ensureWorkbook() {
  const existing = getSpreadsheetId();
  if (existing) return existing;
  if (isOffline()) {
    throw new Error("Can't create your data sheet while offline — reconnect and try again.");
  }
  await ensureToken();
  if (pendingWorkbook) return pendingWorkbook;
  pendingWorkbook = createWorkbook().finally(() => { pendingWorkbook = null; });
  return pendingWorkbook;
}

// Create the workbook, including all tabs and header rows.
export async function createWorkbook() {
  const sheets = api();
  const resp = await sheets.spreadsheets.create({
    properties: { title: config.defaultSheetName },
    sheets: Object.values(TABS).map((t) => ({
      properties: { title: t.title },
    })),
  });
  const id = resp.result.spreadsheetId;
  setSpreadsheetId(id);

  // Seed headers in every tab.
  const data = Object.values(TABS).map((t) => ({
    range: `${t.title}!A1`,
    values: [t.headers],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: id,
    resource: { valueInputOption: "RAW", data },
  });

  // Stamp schema version.
  await appendRow("meta", ["schemaVersion", config.schemaVersion]);
  return id;
}

// Verify a spreadsheet ID exists and contains our tabs; create any
// missing ones. Returns the inspected spreadsheet metadata.
export async function ensureTabs(spreadsheetId) {
  const sheets = api();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Set(
    (meta.result.sheets || []).map((s) => s.properties.title),
  );
  const missing = Object.values(TABS).filter((t) => !existing.has(t.title));
  if (missing.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: missing.map((t) => ({
          addSheet: { properties: { title: t.title } },
        })),
      },
    });
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: "RAW",
        data: missing.map((t) => ({
          range: `${t.title}!A1`,
          values: [t.headers],
        })),
      },
    });
  }

  // Header migration: reconcile header rows of tabs that already existed so
  // schema additions (e.g. a new trailing column) land in a labelled column.
  // readAll keys rows off the sheet's own header row, so an unlabelled column
  // would be dropped on read.
  const present = Object.values(TABS).filter((t) => existing.has(t.title));
  if (present.length) {
    const headerRows = await withRetry(() =>
      sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: present.map((t) => `${t.title}!1:1`),
      }),
    );
    const ranges = headerRows.result.valueRanges || [];
    const patches = [];
    present.forEach((t, i) => {
      const live = (ranges[i] && ranges[i].values && ranges[i].values[0]) || [];
      if (live.length < t.headers.length) {
        patches.push({ range: `${t.title}!A1`, values: [t.headers] });
      }
    });
    if (patches.length) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: { valueInputOption: "RAW", data: patches },
      });
    }
  }
  return meta.result;
}

function tab(key) {
  const t = TABS[key];
  if (!t) throw new Error(`Unknown tab key: ${key}`);
  return t;
}

// Wrap a Sheets API call: if it 401s, refresh the token and retry once.
async function withRetry(fn) {
  try {
    return await fn();
  } catch (e) {
    const code = e?.result?.error?.code || e?.status;
    if (code === 401) {
      await ensureToken();
      return await fn();
    }
    if (code === 429 || (code >= 500 && code < 600)) {
      await new Promise((r) => setTimeout(r, 1500));
      return await fn();
    }
    throw e;
  }
}

function parseRows(result, key) {
  const rows = result.values || [];
  if (!rows.length) return [];
  const [headers, ...body] = rows;
  return body
    .filter((row) => row.length > 0)
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        const v = row[i] ?? "";
        obj[h] = h === "date" ? toIsoDate(v) : v;
      });
      return obj;
    });
}

// Queued (not-yet-synced) rows for a tab as header-keyed objects, excluding
// any whose id already appears in `existing` (so a replayed-but-already-written
// row isn't shown twice).
function mergedQueuedRows(key, existing) {
  if (!QUEUEABLE.has(key)) return [];
  const headers = tab(key).headers;
  const seen = new Set(existing.map((r) => r.id).filter(Boolean));
  const out = [];
  for (const row of peekRows(key)) {
    const obj = {};
    headers.forEach((h, i) => {
      const v = row[i] ?? "";
      obj[h] = h === "date" ? toIsoDate(v) : v;
    });
    if (obj.id && seen.has(obj.id)) continue;
    if (obj.id) seen.add(obj.id);
    out.push(obj);
  }
  return out;
}

// Read all rows of a tab as objects keyed by header name. Pending offline
// writes for queueable tabs are merged in so reads reflect them.
export async function readAll(key) {
  await ensureToken();
  const id = getSpreadsheetId();
  if (!id) return [];
  const t = tab(key);
  try {
    const r = await withRetry(() =>
      api().spreadsheets.values.get({
        spreadsheetId: id,
        range: `${t.title}`,
      }),
    );
    const rows = parseRows(r.result, key);
    return [...rows, ...mergedQueuedRows(key, rows)];
  } catch (e) {
    if (e?.result?.error?.code === 400) return [];
    throw e;
  }
}

function rowFromObject(key, obj) {
  return tab(key).headers.map((h) => {
    const v = obj[h];
    if (v === undefined || v === null) return "";
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    return v;
  });
}

// Raw append of pre-built row values (2D array) to a tab.
async function sendAppend(key, values) {
  const t = tab(key);
  return withRetry(() =>
    api().spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range: `${t.title}!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      resource: { values },
    }),
  );
}

// Append, or queue offline. For queueable (append-only) tabs, a connectivity
// failure enqueues the rows and resolves optimistically so the in-memory UI
// stays consistent and the write is replayed later. Other tabs are unchanged.
async function appendOrQueue(key, values) {
  const queueable = QUEUEABLE.has(key);
  if (queueable && isOffline()) {
    enqueue(key, values);
    notifyOutbox();
    return { queued: true };
  }
  await ensureToken();
  await ensureWorkbook();
  try {
    return await sendAppend(key, values);
  } catch (e) {
    if (queueable && isNetworkError(e)) {
      enqueue(key, values);
      notifyOutbox();
      return { queued: true };
    }
    throw e;
  }
}

export async function appendRow(key, row) {
  const values = [Array.isArray(row) ? row : rowFromObject(key, row)];
  return appendOrQueue(key, values);
}

export async function appendRows(key, rows) {
  if (!rows.length) return;
  const values = rows.map((r) => (Array.isArray(r) ? r : rowFromObject(key, r)));
  return appendOrQueue(key, values);
}

// Replay queued writes in order. Safe to call repeatedly; no-op when offline,
// signed out, or empty. Returns { sent, remaining }.
export async function flushOutbox() {
  if (!getSpreadsheetId() || isOffline() || !pendingCount()) {
    return { sent: 0, remaining: pendingCount() };
  }
  try {
    await ensureToken();
  } catch {
    return { sent: 0, remaining: pendingCount() };
  }
  const res = await drain((key, values) => sendAppend(key, values));
  notifyOutbox();
  return res;
}

// Overwrite a tab's contents (keeps header).
export async function replaceAll(key, rows) {
  await ensureToken();
  await ensureWorkbook();
  const id = getSpreadsheetId();
  const t = tab(key);
  // Clear everything below the header, then write fresh data.
  await withRetry(() =>
    api().spreadsheets.values.clear({
      spreadsheetId: id,
      range: `${t.title}!A2:Z`,
    }),
  );
  if (!rows.length) return;
  const values = rows.map((r) =>
    Array.isArray(r) ? r : rowFromObject(key, r),
  );
  return withRetry(() =>
    api().spreadsheets.values.update({
      spreadsheetId: id,
      range: `${t.title}!A2`,
      valueInputOption: "USER_ENTERED",
      resource: { values },
    }),
  );
}

// Update or insert a single row matched by primary key column.
export async function upsertRow(key, primaryKey, obj) {
  await ensureToken();
  await ensureWorkbook();
  const all = await readAll(key);
  const headers = tab(key).headers;
  const idx = all.findIndex((r) => String(r[primaryKey]) === String(obj[primaryKey]));
  if (idx === -1) {
    return appendRow(key, obj);
  }
  // Row index in sheet = idx + 2 (1 for header, 1 for 1-based).
  const sheetRow = idx + 2;
  const t = tab(key);
  const merged = { ...all[idx], ...obj };
  const row = headers.map((h) => merged[h] ?? "");
  return withRetry(() =>
    api().spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: `${t.title}!A${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      resource: { values: [row] },
    }),
  );
}
