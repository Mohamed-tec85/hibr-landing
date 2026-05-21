/* ============================================================
   CHATTLLE — SEND ORDER EMAIL (Netlify Function)
   ============================================================
   POST /.netlify/functions/send-order-email
   Body: {
     orderNumber: "CHT-XXXXX",
     customer: { name, email },
     items: [{ title, format, size, filePath }],
     subtotal, vat, total, lang ("ar" | "en")
   }
   ============================================================ */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'orders@chattlle.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS'){
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }
  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method not allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { orderNumber, customer, items, subtotal, vat, total, lang } = data;

    if(!customer?.email || !items || items.length === 0){
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // 1. Generate signed download URLs (server-side using service key)
    const itemsWithUrls = await Promise.all(items.map(async (item) => {
      if(!item.filePath){
        return { ...item, downloadUrl: null };
      }
      try {
        const res = await fetch(
          `${SUPABASE_URL}/storage/v1/object/sign/product-files/${encodeURIComponent(item.filePath)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'apikey': SUPABASE_SERVICE_KEY
            },
            body: JSON.stringify({ expiresIn: 7 * 24 * 60 * 60 }) // 7 days
          }
        );
        const j = await res.json();
        if(j.signedURL){
          return { ...item, downloadUrl: `${SUPABASE_URL}/storage/v1${j.signedURL}` };
        }
        return { ...item, downloadUrl: null };
      } catch(err){
        console.error('Signed URL error:', err);
        return { ...item, downloadUrl: null };
      }
    }));

    // 2. Build email HTML
    const isAr = lang === 'ar';
    const html = buildEmailHtml({
      orderNumber, customer, items: itemsWithUrls,
      subtotal, vat, total, isAr
    });

    const subject = isAr
      ? `طلبك #${orderNumber} جاهز للتحميل ✨`
      : `Your order #${orderNumber} is ready for download ✨`;

    // 3. Send via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: `Chattlle <${FROM_EMAIL}>`,
        to: [customer.email],
        subject: subject,
        html: html
      })
    });

    const emailResult = await emailRes.json();

    if(!emailRes.ok){
      console.error('Resend error:', emailResult);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: emailResult.message || 'Email send failed' })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, id: emailResult.id })
    };

  } catch(err){
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message })
    };
  }
};

// ============================================================
// Email HTML Template
// ============================================================
function buildEmailHtml({ orderNumber, customer, items, subtotal, vat, total, isAr }){
  const dir = isAr ? 'rtl' : 'ltr';
  const lang = isAr ? 'ar' : 'en';

  const T = isAr ? {
    preview: `طلبك #${orderNumber} جاهز للتحميل`,
    title: 'تم استلام طلبك بنجاح',
    thanks: `شكرًا لك ${customer.name}، طلبك جاهز للتحميل!`,
    orderLabel: 'رقم الطلب',
    download: 'تحميل الملف',
    notAvailable: 'الملف غير متوفر',
    summary: 'ملخّص الطلب',
    subtotal: 'المجموع الفرعي',
    vat: 'ضريبة القيمة المضافة (15%)',
    total: 'الإجمالي',
    note: '🔗 روابط التحميل صالحة لمدة 7 أيام. للحصول على روابط جديدة بعد ذلك، تواصل معنا.',
    footer: 'شكرًا لاختيارك Chattlle ✦',
    rights: 'جميع الحقوق محفوظة © Chattlle',
    currency: 'ر.س'
  } : {
    preview: `Your order #${orderNumber} is ready`,
    title: 'Order Received Successfully',
    thanks: `Thank you ${customer.name}, your order is ready to download!`,
    orderLabel: 'Order Number',
    download: 'Download File',
    notAvailable: 'File unavailable',
    summary: 'Order Summary',
    subtotal: 'Subtotal',
    vat: 'VAT (15%)',
    total: 'Total',
    note: '🔗 Download links are valid for 7 days. Contact us afterwards for new links.',
    footer: 'Thank you for choosing Chattlle ✦',
    rights: 'All rights reserved © Chattlle',
    currency: 'SAR'
  };

  const fmtPrice = (n) => isAr ? `${n} ${T.currency}` : `${T.currency} ${n}`;

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid rgba(245,239,227,0.1)">
        <div style="font-weight:600;color:#f5efe3;font-size:15px;margin-bottom:4px">${item.title}</div>
        <div style="color:#b8a99a;font-size:13px">${item.format || ''} ${item.size ? '· ' + item.size : ''}</div>
      </td>
      <td style="padding:16px 0;border-bottom:1px solid rgba(245,239,227,0.1);text-align:${isAr ? 'left' : 'right'};vertical-align:middle">
        ${item.downloadUrl
          ? `<a href="${item.downloadUrl}" style="display:inline-block;background:linear-gradient(135deg,#e8c178,#7b3fff);color:#0a0613;padding:10px 18px;border-radius:100px;text-decoration:none;font-weight:600;font-size:13px">⬇ ${T.download}</a>`
          : `<span style="color:#b8a99a;font-size:13px;opacity:0.6">${T.notAvailable}</span>`
        }
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${T.preview}</title>
</head>
<body style="margin:0;padding:0;background:#0a0613;font-family:${isAr ? "'Tajawal',Arial,sans-serif" : "'Outfit',Arial,sans-serif"};color:#f5efe3">

<div style="display:none;max-height:0;overflow:hidden">${T.preview}</div>

<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(180deg,#0a0613,#120a26);padding:40px 20px">
  <tr>
    <td align="center">

      <!-- Main card -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:rgba(245,239,227,0.04);border:1px solid rgba(245,239,227,0.12);border-radius:24px;overflow:hidden;max-width:600px">

        <!-- Header with gradient -->
        <tr>
          <td style="background:linear-gradient(135deg,rgba(232,193,120,0.15),rgba(123,63,255,0.1));padding:50px 40px;text-align:center;border-bottom:1px solid rgba(245,239,227,0.1)">
            <!-- Logo -->
            <div style="font-family:Georgia,'Cormorant Garamond',serif;font-style:italic;font-size:32px;color:#e8c178;margin-bottom:20px;direction:ltr">
              <span style="display:inline-block;width:10px;height:10px;background:#e8c178;border-radius:50%;vertical-align:middle;margin-${isAr ? 'left' : 'right'}:8px"></span>
              Chattlle
            </div>

            <!-- Check icon -->
            <div style="width:70px;height:70px;background:linear-gradient(135deg,#e8c178,#7b3fff);border-radius:50%;line-height:70px;text-align:center;margin:0 auto 20px;font-size:32px;color:#0a0613;font-weight:bold">✓</div>

            <h1 style="margin:0 0 10px;font-size:26px;color:#f5efe3;font-weight:700">${T.title}</h1>
            <p style="margin:0;color:#b8a99a;font-size:15px;line-height:1.6">${T.thanks}</p>
          </td>
        </tr>

        <!-- Order Number -->
        <tr>
          <td style="padding:30px 40px;border-bottom:1px solid rgba(245,239,227,0.1)">
            <div style="color:#b8a99a;font-family:Georgia,serif;font-style:italic;font-size:13px;margin-bottom:5px">${T.orderLabel}</div>
            <div style="font-size:22px;color:#e8c178;font-weight:700;letter-spacing:0.02em;direction:ltr;text-align:${isAr ? 'right' : 'left'}">${orderNumber}</div>
          </td>
        </tr>

        <!-- Items -->
        <tr>
          <td style="padding:20px 40px">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              ${itemRows}
            </table>
          </td>
        </tr>

        <!-- Totals -->
        <tr>
          <td style="padding:20px 40px 30px;border-top:1px solid rgba(245,239,227,0.1)">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding:6px 0;color:#b8a99a;font-size:14px">${T.subtotal}</td>
                <td style="padding:6px 0;text-align:${isAr ? 'left' : 'right'};color:#f5efe3;font-family:Georgia,serif">${fmtPrice(Number(subtotal).toFixed(2))}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#b8a99a;font-size:14px">${T.vat}</td>
                <td style="padding:6px 0;text-align:${isAr ? 'left' : 'right'};color:#f5efe3;font-family:Georgia,serif">${fmtPrice(Number(vat).toFixed(2))}</td>
              </tr>
              <tr>
                <td style="padding:12px 0 6px;color:#f5efe3;font-size:16px;font-weight:600;border-top:1px solid rgba(245,239,227,0.1)">${T.total}</td>
                <td style="padding:12px 0 6px;text-align:${isAr ? 'left' : 'right'};color:#e8c178;font-size:22px;font-weight:600;font-family:Georgia,serif;border-top:1px solid rgba(245,239,227,0.1)">${fmtPrice(Number(total).toFixed(2))}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Notice -->
        <tr>
          <td style="padding:25px 40px;background:rgba(123,63,255,0.08);border-top:1px solid rgba(123,63,255,0.2)">
            <p style="margin:0;color:#f5efe3;font-size:14px;line-height:1.6;text-align:center">${T.note}</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:30px 40px;text-align:center;background:rgba(0,0,0,0.3)">
            <p style="margin:0 0 8px;color:#e8c178;font-family:Georgia,serif;font-style:italic;font-size:16px">${T.footer}</p>
            <p style="margin:0;color:#b8a99a;font-size:12px">${T.rights}</p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
</body>
</html>`;
}
