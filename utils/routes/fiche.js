const express = require('express');
const router = express.Router();
const {db, ID, Query} = require('../appwrite');
const { verifyJWT, requireRole } = require('../middleware/auth');

const COLLECTION_FICHE_ID = process.env.APPWRITE_FICHE_ID;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

/**
 * POST /fiche
 * Creates a new fiche.
 */

router.post('/', verifyJWT, requireRole(['owner','manager','pompiste']), async (req, res) => {
  try {
    const body = req.body;

    if (!body){
        return res.status(400).json({ error: "Fiche body is required." });
    }

    const newFiche = await db.createDocument(
      DATABASE_ID,
      COLLECTION_FICHE_ID,
      ID.unique(),
      body
    );

    res.json({ message: "Fiche created successfully", fiche: newFiche });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * GET /fiche
 * Returns the fiche details for the logged-in user.
 */
router.get('/me', verifyJWT, requireRole(['owner','manager']), async (req, res) => {
  try {
    const customerId = req.query.customerId;
    if (!customerId) {
      return res.status(404).json({ error: "No customer ID associated with this account." });
    }

    const fiche = await db.listDocuments(
        DATABASE_ID,
        COLLECTION_FICHE_ID,
        [
            Query.equal('customerId', customerId) // The search filter
        ]
    );
    res.json({ fiche });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /fiche
 * Returns the fiche details for the logged-in user.
 */
router.get('/', verifyJWT, requireRole(['owner','manager']), async (req, res) => {
  try {
    const { search, limit = 25, offset = 0 } = req.query;

    const queries = [Query.limit(Number(limit)), Query.offset(Number(offset))];
    if (search) queries.push(Query.search('name', search));

    const { documents, total } = await db.listDocuments(DATABASE_ID, COLLECTION_FICHE_ID, queries);
    res.json({ fiche: documents, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /fiche
 * Updates fiche information (e.g., name).
 */
router.patch('/', verifyJWT, requireRole(['owner','manager']), async (req, res) => {
  try {
    const { $Id, ...body } = req.body;

    if (!body) {
      return res.status(400).json({ error: "Fiche body is required." });
    }

    const updatedFiche = await db.updateDocument(
      DATABASE_ID,
      COLLECTION_FICHE_ID,
      $Id,
      body
    );

    res.json({ message: "Fiche updated successfully", fiche: updatedFiche });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /fiche
 * Deletes fiche information (e.g., name).
 */
router.delete('/:id',verifyJWT,requireRole(['owner','manager']), async (req, res) => {
    try {
    const { id } = req.params;

        if (!id){
            return res.status(400).json({ error: "Fiche ID is required." });
        }

        const deletedFiche = await db.deleteDocument(
            DATABASE_ID,
            COLLECTION_FICHE_ID,
            id
        );

        return res.json({message : "Fiche deleted successfully", fiche: deletedFiche});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;
