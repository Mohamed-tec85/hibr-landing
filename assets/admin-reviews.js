/* ============================================================
   Chattlle — لوحة إدارة التقييمات (داخل admin.html)
   تعتمد على Supabase (المتغيّر العام sb) وجدول product_reviews.
   ============================================================ */
(function () {

  let allAdminReviews = [];
  let currentReviewFilter = 'all';

  function esc(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"]/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function reviewStars(n) {
    let s = '';
    for (let i = 1; i <= 5; i++)
      s += `<span style="color:${i <= n ? 'var(--gold)' : 'rgba(255,255,255,.2)'}">★</span>`;
    return s;
  }

  async function loadAdminReviews(filter = 'all') {
    currentReviewFilter = filter;
    const list = document.getElementById('adminReviewsList');
    const empty = document.getElementById('reviewsEmptyState');
    try {
      const { data, error } = await sb
        .from('product_reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      let rows = data || [];
      const pending = rows.filter(r => !r.is_approved).length;
      const badge = document.getElementById('reviewsAdminCount');
      if (badge) badge.textContent = pending;

      if (filter === 'approved') rows = rows.filter(r => r.is_approved);
      else if (filter === 'pending') rows = rows.filter(r => !r.is_approved);
      allAdminReviews = rows;

      if (rows.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
      }
      if (empty) empty.style.display = 'none';
      renderAdminReviewsList();
    } catch (err) {
      list.innerHTML = `<div style="color:var(--ink-mute);padding:2rem;text-align:center">
        تعذّر تحميل التقييمات: ${esc(err.message)}<br>
        تأكّد من إنشاء جدول <b>product_reviews</b> في Supabase.</div>`;
    }
  }

  function renderAdminReviewsList() {
    const list = document.getElementById('adminReviewsList');
    list.innerHTML = allAdminReviews.map(r => {
      const date = new Date(r.created_at).toLocaleDateString('ar-SA',
        { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const initial = (r.author_name || '?').charAt(0).toUpperCase();
      return `
      <div style="background:rgba(245,239,227,.04);border:1px solid var(--line);border-radius:16px;padding:1.5rem">
        <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:1rem;flex-wrap:wrap">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--violet),var(--gold));display:flex;align-items:center;justify-content:center;color:var(--bg-deep);font-weight:700;font-size:1.1rem">${initial}</div>
          <div style="flex:1;min-width:200px">
            <div style="color:var(--gold);font-weight:600">${esc(r.author_name)}</div>
            <div style="color:var(--ink-mute);font-size:.82rem">${date} · ${reviewStars(r.rating)}</div>
          </div>
          ${r.is_approved
            ? '<span style="background:rgba(92,229,217,.12);color:var(--cyan);padding:.25rem .7rem;border-radius:100px;font-size:.75rem;font-weight:600">✓ منشور</span>'
            : '<span style="background:rgba(255,193,7,.12);color:#ffc107;padding:.25rem .7rem;border-radius:100px;font-size:.75rem;font-weight:600">⏳ قيد المراجعة</span>'}
        </div>
        ${r.comment ? `<div style="background:rgba(10,6,19,.4);padding:1rem;border-radius:12px;color:var(--ink);line-height:1.7;margin-bottom:1rem;border-inline-start:3px solid var(--gold)">${esc(r.comment)}</div>` : ''}
        <div style="display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;font-size:.85rem">
          <span style="color:var(--ink-mute)">🛍️ منتج رقم: ${esc(r.product_id)}</span>
        </div>
        <div style="display:flex;gap:.5rem;margin-top:1rem;flex-wrap:wrap">
          ${!r.is_approved
            ? `<button onclick="approveReview('${r.id}')" style="padding:.55rem 1.2rem;background:rgba(92,229,217,.12);color:var(--cyan);border:1px solid rgba(92,229,217,.3);border-radius:10px;cursor:pointer;font-size:.85rem;font-family:inherit">✓ موافقة ونشر</button>`
            : `<button onclick="unapproveReview('${r.id}')" style="padding:.55rem 1.2rem;background:rgba(255,193,7,.1);color:#ffc107;border:1px solid rgba(255,193,7,.25);border-radius:10px;cursor:pointer;font-size:.85rem;font-family:inherit">⏸️ إخفاء</button>`
          }
          <button onclick="deleteAdminReview('${r.id}')" style="padding:.55rem 1.2rem;background:rgba(255,99,99,.1);color:#ff6b6b;border:1px solid rgba(255,99,99,.25);border-radius:10px;cursor:pointer;font-size:.85rem;font-family:inherit">🗑️ حذف</button>
        </div>
      </div>`;
    }).join('');
  }

  async function approveReview(id) {
    try {
      const { error } = await sb.from('product_reviews').update({ is_approved: true }).eq('id', id);
      if (error) throw error;
      loadAdminReviews(currentReviewFilter);
    } catch (err) { alert('فشل: ' + err.message); }
  }

  async function unapproveReview(id) {
    try {
      const { error } = await sb.from('product_reviews').update({ is_approved: false }).eq('id', id);
      if (error) throw error;
      loadAdminReviews(currentReviewFilter);
    } catch (err) { alert('فشل: ' + err.message); }
  }

  async function deleteAdminReview(id) {
    if (!confirm('هل أنت متأكّد من حذف هذا التقييم؟ لا يمكن التراجع.')) return;
    try {
      const { error } = await sb.from('product_reviews').delete().eq('id', id);
      if (error) throw error;
      loadAdminReviews(currentReviewFilter);
    } catch (err) { alert('فشل: ' + err.message); }
  }

  // إتاحة الدوال للأزرار داخل الصفحة
  window.loadAdminReviews = loadAdminReviews;
  window.approveReview = approveReview;
  window.unapproveReview = unapproveReview;
  window.deleteAdminReview = deleteAdminReview;

  // تحميل البيانات عند فتح التبويب + عدّاد المعلّقة عند بدء الصفحة
  function wire() {
    const tab = document.querySelector('.admin-tab[data-section="reviews"]');
    if (tab) tab.addEventListener('click', () => loadAdminReviews('all'));
    // عدّاد التقييمات المعلّقة في الشارة
    if (typeof sb !== 'undefined') {
      sb.from('product_reviews').select('id', { count: 'exact', head: true })
        .eq('is_approved', false)
        .then(({ count }) => {
          const badge = document.getElementById('reviewsAdminCount');
          if (badge && typeof count === 'number') badge.textContent = count;
        }).catch(() => { });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

})();
