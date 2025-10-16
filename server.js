const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes will go here
app.post('/generate-image', async (req, res) => {
  // Здесь будет логика для Gemini
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Gemini Proxy' });
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
});
