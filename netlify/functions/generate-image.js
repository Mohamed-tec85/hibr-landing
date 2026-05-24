// ============================================================
// Generate Image - GPT Image 2
// توليد الصور بأحدث نموذج من OpenAI
// ============================================================

exports.handler = async (event, context) => {
  // Only POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { prompt, size, quality } = JSON.parse(event.body);

    if (!prompt || prompt.trim().length < 5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'يرجى إدخال وصف الصورة' })
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    // Validate size
    const validSizes = ['1024x1024', '1024x1536', '1536x1024'];
    const imageSize = validSizes.includes(size) ? size : '1024x1024';

    // Quality: low (cheapest) | medium | high
    const imageQuality = ['low', 'medium', 'high'].includes(quality) ? quality : 'low';

    // Call OpenAI Image Generation API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-image-1',  // Most affordable model currently available
        prompt: prompt,
        n: 1,
        size: imageSize,
        quality: imageQuality
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI error:', errorData);

      let userMessage = 'فشل توليد الصورة';

      if (errorData.error?.code === 'billing_hard_limit_reached') {
        userMessage = 'تم استنفاد الرصيد - يرجى التواصل مع الإدارة';
      } else if (errorData.error?.code === 'invalid_api_key') {
        userMessage = 'مفتاح API غير صحيح';
      } else if (errorData.error?.code === 'content_policy_violation') {
        userMessage = 'الوصف يخالف سياسات OpenAI - جرّب وصفًا آخر';
      } else if (errorData.error?.message) {
        userMessage = errorData.error.message;
      }

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: userMessage })
      };
    }

    const data = await response.json();
    const imageData = data.data[0];

    // Image is returned as base64 by default for gpt-image-1
    const imageUrl = imageData.url || (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : null);

    if (!imageUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'لم يتم استلام الصورة من OpenAI' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        imageUrl,
        revisedPrompt: imageData.revised_prompt,
        size: imageSize,
        quality: imageQuality
      })
    };

  } catch (err) {
    console.error('Image generation error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'حدث خطأ غير متوقع' })
    };
  }
};
