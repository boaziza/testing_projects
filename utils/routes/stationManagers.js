const express = require('express');
const router = express.Router();
const {db, ID, Query} = require('../appwrite');
const { verifyJWT, requireRole } = require('../middleware/auth');

const COLLECTION_STATION_MANAGERS = process.env.APPWRITE_STATION_MANAGERS;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

/**
 * POST /station manager
 * Creates a new station manager.
 */
router.post('/', verifyJWT, requireRole(['owner']), async (req, res) => {
  try {
    const body = req.body;

    if (!body){
        return res.status(400).json({ error: "Station manager body is required." });
    }

    const newStationManager = await db.createDocument(
        DATABASE_ID,
        COLLECTION_STATION_MANAGERS,
        ID.unique(),
        body
    );

    res.json({ message: "Station manager created successfully", stationManager: newStationManager });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * GET /station manager
 * Returns the station manager details for the logged-in owner.
 */
router.get('/', verifyJWT, requireRole(['owner']), async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(404).json({ error: "No station manager associated with this account." });
    }

    const stationManager = await db.listDocuments(
        DATABASE_ID, 
        COLLECTION_STATION_MANAGERS, 
        [
            Query.equal('userId', userId) // The search filter
        ]
    );

    res.json({ stationManager });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * PATCH /station manager
 * Updates station manager information (e.g., name).
 */
router.patch('/', verifyJWT, requireRole(['owner']), async (req, res) => {
  try {
    const { $Id, ...body } = req.body;

    if (!body) {
      return res.status(400).json({ error: "Station manager body is required." });
    }

    const updatedStationManager = await db.updateDocument(
      DATABASE_ID,
      COLLECTION_STATION_MANAGERS,
      $Id,
      body
    );

    res.json({ message: "Station manager updated successfully", stationManager: updatedStationManager });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * DELETE /station manager
 * Deletes a station manager.
 */
router.delete('/:id', verifyJWT, requireRole(['owner']), async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Station manager ID is required." });
    }

    const deletedStationManager = await db.deleteDocument(
      DATABASE_ID,
      COLLECTION_STATION_MANAGERS,
      id
    );

    res.json({ message: "Station manager deleted successfully", stationManager: deletedStationManager });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
