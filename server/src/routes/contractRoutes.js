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

const upload = require('../middleware/uploadMiddleware');

// POST /api/contracts/upload
// Receives the file, runs the full LangChain pipeline
router.post('/upload', upload.single('contract'), uploadContract);

// GET /api/contracts
// Returns all contracts sorted newest first
router.get('/', getAllContracts);

// GET /api/contracts/:id
// Returns one contract by MongoDB ID
router.get('/:id', getContractById);

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

module.exports = router;