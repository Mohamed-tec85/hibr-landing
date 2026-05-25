/* ============================================================
   CHATTLLE — INDEXNOW HELPER LIBRARY
   ============================================================
   ميزة: إرسال URLs لـ Bing/Yandex فورًا عند النشر
   الاستخدام: window.indexNow.submit([urls])
   ============================================================ */

(function(){

  const ENDPOINT = '/.netlify/functions/indexnow-submit';
  const STORAGE_KEY = 'chattlle_indexnow_log';
  const MAX_LOG_ENTRIES = 100;

  // ============ SUBMIT FUNCTION ============
  async function submit(urls){
    // Normalize to array
    if (typeof urls === 'string') urls = [urls];
    if (!Array.isArray(urls) || urls.length === 0){
      return { success: false, error: 'No URLs provided' };
    }

    // Normalize URLs - ensure full URL
    const normalizedUrls = urls.map(url => {
      if (url.startsWith('http')) return url;
      if (url.startsWith('/')) return 'https://chattlle.com' + url;
      return 'https://chattlle.com/' + url;
    });

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: normalizedUrls })
      });

      const data = await response.json();

      // Log to localStorage
      logSubmission({
        urls: normalizedUrls,
        result: data,
        timestamp: Date.now()
      });

      return data;
    } catch (err) {
      console.error('IndexNow submit error:', err);
      return { success: false, error: err.message };
    }
  }

  // ============ LOGGING ============
  function logSubmission(entry){
    try {
      const log = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      log.unshift(entry);
      if (log.length > MAX_LOG_ENTRIES) log.length = MAX_LOG_ENTRIES;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    } catch (e) { /* silent */ }
  }

  function getLog(){
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  }

  function getStats(){
    const log = getLog();
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const last7d = Date.now() - 7 * 24 * 60 * 60 * 1000;

    let totalUrls = 0;
    let urls24h = 0;
    let urls7d = 0;
    let successCount = 0;
    let failCount = 0;

    log.forEach(entry => {
      const count = entry.urls?.length || 0;
      totalUrls += count;

      if (entry.timestamp > last24h) urls24h += count;
      if (entry.timestamp > last7d) urls7d += count;

      if (entry.result?.success) successCount += count;
      else failCount += count;
    });

    return {
      totalSubmissions: log.length,
      totalUrls,
      urls24h,
      urls7d,
      successCount,
      failCount,
      lastSubmission: log[0]?.timestamp || null
    };
  }

  // ============ EXPOSE ============
  window.indexNow = {
    submit,
    getLog,
    getStats,
    clearLog: () => {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // ============ AUTO-NOTIFY ON BLOG POST UPDATES ============
  // يستمع لأحداث تحديث المدوّنة لإرسال URL تلقائيًا
  document.addEventListener('blogPostPublished', async (e) => {
    const { slug } = e.detail;
    if (slug){
      const url = `https://chattlle.com/blog-post.html?slug=${slug}`;
      const result = await submit([url, 'https://chattlle.com/blog.html']);
      console.log('IndexNow auto-submit (blog):', result);
    }
  });

  document.addEventListener('productUpdated', async (e) => {
    const { productId } = e.detail;
    if (productId){
      const url = `https://chattlle.com/product.html?id=${productId}`;
      const result = await submit([url, 'https://chattlle.com/']);
      console.log('IndexNow auto-submit (product):', result);
    }
  });

})();
