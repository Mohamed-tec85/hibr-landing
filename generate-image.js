// ============================================================
// Generate Image - GPT Image 2 (with smart fallback)
// توليد الصور بأحدث نموذج من OpenAI
// ============================================================

exports.handler = async (event, context) => {
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

    const validSizes = ['1024x1024', '1024x1536', '1536x1024'];
    const imageSize = validSizes.includes(size) ? size : '1024x1024';
    const imageQuality = ['low', 'medium', 'high'].includes(quality) ? quality : 'low';

    // Function to call OpenAI with a specific model
    async function callOpenAI(modelName) {
      return await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          n: 1,
          size: imageSize,
          quality: imageQuality
        })
      });
    }

    // Try GPT Image 2 first (latest model - April 2026)
    let response = await callOpenAI('gpt-image-2');
    let usedModel = 'gpt-image-2';

    // If GPT Image 2 fails (e.g. model not yet available for this account), fall back to gpt-image-1
    if (!response.ok) {
      const errorBody = await response.text();
      console.log('GPT Image 2 failed, trying gpt-image-1...', errorBody.substring(0, 200));

      // Check if it's a model not found error
      if (response.status === 404 || errorBody.includes('model') || errorBody.includes('not found')) {
        response = await callOpenAI('gpt-image-1');
        usedModel = 'gpt-image-1';
      } else {
        // Other error - return it
        let errorData = {};
        try { errorData = JSON.parse(errorBody); } catch(e) {}

        let userMessage = 'فشل توليد الصورة';

        if (errorData.error?.code === 'billing_hard_limit_reached') {
          userMessage = 'تم استنفاد الرصيد - يرجى إضافة رصيد لحساب OpenAI';
        } else if (errorData.error?.code === 'invalid_api_key') {
          userMessage = 'مفتاح API غير صحيح';
        } else if (errorData.error?.code === 'content_policy_violation') {
          userMessage = 'الوصف يخالف سياسات OpenAI - جرّب وصفًا آخر';
        } else if (errorData.error?.code === 'rate_limit_exceeded') {
          userMessage = 'تم تجاوز الحد المسموح - انتظر دقيقة وحاول مرة أخرى';
        } else if (errorData.error?.message) {
          userMessage = errorData.error.message;
        }

        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ error: userMessage })
        };
      }
    }

    // Final check after fallback
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Both models failed:', errorBody);
      let errorData = {};
      try { errorData = JSON.parse(errorBody); } catch(e) {}

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: errorData.error?.message || 'فشل التوليد - حاول مرة أخرى بجودة أقل'
        })
      };
    }

    const data = await response.json();
    const imageData = data.data[0];

    // Image is returned as base64 by default for gpt-image models
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
        quality: imageQuality,
        model: usedModel  // For debugging
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
