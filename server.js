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
      hasPrompt: !!prompt,
      hasImage: !!imageData 
    });

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Если есть изображение - ПРОСТО отправляем в Pollinations с улучшенным промптом
    if (imageData) {
      console.log('🎨 Режим редактирования изображения');
      
      // Создаем улучшенный промпт для редактирования
      const enhancedPrompt = `edit the image: ${prompt}. Maintain original composition and style but apply the requested changes`;
      
      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;
      
      console.log('🔗 Pollinations URL:', pollinationsUrl);
      
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
      console.log('🆕 Обычная генерация');
      const encodedPrompt = encodeURIComponent(prompt);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;
      
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
    console.error('💥 Ошибка:', error.message);
    res.status(500).json({ 
      error: 'Ошибка генерации',
      details: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Image Generator Proxy' });
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
});
