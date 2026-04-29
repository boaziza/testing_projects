/**
 * set-prefs.js — one-time script
 * Reads every document in the users collection and sets Appwrite account
 * prefs (role, companyId, stationId) so verifyJWT uses the fast path
 * and never needs the fallback DB lookup.
 *
 * If the userId stored in the document is stale/wrong, falls back to
 * looking up the account by email, then patches the document with the
 * correct userId so future lookups work.
 *
 * Usage: node set-prefs.js
 */

require('dotenv').config();
const { users, db, ID, Query } = require('./utils/appwrite');

const DB_ID    = process.env.APPWRITE_DATABASE_ID;
const USERS_ID = process.env.APPWRITE_USERS_ID;

async function resolveUserId(doc) {
  // Try the stored userId first
  if (doc.userId) {
    try {
      await users.get(doc.userId);
      return doc.userId; // still valid
    } catch {
      // stale — fall through to email lookup
    }
  }

  // Fall back: search by email
  if (!doc.email) return null;
  try {
    const result = await users.list([], doc.email);
    const match  = result.users.find(u => u.email === doc.email);
    if (!match) return null;

    // Patch the document so the correct userId is stored going forward
    await db.updateDocument(DB_ID, USERS_ID, doc.$id, { userId: match.$id });
    console.log(`    ↳ fixed stale userId for ${doc.email}: ${doc.userId} → ${match.$id}`);
    return match.$id;
  } catch {
    return null;
  }
}

async function run() {
  console.log('Fetching users collection...');

  let offset = 0;
  const pageSize = 100;
  let total = Infinity;
  let updated = 0, skipped = 0, failed = 0;

  while (offset < total) {
    const { documents, total: t } = await db.listDocuments(DB_ID, USERS_ID, [
      Query.limit(pageSize),
      Query.offset(offset),
    ]);
    total = t;

    for (const doc of documents) {
      const { role, companyId, stationId } = doc;

      const resolvedId = await resolveUserId(doc);
      if (!resolvedId) {
        console.warn(`  ⚠ ${doc.email || doc.$id} — no matching Appwrite account found, skipping`);
        skipped++;
        continue;
      }

      try {
        await users.updatePrefs(resolvedId, {
          role:      role      || 'pompiste',
          companyId: companyId || '',
          stationId: stationId || '',
        });
        console.log(`  ✓ ${doc.email} → role=${role}, companyId=${companyId}, stationId=${stationId}`);
        updated++;
      } catch (err) {
        console.error(`  ✗ ${doc.email}: ${err.message}`);
        failed++;
      }
    }

    offset += documents.length;
    if (documents.length === 0) break;
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
}

run().catch(err => { console.error(err); process.exit(1); });
