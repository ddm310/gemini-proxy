const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post('/generate-image', async (req, res) => {
  try {
    const { prompt, imageData } = req.body;
    
    console.log('📨 Получен запрос:', { 
      prompt: prompt?.substring(0, 100),
      hasImage: !!imageData 
    });

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Используем Imagen модели для генерации изображений
    const IMAGEN_URL = `https://us-central1-aiplatform.googleapis.com/v1/projects/gen-lang-client-0336203728/locations/us-central1/publishers/google/models/imagen-4.0-fast-generate-001:predict`;

    const requestBody = {
      instances: [
        {
          prompt: prompt
        }
      ],
      parameters: {
        sampleCount: 1
      }
    };

    // Если есть изображение для img2img
    if (imageData) {
      requestBody.instances[0].image = {
        bytesBase64Encoded: imageData
      };
    }

    const response = await axios.post(IMAGEN_URL, requestBody, {
      headers: { 
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json' 
      },
      timeout: 60000
    });

    console.log('✅ Imagen ответила');

    // Обрабатываем ответ Imagen
    if (response.data.predictions && response.data.predictions[0]) {
      const imageBase64 = response.data.predictions[0].bytesBase64Encoded;
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length
      });
      return res.send(imageBuffer);
    } else {
      console.log('❌ Нет данных изображения в ответе:', response.data);
      return res.status(500).json({ error: 'No image generated' });
    }

  } catch (error) {
    console.error('💥 Ошибка Imagen:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Ошибка генерации',
      details: error.response?.data || error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Imagen Proxy',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Imagen proxy server running on port ${PORT}`);
});
