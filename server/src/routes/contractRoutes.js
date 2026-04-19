// All uploads go directly through LangChain via contractController.

const express = require('express');
const router = express.Router();

const {
  uploadContract,
  getAllContracts,
  getContractById,
  validateContract,
} = require('../controllers/contractController');

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

module.exports = router;