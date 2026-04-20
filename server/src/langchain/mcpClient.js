const { MultiServerMCPClient } = require('@langchain/mcp-adapters');

let mcpClient = null;
let mcpTools  = null;
let lastFetchTime = null;

const CACHE_TTL_MS = process.env.NODE_ENV === 'production'
  ? 5 * 60 * 1000
  : 30 * 1000;

function getMcpClient() {
  if (!mcpClient) {
    mcpClient = new MultiServerMCPClient({
      mcpServers: {
        'ged-pipeline': {
          transport: 'sse',
          url: `http://localhost:${process.env.PORT || 5000}/mcp/sse`,
          // Set timeout at every possible level
          timeout:            600000,
          sseOptions: {
            timeout:          600000,
            reconnectInterval: 3000,
          },
          requestTimeout:     600000,
        },
      },
      // Global timeout for all servers
      timeout: 600000,
    });
  }
  return mcpClient;
}

async function getMcpTools() {
  const now = Date.now();
  const expired = !lastFetchTime || (now - lastFetchTime) > CACHE_TTL_MS;

  if (mcpTools && !expired) return mcpTools;

  console.log('[MCP Client] Connecting to MCP server...');
  const client = getMcpClient();
  mcpTools     = await client.getTools();
  lastFetchTime = now;

  console.log(`[MCP Client] Connected. ${mcpTools.length} tools available:`);
  mcpTools.forEach(t => console.log(`  - ${t.name}`));

  return mcpTools;
}

function getToolByName(name, tools) {
  const tool = tools.find(t => t.name === name);
  if (!tool) {
    throw new Error(
      `MCP tool "${name}" not found. Available: ${tools.map(t => t.name).join(', ')}`
    );
  }
  return tool;
}

function resetMcpClient() {
  mcpClient     = null;
  mcpTools      = null;
  lastFetchTime = null;
  console.log('[MCP Client] Reset');
}

module.exports = { getMcpTools, getToolByName, resetMcpClient };