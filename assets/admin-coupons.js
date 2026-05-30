/* ============================================================
   Chattlle — إدارة كوبونات الخصم (داخل admin.html)
   تعتمد على Supabase (المتغيّر العام sb) وجدول coupons.
   ============================================================ */
(function () {

  function esc(s){
    return (s == null ? '' : String(s)).replace(/[&<>"]/g, c =>
      ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  }

  async function createCoupon(){
    const code  = (document.getElementById('cpCode').value || '').trim().toUpperCase();
    const type  = document.getElementById('cpType').value;
    const value = parseFloat(document.getElementById('cpValue').value);
    const minOrder = parseFloat(document.getElementById('cpMin').value) || 0;
    const days  = parseInt(document.getElementById('cpDays').value);

    if(!code){ alert('⚠️ اكتب كود الخصم'); return; }
    if(!(value > 0)){ alert('⚠️ اكتب قيمة خصم صحيحة'); return; }
    if(type === 'percent' && value > 100){ alert('⚠️ النسبة لا تتجاوز 100%'); return; }

    let expires_at = null;
    if(days && days > 0) expires_at = new Date(Date.now() + days*86400000).toISOString();

    const btn = document.getElementById('cpCreateBtn');
    btn.disabled = true; const t = btn.textContent; btn.textContent = '⏳ جارٍ الحفظ…';
    try{
      const { error } = await sb.from('coupons').insert([{
        code, discount_type: type, discount_value: value,
        min_order: minOrder, expires_at, is_active: true
      }]);
      if(error){
        if((error.message||'').includes('duplicate') || error.code === '23505')
          alert('⚠️ هذا الكود مستخدم بالفعل، اختر كودًا آخر.');
        else throw error;
      } else {
        document.getElementById('cpCode').value = '';
        document.getElementById('cpValue').value = '';
        document.getElementById('cpMin').value = '0';
        document.getElementById('cpDays').value = '';
        loadCoupons();
      }
    }catch(e){ alert('خطأ: ' + e.message); }
    finally{ btn.disabled = false; btn.textContent = t; }
  }

  async function loadCoupons(){
    const list = document.getElementById('couponsList');
    const empty = document.getElementById('couponsEmpty');
    try{
      const { data, error } = await sb.from('coupons').select('*').order('created_at', { ascending:false });
      if(error) throw error;
      const rows = data || [];
      if(rows.length === 0){ list.innerHTML=''; if(empty) empty.style.display='block'; return; }
      if(empty) empty.style.display='none';

      list.innerHTML = rows.map(c => {
        const val = c.discount_type === 'percent' ? `${c.discount_value}%` : `${c.discount_value} ر.س`;
        const expired = c.expires_at && new Date(c.expires_at) < new Date();
        const expTxt = c.expires_at
          ? new Date(c.expires_at).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' })
          : 'بدون انتهاء';
        const active = c.is_active && !expired;
        return `
        <div style="background:rgba(245,239,227,.04);border:1px solid var(--line);border-radius:16px;padding:1.3rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <div style="font-weight:700;color:var(--gold);font-size:1.1rem;letter-spacing:1px">${esc(c.code)}
              ${active
                ? '<span style="background:rgba(92,229,217,.12);color:var(--cyan);padding:.2rem .6rem;border-radius:100px;font-size:.7rem;margin-inline-start:.5rem">فعّال</span>'
                : `<span style="background:rgba(255,99,99,.12);color:#ff6b6b;padding:.2rem .6rem;border-radius:100px;font-size:.7rem;margin-inline-start:.5rem">${expired ? 'منتهٍ' : 'موقوف'}</span>`}
            </div>
            <div style="color:var(--ink-mute);font-size:.85rem;margin-top:.4rem">
              خصم: <b style="color:var(--ink)">${val}</b>
              ${c.min_order ? ` · حد أدنى ${c.min_order} ر.س` : ''}
              · ينتهي: ${expTxt}
            </div>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <button onclick="toggleCoupon('${c.id}', ${c.is_active})" style="padding:.5rem 1rem;background:rgba(255,193,7,.1);color:#ffc107;border:1px solid rgba(255,193,7,.25);border-radius:10px;cursor:pointer;font-family:inherit;font-size:.85rem">${c.is_active ? '⏸️ إيقاف' : '▶️ تفعيل'}</button>
            <button onclick="deleteCoupon('${c.id}')" style="padding:.5rem 1rem;background:rgba(255,99,99,.1);color:#ff6b6b;border:1px solid rgba(255,99,99,.25);border-radius:10px;cursor:pointer;font-family:inherit;font-size:.85rem">🗑️ حذف</button>
          </div>
        </div>`;
      }).join('');
    }catch(e){
      list.innerHTML = `<div style="color:var(--ink-mute);padding:2rem;text-align:center">
        تعذّر تحميل الكوبونات: ${esc(e.message)}<br>تأكّد من إنشاء جدول <b>coupons</b> في Supabase.</div>`;
    }
  }

  async function toggleCoupon(id, current){
    try{
      const { error } = await sb.from('coupons').update({ is_active: !current }).eq('id', id);
      if(error) throw error; loadCoupons();
    }catch(e){ alert('فشل: ' + e.message); }
  }

  async function deleteCoupon(id){
    if(!confirm('حذف هذا الكوبون نهائيًا؟')) return;
    try{
      const { error } = await sb.from('coupons').delete().eq('id', id);
      if(error) throw error; loadCoupons();
    }catch(e){ alert('فشل: ' + e.message); }
  }

  window.createCoupon = createCoupon;
  window.loadCoupons  = loadCoupons;
  window.toggleCoupon = toggleCoupon;
  window.deleteCoupon = deleteCoupon;

  function wire(){
    const tab = document.querySelector('.admin-tab[data-section="coupons"]');
    if(tab) tab.addEventListener('click', loadCoupons);
    const btn = document.getElementById('cpCreateBtn');
    if(btn) btn.addEventListener('click', createCoupon);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

})();
