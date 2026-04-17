// orchestrator.js
// This is the heart of the LangChain migration.
// Right now it only loads the tools and verifies they work.
// In Phase 2, we will build the actual pipeline chain here.

const { ocrTool } = require('../tools/ocrTool');
const { classifyTool } = require('../tools/classifyTool');
const { extractTool } = require('../tools/extractTool');
const { summarizeTool } = require('../tools/summarizeTool');
const { mongoUpdateTool } = require('../tools/mongoTool');

// Collect all tools in one place
// This makes it easy to see all capabilities at a glance
const allTools = [
  ocrTool,
  classifyTool,
  extractTool,
  summarizeTool,
  mongoUpdateTool,
];

/**
 * getLangChainTools()
 * Returns the list of all registered LangChain tools.
 * Will be used by the Chain in Phase 2.
 */
function getLangChainTools() {
  return allTools;
}

/**
 * verifyTools()
 * Logs all registered tools so we can confirm Phase 1 is working.
 * Call this once at server startup.
 */
function verifyTools() {
  console.log('\n[LangChain] Tools registered:');
  allTools.forEach((t) => {
    console.log(`  - ${t.name}: ${t.description.substring(0, 60)}...`);
  });
  console.log('[LangChain] Orchestrator ready (Phase 1 — tools loaded)\n');
}

module.exports = { getLangChainTools, verifyTools };