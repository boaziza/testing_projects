const express = require('express');
const router = express.Router();
const {db, ID, Query} = require('../appwrite');
const { verifyJWT, requireRole } = require('../middleware/auth');

const COLLECTION_DAILY_REPORTS_ID = process.env.APPWRITE_DAILY_REPORTS_ID;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

/**
 * POST /daily-report
 * Creates a new daily report.
 */

router.post('/', verifyJWT, requireRole(['owner','manager','pompiste']), async (req, res) => {
  try {
    const body = req.body;

    if (!body){
        return res.status(400).json({ error: "Daily report body is required." });
    }

    const newDailyReport = await db.createDocument(
      DATABASE_ID,
      COLLECTION_DAILY_REPORTS_ID,
      ID.unique(),
      body
    );

    res.json({ message: "Daily report created successfully", dailyReport: newDailyReport });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * GET /daily-report/me
 * Returns the daily report details for the logged-in user.
 */
router.get('/me', verifyJWT, requireRole(['owner','manager','pompiste']), async (req, res) => {
  try {
    const email = req.query.email;
    const logDate = req.query.logDate;
    

    if (!email && !logDate) {
      return res.status(404).json({ error: "No email and log date provided." });
    }

    const dailyReport = await db.listDocuments(
      DATABASE_ID,
      COLLECTION_DAILY_REPORTS_ID,
      [
        Query.equal('email', email),
        Query.equal('logDate', logDate)// The search filter
      ]
    );
    res.json({ dailyReport });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /daily-report
 * Returns the daily report details for the logged-in user.
 */
router.get('/', verifyJWT, requireRole(['owner','manager','pompiste']), async (req, res) => {
  try {
    const { search, limit = 25, offset = 0 } = req.query;

    const queries = [Query.limit(Number(limit)), Query.offset(Number(offset))];
    if (search) queries.push(Query.search('name', search));

    const { documents, total } = await db.listDocuments(DATABASE_ID, COLLECTION_DAILY_REPORTS_ID, queries);
    res.json({ dailyReports: documents, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /daily-report
 * Updates daily report information (e.g., name).
 */
router.patch('/', verifyJWT, requireRole(['owner','manager']), async (req, res) => {
  try {
    const { $Id, ...body } = req.body;

    if (!body) {
      return res.status(400).json({ error: "Daily report body is required." });
    }

    const updatedDailyReport = await db.updateDocument(
      DATABASE_ID,
      COLLECTION_DAILY_REPORTS_ID,
      $Id,
      body
    );

    res.json({ message: "Daily report updated successfully", dailyReport: updatedDailyReport });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /daily-report
 * Deletes daily report information (e.g., name).
 */
router.delete('/:id',verifyJWT,requireRole(['owner','manager']), async (req, res) => {
    try {
    const { id } = req.params;

        if (!id){
            return res.status(400).json({ error: "Daily report ID is required." });
        }

        const deletedDailyReport = await db.deleteDocument(
            DATABASE_ID,
            COLLECTION_DAILY_REPORTS_ID,
            id
        );

        return res.json({message : "Daily report deleted successfully", dailyReport: deletedDailyReport});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;
