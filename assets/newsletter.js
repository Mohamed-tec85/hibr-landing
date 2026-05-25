/* ============================================================
   CHATTLLE — NEWSLETTER WIDGET
   ============================================================
   - Smart popup (shows after 20s or scroll 60%)
   - Footer subscription form
   - Don't show popup if user already subscribed/dismissed
   - Multi-language support
   ============================================================ */

(function(){
  const STORAGE_KEY = 'chattlle_newsletter';
  const DISMISS_DAYS = 30; // Don't show again for 30 days if dismissed

  function getState(){
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return data;
    } catch { return {}; }
  }

  function setState(state){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  function shouldShowPopup(){
    const state = getState();
    if (state.subscribed) return false;
    if (state.dismissed_at){
      const days = (Date.now() - state.dismissed_at) / (1000 * 60 * 60 * 24);
      if (days < DISMISS_DAYS) return false;
    }
    return true;
  }

  function getLang(){
    return document.documentElement.lang || 'ar';
  }

  function t(ar, en){
    return getLang() === 'en' ? en : ar;
  }

  // ============ POPUP ============
  function createPopup(){
    if (document.getElementById('newsletter-popup')) return;

    const overlay = document.createElement('div');
    overlay.id = 'newsletter-popup';
    overlay.innerHTML = `
      <div class="nl-overlay"></div>
      <div class="nl-modal">
        <button class="nl-close" aria-label="Close">×</button>
        <div class="nl-icon">📧</div>
        <h2 class="nl-title">${t('🎁 احصل على 15% خصم!', '🎁 Get 15% OFF!')}</h2>
        <p class="nl-subtitle">${t('اشترك في النشرة البريدية واحصل على عروض حصرية، براومبتات مجانية، وأحدث أخبار AI', 'Subscribe for exclusive deals, free prompts, and AI updates')}</p>

        <form class="nl-form" id="nl-popup-form">
          <input type="text" class="nl-input" id="nl-popup-name" placeholder="${t('اسمك (اختياري)', 'Your name (optional)')}" maxlength="50">
          <input type="email" class="nl-input" id="nl-popup-email" placeholder="${t('بريدك الإلكتروني', 'Your email')}" required>
          <button type="submit" class="nl-button" id="nl-popup-submit">
            <span>🎉</span>
            <span>${t('احصل على الخصم', 'Get My Discount')}</span>
          </button>
        </form>

        <p class="nl-disclaimer">${t('لن نرسل لك سبام أبدًا. يمكنك إلغاء الاشتراك في أي وقت.', 'No spam ever. Unsubscribe anytime.')}</p>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close handlers
    overlay.querySelector('.nl-overlay').addEventListener('click', dismissPopup);
    overlay.querySelector('.nl-close').addEventListener('click', dismissPopup);

    // Form submit
    overlay.querySelector('#nl-popup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('nl-popup-email').value.trim();
      const name = document.getElementById('nl-popup-name').value.trim();
      await subscribe(email, name, 'popup', 'nl-popup-submit', overlay);
    });

    // Animate in
    setTimeout(() => overlay.classList.add('show'), 50);
  }

  function dismissPopup(){
    const popup = document.getElementById('newsletter-popup');
    if (popup){
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 400);
    }
    setState({ ...getState(), dismissed_at: Date.now() });
  }

  // ============ FOOTER FORM ============
  function createFooterForm(){
    // Find footer or create injection point
    const footer = document.querySelector('footer .foot-grid') || document.querySelector('footer .container');
    if (!footer) return;

    // Don't add twice
    if (document.querySelector('.nl-footer-form')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'nl-footer-wrapper';
    wrapper.innerHTML = `
      <div class="nl-footer-content">
        <div>
          <h4 class="nl-footer-title">${t('📧 ابقَ على اطّلاع', '📧 Stay Updated')}</h4>
          <p class="nl-footer-text">${t('عروض حصرية، براومبتات مجانية، وأحدث أخبار AI', 'Exclusive deals, free prompts, and AI news')}</p>
        </div>
        <form class="nl-footer-form" id="nl-footer-form">
          <input type="email" class="nl-input" id="nl-footer-email" placeholder="${t('بريدك الإلكتروني', 'Your email')}" required>
          <button type="submit" class="nl-button" id="nl-footer-submit">
            <span>${t('اشترك', 'Subscribe')}</span>
          </button>
        </form>
      </div>
    `;

    // Insert before foot-grid
    footer.parentNode.insertBefore(wrapper, footer);

    // Form submit
    wrapper.querySelector('#nl-footer-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('nl-footer-email').value.trim();
      await subscribe(email, '', 'footer', 'nl-footer-submit');
    });
  }

  // ============ SUBSCRIBE LOGIC ============
  async function subscribe(email, name, source, btnId, popupEl){
    if (!email || !email.includes('@')){
      showNotification(t('⚠️ يرجى إدخال إيميل صحيح', '⚠️ Please enter a valid email'), 'error');
      return;
    }

    const btn = document.getElementById(btnId);
    if (btn){
      btn.disabled = true;
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<span>⏳</span><span>${t('جاري...', 'Loading...')}</span>`;

      try {
        const response = await fetch('/.netlify/functions/newsletter-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, source, lang: getLang() })
        });

        const data = await response.json();

        if (response.ok){
          setState({ ...getState(), subscribed: true, email });
          showNotification(t('🎉 تم! تحقّق من بريدك للهدية', '🎉 Done! Check your email for the gift'), 'success');

          // Track in analytics
          if (typeof gtag !== 'undefined'){
            gtag('event', 'newsletter_subscribe', { source });
          }

          // Close popup if open
          if (popupEl){
            setTimeout(() => {
              popupEl.classList.remove('show');
              setTimeout(() => popupEl.remove(), 400);
            }, 1500);
          }

          // Clear forms
          document.querySelectorAll('.nl-input').forEach(inp => inp.value = '');

        } else {
          // 409 = already subscribed (still success message)
          if (response.status === 409){
            setState({ ...getState(), subscribed: true, email });
            showNotification(data.error || t('أنت مشترك بالفعل!', 'You are already subscribed!'), 'info');
          } else {
            showNotification(data.error || t('حدث خطأ', 'Error occurred'), 'error');
          }
        }
      } catch (err) {
        console.error('Subscribe error:', err);
        showNotification(t('فشل الاتصال', 'Connection failed'), 'error');
      } finally {
        if (btn){
          btn.disabled = false;
          btn.innerHTML = originalHTML;
        }
      }
    }
  }

  // ============ NOTIFICATION ============
  function showNotification(message, type = 'success'){
    let toast = document.getElementById('nl-toast');
    if (!toast){
      toast = document.createElement('div');
      toast.id = 'nl-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'show ' + type;
    setTimeout(() => toast.className = '', 4000);
  }

  // ============ STYLES ============
  function injectStyles(){
    if (document.getElementById('nl-styles')) return;
    const style = document.createElement('style');
    style.id = 'nl-styles';
    style.textContent = `
      /* ===== POPUP ===== */
      #newsletter-popup{
        position: fixed;
        inset: 0;
        z-index: 99999;
        opacity: 0;
        visibility: hidden;
        transition: all .4s ease;
      }
      #newsletter-popup.show{ opacity: 1; visibility: visible; }

      .nl-overlay{
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,.75);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }

      .nl-modal{
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%) scale(.9);
        width: 90%; max-width: 480px;
        max-height: 90vh; overflow-y: auto;
        background: linear-gradient(180deg, #15102a, #0a0613);
        border: 1px solid rgba(232,193,120,.25);
        border-radius: 24px;
        padding: 2.5rem 2rem;
        text-align: center;
        box-shadow: 0 30px 80px rgba(0,0,0,.6);
        transition: transform .4s cubic-bezier(.34,1.56,.64,1);
      }
      #newsletter-popup.show .nl-modal{ transform: translate(-50%, -50%) scale(1); }

      .nl-close{
        position: absolute;
        top: 1rem; inset-inline-end: 1rem;
        width: 36px; height: 36px;
        background: rgba(245,239,227,.08);
        border: 1px solid rgba(245,239,227,.15);
        color: #f5efe3;
        font-size: 1.5rem;
        border-radius: 50%;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all .2s;
      }
      .nl-close:hover{ background: rgba(245,239,227,.15); transform: rotate(90deg); }

      .nl-icon{ font-size: 3.5rem; margin-bottom: 1rem; animation: nl-bounce 2s ease-in-out infinite; }
      @keyframes nl-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

      .nl-title{
        font-size: 1.7rem;
        color: #e8c178;
        margin: 0 0 .8rem;
        font-weight: 700;
        font-family: 'Reem Kufi', 'Tajawal', sans-serif;
      }
      .nl-subtitle{
        color: #ada69b;
        margin: 0 0 1.8rem;
        line-height: 1.7;
        font-size: .95rem;
      }

      .nl-form{ display: flex; flex-direction: column; gap: .8rem; }

      .nl-input{
        width: 100%;
        padding: .95rem 1.2rem;
        background: rgba(10,6,19,.5);
        border: 1px solid rgba(232,193,120,.2);
        border-radius: 14px;
        color: #f5efe3;
        font-family: inherit;
        font-size: .95rem;
        box-sizing: border-box;
        transition: all .3s;
      }
      .nl-input:focus{
        outline: none;
        border-color: rgba(232,193,120,.5);
        background: rgba(10,6,19,.7);
        box-shadow: 0 0 0 4px rgba(232,193,120,.08);
      }
      .nl-input::placeholder{ color: #6b6660; }

      .nl-button{
        width: 100%;
        padding: 1rem 1.5rem;
        background: linear-gradient(135deg, #e8c178, #d4ab5f);
        color: #0a0613;
        border: none;
        border-radius: 14px;
        font-family: inherit;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: .5rem;
        transition: all .3s;
        box-shadow: 0 10px 24px rgba(232,193,120,.25);
      }
      .nl-button:hover:not(:disabled){
        transform: translateY(-2px);
        box-shadow: 0 14px 32px rgba(232,193,120,.4);
      }
      .nl-button:disabled{ opacity: .6; cursor: not-allowed; }

      .nl-disclaimer{
        color: #6b6660;
        font-size: .78rem;
        margin: 1.2rem 0 0;
      }

      /* ===== FOOTER FORM ===== */
      .nl-footer-wrapper{
        margin: 0 0 2.5rem;
        padding: 2rem;
        background: linear-gradient(135deg, rgba(232,193,120,.08), rgba(123,63,255,.05));
        border: 1px solid rgba(232,193,120,.15);
        border-radius: 18px;
      }
      .nl-footer-content{
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: 2rem;
        align-items: center;
      }
      @media (max-width: 768px){
        .nl-footer-content{ grid-template-columns: 1fr; gap: 1.2rem; }
      }

      .nl-footer-title{
        color: #e8c178;
        margin: 0 0 .5rem;
        font-size: 1.2rem;
        font-family: 'Reem Kufi', 'Tajawal', sans-serif;
      }
      .nl-footer-text{
        color: #ada69b;
        margin: 0;
        font-size: .9rem;
        line-height: 1.6;
      }

      .nl-footer-form{
        display: grid;
        grid-template-columns: 1fr auto;
        gap: .6rem;
      }
      @media (max-width: 500px){
        .nl-footer-form{ grid-template-columns: 1fr; }
      }
      .nl-footer-form .nl-button{ padding: .85rem 1.5rem; white-space: nowrap; }

      /* ===== NOTIFICATION TOAST ===== */
      #nl-toast{
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%) translateY(150px);
        background: linear-gradient(135deg, #e8c178, #d4ab5f);
        color: #0a0613;
        padding: 1rem 1.8rem;
        border-radius: 100px;
        font-weight: 700;
        font-size: .95rem;
        box-shadow: 0 14px 36px rgba(0,0,0,.5);
        z-index: 100000;
        transition: transform .4s cubic-bezier(.34,1.56,.64,1);
        max-width: 90%;
      }
      #nl-toast.show{ transform: translateX(-50%) translateY(0); }
      #nl-toast.error{ background: linear-gradient(135deg, #ff6b6b, #ee5a52); color: #fff; }
      #nl-toast.info{ background: linear-gradient(135deg, #5ce5d9, #4fb8b0); color: #0a0613; }
    `;
    document.head.appendChild(style);
  }

  // ============ INIT ============
  function init(){
    injectStyles();
    createFooterForm();

    if (!shouldShowPopup()) return;

    // Show popup after 20 seconds or 60% scroll
    let popupShown = false;
    function trigger(){
      if (popupShown || !shouldShowPopup()) return;
      popupShown = true;
      createPopup();
    }

    setTimeout(trigger, 20000); // 20 seconds

    window.addEventListener('scroll', () => {
      const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrolled > 60) trigger();
    }, { passive: true });

    // Re-create footer form on language change
    document.addEventListener('langChanged', () => {
      const oldForm = document.querySelector('.nl-footer-wrapper');
      if (oldForm){
        oldForm.remove();
        createFooterForm();
      }
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
