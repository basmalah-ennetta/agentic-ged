// orchestrator.js
// Phase 4: Orchestrator is now a thin coordinator.
// All pipeline logic lives in the specialized agent classes.
// This file only resolves tools and delegates to AgentCoordinator.

const { getMcpTools, getToolByName } = require('./mcpClient');
const { AgentCoordinator }           = require('../agents/AgentCoordinator');
const { getSupportedTypes, getChainName } = require('./router');

// ── TOOL RESOLUTION ────────────────────────────────────────────────────────

async function resolveTools() {
  const tools = await getMcpTools();

  return {
    ocr:       getToolByName('ocr',       tools),
    classify:  getToolByName('classify',  tools),
    extract:   getToolByName('extract',   tools),
    summarize: getToolByName('summarize', tools),
    storage:   getToolByName('storage',   tools),
  };
}

// ── MAIN PIPELINE ──────────────────────────────────────────────────────────

async function runContractPipeline(initialState) {
  console.log('\n' + '='.repeat(56));
  console.log('[Coordinator] Pipeline starting');
  console.log(`[Coordinator] Contract : ${initialState.contractId}`);
  console.log(`[Coordinator] File     : ${initialState.fileName}`);
  console.log('='.repeat(56));

  // Resolve all tools from MCP server
  const tools = await resolveTools();

  // Create coordinator with all tools
  // It distributes tools to each agent internally
  const coordinator = new AgentCoordinator(tools);

  // Run the full agent pipeline
  const finalState = await coordinator.run(initialState);

  console.log('\n' + '='.repeat(56));
  console.log('[Coordinator] Pipeline COMPLETE');
  console.log(`[Coordinator] Type     : ${finalState.documentType}`);
  console.log(`[Coordinator] Validated: ${finalState.validationPassed ? 'yes' : 'warnings present'}`);
  if (finalState.validationWarnings?.length > 0) {
    finalState.validationWarnings.forEach((w) =>
      console.log(`[Coordinator] Warning  : ${w}`)
    );
  }
  console.log('='.repeat(56) + '\n');

  return finalState;
}

// ── STARTUP VERIFICATION ───────────────────────────────────────────────────

function verifyTools() {
  const supported = getSupportedTypes();
  console.log('\n[Coordinator] Agent pipeline:');
  console.log('  OcrAgent         → reads file, extracts text');
  console.log('  StructuringAgent → classifies + extracts fields');
  console.log('  SummaryAgent     → generates human summary');
  console.log('  ValidationAgent  → checks result completeness');
  console.log('\n[Coordinator] Supported document types:');
  supported.forEach((type) => {
    console.log(`  - ${type} → ${getChainName(type)}`);
  });
  console.log('[Coordinator] Ready — MCP multi-agent pipeline active\n');
}

module.exports = { runContractPipeline, verifyTools };