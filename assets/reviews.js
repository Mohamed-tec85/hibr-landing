/* ============================================================
   Chattlle — نظام تقييمات المنتجات (حقيقي)
   يعتمد على Supabase (المتغيّر العام sb) وجدول product_reviews.
   الاستخدام: ChReviews.init(productId, lang)  في نهاية renderProduct().
   ============================================================ */
window.ChReviews = (function () {

  const TXT = {
    ar: {
      title: 'تقييمات العملاء',
      none: 'لا توجد تقييمات بعد — كن أوّل من يقيّم هذا المنتج!',
      basedOn: n => `بناءً على ${n} ${n === 1 ? 'تقييم' : 'تقييمات'}`,
      writeTitle: 'أضف تقييمك',
      name: 'اسمك',
      yourRating: 'تقييمك',
      comment: 'رأيك في المنتج (اختياري)',
      submit: 'إرسال التقييم',
      sending: 'جارٍ الإرسال…',
      thanks: '✓ شكرًا لك! تقييمك قيد المراجعة وسيظهر بعد الموافقة.',
      errName: 'من فضلك اكتب اسمك.',
      errRating: 'من فضلك اختر عدد النجوم.',
      errGeneric: 'تعذّر إرسال التقييم، حاول مرة أخرى.'
    },
    en: {
      title: 'Customer Reviews',
      none: 'No reviews yet — be the first to review this product!',
      basedOn: n => `Based on ${n} review${n === 1 ? '' : 's'}`,
      writeTitle: 'Write a review',
      name: 'Your name',
      yourRating: 'Your rating',
      comment: 'Your thoughts (optional)',
      submit: 'Submit review',
      sending: 'Sending…',
      thanks: '✓ Thank you! Your review is pending approval and will appear once approved.',
      errName: 'Please enter your name.',
      errRating: 'Please choose a star rating.',
      errGeneric: 'Could not submit your review, please try again.'
    }
  };

  let PID = null, LANG = 'ar', chosenRating = 0;

  // ---------- helpers ----------
  function stars(value, cls) {
    const v = Math.round(value);
    let s = '';
    for (let i = 1; i <= 5; i++) s += `<span class="${cls}" style="color:${i <= v ? 'var(--gold,#e8c178)' : 'rgba(255,255,255,.25)'}">★</span>`;
    return s;
  }
  function esc(str) {
    return (str || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function fmtDate(d) {
    try { return new Date(d).toLocaleDateString(LANG === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return ''; }
  }

  // ---------- inject styles once ----------
  function injectStyles() {
    if (document.getElementById('chReviewsStyle')) return;
    const st = document.createElement('style');
    st.id = 'chReviewsStyle';
    st.textContent = `
      #chReviews{margin:3rem auto 0;max-width:900px;padding:0 1rem}
      #chReviews .ch-rv-head{display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem}
      #chReviews h3{font-size:1.5rem;color:var(--ink,#fff);margin:0}
      #chReviews .ch-rv-summary{display:flex;align-items:center;gap:.6rem;color:var(--ink-mute,#9aa)}
      #chReviews .ch-rv-summary .big{font-size:2rem;font-weight:700;color:var(--ink,#fff)}
      #chReviews .ch-rv-list{display:flex;flex-direction:column;gap:1rem;margin-bottom:2.5rem}
      #chReviews .ch-rv-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:1.1rem 1.3rem}
      #chReviews .ch-rv-card .top{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.4rem;flex-wrap:wrap}
      #chReviews .ch-rv-card .nm{font-weight:600;color:var(--ink,#fff)}
      #chReviews .ch-rv-card .dt{font-size:.8rem;color:var(--ink-mute,#9aa)}
      #chReviews .ch-rv-card p{margin:.3rem 0 0;color:var(--ink-mute,#cbd);line-height:1.7}
      #chReviews .ch-rv-empty{color:var(--ink-mute,#9aa);padding:1rem 0 2rem}
      #chReviews .ch-rv-form{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:1.5rem}
      #chReviews .ch-rv-form h4{margin:0 0 1rem;color:var(--ink,#fff);font-size:1.15rem}
      #chReviews .ch-rv-form label{display:block;margin:.3rem 0 .35rem;color:var(--ink-mute,#cbd);font-size:.9rem}
      #chReviews .ch-rv-form input,#chReviews .ch-rv-form textarea{width:100%;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:.7rem .9rem;color:var(--ink,#fff);font:inherit;margin-bottom:1rem}
      #chReviews .ch-rv-form input:focus,#chReviews .ch-rv-form textarea:focus{outline:none;border-color:var(--gold,#e8c178)}
      #chReviews .ch-rv-picker span{font-size:1.8rem;cursor:pointer;color:rgba(255,255,255,.25);transition:.15s}
      #chReviews .ch-rv-picker span.on{color:var(--gold,#e8c178)}
      #chReviews .ch-rv-btn{background:var(--gold,#e8c178);color:#0a0613;border:none;border-radius:10px;padding:.8rem 1.6rem;font-weight:700;cursor:pointer;font:inherit}
      #chReviews .ch-rv-btn:disabled{opacity:.6;cursor:default}
      #chReviews .ch-rv-msg{margin-top:1rem;font-weight:600;color:var(--gold,#e8c178)}
    `;
    document.head.appendChild(st);
  }

  // ---------- update header rating + JSON-LD schema ----------
  function updateHeaderAndSchema(avg, count) {
    const row = document.getElementById('chRatingRow');
    if (row) {
      row.innerHTML = count > 0
        ? `<span class="stars">${stars(avg, 'st')}</span>
           <span class="rating-num">${avg.toFixed(1)}</span>
           <span>(${count})</span>`
        : '';
    }
    const tag = document.getElementById('productSchema');
    if (tag) {
      try {
        const data = JSON.parse(tag.textContent);
        if (count > 0) data.aggregateRating = { "@type": "AggregateRating", "ratingValue": avg.toFixed(1), "reviewCount": count };
        else delete data.aggregateRating;
        tag.textContent = JSON.stringify(data);
      } catch (e) { /* تجاهل */ }
    }
  }

  // ---------- render ----------
  function render(reviews) {
    const t = TXT[LANG] || TXT.ar;
    const count = reviews.length;
    const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    updateHeaderAndSchema(avg, count);

    const listHtml = count
      ? reviews.map(r => `
          <div class="ch-rv-card">
            <div class="top">
              <span class="nm">${esc(r.author_name)}</span>
              <span class="dt">${fmtDate(r.created_at)}</span>
            </div>
            <div>${stars(r.rating, 'st')}</div>
            ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}
          </div>`).join('')
      : `<div class="ch-rv-empty">${t.none}</div>`;

    const summaryHtml = count
      ? `<div class="ch-rv-summary"><span class="big">${avg.toFixed(1)}</span>
         <span>${stars(avg, 'st')}</span><span>${t.basedOn(count)}</span></div>`
      : '';

    const sec = document.createElement('section');
    sec.id = 'chReviews';
    sec.innerHTML = `
      <div class="ch-rv-head"><h3>★ ${t.title}</h3>${summaryHtml}</div>
      <div class="ch-rv-list">${listHtml}</div>
      <div class="ch-rv-form">
        <h4>${t.writeTitle}</h4>
        <label>${t.yourRating}</label>
        <div class="ch-rv-picker" id="chPicker">
          ${[1, 2, 3, 4, 5].map(i => `<span data-v="${i}">★</span>`).join('')}
        </div>
        <label>${t.name}</label>
        <input id="chRvName" type="text" maxlength="60" />
        <label>${t.comment}</label>
        <textarea id="chRvComment" rows="3" maxlength="600"></textarea>
        <button class="ch-rv-btn" id="chRvSubmit">${t.submit}</button>
        <div class="ch-rv-msg" id="chRvMsg"></div>
      </div>`;

    const parent = document.getElementById('mainContent') || document.body;
    parent.appendChild(sec);
    wireForm();
  }

  // ---------- form interactivity ----------
  function wireForm() {
    const picker = document.getElementById('chPicker');
    chosenRating = 0;
    picker.querySelectorAll('span').forEach(sp => {
      sp.addEventListener('click', () => {
        chosenRating = +sp.dataset.v;
        picker.querySelectorAll('span').forEach(s => s.classList.toggle('on', +s.dataset.v <= chosenRating));
      });
    });
    document.getElementById('chRvSubmit').addEventListener('click', submit);
  }

  async function submit() {
    const t = TXT[LANG] || TXT.ar;
    const name = document.getElementById('chRvName').value.trim();
    const comment = document.getElementById('chRvComment').value.trim();
    const msg = document.getElementById('chRvMsg');
    const btn = document.getElementById('chRvSubmit');

    if (!name) { msg.style.color = '#e76'; msg.textContent = t.errName; return; }
    if (!chosenRating) { msg.style.color = '#e76'; msg.textContent = t.errRating; return; }

    btn.disabled = true; btn.textContent = t.sending; msg.textContent = '';
    try {
      const { error } = await sb.from('product_reviews').insert([{
        product_id: String(PID),
        author_name: name,
        rating: chosenRating,
        comment: comment || null,
        is_approved: false
      }]);
      if (error) throw error;
      msg.style.color = 'var(--gold,#e8c178)';
      msg.textContent = t.thanks;
      document.getElementById('chRvName').value = '';
      document.getElementById('chRvComment').value = '';
      chosenRating = 0;
      document.querySelectorAll('#chPicker span').forEach(s => s.classList.remove('on'));
    } catch (e) {
      msg.style.color = '#e76';
      msg.textContent = t.errGeneric;
    } finally {
      btn.disabled = false; btn.textContent = t.submit;
    }
  }

  // ---------- load ----------
  async function load() {
    if (typeof sb === 'undefined') return;
    const { data, error } = await sb
      .from('product_reviews')
      .select('*')
      .eq('product_id', String(PID))
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    render(error ? [] : (data || []));
  }

  // ---------- public init ----------
  function init(productId, lang) {
    PID = (productId != null && productId !== '')
      ? productId
      : new URLSearchParams(location.search).get('id');
    LANG = lang || document.documentElement.lang || 'ar';
    if (!PID) return;
    injectStyles();
    const old = document.getElementById('chReviews');
    if (old) old.remove();         // تجنّب التكرار عند تبديل اللغة
    load();
  }

  // ---------- تشغيل تلقائي (لا حاجة لتعديل أي كود آخر) ----------
  function boot() { setTimeout(() => init(), 0); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('langChanged', boot);   // إعادة التشغيل عند تبديل اللغة

  return { init };
})();
