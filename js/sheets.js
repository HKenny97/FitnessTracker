import { config } from "./config.js";

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
  return meta.result;
}

function tab(key) {
  const t = TABS[key];
  if (!t) throw new Error(`Unknown tab key: ${key}`);
  return t;
}

// Read all rows of a tab as objects keyed by header name.
export async function readAll(key) {
  const id = getSpreadsheetId();
  if (!id) return [];
  const t = tab(key);
  try {
    const r = await api().spreadsheets.values.get({
      spreadsheetId: id,
      range: `${t.title}`,
    });
    const rows = r.result.values || [];
    if (!rows.length) return [];
    const [headers, ...body] = rows;
    return body
      .filter((row) => row.length > 0)
      .map((row) => {
        const obj = {};
        headers.forEach((h, i) => (obj[h] = row[i] ?? ""));
        return obj;
      });
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

export async function appendRow(key, row) {
  const id = getSpreadsheetId();
  const t = tab(key);
  const values = Array.isArray(row) ? [row] : [rowFromObject(key, row)];
  return api().spreadsheets.values.append({
    spreadsheetId: id,
    range: `${t.title}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    resource: { values },
  });
}

export async function appendRows(key, rows) {
  if (!rows.length) return;
  const id = getSpreadsheetId();
  const t = tab(key);
  const values = rows.map((r) =>
    Array.isArray(r) ? r : rowFromObject(key, r),
  );
  return api().spreadsheets.values.append({
    spreadsheetId: id,
    range: `${t.title}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    resource: { values },
  });
}

// Overwrite a tab's contents (keeps header).
export async function replaceAll(key, rows) {
  const id = getSpreadsheetId();
  const t = tab(key);
  // Clear everything below the header, then write fresh data.
  await api().spreadsheets.values.clear({
    spreadsheetId: id,
    range: `${t.title}!A2:Z`,
  });
  if (!rows.length) return;
  const values = rows.map((r) =>
    Array.isArray(r) ? r : rowFromObject(key, r),
  );
  return api().spreadsheets.values.update({
    spreadsheetId: id,
    range: `${t.title}!A2`,
    valueInputOption: "USER_ENTERED",
    resource: { values },
  });
}

// Update or insert a single row matched by primary key column.
export async function upsertRow(key, primaryKey, obj) {
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
  return api().spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${t.title}!A${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    resource: { values: [row] },
  });
}
