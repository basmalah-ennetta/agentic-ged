// orchestrator.js
// Phase 2: Full sequential pipeline chain using LangChain RunnableSequence.
//
// RunnableSequence works like a conveyor belt:
//   - Each step receives the full "state" object
//   - Each step adds its results to the state
//   - The next step receives the updated state
//
// No LLM is needed here — this is a deterministic pipeline.

const { RunnableSequence } = require('@langchain/core/runnables');
const { ocrTool } = require('../tools/ocrTool');
const { classifyTool } = require('../tools/classifyTool');
const { extractTool } = require('../tools/extractTool');
const { summarizeTool } = require('../tools/summarizeTool');
const { mongoUpdateTool } = require('../tools/mongoTool');

// ── STEP FUNCTIONS ─────────────────────────────────────────────────────────
// Each step is a plain async function that:
//   1. Receives the current pipeline "state" object
//   2. Calls one tool
//   3. Returns the updated state with new data merged in
//
// State shape grows as it passes through each step:
// Initial:   { contractId, filePath, fileName, mimeType }
// After OCR: { ...above, extractedText, characterCount }
// After CLS: { ...above, documentType, confidence }
// After EXT: { ...above, extractedInfo }
// After SUM: { ...above, summary }

async function stepOCR(state) {
  console.log('[Chain] Step 1/4: Running OCR...');

  // Update MongoDB to show OCR is in progress
  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'ocr_processing' }),
  });

  // Call the OCR tool — it returns a JSON string
  const ocrResultStr = await ocrTool.invoke({
    filePath: state.filePath,
    fileName: state.fileName,
    mimeType: state.mimeType,
  });

  // Parse the JSON string result back into an object
  const ocrResult = JSON.parse(ocrResultStr);

  console.log(`[Chain] OCR complete. Characters extracted: ${ocrResult.character_count}`);

  // Persist the result to MongoDB
  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({
      status: 'ocr_done',
      extractedText: ocrResult.extracted_text,
    }),
  });

  // Return the state with OCR data added
  // The spread operator (...state) keeps all previous fields
  return {
    ...state,
    extractedText: ocrResult.extracted_text,
    characterCount: ocrResult.character_count,
  };
}

async function stepClassify(state) {
  console.log('[Chain] Step 2/4: Running classification...');

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'classifying' }),
  });

  const classifyResultStr = await classifyTool.invoke({
    text: state.extractedText,
    contractId: state.contractId,
  });

  const classifyResult = JSON.parse(classifyResultStr);

  console.log(`[Chain] Classification complete: ${classifyResult.document_type} (${classifyResult.confidence})`);

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({
      status: 'classified',
      documentType: classifyResult.document_type,
    }),
  });

  return {
    ...state,
    documentType: classifyResult.document_type,
    confidence: classifyResult.confidence,
  };
}

async function stepExtract(state) {
  console.log('[Chain] Step 3/4: Running extraction...');

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'extracting' }),
  });

  const extractResultStr = await extractTool.invoke({
    text: state.extractedText,
    contractId: state.contractId,
    documentType: state.documentType,
  });

  const extractResult = JSON.parse(extractResultStr);

  console.log('[Chain] Extraction complete:', extractResult.extracted_info);

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({
      status: 'extracted',
      extractedInfo: {
        employeeName: extractResult.extracted_info.employeeName || '',
        salary: extractResult.extracted_info.salary || '',
        startDate: extractResult.extracted_info.startDate || '',
        endDate: extractResult.extracted_info.endDate || '',
        jobTitle: extractResult.extracted_info.jobTitle || '',
        companyName: extractResult.extracted_info.companyName || '',
      },
    }),
  });

  return {
    ...state,
    extractedInfo: extractResult.extracted_info,
  };
}

async function stepSummarize(state) {
  console.log('[Chain] Step 4/4: Running summarization...');

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'summarizing' }),
  });

  const summarizeResultStr = await summarizeTool.invoke({
    text: state.extractedText,
    contractId: state.contractId,
    documentType: state.documentType,
    // summarizeTool expects extractedInfo as a JSON string
    extractedInfo: JSON.stringify(state.extractedInfo),
  });

  const summarizeResult = JSON.parse(summarizeResultStr);

  console.log(`[Chain] Summarization complete. (${summarizeResult.summary.length} chars)`);

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({
      status: 'completed',
      summary: summarizeResult.summary,
    }),
  });

  return {
    ...state,
    summary: summarizeResult.summary,
  };
}

// ── BUILD THE CHAIN ────────────────────────────────────────────────────────
// RunnableSequence.from() takes an array of functions and runs them in order.
// Each function MUST return the full updated state — that return value becomes
// the input to the next function.

const contractPipelineChain = RunnableSequence.from([
  stepOCR,
  stepClassify,
  stepExtract,
  stepSummarize,
]);

// ── PUBLIC API ─────────────────────────────────────────────────────────────

/**
 * runContractPipeline(initialState)
 *
 * Runs the full document processing pipeline using LangChain.
 *
 * @param {object} initialState - Must contain:
 *   - contractId {string}  MongoDB _id of the saved contract record
 *   - filePath   {string}  Absolute path to the uploaded file on disk
 *   - fileName   {string}  Original filename (e.g. "contract.pdf")
 *   - mimeType   {string}  MIME type (e.g. "application/pdf")
 *
 * @returns {object} Final state containing all pipeline results
 */
async function runContractPipeline(initialState) {
  console.log('\n' + '='.repeat(52));
  console.log('[LangChain] Starting contract pipeline');
  console.log(`[LangChain] Contract ID: ${initialState.contractId}`);
  console.log(`[LangChain] File: ${initialState.fileName}`);
  console.log('='.repeat(52));

  // .invoke() runs the full chain synchronously (awaits each step)
  const finalState = await contractPipelineChain.invoke(initialState);

  console.log('\n' + '='.repeat(52));
  console.log('[LangChain] Pipeline COMPLETE');
  console.log('='.repeat(52) + '\n');

  return finalState;
}

/**
 * verifyTools()
 * Logs all steps at server startup — carried over from Phase 1
 */
function verifyTools() {
  const steps = [
    'stepOCR        → calls OCR agent, saves extractedText',
    'stepClassify   → calls Classification agent, saves documentType',
    'stepExtract    → calls Extraction agent, saves extractedInfo',
    'stepSummarize  → calls Summarization agent, saves summary',
  ];
  console.log('\n[LangChain] Pipeline chain registered:');
  steps.forEach((s) => console.log(`  ${s}`));
  console.log('[LangChain] Orchestrator ready (Phase 2 — chain built)\n');
}

module.exports = { runContractPipeline, verifyTools };