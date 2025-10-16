const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Image generation endpoint
app.post('/generate-image', async (req, res) => {
  try {
    const { prompt, imageData } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const requestBody = {
      contents: [
        {
          parts: [
            { text: `Generate an image showing: ${prompt}. Return only the image, no text.` }
          ]
        }
      ]
    };

    // If image provided for img2img, add it to request
    if (imageData) {
      requestBody.contents[0].parts.unshift({
        inline_data: {
          mime_type: "image/jpeg",
          data: imageData
        }
      });
    }

    const response = await axios.post(GEMINI_URL, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000
    });

    // Process Gemini response
    if (response.data.candidates && response.data.candidates[0].content.parts[0].inline_data) {
      const imageData = response.data.candidates[0].content.parts[0].inline_data.data;
      const imageBuffer = Buffer.from(imageData, 'base64');
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length
      });
      res.send(imageBuffer);
    } else {
      res.status(500).json({ error: 'No image generated' });
    }

  } catch (error) {
    console.error('Proxy error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Generation failed',
      details: error.response?.data || error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Gemini Proxy',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
});
