require('dotenv').config();
const { BigQuery } = require("@google-cloud/bigquery");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getSecret } = require('./services/secretService');
const fs = require('fs').promises;
const path = require('path');

// --- Configuration ---
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "bqsqltesting";
const DATASET_ID = "Mobile_Fitters";
const DEAD_LETTER_PATH = path.join(__dirname, 'dead_letter.jsonl');

const bigquery = new BigQuery({ projectId: PROJECT_ID });
let genai;
let geminiApiKey;

const TABLES = {
  intended_route: "Intended_route_table",
  jobs: "Jobs",
  shifts: "Shifts",
  gps_logs: "gps_logs",
};

// --- Schema Management ---
const SCHEMA_CACHE = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Log a rejected row to a durable sink (JSONL file)
 */
async function logToDeadLetter(tableName, row, errors) {
  const entry = {
    table: tableName,
    insertId: row.eventId || "unknown",
    receivedAt: new Date().toISOString(),
    payload: row,
    errors: errors
  };

  try {
    // Async, non-blocking append to the dead_letter file
    await fs.appendFile(DEAD_LETTER_PATH, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error("🚨 CRITICAL: Persistent dead-letter write failed!", err.message);
  }
}

async function refreshSchema(tableName) {
  const now = Date.now();
  try {
    const table = bigquery.dataset(DATASET_ID).table(tableName);
    const [metadata] = await table.getMetadata();
    const fields = metadata.schema.fields.reduce((acc, f) => {
      acc[f.name] = { type: f.type, mode: f.mode };
      return acc;
    }, {});

    SCHEMA_CACHE[tableName] = { timestamp: now, fields };
    console.log(`📡 Cached schema for ${tableName} (${Object.keys(fields).length} fields): ${Object.keys(fields).join(', ')}`);
    return fields;
  } catch (err) {
    console.error(`❌ Failed to fetch schema for ${tableName}:`, err.message);
    return SCHEMA_CACHE[tableName]?.fields || null;
  }
}

async function getSchemaForTable(tableName) {
  const now = Date.now();
  const cached = SCHEMA_CACHE[tableName];

  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.fields;
  }

  if (cached) {
    // Refresh in background
    refreshSchema(tableName).catch(() => { });
    return cached.fields;
  }

  return await refreshSchema(tableName);
}

// --- Data Transformation ---
function normalizeValue(val, type) {
  if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) return null;

  switch (type) {
    case 'TIMESTAMP':
      try {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString();
      } catch (e) { return null; }
    case 'DATETIME':
      try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return null;
        // DATETIME format: YYYY-MM-DD HH:MM:SS.sss
        return d.toISOString().replace('T', ' ').replace('Z', '');
      } catch (e) { return null; }
    case 'NUMERIC':
    case 'FLOAT64':
    case 'FLOAT':
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.-]/g, '');
        if (!cleaned) return null;
        return type === 'NUMERIC' ? Number(cleaned).toFixed(9) : Number(cleaned);
      }
      return type === 'NUMERIC' ? val.toFixed(9) : val;
    case 'INTEGER':
    case 'INT64':
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9-]/g, ''); // No dots for integers
        return cleaned ? parseInt(cleaned, 10) : null;
      }
      return Number.isFinite(val) ? Math.floor(val) : null;
    case 'BOOLEAN':
    case 'BOOL':
      return !!(val === true || val === 'true' || val === 1 || val === '1' || val === 'TRUE');
    case 'STRING':
      return String(val);
  }
}

// --- Ingestion Logic ---
async function insertRows(tableName, rows) {
  if (!rows || rows.length === 0) return { inserted: 0, dropped: 0 };

  const schema = await getSchemaForTable(tableName);
  const table = bigquery.dataset(DATASET_ID).table(tableName);

  const droppedRows = [];
  const safeRows = [];

  for (let row of rows) {
    // 1. Enforce/Generate eventId
    if (!row.eventId) {
      console.warn(`⚠️ Row missing eventId for ${tableName}, generating server-side...`);
      row.eventId = `server-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    }

    if (!schema) {
      console.error(`🛑 Schema unavailable for ${tableName}; refusing to insert blindly.`);
      droppedRows.push({ row, error: "Schema unavailable; refusing to insert blindly" });
      continue;
    }

    let processedRow = { ...row };

    // 2. Alias Mapping
    if (schema['timestampt'] && processedRow['timestamp'] && !processedRow['timestampt']) {
      processedRow['timestampt'] = processedRow['timestamp'];
    } else if (schema['timestamp'] && processedRow['timestampt'] && !processedRow['timestamp']) {
      processedRow['timestamp'] = processedRow['timestampt'];
    }

    const safeRow = {};
    const missingRequired = [];

    // 3. Whitelist, Coerce & Validate (Case-Insensitive)
    const upperProcessed = {};
    for (const key of Object.keys(processedRow)) {
      upperProcessed[key.toLowerCase()] = processedRow[key];
    }

    for (const fName of Object.keys(schema)) {
      const fDef = schema[fName];
      const val = upperProcessed[fName.toLowerCase()];

      if (val !== undefined && val !== null) {
        safeRow[fName] = normalizeValue(val, fDef.type);
      } else if (fDef.mode === 'REQUIRED') {
        missingRequired.push(fName);
      }
    }

    // 4. Required Field Check
    if (missingRequired.length > 0) {
      const errMsg = `Missing REQUIRED fields: ${missingRequired.join(', ')}`;
      if (tableName === TABLES.gps_logs) {
        console.warn(`🗑️ Dropping GPS row (${row.eventId}): ${errMsg}`);
        droppedRows.push({ row, error: errMsg });
      } else {
        console.error(`🛑 REJECTING Row (${row.eventId}) for ${tableName}: ${errMsg}`);
        throw new Error(`Data Integrity Error: ${errMsg}`);
      }
      continue;
    }

    safeRows.push(safeRow);
  }

  if (safeRows.length === 0) return { inserted: 0, dropped: droppedRows.length };

  try {
    await table.insert(safeRows, {
      ignoreUnknownValues: false,
      skipInvalidRows: false,
    });

    for (const d of droppedRows) {
      logToDeadLetter(tableName, d.row, d.error).catch(() => { });
    }

    return { inserted: safeRows.length, dropped: droppedRows.length };
  } catch (err) {
    console.error(`BigQuery Insert Error (${tableName}):`, JSON.stringify(err, null, 2));
    if (err.errors) {
      err.errors.forEach((rowError, idx) => {
        console.error(`  - Row ${idx} Error:`, JSON.stringify(rowError.errors, null, 2));
        const errorRow = safeRows[rowError.rowIndex ?? rowError.index ?? idx] ?? safeRows[idx] ?? null;
        logToDeadLetter(tableName, errorRow, rowError.errors).catch(() => { });
      });
    }
    throw err;
  }
}

// --- Handler Functions ---
async function handleIngest(req, res) {
  const body = req.body || {};
  const results = {};

  const tasks = [
    { key: "intended_route", table: TABLES.intended_route, rows: body.intended_route },
    { key: "jobs", table: TABLES.jobs, rows: body.jobs },
    { key: "shifts", table: TABLES.shifts, rows: body.shifts },
    { key: "gps_logs", table: TABLES.gps_logs, rows: body.gps_logs },
  ];

  try {
    for (const task of tasks) {
      if (task.rows && task.rows.length > 0) {
        results[task.key] = await insertRows(task.table, task.rows);
      }
    }
    res.status(200).json({ status: "success", data: results });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
}

async function ensureGenAI() {
  if (genai) return genai;
  if (!geminiApiKey) {
    geminiApiKey = process.env.GEMINI_API_KEY || await getSecret('ROUTEMASTER_GEMINI_API_KEY');
  }
  if (!geminiApiKey) throw new Error("GEMINI_API_KEY missing");
  genai = new GoogleGenerativeAI(geminiApiKey);
  return genai;
}

async function handleGeminiParse(req, res) {
  const { manifest } = req.body;
  if (!manifest) return res.status(400).json({ error: "Manifest required" });

  try {
    const ai = await ensureGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Parse the following delivery manifest.\nExtract addresses and specific notes.\nDefault tyreCount to 2 unless specified.\nStatus must be 'pending'.\nMANIFEST:\n${manifest}` }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const stops = JSON.parse(response.response.text());
    res.json(stops);
  } catch (e) {
    console.error("Gemini Parse Error:", e);
    res.status(500).json({ error: "AI Parsing Failed", details: e.message });
  }
}

async function handleGeminiFuel(req, res) {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: "Location required" });

  try {
    const ai = await ensureGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    // Use standard generateContent with retrieval tools if available, or just standard text search
    // Since we're using Express, we can use the same logic as before but cleaner
    const prompt = `Find exactly 5 fuel stations nearest to Lat ${lat}, Lng ${lng} that accept Allstar One business cards.
For each station, provide the FULL ADDRESS including POSTCODE for accurate routing.
Format each line exactly as: [BRAND] | [NAME] | [FULL_ADDRESS_WITH_POSTCODE] | [DISTANCE]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const stations = [];
    const lines = text.split('\n').filter(l => l.includes(' | '));

    lines.forEach(line => {
      const parts = line.split(' | ');
      if (parts.length >= 3) {
        stations.push({
          brand: parts[0].replace(/[*[\]]/g, '').trim(),
          name: parts[1].trim(),
          address: parts[2].trim(),
          distance: parts[3]?.trim() || "Nearby",
        });
      }
    });

    res.json(stations.slice(0, 5));
  } catch (e) {
    console.error("Gemini Fuel Error:", e);
    res.status(500).json({ error: "Fuel Search Failed", details: e.message });
  }
}

// --- Main HTTP Export ---
const mobileFittersIngest = async (req, res) => {
  if (req.method === "GET") return res.json({ status: "ok" });
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const authorizedKey = process.env.INGEST_API_KEY || await getSecret("ROUTEMASTER_INGEST_API_KEY");
  const providedKey = req.get('x-api-key');

  if (providedKey !== authorizedKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const path = req.path;
  if (path === '/' || path === '') return handleIngest(req, res);
  if (path === '/gemini/parse') return handleGeminiParse(req, res);
  if (path === '/gemini/fuel') return handleGeminiFuel(req, res);

  return res.status(404).json({ error: "Not Found" });
};

// Startup verification
(async () => {
  console.log("🚀 Server starting. Verifying BigQuery connectivity...");
  for (const tableKey of Object.keys(TABLES)) {
    await getSchemaForTable(TABLES[tableKey]);
  }
})();

module.exports = {
  mobileFittersIngest,
  // Older aliases if needed
  handleIngest,
  handleGeminiParse,
  handleGeminiFuel
};
