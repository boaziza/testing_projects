const express = require('express');
const router = express.Router();
const {db, ID, Query} = require('../appwrite');
const { verifyJWT, requireRole } = require('../middleware/auth');

const COLLECTION_SITUATION_ID = process.env.APPWRITE_SITUATION_ID;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

/**
 * POST /situation
 * Creates a new situation.
 */

router.post('/', verifyJWT, requireRole(['owner','manager']), async (req, res) => {
  try {
    const body = req.body;

    if (!body){
        return res.status(400).json({ error: "Situation body is required." });
    }

    const newSituation = await db.createDocument(
      DATABASE_ID,
      COLLECTION_SITUATION_ID,
      ID.unique(),
      body
    );

    res.json({ message: "Situation created successfully", situation: newSituation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * GET /situation
 * Returns the situation details for the logged-in user.
 */
router.get('/me', verifyJWT, requireRole(['owner','manager']), async (req, res) => {
  try {
    const logDate = req.query.logDate;
    if (!logDate) {
      return res.status(404).json({ error: "No log date provided." });
    }

    const situation = await db.listDocuments(
        DATABASE_ID,
        COLLECTION_SITUATION_ID,
        [
            Query.equal('logDate', logDate) // The search filter
        ]
    );
    res.json({ situation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /situation
 * Returns the situation details for the logged-in user.
 */
router.get('/', verifyJWT, requireRole(['owner','manager']), async (req, res) => {
  try {
    const { year, month, from, to, station, limit = 31, offset = 0 } = req.query;

    const queries = [Query.orderDesc("logDate"), Query.limit(Number(limit)), Query.offset(Number(offset))];

    if (year && month) {
      const mm = String(month).padStart(2, "0");
      queries.push(Query.greaterThanEqual("logDate", `${year}-${mm}-01`));
      queries.push(Query.lessThanEqual("logDate", `${year}-${mm}-31`));
    } else if (from && to) {
      queries.push(Query.greaterThanEqual("logDate", from));
      queries.push(Query.lessThanEqual("logDate", to));
    }

    if (station) {
      queries.push(Query.equal("stationId", station));  // Assuming stationId field exists
    }

    const { documents, total } = await db.listDocuments(DATABASE_ID, COLLECTION_SITUATION_ID, queries);
    res.json({ situations: documents, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /situation
 * Updates situation information (e.g., name).
 */
router.patch('/', verifyJWT, requireRole(['owner','manager']), async (req, res) => {
  try {
    const { $Id, ...body } = req.body;

    if (!body) {
      return res.status(400).json({ error: "Situation body is required." });
    }

    const updatededSituation = await db.updateDocument(
      DATABASE_ID,
      COLLECTION_SITUATION_ID,
      $Id,
      body
    );

    res.json({ message: "Situation updated successfully", situation: updatededSituation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /situation
 * Deletes situation information (e.g., name).
 */
router.delete('/:id',verifyJWT,requireRole(['owner','manager']), async (req, res) => {
    try {
    const { id } = req.params;

        if (!id){
            return res.status(400).json({ error: "Situation ID is required." });
        }

        const deletedSituation = await db.deleteDocument(
            DATABASE_ID,
            COLLECTION_SITUATION_ID,
            id
        );

        return res.json({message : "Situation deleted successfully", situation: deletedSituation});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;
