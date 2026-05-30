/* ============================================================
   CHATTLLE — CART SYSTEM
   ============================================================
   Cart structure: [{ id: number, qty: number }, ...]
   Stored in localStorage under 'chattlle-cart'.
   ============================================================ */

const CART_KEY = 'chattlle-cart';
const COUPON_KEY = 'chattlle-coupon';
const VAT_RATE = 0.15; // 15% Saudi VAT

/* ===== STORAGE ===== */
function getCart(){
  try{
    const data = localStorage.getItem(CART_KEY);
    return data ? JSON.parse(data) : [];
  }catch(e){
    return [];
  }
}

function saveCart(cart){
  try{
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
    document.dispatchEvent(new CustomEvent('cartChanged', { detail: { cart } }));
  }catch(e){
    console.error('Cart save failed:', e);
  }
}

/* ===== ACTIONS ===== */
function addToCart(productId, qty = 1){
  const cart = getCart();
  const existing = cart.find(item => item.id === productId);
  if(existing){
    existing.qty += qty;
  } else {
    cart.push({ id: productId, qty: qty });
  }
  saveCart(cart);
  bumpCartBadge();
  showToast(getText('toast.added'), '✓');
}

function removeFromCart(productId){
  let cart = getCart();
  cart = cart.filter(item => item.id !== productId);
  saveCart(cart);
  showToast(getText('toast.removed'), '×');
}

function updateQuantity(productId, qty){
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if(item){
    item.qty = Math.max(1, parseInt(qty) || 1);
    saveCart(cart);
  }
}

function clearCart(){
  saveCart([]);
  removeCoupon();
  showToast(getText('toast.cleared'), '×');
}

/* ===== COUPONS ===== */
function getAppliedCoupon(){
  try{
    const data = localStorage.getItem(COUPON_KEY);
    return data ? JSON.parse(data) : null;
  }catch(e){ return null; }
}

function setAppliedCoupon(coupon){
  try{ localStorage.setItem(COUPON_KEY, JSON.stringify(coupon)); }catch(e){}
}

function removeCoupon(){
  try{ localStorage.removeItem(COUPON_KEY); }catch(e){}
}

// قيمة الخصم الحالية بناءً على الكوبون المطبّق
function getCartDiscount(){
  const c = getAppliedCoupon();
  if(!c) return 0;
  const subtotal = getCartSubtotal();
  if(subtotal <= 0) return 0;
  if(c.expires_at && new Date(c.expires_at) < new Date()) return 0;       // منتهي
  if(c.min_order && subtotal < c.min_order) return 0;                      // أقل من الحد الأدنى
  let d = (c.discount_type === 'percent')
    ? subtotal * (Number(c.discount_value) / 100)
    : Number(c.discount_value);
  const cap = subtotal + getCartVAT();
  return Math.min(Math.max(0, d), cap);                                    // لا يتجاوز الإجمالي
}

// التحقّق من كود وتطبيقه (يُستخدم في صفحة السلة)
async function applyCouponCode(rawCode){
  const code = (rawCode || '').trim().toUpperCase();
  if(!code) return { ok:false, msg:'اكتب كود الخصم أولاً' };
  if(typeof sb === 'undefined') return { ok:false, msg:'تعذّر الاتصال بالخادم' };
  try{
    const { data, error } = await sb
      .from('coupons').select('*')
      .eq('code', code).eq('is_active', true).limit(1);
    if(error) throw error;
    const coupon = data && data[0];
    if(!coupon) return { ok:false, msg:'كود الخصم غير صالح' };
    if(coupon.expires_at && new Date(coupon.expires_at) < new Date())
      return { ok:false, msg:'انتهت صلاحية هذا الكود' };
    const subtotal = getCartSubtotal();
    if(coupon.min_order && subtotal < coupon.min_order)
      return { ok:false, msg:`الحد الأدنى للطلب ${coupon.min_order} ر.س` };
    setAppliedCoupon({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order: coupon.min_order || 0,
      expires_at: coupon.expires_at || null
    });
    return { ok:true, msg:'✓ تم تطبيق كود الخصم' };
  }catch(e){
    return { ok:false, msg:'تعذّر التحقّق من الكود، حاول مجددًا' };
  }
}

// ربط واجهة الكوبون في صفحة السلة (تُستدعى من renderCart)
function wireCoupon(lang){
  lang = lang || document.documentElement.lang || 'ar';
  const applied  = getAppliedCoupon();
  const discount = getCartDiscount();
  const card     = document.querySelector('.summary-card');
  const couponRow = document.querySelector('.coupon-row');

  // صف الخصم بين الضريبة والإجمالي
  if(card && discount > 0){
    const old = card.querySelector('.ch-discount-row'); if(old) old.remove();
    const rows = card.querySelectorAll('.summary-row');     // [subtotal, vat, total]
    const vatRow = rows[1];
    if(vatRow && vatRow.parentNode){
      const drow = document.createElement('div');
      drow.className = 'summary-row ch-discount-row';
      drow.style.color = 'var(--gold)';
      drow.innerHTML = `<span>${lang==='ar'?'الخصم':'Discount'} (${applied.code})</span>
        <span class="amt">− ${formatPrice(discount.toFixed(2), lang)}</span>`;
      vatRow.parentNode.insertBefore(drow, vatRow.nextSibling);
    }
  }

  if(!couponRow) return;
  if(applied){
    couponRow.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:.5rem">
        <span style="color:var(--gold);font-weight:600">✓ ${applied.code}</span>
        <button id="removeCouponBtn" style="background:transparent;border:1px solid var(--line);color:var(--ink-mute);border-radius:8px;padding:.4rem .9rem;cursor:pointer;font-family:inherit">
          ${lang==='ar'?'إزالة':'Remove'}
        </button>
      </div>`;
    const rb = document.getElementById('removeCouponBtn');
    if(rb) rb.addEventListener('click', () => {
      removeCoupon();
      if(typeof renderCart === 'function') renderCart();
    });
  } else {
    const btn = document.getElementById('applyCouponBtn');
    const input = document.getElementById('couponInput');
    if(btn) btn.addEventListener('click', async () => {
      btn.disabled = true;
      const res = await applyCouponCode(input ? input.value : '');
      showToast(res.msg, res.ok ? '✓' : '✕');
      btn.disabled = false;
      if(res.ok && typeof renderCart === 'function') renderCart();
    });
  }
}

/* ===== CALCULATIONS ===== */
function getCartCount(){
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function getCartSubtotal(){
  const cart = getCart();
  return cart.reduce((sum, item) => {
    const product = getProduct(item.id);
    return product ? sum + (product.prices.current * item.qty) : sum;
  }, 0);
}

function getCartVAT(){
  return getCartSubtotal() * VAT_RATE;
}

// الإجمالي بعد خصم الكوبون (مصدر واحد للسلة والدفع)
function getCartTotal(){
  return Math.max(0, getCartSubtotal() + getCartVAT() - getCartDiscount());
}

function getCartDetailed(){
  const cart = getCart();
  return cart.map(item => {
    const product = getProduct(item.id);
    return {
      ...item,
      product,
      lineTotal: product ? product.prices.current * item.qty : 0
    };
  }).filter(i => i.product);
}

/* ===== UI HELPERS ===== */
function updateCartBadge(){
  const badge = document.getElementById('cartBadge');
  if(!badge) return;
  const count = getCartCount();
  badge.textContent = count;
  badge.classList.toggle('show', count > 0);
}

function bumpCartBadge(){
  const badge = document.getElementById('cartBadge');
  if(!badge) return;
  badge.classList.add('bump');
  setTimeout(() => badge.classList.remove('bump'), 400);
}

/* ===== TOAST ===== */
function showToast(message, icon = '✓'){
  const existing = document.querySelector('.toast');
  if(existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<div class="toast-icon">${icon}</div><div>${message}</div>`;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

/* ===== ORDER (for checkout) ===== */
function generateOrderId(){
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CHT-${ts.slice(-5)}${rnd}`;
}

function saveOrder(order){
  try{
    localStorage.setItem('chattlle-last-order', JSON.stringify(order));
  }catch(e){}

  if(typeof sbCreateOrder === 'function'){
    sbCreateOrder(order).then(result => {
      if(!result.success){
        console.warn('Order not saved to Supabase:', result.error);
      }
    }).catch(err => console.warn('Order save error:', err));
  }
}

function getLastOrder(){
  try{
    const data = localStorage.getItem('chattlle-last-order');
    return data ? JSON.parse(data) : null;
  }catch(e){
    return null;
  }
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', updateCartBadge);
