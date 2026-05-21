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
