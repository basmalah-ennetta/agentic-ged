// orchestrator.js
// Phase 5: Dynamic agent orchestrator with document-type routing.
//
// Pipeline flow:
//   1. stepOCR       — always runs, extracts text
//   2. stepClassify  — always runs, identifies document type
//   3. router        — selects the right chain based on document type
//   4. selected chain — runs extraction + summarization for that type
//
// Adding a new document type:
//   1. Create a chain in langchain/chains/
//   2. Add it to router.js CHAIN_MAP
//   Done — orchestrator does not need to change.

const { ocrTool } = require('../tools/ocrTool');
const { classifyTool } = require('../tools/classifyTool');
const { mongoUpdateTool } = require('../tools/mongoTool');
const { routeToChain, getSupportedTypes } = require('./router');

// ── FIXED STEPS (always run regardless of document type) ───────────────────

async function stepOCR(state) {
  console.log('[Agent] Step 1/3: Running OCR...');

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'ocr_processing' }),
  });

  const resultStr = await ocrTool.invoke({
    filePath: state.filePath,
    fileName: state.fileName,
    mimeType: state.mimeType,
  });

  const result = JSON.parse(resultStr);

  console.log(`[Agent] OCR complete. Characters: ${result.character_count}`);

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({
      status: 'ocr_done',
      extractedText: result.extracted_text,
    }),
  });

  return {
    ...state,
    extractedText: result.extracted_text,
    characterCount: result.character_count,
  };
}

async function stepClassify(state) {
  console.log('[Agent] Step 2/3: Classifying document...');

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'classifying' }),
  });

  const resultStr = await classifyTool.invoke({
    text: state.extractedText,
    contractId: state.contractId,
  });

  const result = JSON.parse(resultStr);

  console.log(`[Agent] Classification: ${result.document_type} (${result.confidence})`);

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({
      status: 'classified',
      documentType: result.document_type,
    }),
  });

  return {
    ...state,
    documentType: result.document_type,
    confidence: result.confidence,
  };
}

// ── DYNAMIC STEP (document-type specific) ──────────────────────────────────

async function stepRouteAndProcess(state) {
  console.log(`[Agent] Step 3/3: Routing to chain for "${state.documentType}"...`);

  // Get the right chain for this document type
  const selectedChain = routeToChain(state.documentType);

  // Run that chain — it handles extraction + summarization
  const finalState = await selectedChain.invoke(state);

  return finalState;
}

// ── MAIN PIPELINE FUNCTION ─────────────────────────────────────────────────

/**
 * runContractPipeline(initialState)
 *
 * Runs the full document processing pipeline with dynamic routing.
 *
 * @param {object} initialState - Must contain:
 *   - contractId {string}
 *   - filePath   {string}
 *   - fileName   {string}
 *   - mimeType   {string}
 *
 * @returns {object} Final state with all results
 */
async function runContractPipeline(initialState) {
  console.log('\n' + '='.repeat(54));
  console.log('[LangChain Agent] Starting document pipeline');
  console.log(`[LangChain Agent] Contract: ${initialState.contractId}`);
  console.log(`[LangChain Agent] File:     ${initialState.fileName}`);
  console.log('='.repeat(54));

  // Step 1 — OCR (always)
  const stateAfterOCR = await stepOCR(initialState);

  // Step 2 — Classify (always)
  const stateAfterClassify = await stepClassify(stateAfterOCR);

  // Step 3 — Route and process (dynamic)
  const finalState = await stepRouteAndProcess(stateAfterClassify);

  console.log('\n' + '='.repeat(54));
  console.log('[LangChain Agent] Pipeline COMPLETE');
  console.log(`[LangChain Agent] Type:     ${finalState.documentType}`);
  console.log(`[LangChain Agent] Chain:    ${getChainName(finalState.documentType)}`);
  console.log('='.repeat(54) + '\n');

  return finalState;
}

// Helper — returns readable chain name for logging
function getChainName(documentType) {
  const map = {
    employment_contract: 'EmploymentChain',
    internship_agreement: 'EmploymentChain (reused)',
    freelance_agreement: 'EmploymentChain (reused)',
    nda: 'NDAChain',
    amendment: 'GenericChain',
    termination_letter: 'GenericChain',
    other: 'GenericChain',
  };
  return map[documentType] || 'GenericChain (fallback)';
}

// ── STARTUP VERIFICATION ───────────────────────────────────────────────────

function verifyTools() {
  const supported = getSupportedTypes();
  console.log('\n[LangChain Agent] Document routing registered:');
  supported.forEach((type) => {
    console.log(`  - ${type} → ${getChainName(type)}`);
  });
  console.log('[LangChain Agent] Ready (Phase 5 — dynamic routing active)\n');
}

module.exports = { runContractPipeline, verifyTools };