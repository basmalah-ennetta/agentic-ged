// mcpClient.js
// Wraps the LangChain MCP client.
// Connects to our MCP server and returns tools as LangChain-compatible
// objects — the same interface as ocrTool.js, classifyTool.js, etc.
//
// The key benefit: the orchestrator no longer needs to know WHERE
// tools come from. It just receives a list of tools and calls them.
// Whether they come from direct imports or MCP doesn't matter.

const { MultiServerMCPClient } = require('@langchain/mcp-adapters');

// We keep a single client instance — no need to reconnect on every request
let mcpClient = null;
let mcpTools = null;

/**
 * getMcpClient()
 * Returns the singleton MCP client, creating it if needed.
 */
function getMcpClient() {
  if (!mcpClient) {
    mcpClient = new MultiServerMCPClient({
      // Define which MCP servers to connect to
      // In Phase 4+ we can add more servers here (e.g. external agents)
      mcpServers: {
        'ged-pipeline': {
          // SSE transport — connects to our Express-mounted MCP server
          transport: 'sse',
          url: `http://localhost:${process.env.PORT || 5000}/mcp/sse`,
        },
      },
    });
  }
  return mcpClient;
}

/**
 * getMcpTools()
 * Connects to the MCP server and returns all available tools
 * as LangChain-compatible tool objects.
 *
 * Tools are cached after the first fetch — the MCP server tool
 * list does not change at runtime so we only need to fetch once.
 *
 * @returns {Array} Array of LangChain tool objects
 */
async function getMcpTools() {
  if (mcpTools) {
    return mcpTools;
  }

  console.log('[MCP Client] Connecting to MCP server...');

  const client = getMcpClient();

  // getTools() fetches the tool list from the MCP server
  // and converts each tool into a LangChain-compatible object
  mcpTools = await client.getTools();

  console.log(`[MCP Client] Connected. ${mcpTools.length} tools available:`);
  mcpTools.forEach((t) => console.log(`  - ${t.name}`));

  return mcpTools;
}

/**
 * getToolByName(name, tools)
 * Helper — finds a specific tool by name from the tools array.
 * Throws a clear error if the tool is not found.
 *
 * @param {string} name   - Tool name e.g. 'ocr', 'classify'
 * @param {Array}  tools  - Array returned by getMcpTools()
 * @returns {object} LangChain tool object
 */
function getToolByName(name, tools) {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    throw new Error(
      `MCP tool "${name}" not found. ` +
      `Available: ${tools.map((t) => t.name).join(', ')}`
    );
  }
  return tool;
}

/**
 * resetMcpClient()
 * Clears the cached client and tools.
 * Useful for testing or if the MCP server restarts.
 */
function resetMcpClient() {
  mcpClient = null;
  mcpTools = null;
  console.log('[MCP Client] Cache cleared — will reconnect on next call');
}

module.exports = { getMcpTools, getToolByName, resetMcpClient };