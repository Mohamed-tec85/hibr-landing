// ============================================================
// Generate Prompt - GPT-4o-mini
// تحويل وصف عربي إلى برومبت إنجليزي احترافي
// ============================================================

exports.handler = async (event, context) => {
  // Only POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { idea, style, lang } = JSON.parse(event.body);

    if (!idea || idea.trim().length < 3) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'يرجى إدخال وصف الفكرة (3 أحرف على الأقل)' })
      };
    }

    // Check API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    // Build system prompt based on style
    const styles = {
      cinematic: 'cinematic, dramatic lighting, film grain, professional cinematography, golden hour, depth of field, anamorphic lens',
      photorealistic: 'photorealistic, ultra detailed, 8K resolution, professional photography, natural lighting, sharp focus, high quality',
      anime: 'anime style, Studio Ghibli inspired, beautiful illustration, vibrant colors, detailed character design, Japanese animation',
      '3d': '3D render, Octane render, ray tracing, ultra realistic materials, cinematic lighting, hyper detailed, professional 3D',
      oil_painting: 'oil painting, Renaissance style, masterpiece, classical art, rich textures, baroque lighting, traditional fine art',
      product: 'product photography, studio lighting, white background, commercial advertising, professional, clean composition, high-end',
      arabic: 'Arabic calligraphy style, traditional Islamic art patterns, gold and emerald colors, intricate geometric patterns, luxury design',
      cartoon: 'cartoon style, Disney Pixar inspired, cute characters, expressive emotions, vibrant colors, family-friendly',
      cyberpunk: 'cyberpunk style, neon lights, futuristic city, dystopian atmosphere, electric blue and pink, blade runner aesthetic',
      minimalist: 'minimalist style, clean simple composition, white space, modern design, geometric shapes, scandinavian aesthetic'
    };

    const styleDesc = styles[style] || styles.photorealistic;

    const systemPrompt = `You are an expert AI image prompt engineer. Convert user descriptions into professional, detailed English prompts for AI image generators (DALL-E, Midjourney, GPT Image).

Rules:
1. Always respond in English (regardless of input language)
2. Be specific and detailed (composition, lighting, colors, mood)
3. Use professional photography/art terminology
4. Length: 30-60 words optimal
5. Style modifier: ${styleDesc}
6. End with quality boosters: "highly detailed, professional, masterpiece"
7. Don't include "create" or "generate" verbs
8. Don't include negative prompts

Just output the prompt directly, no explanations.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: idea }
        ],
        temperature: 0.8,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error:', error);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'فشل توليد البرومبت. حاول مرة أخرى.' })
      };
    }

    const data = await response.json();
    const prompt = data.choices[0]?.message?.content?.trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        prompt,
        usage: data.usage,
        style: style
      })
    };

  } catch (err) {
    console.error('Prompt generation error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'حدث خطأ غير متوقع' })
    };
  }
};
