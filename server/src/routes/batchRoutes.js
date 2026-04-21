const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const path       = require('path');
const { processBatch, getBatch, getAllBatches } = require('../controllers/batchController');

// Multer config for batch — accepts up to 20 files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const name = path.parse(file.originalname).name;
    const ext  = path.extname(file.originalname);
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif'];
  const ext     = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new Error(`Unsupported file type: ${ext}`), false);
};

const uploadBatch = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10MB per file
    files:    20,                  // max 20 files per batch
  },
});

// POST /api/batch/upload — submit multiple files
router.post('/upload', uploadBatch.array('documents', 20), processBatch);

// GET /api/batch — list all batches
router.get('/', getAllBatches);

// GET /api/batch/:id — get one batch status
router.get('/:id', getBatch);

module.exports = router;