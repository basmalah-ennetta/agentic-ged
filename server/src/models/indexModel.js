const mongoose = require('mongoose');

const indexSchema = new mongoose.Schema({
  // Link to the source document
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true,
  },

  // Original filename for display
  fileName: { type: String, required: true },

  // Document type from classification
  documentType: { type: String, default: '' },

  // Human-readable label
  documentTypeLabel: { type: String, default: '' },

  // Keywords extracted from the document text
  // Dynamic — not hardcoded, derived from content
  keywords: {
    type: [String],
    default: [],
    index: true,
  },

  // Named entities found in the document
  entities: {
    people:        { type: [String], default: [] },
    organizations: { type: [String], default: [] },
    dates:         { type: [String], default: [] },
    amounts:       { type: [String], default: [] },
    locations:     { type: [String], default: [] },
  },

  // Auto-generated tags for filtering
  tags: {
    type: [String],
    default: [],
    index: true,
  },

  // Full text stored for search (truncated to 2000 chars)
  textSnippet: { type: String, default: '' },

  // Processing metadata
  indexedAt:    { type: Date, default: Date.now },
  indexVersion: { type: Number, default: 1 },

}, { timestamps: true });

// Text index for full-text search across key fields
indexSchema.index({
  keywords:              'text',
  tags:                  'text',
  'entities.people':     'text',
  'entities.organizations': 'text',
  fileName:              'text',
});

const DocumentIndex = mongoose.model('DocumentIndex', indexSchema);
module.exports = DocumentIndex;