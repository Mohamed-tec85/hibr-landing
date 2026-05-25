// ============================================================
// Newsletter Subscribe Function
// تسجيل مشترك جديد + إرسال welcome email
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
    const { email, name, source, lang } = JSON.parse(event.body);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'يرجى إدخال إيميل صحيح' })
      };
    }

    const SUPABASE_URL = 'https://opwqklcttccnixvzspdx.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    // Insert into Supabase
    const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        source: source || 'website',
        language: lang || 'ar'
      })
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      // Check if duplicate
      if (errorText.includes('duplicate') || errorText.includes('unique')) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'هذا الإيميل مشترك بالفعل! شكرًا لك 🎉' })
        };
      }
      console.error('Supabase error:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'فشل التسجيل. حاول مرة أخرى.' })
      };
    }

    // Send welcome email via Resend
    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (RESEND_KEY) {
      try {
        const welcomeName = name?.trim() || 'صديقنا العزيز';
        const emailContent = lang === 'en' ? buildEnglishEmail(welcomeName) : buildArabicEmail(welcomeName);

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Chattlle <hello@chattlle.com>',
            to: [email],
            subject: lang === 'en' ? '🎉 Welcome to Chattlle!' : '🎉 مرحبًا بك في Chattlle!',
            html: emailContent
          })
        });
      } catch (emailErr) {
        console.error('Email send failed (non-critical):', emailErr);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: lang === 'en' ? '✅ Successfully subscribed!' : '✅ تم الاشتراك بنجاح!'
      })
    };

  } catch (err) {
    console.error('Subscribe error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'خطأ غير متوقع' })
    };
  }
};

function buildArabicEmail(name) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Tahoma','Arial',sans-serif;background:#0a0613;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0613;padding:2rem 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:linear-gradient(135deg,#15102a,#0a0613);border:1px solid rgba(232,193,120,0.2);border-radius:20px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:3rem 2rem 2rem;text-align:center;background:linear-gradient(135deg,rgba(232,193,120,0.15),rgba(123,63,255,0.1));">
          <div style="font-family:Georgia,serif;font-size:2.5rem;font-style:italic;color:#e8c178;font-weight:bold;">Chattlle</div>
          <div style="margin-top:0.5rem;color:#e8c178;font-size:1.1rem;font-weight:600;">🎉 أهلاً بك في عائلتنا!</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:2.5rem 2rem;color:#f5efe3;line-height:1.9;font-size:1rem;">
          <p style="margin:0 0 1.5rem;font-size:1.15rem;color:#e8c178;">مرحبًا ${name}،</p>

          <p style="margin:0 0 1.5rem;">شكرًا جزيلاً لانضمامك إلى مجتمع <strong style="color:#e8c178;">Chattlle</strong>! 🚀</p>

          <p style="margin:0 0 1.5rem;">أنت الآن جزء من قائمة <strong>VIP</strong> الذين سيحصلون على:</p>

          <ul style="margin:0 0 1.5rem;padding-inline-start:1.5rem;">
            <li style="margin-bottom:0.8rem;">🎁 <strong>عروض حصرية</strong> قبل الجميع</li>
            <li style="margin-bottom:0.8rem;">📰 <strong>مقالات تريندج</strong> أسبوعيًا عن AI</li>
            <li style="margin-bottom:0.8rem;">💎 <strong>براومبتات مجانية</strong> شهريًا</li>
            <li style="margin-bottom:0.8rem;">🔥 <strong>منتجات جديدة</strong> أوّل بأوّل</li>
            <li style="margin-bottom:0.8rem;">🎓 <strong>دروس وحيل</strong> من خبراء AI</li>
          </ul>

          <div style="background:rgba(232,193,120,0.08);border:1px solid rgba(232,193,120,0.2);border-radius:12px;padding:1.2rem;margin:1.5rem 0;">
            <p style="margin:0;color:#e8c178;font-weight:600;">🎁 هدية ترحيب:</p>
            <p style="margin:0.5rem 0 0;">استخدم كود <strong style="background:#e8c178;color:#0a0613;padding:0.2rem 0.6rem;border-radius:6px;">WELCOME15</strong> للحصول على خصم 15% على أوّل طلب!</p>
          </div>

          <div style="text-align:center;margin:2rem 0;">
            <a href="https://chattlle.com" style="display:inline-block;background:linear-gradient(135deg,#e8c178,#d4ab5f);color:#0a0613;padding:0.9rem 2rem;border-radius:100px;text-decoration:none;font-weight:700;">
              🛍️ ابدأ التسوّق الآن
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:1.5rem 2rem;background:rgba(0,0,0,0.3);text-align:center;color:#8b8480;font-size:0.85rem;">
          <p style="margin:0 0 0.5rem;">تابعنا:
            <a href="https://twitter.com/chattlle" style="color:#e8c178;text-decoration:none;margin:0 0.5rem;">Twitter</a> ·
            <a href="https://instagram.com/chattlle" style="color:#e8c178;text-decoration:none;margin:0 0.5rem;">Instagram</a>
          </p>
          <p style="margin:0.5rem 0 0;color:#8b8480;font-size:0.78rem;">© 2026 Chattlle · جميع الحقوق محفوظة</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
}

function buildEnglishEmail(name) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Arial',sans-serif;background:#0a0613;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0613;padding:2rem 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:linear-gradient(135deg,#15102a,#0a0613);border:1px solid rgba(232,193,120,0.2);border-radius:20px;overflow:hidden;">
        <tr><td style="padding:3rem 2rem 2rem;text-align:center;background:linear-gradient(135deg,rgba(232,193,120,0.15),rgba(123,63,255,0.1));">
          <div style="font-family:Georgia,serif;font-size:2.5rem;font-style:italic;color:#e8c178;font-weight:bold;">Chattlle</div>
          <div style="margin-top:0.5rem;color:#e8c178;font-size:1.1rem;font-weight:600;">🎉 Welcome to the family!</div>
        </td></tr>
        <tr><td style="padding:2.5rem 2rem;color:#f5efe3;line-height:1.9;font-size:1rem;">
          <p style="margin:0 0 1.5rem;font-size:1.15rem;color:#e8c178;">Hi ${name},</p>
          <p style="margin:0 0 1.5rem;">Thank you for joining the <strong style="color:#e8c178;">Chattlle</strong> community! 🚀</p>
          <p style="margin:0 0 1.5rem;">You're now part of our <strong>VIP</strong> list and will get:</p>
          <ul style="margin:0 0 1.5rem;padding-inline-start:1.5rem;">
            <li style="margin-bottom:0.8rem;">🎁 <strong>Exclusive deals</strong> before anyone else</li>
            <li style="margin-bottom:0.8rem;">📰 <strong>Trending AI articles</strong> weekly</li>
            <li style="margin-bottom:0.8rem;">💎 <strong>Free prompts</strong> monthly</li>
            <li style="margin-bottom:0.8rem;">🔥 <strong>New products</strong> first</li>
          </ul>
          <div style="background:rgba(232,193,120,0.08);border:1px solid rgba(232,193,120,0.2);border-radius:12px;padding:1.2rem;margin:1.5rem 0;">
            <p style="margin:0;color:#e8c178;font-weight:600;">🎁 Welcome Gift:</p>
            <p style="margin:0.5rem 0 0;">Use code <strong style="background:#e8c178;color:#0a0613;padding:0.2rem 0.6rem;border-radius:6px;">WELCOME15</strong> for 15% off your first order!</p>
          </div>
          <div style="text-align:center;margin:2rem 0;">
            <a href="https://chattlle.com" style="display:inline-block;background:linear-gradient(135deg,#e8c178,#d4ab5f);color:#0a0613;padding:0.9rem 2rem;border-radius:100px;text-decoration:none;font-weight:700;">
              🛍️ Start Shopping
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:1.5rem 2rem;background:rgba(0,0,0,0.3);text-align:center;color:#8b8480;font-size:0.85rem;">
          <p style="margin:0.5rem 0 0;color:#8b8480;font-size:0.78rem;">© 2026 Chattlle · All rights reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
}
