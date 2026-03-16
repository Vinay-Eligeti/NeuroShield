const express = require('express');
const cors = require('cors');
const { analyzeMessage } = require('./analyzer');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'NeuroShield Scam Detector API' });
});

// Main analysis endpoint
app.post('/api/analyze', (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Invalid request. Please provide a "message" field with text to analyze.'
      });
    }

    if (message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message cannot be empty.'
      });
    }

    if (message.length > 10000) {
      return res.status(400).json({
        error: 'Message is too long. Maximum 10,000 characters allowed.'
      });
    }

    const result = analyzeMessage(message);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'An internal error occurred during analysis.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🛡️  NeuroShield API running on http://localhost:${PORT}`);
});
