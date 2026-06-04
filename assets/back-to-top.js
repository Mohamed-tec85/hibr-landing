/* ============================================================
   CHATTLLE — BACK-TO-TOP BUTTON
   ============================================================
   Auto-injects a button into the page. Shows after scrolling 400px.
   Clicking smoothly scrolls back to top.
   ============================================================ */

(function(){
  function init(){
    // Don't add twice
    if(document.querySelector('.back-to-top')) return;

    // Create button
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'العودة للأعلى');
    btn.title = 'العودة للأعلى';
    btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    document.body.appendChild(btn);

    // Show/hide based on scroll position
    function updateVisibility(){
      if(window.scrollY > 400){
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }

    // Throttle scroll handler for performance
    let ticking = false;
    window.addEventListener('scroll', () => {
      if(!ticking){
        window.requestAnimationFrame(() => {
          updateVisibility();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    // Initial check
    updateVisibility();

    // Click → scroll smoothly to top
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Update aria-label based on language
    function updateAriaLabel(){
      const lang = document.documentElement.lang || 'ar';
      const label = lang === 'ar' ? 'العودة للأعلى' : 'Back to top';
      btn.setAttribute('aria-label', label);
      btn.title = label;
    }
    updateAriaLabel();
    document.addEventListener('langChanged', updateAriaLabel);
  }

  // Setup all .back-link buttons (smart "Back" navigation)
  function setupBackLinks(){
    document.querySelectorAll('.back-link').forEach(btn => {
      if(btn.dataset.backInit) return; // skip if already initialized
      btn.dataset.backInit = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // If we came from another page on the same site, go back in history
        let sameOrigin = false;
        try {
          sameOrigin = document.referrer && new URL(document.referrer).origin === window.location.origin;
        } catch(err){ sameOrigin = false; }

        if(sameOrigin && window.history.length > 1){
          window.history.back();
        } else {
          // Direct visit or external referrer — go to home (or custom fallback)
          window.location.href = btn.getAttribute('data-fallback') || 'index.html';
        }
      });
    });
  }

  // Re-scan for new back-link buttons after dynamic rendering
  function initAll(){
    setupBackLinks();
  }

  // Expose for pages that render content dynamically
  window.chattlleSetupBackLinks = setupBackLinks;

  // Run when DOM ready
  function bootAll(){
    init();
    setupBackLinks();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bootAll);
  } else {
    bootAll();
  }
})();


/* ============================================================
   CHATTLLE — شريط الإعلان الذكي (كوبون الخصم)
   ============================================================
   يسحب أحدث كوبون فعّال من جدول coupons في Supabase ويعرضه
   أعلى كل الصفحات تلقائيًا. فيه زر نسخ + زر إخفاء.
   لو وقفت/حذفت الكوبون من الأدمن → الشريط يختفي لوحده.
   ============================================================ */
(function(){
  const DISMISS_KEY = 'chattlle-promo-dismissed';

  async function initPromoBar(){
    if(typeof sb === 'undefined') return;          // لا يوجد اتصال بالخادم على هذه الصفحة
    if(document.getElementById('chPromoBar')) return;

    let coupon = null;
    try{
      const { data, error } = await sb.from('coupons').select('*')
        .eq('is_active', true).order('created_at', { ascending:false }).limit(5);
      if(error) throw error;
      const now = new Date();
      coupon = (data || []).find(c => !c.expires_at || new Date(c.expires_at) > now);
    }catch(e){ return; }
    if(!coupon) return;

    // لو الزائر أخفى نفس الكود سابقًا، لا نعرضه
    try{ if(localStorage.getItem(DISMISS_KEY) === coupon.code) return; }catch(e){}

    const lang = document.documentElement.lang || 'ar';
    const valTxt = coupon.discount_type === 'percent'
      ? `${coupon.discount_value}%`
      : (lang === 'ar' ? `${coupon.discount_value} ر.س` : `${coupon.discount_value} SAR`);
    const msg = lang === 'ar'
      ? `🎁 استخدم كود <b>${coupon.code}</b> واحصل على خصم ${valTxt}`
      : `🎁 Use code <b>${coupon.code}</b> for ${valTxt} off`;
    const copyTxt = lang === 'ar' ? 'نسخ الكود' : 'Copy code';
    const copiedTxt = lang === 'ar' ? '✓ تم النسخ' : '✓ Copied';

    if(!document.getElementById('chPromoStyle')){
      const st = document.createElement('style');
      st.id = 'chPromoStyle';
      st.textContent = `
        #chPromoBar{position:fixed;top:0;left:0;right:0;z-index:200;
          background:linear-gradient(90deg,#e8c178,#7b3fff);color:#0a0613;
          font-family:inherit;font-size:.92rem;font-weight:600;
          display:flex;align-items:center;justify-content:center;gap:.9rem;flex-wrap:wrap;
          padding:.6rem 2.6rem;text-align:center}
        #chPromoBar b{letter-spacing:1px}
        #chPromoBar .ch-copy{background:rgba(10,6,19,.85);color:#fff;border:none;border-radius:8px;
          padding:.3rem .8rem;cursor:pointer;font-family:inherit;font-size:.82rem;font-weight:600}
        #chPromoBar .ch-x{position:absolute;inset-inline-end:.8rem;top:50%;transform:translateY(-50%);
          background:transparent;border:none;color:#0a0613;font-size:1.2rem;cursor:pointer;line-height:1;padding:.2rem}
        @media(max-width:520px){#chPromoBar{font-size:.78rem}}
      `;
      document.head.appendChild(st);
    }

    const bar = document.createElement('div');
    bar.id = 'chPromoBar';
    bar.innerHTML = `<span>${msg}</span>
      <button class="ch-copy" type="button">${copyTxt}</button>
      <button class="ch-x" type="button" aria-label="close">✕</button>`;
    document.body.prepend(bar);

    const nav = document.querySelector('nav');
    function applyOffset(){
      const h = bar.offsetHeight;
      if(nav) nav.style.top = h + 'px';
      document.body.style.paddingTop = h + 'px';
    }
    applyOffset();
    setTimeout(applyOffset, 400);                  // إعادة قياس بعد تحميل الخطوط
    window.addEventListener('resize', applyOffset);

    bar.querySelector('.ch-copy').addEventListener('click', (e) => {
      try{ navigator.clipboard && navigator.clipboard.writeText(coupon.code); }catch(err){}
      e.currentTarget.textContent = copiedTxt;
      setTimeout(() => { e.currentTarget.textContent = copyTxt; }, 1800);
    });
    bar.querySelector('.ch-x').addEventListener('click', () => {
      try{ localStorage.setItem(DISMISS_KEY, coupon.code); }catch(err){}
      bar.remove();
      if(nav) nav.style.top = '';
      document.body.style.paddingTop = '';
      window.removeEventListener('resize', applyOffset);
    });

    document.addEventListener('langChanged', () => {
      const b = document.getElementById('chPromoBar');
      if(b){ b.remove(); if(nav) nav.style.top=''; document.body.style.paddingTop=''; }
      setTimeout(initPromoBar, 50);
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPromoBar);
  else initPromoBar();
})();

/* ============================================================
   Chattlle — PWA bootstrap (added)
   Injects manifest + theme-color + apple icon, registers SW.
   Works site-wide because this file loads on every page.
   ============================================================ */
(function () {
  try {
    if (!document.querySelector('link[rel="manifest"]')) {
      var l = document.createElement('link');
      l.rel = 'manifest'; l.href = '/manifest.json';
      document.head.appendChild(l);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      var m = document.createElement('meta');
      m.name = 'theme-color'; m.content = '#0a0613';
      document.head.appendChild(m);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      var a = document.createElement('link');
      a.rel = 'apple-touch-icon'; a.href = '/apple-touch-icon.png';
      document.head.appendChild(a);
    }
  } catch (e) {}

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
})();
