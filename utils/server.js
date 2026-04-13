// utils/server.js
import express from "express";
import cors from "cors";
import { Query, ID } from "node-appwrite";
import * as sdk from "node-appwrite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

const apiSecret = process.env.API_SECRET;

// Startup validation — fail fast so Render logs show the real cause
if (allowedOrigins.length === 0) {
  throw new Error("ALLOWED_ORIGINS env var is missing or empty — server cannot start safely.");
}
if (!apiSecret) {
  throw new Error("API_SECRET env var is missing — server cannot start safely.");
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or local tools (like Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn(`❌ Blocked by CORS: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // for legacy browsers
};

// Use before your routes
app.use(cors(corsOptions));

// API key guard — all /api/* routes require X-API-Key header
function requireApiKey(req, res, next) {
  if (req.headers["x-api-key"] !== apiSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
app.use("/api", requireApiKey);

// ✅ Appwrite client setup
const client = new sdk.Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY); // Server key — NEVER expose in frontend

const databases = new sdk.Databases(client);

// ✅ Shared database + collections
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collections = {
  // customers: process.env.APPWRITE_CUSTOMERS_ID,
  loans:        process.env.APPWRITE_LOANS_ID,
  fiche:        process.env.APPWRITE_FICHE_ID,
  gain:         process.env.APPWRITE_GAIN_ID,
  payments:     process.env.APPWRITE_PAYMENTS_ID,
  stock:        process.env.APPWRITE_STOCK_ID,
  gainTesting:  process.env.APPWRITE_GAINTESTING_ID,
  gainPompiste: process.env.APPWRITE_GAINPOMPISTE_ID,
  // sample: process.env.APPWRITE_SAMPLE_ID
};

// ✅ Route 1: Get attributes (fields) for one collection
app.get("/api/attributes/:collection", async (req, res) => {
  const { collection } = req.params;
  const collectionId = collections[collection];

  if (!collectionId) {
    return res.status(400).json({ error: `Invalid collection name: ${collection}` });
  }

  try {
    const response = await databases.listAttributes(databaseId, collectionId);
    res.json(response);
  } catch (err) {
    console.error(`Error fetching attributes for ${collection}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// GET documents from a collection
app.get("/api/documents/:collection", async (req, res) => {
  const { collection } = req.params;
  const collectionId = collections[collection];

  if (!collectionId) {
    return res.status(400).json({ error: `Collection '${collection}' not found` });
  }

  try {
    const documents = await fetchAllDocuments(collectionId);

    res.json({ documents });
    
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: error.message });
  }
});

// Universal write route
app.post("/api/create/:collection", async (req, res) => {
  try {
    const tableKey = req.params.collection;
    const data = req.body;

    const tableId = collections[tableKey];  

    const result = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      tableId,
      ID.unique(),
      data
    );

    res.json({ success: true, result });

  } catch (error) {
    console.error("Create error:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

app.patch("/api/update-by-field/:collection", async (req, res) => {
  try {
    const { collection } = req.params;
    const { searchField, searchValue } = req.body;
    let { updateData } = req.body;
    
    const collectionId = collections[collection];
    if (!collectionId) {
      return res.status(400).json({ error: `Collection '${collection}' not found` });
    }

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
    console.error("Update by field error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Atomic gain upsert — avoids race condition from client-side read-modify-write
app.post("/api/upsert-gain", async (req, res) => {
  try {
    const { email, employee, gainPayments, logDate, monthYear } = req.body;
    const gainPompisteId = collections.gainPompiste;

    if (!gainPompisteId) {
      return res.status(500).json({ error: "APPWRITE_GAINPOMPISTE_ID env var not set" });
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
    console.error("Upsert gain error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Health check
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// ✅ Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log("✅ Server running successfully!");
  console.log(`   Local:     http://localhost:${port}`);
  console.log(`   Frontend:  https://boaziza.github.io/myWebApp`);
});

async function fetchAllDocuments(collectionId) {
  const limit = 100;

  let all = [];
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
