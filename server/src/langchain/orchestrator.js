// orchestrator.js
// Phase 2: Two modes — MCP client mode (new) and direct tool mode (fallback).
//
// USE_MCP_CLIENT=true  → tools come from MCP server (new path)
// USE_MCP_CLIENT=false → tools come from direct imports (old path)
//
// Both produce identical results. This lets us validate MCP tools
// work correctly before removing the direct imports in Phase 3.

const { getMcpTools, getToolByName } = require('./mcpClient');
const { routeToChain, getChainName, getSupportedTypes } = require('./router');

// Direct tool imports — kept as fallback during Phase 2
const { ocrTool } = require('../tools/ocrTool');
const { classifyTool } = require('../tools/classifyTool');
const { mongoUpdateTool } = require('../tools/mongoTool');

// ── TOOL RESOLUTION ────────────────────────────────────────────────────────
// Resolves the tools object from either MCP or direct imports.
// Returns a consistent { ocr, classify, extract, summarize, storage } shape
// regardless of which source is used.

async function resolveTools() {
  const useMcp = process.env.USE_MCP_CLIENT === 'true';

  if (useMcp) {
    console.log('[Orchestrator] Using MCP client tools');

    const tools = await getMcpTools();

    return {
      ocr: getToolByName('ocr', tools),
      classify: getToolByName('classify', tools),
      extract: getToolByName('extract', tools),
      summarize: getToolByName('summarize', tools),
      storage: getToolByName('storage', tools),
      source: 'mcp',
    };
  } else {
    console.log('[Orchestrator] Using direct LangChain tools (legacy)');

    // Direct imports — Phase 1 tools
    const { extractTool } = require('../tools/extractTool');
    const { summarizeTool } = require('../tools/summarizeTool');

    return {
      ocr: ocrTool,
      classify: classifyTool,
      extract: extractTool,
      summarize: summarizeTool,
      storage: mongoUpdateTool,
      source: 'direct',
    };
  }
}

// ── PIPELINE STEPS ─────────────────────────────────────────────────────────

async function stepOCR(state, tools) {
  console.log('[Agent] Step 1/3: Running OCR...');

  await tools.storage.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'ocr_processing' }),
  });

  const resultRaw = await tools.ocr.invoke({
    filePath: state.filePath,
    fileName: state.fileName,
    mimeType: state.mimeType,
  });

  // Handle both direct tool response and MCP string response
  const result = typeof resultRaw === 'string'
    ? JSON.parse(resultRaw)
    : resultRaw;

  console.log(`[Agent] OCR complete. Characters: ${result.character_count}`);

  await tools.storage.invoke({
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

async function stepClassify(state, tools) {
  console.log('[Agent] Step 2/3: Classifying document...');

  await tools.storage.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'classifying' }),
  });

  const resultRaw = await tools.classify.invoke({
    text: state.extractedText,
    contractId: state.contractId,
  });

  const result = typeof resultRaw === 'string'
    ? JSON.parse(resultRaw)
    : resultRaw;

  console.log(`[Agent] Classification: ${result.document_type} (${result.confidence})`);

  await tools.storage.invoke({
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

// ── MAIN PIPELINE ──────────────────────────────────────────────────────────

async function runContractPipeline(initialState) {
  console.log('\n' + '='.repeat(54));
  console.log('[LangChain Agent] Starting pipeline');
  console.log(`[LangChain Agent] Contract: ${initialState.contractId}`);
  console.log(`[LangChain Agent] File:     ${initialState.fileName}`);
  console.log('='.repeat(54));

  // Resolve tools from MCP or direct imports
  const tools = await resolveTools();
  console.log(`[LangChain Agent] Tool source: ${tools.source}`);

  // Step 1 — OCR
  const stateAfterOCR = await stepOCR(initialState, tools);

  // Step 2 — Classify
  const stateAfterClassify = await stepClassify(stateAfterOCR, tools);

  // Step 3 — Route and process using the right chain
  console.log('[Agent] Step 3/3: Routing to document chain...');
  const chain = routeToChain(stateAfterClassify.documentType, tools);
  const finalState = await chain.invoke(stateAfterClassify);

  console.log('\n' + '='.repeat(54));
  console.log('[LangChain Agent] Pipeline COMPLETE');
  console.log(`[LangChain Agent] Type:   ${finalState.documentType}`);
  console.log(`[LangChain Agent] Chain:  ${getChainName(finalState.documentType)}`);
  console.log(`[LangChain Agent] Source: ${tools.source}`);
  console.log('='.repeat(54) + '\n');

  return finalState;
}

function verifyTools() {
  const supported = getSupportedTypes();
  const useMcp = process.env.USE_MCP_CLIENT === 'true';

  console.log('\n[LangChain Agent] Document routing registered:');
  supported.forEach((type) => {
    console.log(`  - ${type} → ${getChainName(type)}`);
  });
  console.log(`[LangChain Agent] Tool mode: ${useMcp ? 'MCP client' : 'direct imports'}`);
  console.log('[LangChain Agent] Ready (Phase 2 — MCP client coexistence)\n');
}

module.exports = { runContractPipeline, verifyTools };