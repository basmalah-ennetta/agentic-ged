// universalChain.js
// One chain handles all document types.
// Document-type-specific behavior comes from the config,
// not from separate chain files.
//
// This replaces employmentChain.js, ndaChain.js, and genericChain.js.

const { RunnableSequence } = require('@langchain/core/runnables');
const { getDocumentType, getLabel } = require('../../config/documentTypes');

/**
 * createUniversalChain(tools)
 * Creates a chain that handles any document type.
 * The document type is read from state at runtime —
 * not hardcoded at chain creation time.
 */
function createUniversalChain(tools) {
  const { extract, summarize, storage } = tools;

  async function stepExtract(state) {
    const typeConfig = getDocumentType(state.documentType);
    console.log(`[UniversalChain] Extracting fields for: ${state.documentType}`);
    console.log(`[UniversalChain] Hint: ${typeConfig.extractionHint.substring(0, 60)}...`);

    await storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'extracting' }),
    });

    const raw = await extract.invoke({
      text: state.extractedText,
      contractId: state.contractId,
      documentType: state.documentType,
    });

    const result = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // extractedFields is a flat key-value object — no hardcoded field names
    const extractedFields = result.extracted_info || result;

    // Remove nested objects if any — Map only stores strings
    const flatFields = {};
    Object.entries(extractedFields).forEach(([key, value]) => {
      if (typeof value === 'string') {
        flatFields[key] = value;
      }
    });

    console.log(`[UniversalChain] Extracted ${Object.keys(flatFields).length} fields`);

    await storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({
        status: 'extracted',
        extractedFields: flatFields,
        documentTypeLabel: getLabel(state.documentType),
        // Keep legacy extractedInfo for backward compatibility
        // with existing frontend code
        extractedInfo: {
          employeeName:  flatFields.employeeName  || '',
          companyName:   flatFields.companyName   || '',
          jobTitle:      flatFields.jobTitle       || '',
          salary:        flatFields.salary         || '',
          startDate:     flatFields.startDate      || '',
          endDate:       flatFields.endDate        || '',
        },
      }),
    });

    return { ...state, extractedFields: flatFields };
  }

  async function stepSummarize(state) {
    const typeConfig = getDocumentType(state.documentType);
    console.log(`[UniversalChain] Summarizing: ${state.documentType}`);

    await storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'summarizing' }),
    });

    const raw = await summarize.invoke({
      text: state.extractedText,
      contractId: state.contractId,
      documentType: state.documentType,
      extractedInfo: JSON.stringify(state.extractedFields || {}),
    });

    const result = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const summary = result.summary || result;

    await storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ summary }),
    });

    console.log(`[UniversalChain] Summary complete (${summary.length} chars)`);

    return { ...state, summary };
  }

  return RunnableSequence.from([stepExtract, stepSummarize]);
}

module.exports = { createUniversalChain };