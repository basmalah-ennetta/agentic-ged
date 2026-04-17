require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const { verifyTools } = require('./langchain/orchestrator');
const { initMcpServer } = require('./mcp/mcpServer');

const contractRoutes = require('./routes/contractRoutes');

const app = express();

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API ROUTES ─────────────────────────────────────────────────────────────
app.use('/api/contracts', contractRoutes);

// ── MCP ROUTES ─────────────────────────────────────────────────────────────
// Must be registered before the 404 handler
// initMcpServer registers GET /mcp/sse and POST /mcp/messages
initMcpServer(app);

// ── UTILITY ROUTES ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HR Contract Pipeline server is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/mcp/tools', async (req, res) => {
  try {
    const { getMcpTools } = require('./langchain/mcpClient');
    const tools = await getMcpTools();
    res.status(200).json({
      success: true,
      count: tools.length,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── 404 HANDLER — always last real handler ─────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// ── ERROR HANDLER ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ── CONNECT TO MONGODB & START SERVER ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    verifyTools();

    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`   Health  → http://localhost:${PORT}/health`);
      console.log(`   Tools   → http://localhost:${PORT}/mcp/tools`);
      console.log(`   MCP SSE → http://localhost:${PORT}/mcp/sse`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  });