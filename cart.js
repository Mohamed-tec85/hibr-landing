/* ============================================================
   CHATTLLE — CART SYSTEM
   ============================================================
   Cart structure: [{ id: number, qty: number }, ...]
   Stored in localStorage under 'chattlle-cart'.
   ============================================================ */

const CART_KEY = 'chattlle-cart';
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

  // ========== GA4: add_to_cart event ==========
  if(typeof gtag !== 'undefined'){
    try {
      const product = getProduct(productId);
      if(product){
        const lang = getCurrentLang();
        gtag('event', 'add_to_cart', {
          currency: 'SAR',
          value: parseFloat(product.prices.current) * qty,
          items: [{
            item_id: String(productId),
            item_name: product[lang]?.title || product.ar?.title || 'Product',
            item_category: product.category || '',
            price: parseFloat(product.prices.current),
            quantity: qty
          }]
        });
      }
    } catch(e){ console.warn('GA4 tracking error:', e); }
  }
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
  showToast(getText('toast.cleared'), '×');
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

function getCartTotal(){
  return getCartSubtotal() + getCartVAT();
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
  // remove existing
  const existing = document.querySelector('.toast');
  if(existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<div class="toast-icon">${icon}</div><div>${message}</div>`;
  document.body.appendChild(toast);

  // animate in
  setTimeout(() => toast.classList.add('show'), 10);

  // animate out & remove
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

  // Also save to Supabase (fire-and-forget; localStorage is the source of truth for success page)
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
