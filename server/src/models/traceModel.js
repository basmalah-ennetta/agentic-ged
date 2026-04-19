const mongoose = require('mongoose');

const traceStepSchema = new mongoose.Schema({
  agent:      { type: String, required: true },
  action:     { type: String, required: true },
  tool:       { type: String, default: null },
  data:       { type: mongoose.Schema.Types.Mixed, default: null },
  durationMs: { type: Number, default: null },
  success:    { type: Boolean, default: true },
  error:      { type: String, default: null },
  timestamp:  { type: Date, default: Date.now },
}, { _id: false });

const traceSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  fileName: { type: String, required: true },
  outcome: {
    type: String,
    enum: ['running', 'completed', 'failed'],
    default: 'running',
  },
  totalDurationMs: { type: Number, default: null },
  steps: [traceStepSchema],
  stats: {
    totalSteps: { type: Number, default: 0 },
    toolCalls:  { type: Number, default: 0 },
    warnings:   { type: Number, default: 0 },
    errors:     { type: Number, default: 0 },
  },
}, { timestamps: true });

const Trace = mongoose.model('Trace', traceSchema);
module.exports = Trace;