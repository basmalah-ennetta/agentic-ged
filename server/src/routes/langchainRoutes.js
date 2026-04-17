// langchainRoutes.js
// Parallel test routes for the LangChain pipeline.
// These live at /api/lc/... so they never conflict with /api/contracts/...
//
// Original routes:     POST /api/contracts/upload   (Node.js orchestrator)
// New LangChain routes: POST /api/lc/upload         (LangChain orchestrator)
//
// Both routes exist simultaneously during Phase 2 and 3.
// In Phase 4 we will remove the old ones.

const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { lcUploadContract, lcGetStatus } = require('../controllers/langchainController');

// POST /api/lc/upload
// Upload a contract and process it with the LangChain pipeline
router.post('/upload', upload.single('contract'), lcUploadContract);

// GET /api/lc/status/:id
// Check the processing status of a contract
router.get('/status/:id', lcGetStatus);

module.exports = router;