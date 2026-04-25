// All uploads go directly through LangChain via contractController.

const express = require('express');
const router = express.Router();

const {
  uploadContract,
  getAllContracts,
  getContractById,
  validateContract,
} = require('../controllers/contractController');

const Trace = require('../models/traceModel');
const DocumentIndex = require('../models/indexModel');

const upload = require('../middleware/uploadMiddleware');

// POST /api/contracts/upload
// Receives the file, runs the full LangChain pipeline
router.post('/upload', upload.single('contract'), uploadContract);

// GET /api/contracts
// Returns all contracts sorted newest first
router.get('/', getAllContracts);

// PUT /api/contracts/:id/validate
// HR approves or rejects a contract
router.put('/:id/validate', validateContract);

// GET /api/contracts/:id/trace
router.get('/:id/trace', async (req, res) => {
  try {
    const trace = await Trace.findOne({ documentId: req.params.id });
    if (!trace) {
      return res.status(404).json({
        success: false,
        message: 'No trace found for this document',
      });
    }
    return res.status(200).json({ success: true, data: trace });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});


// GET /api/contracts/search?q=keyword
// Full-text search across all indexed documents
router.get('/search', async (req, res) => {
  try {
    const { q, type, tag } = req.query;

    if (!q && !type && !tag) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one search parameter: q, type, or tag',
      });
    }

    const query = {};

    // Full-text search on keywords, tags, entities, filename
    if (q) {
      query.$text = { $search: q };
    }

    // Filter by document type
    if (type) {
      query.documentType = type;
    }

    // Filter by tag
    if (tag) {
      query.tags = tag.toLowerCase();
    }

    const results = await DocumentIndex.find(query)
      .sort({ indexedAt: -1 })
      .limit(50)
      .select('documentId fileName documentType keywords tags entities indexedAt');

    return res.status(200).json({
      success: true,
      count:   results.length,
      query:   { q, type, tag },
      data:    results,
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/contracts/:id/index
// Returns the index record for a specific document
router.get('/:id/index', async (req, res) => {
  try {
    const indexRecord = await DocumentIndex.findOne({
      documentId: req.params.id
    });

    if (!indexRecord) {
      return res.status(404).json({
        success: false,
        message: 'No index found for this document — it may still be processing',
      });
    }

    return res.status(200).json({ success: true, data: indexRecord });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});


// GET /api/contracts/:id
// Returns one contract by MongoDB ID
router.get('/:id', getContractById);

module.exports = router;