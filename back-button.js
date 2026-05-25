/* ============================================================
   CHATTLLE — BACK BUTTON (History Back)
   ============================================================
   Floating back button that uses browser history.
   Shown on all pages except index.html (no need on home).
   Smart fallback to index.html if no history.
   ============================================================ */

(function(){
  function init(){
    // Don't show on homepage
    const isHome = /\/(index\.html)?$/.test(window.location.pathname) ||
                   window.location.pathname === '/';
    if (isHome) return;

    // Don't add twice
    if (document.getElementById('backBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'backBtn';
    btn.setAttribute('aria-label', 'العودة');
    btn.setAttribute('title', 'العودة');
    btn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      <span class="back-btn-label">عودة</span>
    `;

    btn.style.cssText = `
      position: fixed;
      bottom: 2rem;
      inset-inline-start: 1.5rem;
      width: auto;
      height: 50px;
      padding: 0 1.2rem;
      background: linear-gradient(135deg, rgba(232,193,120,.95), rgba(212,171,95,.95));
      color: #0a0613;
      border: none;
      border-radius: 100px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: .5rem;
      font-family: inherit;
      font-weight: 700;
      font-size: .95rem;
      box-shadow: 0 10px 30px rgba(0,0,0,.4), 0 4px 12px rgba(232,193,120,.3);
      z-index: 9998;
      transition: all .3s cubic-bezier(.34,1.56,.64,1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    `;

    // Flip arrow icon for RTL
    if (document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar') {
      btn.querySelector('svg').style.transform = 'scaleX(-1)';
    }

    // Hover effect
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-3px) scale(1.05)';
      btn.style.boxShadow = '0 14px 40px rgba(0,0,0,.5), 0 6px 16px rgba(232,193,120,.5)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0) scale(1)';
      btn.style.boxShadow = '0 10px 30px rgba(0,0,0,.4), 0 4px 12px rgba(232,193,120,.3)';
    });

    // Click handler - smart back navigation
    btn.addEventListener('click', () => {
      // If there's history, go back. Otherwise go to home.
      if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
        window.history.back();
      } else {
        window.location.href = 'index.html';
      }
    });

    document.body.appendChild(btn);

    // Update label based on language
    function updateLabel(){
      const lang = document.documentElement.lang || 'ar';
      const label = btn.querySelector('.back-btn-label');
      if (label) label.textContent = lang === 'ar' ? 'عودة' : 'Back';
      btn.setAttribute('aria-label', lang === 'ar' ? 'العودة' : 'Back');
      btn.setAttribute('title', lang === 'ar' ? 'العودة' : 'Back');
      // Flip arrow for RTL
      const svg = btn.querySelector('svg');
      if (svg) svg.style.transform = lang === 'ar' ? 'scaleX(-1)' : 'scaleX(1)';
    }

    updateLabel();

    // React to language changes
    document.addEventListener('langChanged', updateLabel);

    // Mobile responsiveness - hide label on small screens
    function checkMobile(){
      if (window.innerWidth < 480) {
        const label = btn.querySelector('.back-btn-label');
        if (label) label.style.display = 'none';
        btn.style.padding = '0';
        btn.style.width = '50px';
        btn.style.justifyContent = 'center';
      } else {
        const label = btn.querySelector('.back-btn-label');
        if (label) label.style.display = 'inline';
        btn.style.padding = '0 1.2rem';
        btn.style.width = 'auto';
      }
    }
    checkMobile();
    window.addEventListener('resize', checkMobile);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
