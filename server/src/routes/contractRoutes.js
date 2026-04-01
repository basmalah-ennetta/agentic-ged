const express = require('express');
const router = express.Router();

// Import controller functions
const {
  uploadContract,
  getAllContracts,
  getContractById,
  validateContract,
} = require('../controllers/contractController');

// Import multer upload middleware
const upload = require('../middleware/uploadMiddleware');

// ── DEFINE ROUTES ──────────────────────────────────────────────────────────
// - 'contract' is the field name the frontend must use when sending the file
router.post('/upload', upload.single('contract'), uploadContract);

// GET /api/contracts
// Returns all contracts
router.get('/', getAllContracts);

// GET /api/contracts/:id
// Returns one contract by ID (:id is a URL parameter)
router.get('/:id', getContractById);

// PUT /api/contracts/:id/validate
// HR person approves or rejects a contract
router.put('/:id/validate', validateContract);

module.exports = router;