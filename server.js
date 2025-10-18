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
    
    console.log('📨 Получен запрос на редактирование изображения');
    console.log('📝 Промпт:', prompt);
    console.log('🖼️ Изображение:', imageData ? 'Есть' : 'Нет');

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!imageData) {
      return res.status(400).json({ error: 'Image is required for editing' });
    }

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: "image/jpeg", 
              data: imageData
            }
          },
          {
            text: `Based on this image, create a new image that: ${prompt}. Return only the new generated image, no text description.`
          }
        ]
      }],
      generationConfig: {
        temperature: 0.7
      }
    };

    console.log('🚀 Отправляем запрос к Gemini...');
    
    const response = await axios.post(GEMINI_URL, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000
    });

    console.log('✅ Gemini ответил');

    // Обрабатываем ответ
    if (response.data.candidates && 
        response.data.candidates[0] && 
        response.data.candidates[0].content && 
        response.data.candidates[0].content.parts && 
        response.data.candidates[0].content.parts[0] && 
        response.data.candidates[0].content.parts[0].inline_data) {
      
      const newImageData = response.data.candidates[0].content.parts[0].inline_data.data;
      const imageBuffer = Buffer.from(newImageData, 'base64');
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length
      });
      
      console.log('🎉 Успешно сгенерировано новое изображение');
      return res.send(imageBuffer);
      
    } else {
      console.log('❌ Неверный формат ответа от Gemini:', JSON.stringify(response.data, null, 2));
      return res.status(500).json({ 
        error: 'Gemini не вернул изображение',
        details: response.data 
      });
    }

  } catch (error) {
    console.error('💥 Ошибка:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Ошибка генерации',
      details: error.response?.data || error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Gemini Image Editor',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Image Editor Proxy running on port ${PORT}`);
});
