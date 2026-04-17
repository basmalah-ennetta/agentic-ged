require('dotenv').config();
const { verifyTools } = require('./langchain/orchestrator');

// Import Libraries
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import routes
const contractRoutes = require('./routes/contractRoutes');

const app = express();

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// ── ROUTES ─────────────────────────────────────────────────────────────────
app.use('/api/contracts', contractRoutes);

// ── HEALTH CHECK ROUTE ─────────────────────────────────────────────────────
// check if the server is running
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HR Contract Pipeline server is running',
    timestamp: new Date().toISOString(),
  });
});

// If no route matched, return a 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// If an error occurs, log it and return a 500
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
    // MongoDB connected — now start the HTTP server
    console.log('Connected to MongoDB');

    // verify LangChain tools loaded correctly
    verifyTools();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });