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

    // Если есть изображение - используем Gemini для анализа + Pollinations
    if (imageData) {
      console.log('🎨 Режим img2img через Gemini + Pollinations');
      
      // 1. Gemini анализирует изображение и создаёт детальный промпт
      const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const geminiRequest = {
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: "image/jpeg", 
                data: imageData
              }
            },
            {
              text: `Analyze this image and create a detailed prompt for image generation that combines: "${prompt}" with the visual elements from the image. Return ONLY the prompt, no additional text.`
            }
          ]
        }]
      };

      const geminiResponse = await axios.post(GEMINI_URL, geminiRequest, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      const enhancedPrompt = geminiResponse.data.candidates[0].content.parts[0].text;
      console.log('💡 Улучшенный промпт от Gemini:', enhancedPrompt);

      // 2. Pollinations генерирует изображение по улучшенному промпту
      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=nanobanano`;
      
      const imageResponse = await axios.get(pollinationsUrl, {
        responseType: 'arraybuffer',
        timeout: 60000
      });

      res.set({
        'Content-Type': 'image/png',
        'Content-Length': imageResponse.data.length
      });
      return res.send(imageResponse.data);

    } else {
      // Обычная генерация через Pollinations
      console.log('🆕 Обычная генерация через Pollinations');
      const encodedPrompt = encodeURIComponent(prompt);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=nanobanano`;
      
      const imageResponse = await axios.get(pollinationsUrl, {
        responseType: 'arraybuffer', 
        timeout: 60000
      });

      res.set({
        'Content-Type': 'image/png',
        'Content-Length': imageResponse.data.length
      });
      return res.send(imageResponse.data);
    }

  } catch (error) {
    console.error('💥 Ошибка:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Ошибка генерации',
      details: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Gemini + Pollinations Proxy' });
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
});
