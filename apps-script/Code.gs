/**
 * Ledger CRM — Google Sheet backend (Apps Script web app).
 *
 * The app pushes changed records here and pulls every row changed since its last pull.
 * One tab per collection, one row per record. Extra columns:
 *   updatedAt — when the record last changed (ms); the newer copy always wins
 *   deleted   — TRUE for deleted records (rows are kept so other devices learn about it)
 *   _rev      — server change counter used for incremental pulls; don't edit by hand
 *
 * Setup and deployment: see README.md → "Google Sheet backend".
 */

const SHEETS = {
  customers: "Customers",
  contractors: "Contractors",
  items: "Items",
  orders: "Orders",
  payments: "Payments",
  settings: "Settings",
};
const COL_ID = "id";
const COL_UPDATED_AT = "updatedAt";
const COL_DELETED = "deleted";
const COL_REV = "_rev";
const META_COLUMNS = [COL_UPDATED_AT, COL_DELETED, COL_REV];
const LOCK_WAIT_MS = 30000;
const FORMAT_TEXT = "@";
const FORMAT_INTEGER = "0";
const FORMAT_DECIMAL = "0.##########";
const FORMULA_LIKE = /^[=+\-@]/;   // would be parsed as a formula by Sheets
const TEXT_PREFIX = "'";

/* ---------- web app entry points ---------- */

function doGet(e) {
  return respond_(() => {
    if (e.parameter.action !== "pull") throw new Error("Unknown action");
    return pull_(Number(e.parameter.since) || 0);
  });
}

function doPost(e) {
  return respond_(() => {
    const body = JSON.parse(e.postData.contents);
    if (body.action !== "push") throw new Error("Unknown action");
    return push_(body.changes || []);
  });
}

function respond_(handler) {
  let payload;
  try {
    payload = Object.assign({ok: true}, handler());
  } catch (err) {
    payload = {ok: false, error: String((err && err.message) || err)};
  }
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ---------- pull: rows changed since a cursor ---------- */

function pull_(since) {
  return withLock_(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let cursor = since;
    const data = {};
    Object.keys(SHEETS).forEach(collection => {
      data[collection] = [];
      const sheet = ss.getSheetByName(SHEETS[collection]);
      if (!sheet || sheet.getLastRow() < 2) return;
      const headers = readHeaders_(sheet);
      const revIndex = headers.indexOf(COL_REV);
      if (revIndex < 0) return;

      const rowCount = sheet.getLastRow() - 1;
      const changed = [];
      sheet.getRange(2, revIndex + 1, rowCount, 1).getValues().forEach((cell, i) => {
        const rev = Number(cell[0]) || 0;
        if (rev > cursor) cursor = rev;
        if (rev > since) changed.push(i);
      });
      if (!changed.length) return;

      const tz = ss.getSpreadsheetTimeZone();
      const values = sheet.getRange(2, 1, rowCount, headers.length).getValues();
      changed.forEach(i => {
        const record = rowToRecord_(headers, values[i], tz);
        if (record[COL_ID]) data[collection].push(record);
      });
    });
    return {cursor, data};
  });
}

function rowToRecord_(headers, row, tz) {
  const record = {};
  headers.forEach((h, i) => {
    if (h) record[h] = fromCell_(row[i], tz);
  });
  return record;
}

function fromCell_(value, tz) {
  if (value instanceof Date) return Utilities.formatDate(value, tz, "yyyy-MM-dd");   // a date typed into the Sheet
  if (typeof value === "string" && value.charAt(0) === TEXT_PREFIX) return value.slice(1);
  return value;
}

/* ---------- push: upsert changed rows, newest updatedAt wins ---------- */

function push_(changes) {
  return withLock_(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const byCollection = {};
    changes.forEach(c => {
      if (!SHEETS[c.collection] || !c.row || !c.row[COL_ID]) return;
      (byCollection[c.collection] = byCollection[c.collection] || []).push(c.row);
    });

    let rev = Math.max(Date.now(), maxRev_(ss) + 1);
    const nextRev = () => rev++;
    let applied = 0;
    Object.keys(byCollection).forEach(collection => {
      applied += applyRows_(ensureSheet_(ss, SHEETS[collection]), byCollection[collection], nextRev);
    });
    return {applied};
  });
}

function applyRows_(sheet, rows, nextRev) {
  const headers = ensureHeaders_(sheet, rows);
  const existing = indexRows_(sheet, headers);
  const appends = [];
  let applied = 0;

  rows.forEach(row => {
    const id = String(row[COL_ID]);
    const updatedAt = Number(row[COL_UPDATED_AT]) || 0;
    const hit = existing[id];
    if (hit && hit.updatedAt >= updatedAt) return;   // same or newer copy already stored

    if (row[COL_DELETED] === true) {
      if (!hit) return;   // never reached the Sheet, nothing to mark
      writeCells_(sheet, hit.rowNumber, headers, {[COL_UPDATED_AT]: updatedAt, [COL_DELETED]: true, [COL_REV]: nextRev()});
    } else {
      const values = headers.map(h => h === COL_REV ? nextRev() : h === COL_DELETED ? "" : row[h]);
      if (hit) writeRows_(sheet, hit.rowNumber, [values]);
      else appends.push(values);
    }
    existing[id] = {rowNumber: hit ? hit.rowNumber : -1, updatedAt};
    applied++;
  });

  if (appends.length) writeRows_(sheet, sheet.getLastRow() + 1, appends);
  return applied;
}

function indexRows_(sheet, headers) {
  const index = Object.create(null);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return index;
  const ids = sheet.getRange(2, headers.indexOf(COL_ID) + 1, lastRow - 1, 1).getValues();
  const updated = sheet.getRange(2, headers.indexOf(COL_UPDATED_AT) + 1, lastRow - 1, 1).getValues();
  ids.forEach((cell, i) => {
    const id = String(cell[0]);
    if (id) index[id] = {rowNumber: i + 2, updatedAt: Number(updated[i][0]) || 0};
  });
  return index;
}

function maxRev_(ss) {
  let max = 0;
  Object.keys(SHEETS).forEach(collection => {
    const sheet = ss.getSheetByName(SHEETS[collection]);
    if (!sheet || sheet.getLastRow() < 2) return;
    const revIndex = readHeaders_(sheet).indexOf(COL_REV);
    if (revIndex < 0) return;
    sheet.getRange(2, revIndex + 1, sheet.getLastRow() - 1, 1).getValues().forEach(cell => {
      max = Math.max(max, Number(cell[0]) || 0);
    });
  });
  return max;
}

/* ---------- sheet & cell helpers ---------- */

function ensureSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(h => String(h).trim());
}

// Adds a column for any field not in the header row yet (new app fields need no script change).
function ensureHeaders_(sheet, rows) {
  const headers = readHeaders_(sheet);
  const wanted = [COL_ID];
  rows.filter(r => r[COL_DELETED] !== true).forEach(r => Object.keys(r).forEach(k => {
    if (wanted.indexOf(k) < 0 && META_COLUMNS.indexOf(k) < 0) wanted.push(k);
  }));
  const missing = wanted.concat(META_COLUMNS).filter(k => headers.indexOf(k) < 0);
  if (!missing.length) return headers;

  const next = headers.concat(missing);
  if (next.length > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), next.length - sheet.getMaxColumns());
  sheet.getRange(1, 1, 1, next.length).setNumberFormat(FORMAT_TEXT).setValues([next]).setFontWeight("bold");
  return next;
}

function writeRows_(sheet, startRow, rows) {
  const lastNeeded = startRow + rows.length - 1;
  if (lastNeeded > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), lastNeeded - sheet.getMaxRows());
  const range = sheet.getRange(startRow, 1, rows.length, rows[0].length);
  range.setNumberFormats(rows.map(r => r.map(formatFor_)));
  range.setValues(rows.map(r => r.map(toCell_)));
}

function writeCells_(sheet, rowNumber, headers, fields) {
  Object.keys(fields).forEach(name => {
    const cell = sheet.getRange(rowNumber, headers.indexOf(name) + 1);
    cell.setNumberFormat(formatFor_(fields[name]));
    cell.setValue(toCell_(fields[name]));
  });
}

// Text stays text (phone numbers keep leading zeros, dates don't get reinterpreted); numbers stay numbers.
function formatFor_(value) {
  if (typeof value === "number") return Number.isInteger(value) ? FORMAT_INTEGER : FORMAT_DECIMAL;
  return FORMAT_TEXT;
}

function toCell_(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return FORMULA_LIKE.test(text) ? TEXT_PREFIX + text : text;
}

/* ---------- edits made directly in the Sheet ---------- */

// Simple trigger: stamps rows edited by hand so every device picks the change up on its next pull.
// New rows typed into the Sheet get an id automatically.
function onEdit(e) {
  const sheet = e.range.getSheet();
  if (Object.keys(SHEETS).map(k => SHEETS[k]).indexOf(sheet.getName()) < 0) return;
  const firstRow = Math.max(e.range.getRow(), 2);
  const lastRow = e.range.getLastRow();
  if (lastRow < firstRow) return;

  const headers = readHeaders_(sheet);
  if ([COL_ID, COL_UPDATED_AT, COL_REV].some(h => headers.indexOf(h) < 0)) return;
  const rows = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, headers.length).getValues();
  const now = Date.now();
  let rev = Math.max(now, maxRev_(sheet.getParent()) + 1);

  rows.forEach((row, i) => {
    if (row.every(v => v === "")) return;
    const fields = {[COL_UPDATED_AT]: now, [COL_REV]: rev++};
    if (!row[headers.indexOf(COL_ID)]) fields[COL_ID] = Utilities.getUuid();
    writeCells_(sheet, firstRow + i, headers, fields);
  });
}
