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

    // Пробуем разные модели Gemini
    const models = [
      'gemini-1.5-flash',
      'gemini-1.5-pro', 
      'gemini-1.0-pro'
    ];

    for (const model of models) {
      try {
        console.log(`🔧 Пробуем модель: ${model}`);
        
        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        
        const requestBody = {
          contents: [{
            parts: [{
              text: `Create an image of: ${prompt}. Return only the image, no text.`
            }]
          }],
          generationConfig: {
            temperature: 0.7
          }
        };

        // Если есть изображение - добавляем его
        if (imageData) {
          requestBody.contents[0].parts.unshift({
            inline_data: {
              mime_type: "image/jpeg",
              data: imageData
            }
          });
        }

        const response = await axios.post(GEMINI_URL, requestBody, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000
        });

        console.log(`✅ Модель ${model} ответила`);

        // Обрабатываем успешный ответ
        if (response.data.candidates?.[0]?.content?.parts?.[0]?.inline_data) {
          const imageData = response.data.candidates[0].content.parts[0].inline_data.data;
          const imageBuffer = Buffer.from(imageData, 'base64');
          
          res.set({
            'Content-Type': 'image/png',
            'Content-Length': imageBuffer.length
          });
          return res.send(imageBuffer);
        } else {
          console.log('❌ Нет данных изображения в ответе:', response.data);
          continue; // Пробуем следующую модель
        }

      } catch (modelError) {
        console.log(`❌ Модель ${model} не сработала:`, modelError.response?.data || modelError.message);
        continue; // Пробуем следующую модель
      }
    }

    // Если все модели не сработали
    res.status(500).json({ 
      error: 'Все модели Gemini недоступны',
      details: 'Попробуйте другой промпт' 
    });

  } catch (error) {
    console.error('💥 Критическая ошибка прокси:', error);
    res.status(500).json({ 
      error: 'Ошибка генерации',
      details: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Gemini Proxy',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
  console.log(`🔑 API Key: ${GEMINI_API_KEY ? '✅ Установлен' : '❌ Отсутствует'}`);
});
