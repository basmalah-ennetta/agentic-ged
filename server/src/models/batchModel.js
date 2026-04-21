const mongoose = require('mongoose');

const batchItemSchema = new mongoose.Schema({
  // Original filename
  fileName: { type: String, required: true },

  // MongoDB _id of the created Document record (null if creation failed)
  documentId: { type: mongoose.Schema.Types.ObjectId, default: null },

  // Final status of this item
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },

  // Error message if this item failed
  error: { type: String, default: null },

  // Processing duration for this item in ms
  durationMs: { type: Number, default: null },

}, { _id: false });

const batchSchema = new mongoose.Schema({
  // Human-readable batch name (e.g. "upload-2026-04-20")
  name: { type: String, default: '' },

  // Overall batch status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'completed_with_errors', 'failed'],
    default: 'pending',
  },

  // Summary counts
  stats: {
    total:     { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    failed:    { type: Number, default: 0 },
    pending:   { type: Number, default: 0 },
  },

  // One entry per document in the batch
  items: [batchItemSchema],

  // Total batch duration in ms
  totalDurationMs: { type: Number, default: null },

}, { timestamps: true });

const Batch = mongoose.model('Batch', batchSchema);
module.exports = Batch;