const path     = require('path');
const mongoose = require('mongoose');
const Document = require('../models/documentModel');
const Batch    = require('../models/batchModel');
const Trace    = require('../models/traceModel');
const { runContractPipeline } = require('../langchain/orchestrator');

/**
 * processBatch
 * Accepts multiple files, processes each through the full pipeline.
 * One failure does not stop the others.
 */
const processBatch = async (req, res) => {
  // Multer with .array() populates req.files (not req.file)
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded. Attach at least one PDF or image.',
    });
  }

  const files      = req.files;
  const batchStart = Date.now();
  const batchName  = `batch-${new Date().toISOString().slice(0, 10)}-${files.length}files`;

  console.log(`\n[Batch] Starting batch: ${batchName}`);
  console.log(`[Batch] Files: ${files.map(f => f.originalname).join(', ')}`);

  // Create the batch record
  const batch = await Batch.create({
    name:   batchName,
    status: 'processing',
    stats:  {
      total:     files.length,
      completed: 0,
      failed:    0,
      pending:   files.length,
    },
    items: files.map(f => ({
      fileName:   f.originalname,
      documentId: null,
      status:     'pending',
      error:      null,
      durationMs: null,
    })),
  });

  const batchId = batch._id.toString();
  console.log(`[Batch] Created batch record: ${batchId}`);

  // Respond immediately — batch runs in background
  // Client polls GET /api/batch/:id for status
  res.status(202).json({
    success: true,
    message: `Batch started. ${files.length} documents queued.`,
    batchId,
    pollUrl: `/api/batch/${batchId}`,
  });

  // Process each file sequentially — prevents RAM overload from parallel Ollama calls
  // Each file is isolated: failure updates only that item, others continue
  let completed = 0;
  let failed    = 0;

  for (let i = 0; i < files.length; i++) {
    const file      = files[i];
    const itemStart = Date.now();

    console.log(`\n[Batch] Processing ${i + 1}/${files.length}: ${file.originalname}`);

    try {
      // Create document record
      const extension  = path.extname(file.originalname).toLowerCase();
      const fileType   = extension === '.pdf' ? 'pdf' : 'image';

      const newDocument = await Document.create({
        originalFileName: file.originalname,
        filePath:         file.path,
        fileType,
        status:           'uploaded',
      });

      const documentId = newDocument._id.toString();

      // Update batch item to processing
      const processingUpdate = { $set: {} };
      processingUpdate.$set[`items.${i}.status`]     = 'processing';
      processingUpdate.$set[`items.${i}.documentId`] = documentId;
      await Batch.findByIdAndUpdate(batchId, processingUpdate);

      // Run the full pipeline
      await runContractPipeline({
        contractId: documentId,
        filePath:   file.path,
        fileName:   file.originalname,
        mimeType:   file.mimetype,
      });

      const durationMs = Date.now() - itemStart;
      completed++;

      // Mark item completed
      const completedUpdate = { $set: {} };
      completedUpdate.$set[`items.${i}.status`]     = 'completed';
      completedUpdate.$set[`items.${i}.durationMs`] = durationMs;
      completedUpdate.$set['stats.completed']        = completed;
      completedUpdate.$set['stats.pending']          = files.length - completed - failed;
      await Batch.findByIdAndUpdate(batchId, completedUpdate);

      console.log(`[Batch] Completed ${file.originalname} in ${durationMs}ms`);

    } catch (error) {
      // This file failed — log it and continue with next file
      const durationMs = Date.now() - itemStart;
      failed++;

      console.error(`[Batch] Failed ${file.originalname}:`, error.message);

      const failedUpdate = { $set: {} };
      failedUpdate.$set[`items.${i}.status`]     = 'failed';
      failedUpdate.$set[`items.${i}.error`]       = error.message;
      failedUpdate.$set[`items.${i}.durationMs`] = durationMs;
      failedUpdate.$set['stats.failed']           = failed;
      failedUpdate.$set['stats.pending']          = files.length - completed - failed;
      await Batch.findByIdAndUpdate(batchId, failedUpdate);
    }
  }

  // Finalize the batch record
  const totalDurationMs = Date.now() - batchStart;
  const finalStatus     = failed === 0
    ? 'completed'
    : completed === 0 ? 'failed' : 'completed_with_errors';

  await Batch.findByIdAndUpdate(batchId, {
    $set: {
      status: finalStatus,
      totalDurationMs,
      'stats.completed': completed,
      'stats.failed':    failed,
      'stats.pending':   0,
    },
  });

  console.log(`\n[Batch] Finished: ${batchName}`);
  console.log(`[Batch] Results: ${completed} completed, ${failed} failed`);
  console.log(`[Batch] Duration: ${totalDurationMs}ms`);
};

/**
 * getBatch
 * Returns the current state of a batch including all item statuses.
 */
const getBatch = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid batch ID' });
    }

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    return res.status(200).json({ success: true, data: batch });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * getAllBatches
 * Returns all batches sorted newest first.
 */
const getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find({})
      .sort({ createdAt: -1 })
      .select('name status stats totalDurationMs createdAt');

    return res.status(200).json({
      success: true,
      count:   batches.length,
      data:    batches,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { processBatch, getBatch, getAllBatches };