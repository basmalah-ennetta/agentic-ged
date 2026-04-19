// Generic document model — works for any document type.
//
// Key design decision: extractedFields is a flexible Map (key-value store)
// instead of hardcoded fields like employeeName, salary, etc.
//
// The old contractModel.js is kept temporarily for backward compatibility
// with any existing MongoDB records. New records use this model.

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    // ── FILE INFO ──────────────────────────────────────────────────────────
    originalFileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'image'],
      required: true,
    },

    // ── PIPELINE STATUS ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'uploaded',
        'ocr_processing',
        'ocr_done',
        'classifying',
        'classified',
        'extracting',
        'extracted',
        'summarizing',
        'completed',
        'failed',
      ],
      default: 'uploaded',
    },

    // ── DOCUMENT TYPE ──────────────────────────────────────────────────────
    documentType: {
      type: String,
      default: '',
    },

    documentTypeLabel: {
      type: String,
      default: '',
      // Human-readable label e.g. "Employment Contract"
      // Set by StructuringAgent using documentTypes config
    },

    // ── EXTRACTED CONTENT ──────────────────────────────────────────────────
    extractedText: {
      type: String,
      default: '',
    },

    // Generic key-value store for extracted fields.
    // Examples:
    //   employment: { employeeName: 'John', salary: '$3000' }
    //   invoice:    { invoiceNumber: 'INV-001', totalAmount: '$500' }
    //   nda:        { companyName: 'Acme', duration: '2 years' }
    extractedFields: {
      type: Map,
      of: String,
      default: {},
    },

    // ── AI OUTPUT ──────────────────────────────────────────────────────────
    summary: {
      type: String,
      default: '',
    },

    // ── VALIDATION ─────────────────────────────────────────────────────────
    validationPassed: {
      type: Boolean,
      default: null,
    },
    validationWarnings: {
      type: [String],
      default: [],
    },

    // ── HR REVIEW ──────────────────────────────────────────────────────────
    validationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    validationNotes: {
      type: String,
      default: '',
    },

    // ── ERROR HANDLING ─────────────────────────────────────────────────────
    errorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;