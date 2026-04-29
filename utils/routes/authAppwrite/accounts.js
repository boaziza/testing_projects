const express = require('express');
const router  = express.Router();
const { users, db, ID, Query } = require('../../appwrite');
const { verifyJWT, requireRole } = require('../../middleware/auth');

const DB_ID    = process.env.APPWRITE_DATABASE_ID;
const USERS_ID = process.env.APPWRITE_USERS_ID;

/**
 * POST /
 * Create a new Appwrite account + users-collection document.
 * Owner only. Body: { name, email, password, role, stationId }
 */
router.post('/', verifyJWT, requireRole(['owner']), async (req, res) => {
  try {
    const { name, email, password, role = 'pompiste', stationId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required.' });
    }

    const companyId = req.user.companyId;

    // 1. Create the Appwrite account
    const account = await users.create(ID.unique(), email, undefined, password, name);

    // 2. Set prefs so verifyJWT uses fast path
    await users.updatePrefs(account.$id, { role, companyId, stationId: stationId || '' });

    // 3. Create the users-collection document
    const doc = await db.createDocument(DB_ID, USERS_ID, ID.unique(), {
      userId:    account.$id,
      name,
      email,
      role,
      companyId,
      stationId: stationId || null,
      createdBy: req.user.$id,
    });

    res.json({ success: true, account: { $id: account.$id, name, email }, user: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /
 * List all Appwrite accounts (admin overview). Owner only.
 */
router.get('/', verifyJWT, requireRole(['owner']), async (req, res) => {
  try {
    const { limit = 100, offset = 0, search } = req.query;
    const queries = [Query.limit(Number(limit)), Query.offset(Number(offset))];
    const result  = await users.list(queries, search || undefined);
    res.json({ accounts: result.users, total: result.total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /:userId/name
 * Update the display name of an account.
 */
router.patch('/:userId/name', verifyJWT, requireRole(['owner']), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required.' });
    const updated = await users.updateName(req.params.userId, name.trim());
    res.json({ success: true, account: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /:userId/password
 * Reset another user's password. Owner only (admin SDK — no current pwd needed).
 */
router.patch('/:userId/password', verifyJWT, requireRole(['owner']), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    await users.updatePassword(req.params.userId, password);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /:userId/prefs
 * Update account prefs (role, companyId, stationId). Owner only.
 */
router.patch('/:userId/prefs', verifyJWT, requireRole(['owner']), async (req, res) => {
  try {
    const prefs = req.body;
    if (!prefs || Object.keys(prefs).length === 0) {
      return res.status(400).json({ error: 'Prefs body is required.' });
    }
    const updated = await users.updatePrefs(req.params.userId, prefs);
    res.json({ success: true, prefs: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /:userId
 * Delete an Appwrite account. Owner only.
 */
router.delete('/:userId', verifyJWT, requireRole(['owner']), async (req, res) => {
  try {
    await users.deleteIdentity(req.params.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
