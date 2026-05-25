// ============================================================
// IndexNow - Auto-notify Bing/Yandex about URL changes
// تُرسل URLs لـ Bing فورًا عند النشر/التحديث
// ============================================================

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
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
    const { urls } = JSON.parse(event.body);

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'يرجى إرسال قائمة URLs' })
      };
    }

    // IndexNow configuration
    const API_KEY = '925b6f8a778114641e40a1e0a094970e';
    const HOST = 'chattlle.com';
    const KEY_LOCATION = `https://chattlle.com/${API_KEY}.txt`;

    // Validate URLs (must be from same host)
    const validUrls = urls.filter(url => {
      try {
        const u = new URL(url);
        return u.hostname === HOST || u.hostname === 'www.chattlle.com';
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'لا توجد URLs صالحة' })
      };
    }

    // Build IndexNow payload
    const payload = {
      host: HOST,
      key: API_KEY,
      keyLocation: KEY_LOCATION,
      urlList: validUrls.slice(0, 10000) // Max 10,000 URLs per request
    };

    // Submit to Bing IndexNow
    const bingResponse = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const bingStatus = bingResponse.status;
    const bingSuccess = bingStatus === 200 || bingStatus === 202;

    // Also submit to Yandex (uses same protocol)
    let yandexSuccess = false;
    try {
      const yandexResponse = await fetch('https://yandex.com/indexnow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(payload)
      });
      yandexSuccess = yandexResponse.status === 200 || yandexResponse.status === 202;
    } catch (e) {
      console.log('Yandex submission failed (non-critical):', e.message);
    }

    // Status code meanings:
    // 200 OK: URL received
    // 202 Accepted: URL received, will be processed
    // 400 Bad request: Invalid format
    // 403 Forbidden: Key not valid
    // 422 Unprocessable entity: URLs don't belong to host or key mismatch
    // 429 Too many requests

    const result = {
      success: bingSuccess,
      submitted: validUrls.length,
      total: urls.length,
      engines: {
        bing: {
          status: bingStatus,
          success: bingSuccess
        },
        yandex: {
          success: yandexSuccess
        }
      },
      message: bingSuccess
        ? `✅ تم إرسال ${validUrls.length} URL لـ Bing بنجاح`
        : `⚠️ فشل الإرسال - حالة ${bingStatus}`
    };

    // Log to console for debugging
    console.log('IndexNow submission:', result);

    return {
      statusCode: bingSuccess ? 200 : 500,
      headers,
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error('IndexNow error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'خطأ غير متوقع' })
    };
  }
};
