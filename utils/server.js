// utils/server.js
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { Query, ID } from "node-appwrite";
import * as sdk from "node-appwrite";
import dotenv from "dotenv";

dotenv.config();

// ── STRUCTURED LOGGER ──────────────────────────────────────────
// Outputs one JSON line per event — Render captures stdout/stderr.
// Also keeps the last 200 entries in memory for the admin log viewer.
const _logBuffer = [];
const _LOG_LIMIT = 200;

const log = {
  _write(level, msg, extra = {}) {
    const entry = { ts: new Date().toISOString(), level, msg, ...extra };
    process.stdout.write(JSON.stringify(entry) + "\n");
    _logBuffer.unshift(entry);
    if (_logBuffer.length > _LOG_LIMIT) _logBuffer.pop();
  },
  info:  (msg, extra) => log._write("INFO",  msg, extra),
  warn:  (msg, extra) => log._write("WARN",  msg, extra),
  error: (msg, extra) => log._write("ERROR", msg, extra),
};

// ── PROCESS CRASH HANDLERS ─────────────────────────────────────
process.on("uncaughtException", (err) => {
  log.error("Uncaught exception — shutting down", { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  log.error("Unhandled promise rejection", { reason: String(reason) });
});

const app = express();
app.use(express.json());

// ── HTTP REQUEST LOGGER ────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    log.info("http", { method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start });
  });
  next();
});

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

// Startup validation — fail fast so Render logs show the real cause
if (allowedOrigins.length === 0) {
  throw new Error("ALLOWED_ORIGINS env var is missing or empty — server cannot start safely.");
}

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      log.warn("CORS blocked", { origin });
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// ── RATE LIMITING ───────────────────────────────────────────────
// Read endpoints: generous — dashboard and reports poll these frequently.
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please try again later." },
});

// Write endpoints: tight — each submit is one action, 30 is plenty for
// a team of ~6 over 15 minutes.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many write requests — please try again later." },
});

// ✅ Appwrite client setup
const client = new sdk.Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY); // Server key — NEVER expose in frontend

const databases = new sdk.Databases(client);
const users     = new sdk.Users(client);
const teamsAPI  = new sdk.Teams(client);

// ✅ Shared database + collections
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collections = {
  loans:        process.env.APPWRITE_LOANS_ID,
  fiche:        process.env.APPWRITE_FICHE_ID,
  gain:         process.env.APPWRITE_GAIN_ID,
  payments:     process.env.APPWRITE_PAYMENTS_ID,
  stock:        process.env.APPWRITE_STOCK_ID,
  gainPompiste: process.env.APPWRITE_GAIN_ID,
};

// ── INPUT SANITISATION ─────────────────────────────────────────
// Strip Appwrite internal fields ($id, $createdAt, etc.) from any
// client-supplied body before writing to the database.
function sanitizeBody(body) {
  if (!body || typeof body !== "object") return {};
  const clean = {};
  for (const [k, v] of Object.entries(body)) {
    if (!k.startsWith("$")) clean[k] = v;
  }
  return clean;
}

// Fields that are safe to use as a query filter per collection.
// Prevents clients from filtering by $id, $permissions, etc.
const QUERY_FIELD_ALLOWLIST = {
  fiche:        ["plate", "company", "amount", "logDate", "employee", "email"],
  loans:        ["plate", "company", "amount", "logDate", "employee", "email", "monthYear"],
  gain:         ["email", "employee", "gainPayments", "logDate", "monthYear"],
  gainPompiste: ["email", "employee", "gainPayments", "logDate", "monthYear"],
  payments:     ["email", "logDate", "shift", "employee", "id"],
  stock:        ["monthYear", "email"],
};

// ── ROUTES ─────────────────────────────────────────────────────

// List available tables (used by the report dashboard sidebar)
app.get("/api/tables", readLimiter, (_, res) => {
  const available = Object.fromEntries(
    Object.entries(collections).filter(([, v]) => v)
  );
  res.json({ availableTables: available });
});

// Get attributes (fields) for one collection
app.get("/api/attributes/:collection", readLimiter, async (req, res) => {
  const { collection } = req.params;
  const collectionId = collections[collection];

  if (!collectionId) {
    return res.status(400).json({ error: `Invalid collection name: ${collection}` });
  }

  try {
    const response = await databases.listAttributes(databaseId, collectionId);
    res.json(response);
  } catch (err) {
    log.error("attributes fetch failed", { collection, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET documents from a collection
app.get("/api/documents/:collection", readLimiter, async (req, res) => {
  const { collection } = req.params;
  const collectionId = collections[collection];

  if (!collectionId) {
    return res.status(400).json({ error: `Collection '${collection}' not found` });
  }

  try {
    const documents = await fetchAllDocuments(collectionId);
    res.json({ documents });
  } catch (error) {
    log.error("documents fetch failed", { collection, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Universal write route
app.post("/api/create/:collection", writeLimiter, async (req, res) => {
  try {
    const tableKey = req.params.collection;
    const tableId  = collections[tableKey];

    if (!tableId) {
      return res.status(400).json({ error: `Collection '${tableKey}' not found` });
    }

    const data = sanitizeBody(req.body);

    const result = await databases.createDocument(
      databaseId,
      tableId,
      ID.unique(),
      data
    );

    res.json({ success: true, result });
  } catch (error) {
    log.error("document create failed", { collection: req.params.collection, error: error.message });
    res.status(500).json({ error: "Failed to create document" });
  }
});

app.patch("/api/update-by-field/:collection", writeLimiter, async (req, res) => {
  try {
    const { collection } = req.params;
    const { searchField, searchValue, updateData: rawUpdateData } = req.body;

    const collectionId = collections[collection];
    if (!collectionId) {
      return res.status(400).json({ error: `Collection '${collection}' not found` });
    }

    // Validate that the search field is in the allowlist for this collection
    const allowedFields = QUERY_FIELD_ALLOWLIST[collection] || [];
    if (!allowedFields.includes(searchField)) {
      return res.status(400).json({ error: `Field '${searchField}' is not queryable on '${collection}'` });
    }

    const updateData = sanitizeBody(rawUpdateData);

    const findResult = await databases.listDocuments(
      databaseId,
      collectionId,
      [Query.equal(searchField, searchValue)]
    );

    if (findResult.documents.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const documentId = findResult.documents[0].$id;

    const updateResult = await databases.updateDocument(
      databaseId,
      collectionId,
      documentId,
      updateData
    );

    res.json({ success: true, result: updateResult });
  } catch (error) {
    log.error("update-by-field failed", { collection, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Atomic gain upsert — avoids race condition from client-side read-modify-write
app.post("/api/upsert-gain", writeLimiter, async (req, res) => {
  try {
    const { email, employee, gainPayments, logDate, monthYear } = req.body;
    const gainPompisteId = collections.gainPompiste;

    if (!gainPompisteId) {
      return res.status(500).json({ error: "Gain collection env var not set" });
    }

    const existing = await databases.listDocuments(databaseId, gainPompisteId, [
      Query.equal("email", email),
      Query.equal("monthYear", monthYear),
    ]);

    if (existing.documents.length === 0) {
      await databases.createDocument(databaseId, gainPompisteId, ID.unique(), {
        employee, email, gainPayments, logDate, monthYear,
      });
    } else {
      const doc = existing.documents[0];
      await databases.updateDocument(databaseId, gainPompisteId, doc.$id, {
        employee, email,
        gainPayments: gainPayments + doc.gainPayments,
        logDate, monthYear,
      });
    }

    res.json({ success: true });
  } catch (err) {
    log.error("upsert-gain failed", { email: req.body?.email, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Create a new employee account (admin only — uses server-side Users API)
app.post("/api/create-employee", writeLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const user = await users.create(ID.unique(), email, undefined, password, name);
    res.json({ success: true, userId: user.$id, name: user.name, email: user.email });
  } catch (err) {
    log.error("create-employee failed", { email: req.body?.email, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── TEAMS ──────────────────────────────────────────────────────

app.get("/api/teams", readLimiter, async (req, res) => {
  try {
    const result = await teamsAPI.list();
    res.json({ teams: result.teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/teams", writeLimiter, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Team name is required." });
    const team = await teamsAPI.create(ID.unique(), name.trim());
    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/teams/:teamId", writeLimiter, async (req, res) => {
  try {
    await teamsAPI.delete(req.params.teamId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/teams/:teamId/members", readLimiter, async (req, res) => {
  try {
    const result = await teamsAPI.listMemberships(req.params.teamId);
    res.json({ memberships: result.memberships });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/teams/:teamId/members", writeLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const found = await users.list([Query.equal("email", email)]);
    if (found.users.length === 0) {
      return res.status(404).json({ error: `No account found for ${email}` });
    }
    const user = found.users[0];

    // Pass userId to add directly without sending an invite email
    const membership = await teamsAPI.createMembership(
      req.params.teamId, ["member"], user.email, user.$id
    );
    res.json({ success: true, membership });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/teams/:teamId/members/:membershipId", writeLimiter, async (req, res) => {
  try {
    await teamsAPI.deleteMembership(req.params.teamId, req.params.membershipId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── USERS ───────────────────────────────────────────────────────

app.get("/api/users", readLimiter, async (req, res) => {
  try {
    const result = await users.list();
    res.json({ users: result.users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/users/:userId", writeLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, prefs } = req.body;
    const updates = [];
    if (name?.trim()) updates.push(users.updateName(userId, name.trim()));
    if (prefs)        updates.push(users.updatePrefs(userId, prefs));
    if (updates.length === 0) return res.status(400).json({ error: "Nothing to update." });
    await Promise.all(updates);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/users/:userId/password", writeLimiter, async (req, res) => {
  try {
    const { userId }  = req.params;
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }
    await users.updatePassword(userId, password);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN LOG VIEWER ───────────────────────────────────────────
// Returns the in-memory log buffer. Caller must present a valid
// Appwrite JWT belonging to the Admin team.
app.get("/api/logs", readLimiter, async (req, res) => {
  const jwt = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!jwt) return res.status(401).json({ error: "Unauthorized" });

  try {
    const jwtClient = new sdk.Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setJWT(jwt);
    const jwtTeams = new sdk.Teams(jwtClient);
    await new sdk.Account(jwtClient).get();
    const result  = await jwtTeams.list();
    const isAdmin = result.teams.some(t => t.name === "Admin");
    if (!isAdmin) return res.status(403).json({ error: "Forbidden" });
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }

  res.json({ logs: _logBuffer });
});

// ✅ Health check
app.get("/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// ── GLOBAL ERROR HANDLER ───────────────────────────────────────
// Catches errors passed via next(err) from any route.
app.use((err, req, res, next) => {
  log.error("Unhandled route error", { method: req.method, path: req.path, error: err.message });
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Internal server error" });
});

// ✅ Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  log.info("Server started", { port, frontend: "https://boaziza.github.io/myWebApp" });
});

async function fetchAllDocuments(collectionId) {
  const limit = 100;
  let all    = [];
  let cursor = null;

  while (true) {
    const queries = [Query.limit(limit)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const result = await databases.listDocuments(databaseId, collectionId, queries);
    all.push(...result.documents);

    if (result.documents.length < limit) break;
    cursor = result.documents[result.documents.length - 1].$id;
  }

  return all;
}
