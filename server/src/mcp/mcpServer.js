// mcpServer.js
// The MCP server — hosts all tools and exposes them
// via the Model Context Protocol.
//
// In Phase 1 this server starts alongside Express but nothing
// calls it yet. It proves the foundation works.
//
// In Phase 2 the LangChain orchestrator will connect to this
// server as a client instead of importing tools directly.
//
// Transport: we use SSE (Server-Sent Events) over HTTP so the
// MCP server runs on its own port and any HTTP client can connect.
// This is the simplest transport for a Node.js web server.

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const {
  SSEServerTransport,
} = require('@modelcontextprotocol/sdk/server/sse.js');

const { ocrMcpTool } = require('./registry/ocrMcpTool');
const { classifyMcpTool } = require('./registry/classifyMcpTool');
const { extractMcpTool } = require('./registry/extractMcpTool');
const { summarizeMcpTool } = require('./registry/summarizeMcpTool');
const { storageMcpTool } = require('./registry/storageMcpTool');
const { traceMcpTool }     = require('./registry/traceMcpTool');
const { batchMcpTool } = require('./registry/batchMcpTool');

// Collect all tools in one place
// Adding a new tool = add one line here
const MCP_TOOLS = [
  ocrMcpTool,
  classifyMcpTool,
  extractMcpTool,
  summarizeMcpTool,
  storageMcpTool,
  traceMcpTool,
  batchMcpTool,
];

// Create the MCP server instance
// name and version identify this server to any connecting client
const mcpServer = new McpServer({
  name: 'ged-pipeline-server',
  version: '1.0.0',
});

/**
 * registerTools()
 * Registers all tools with the MCP server.
 * Each tool gets a name, description, schema, and handler.
 */
function registerTools() {
  MCP_TOOLS.forEach(({ name, description, schema, handler }) => {
    mcpServer.tool(name, description, schema, async (params) => {
      try {
        const result = await handler(params);

        // MCP requires responses in { content: [{ type, text }] } format
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        // MCP error format — clients receive this as a structured error
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: error.message }),
            },
          ],
          isError: true,
        };
      }
    });
  });

  console.log(`[MCP Server] ${MCP_TOOLS.length} tools registered:`);
  MCP_TOOLS.forEach((t) => console.log(`  - ${t.name}: ${t.description.substring(0, 50)}...`));
}

/**
 * attachToExpress(app)
 * Mounts the MCP server onto the existing Express app.
 * Uses two routes:
 *   GET  /mcp/sse      — client connects here to establish SSE stream
 *   POST /mcp/messages — client sends tool calls here
 *
 * This runs on the SAME port as Express (5000).
 * No new port needed.
 */
function attachToExpress(app) {
  // Store active SSE transports by session ID
  const transports = {};

  // Client connects to establish the SSE stream
  app.get('/mcp/sse', async (req, res) => {
    console.log('[MCP Server] New client connected via SSE');

    // Disable ALL timeouts on this connection
    req.socket.setTimeout(0);
    req.socket.setKeepAlive(true, 1000);
    res.setTimeout(0);

    res.setHeader('Connection',               'keep-alive');
    res.setHeader('Cache-Control',            'no-cache');
    res.setHeader('X-Accel-Buffering',        'no');
    res.setHeader('Content-Type',             'text/event-stream');

    const transport = new SSEServerTransport('/mcp/messages', res);
    transports[transport.sessionId] = transport;

    // Clean up when client disconnects
    res.on('close', () => {
      console.log(`[MCP Server] Client disconnected: ${transport.sessionId}`);
      delete transports[transport.sessionId];
    });

    await mcpServer.connect(transport);
  });

  // Client sends tool call requests here
  app.post('/mcp/messages', async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = transports[sessionId];

    if (!transport) {
      return res.status(400).json({
        error: `No active MCP session: ${sessionId}`,
      });
    }

    await transport.handlePostMessage(req, res, req.body);
  });

  console.log('[MCP Server] Mounted on Express:');
  console.log('  GET  /mcp/sse      — SSE connection endpoint');
  console.log('  POST /mcp/messages — tool call endpoint');
}

/**
 * initMcpServer(app)
 * Main entry point — call this from index.js after Express is ready.
 */
function initMcpServer(app) {
  registerTools();
  attachToExpress(app);
  console.log('[MCP Server] Ready (Phase 1 — tools registered, SSE transport active)\n');
}

module.exports = { initMcpServer };