/* ============================================================
   CHATTLLE — PRODUCTS (Supabase-backed)
   ============================================================
   PRODUCTS array is populated by loadProducts() before render.
   ============================================================ */

let PRODUCTS = [];
let _productsLoaded = false;
let _productsLoadingPromise = null;

// Load products from Supabase (cached after first call)
async function loadProducts(force = false){
  if(_productsLoaded && !force) return PRODUCTS;
  if(_productsLoadingPromise && !force) return _productsLoadingPromise;

  _productsLoadingPromise = (async () => {
    try {
      PRODUCTS = await sbFetchProducts();
      _productsLoaded = true;
    } catch(err) {
      console.error('Failed to load products:', err);
      PRODUCTS = [];
    }
    _productsLoadingPromise = null;
    return PRODUCTS;
  })();

  return _productsLoadingPromise;
}

// Synchronous helper — works after loadProducts()
function getProduct(id){
  return PRODUCTS.find(p => p.id === parseInt(id));
}

// Format price string by language
function formatPrice(amount, lang){
  if(lang === 'en') return `SAR ${amount}`;
  return `${amount} ر.س`;
}

// Render product visual (image OR gradient + icon)
function productVisualHtml(product){
  if(product.imageUrl){
    return `<img src="${product.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0">`;
  }
  return `<div class="gradient ${product.gradient}"></div><div class="icon-big" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:5rem;opacity:.9;z-index:1">${product.icon}</div>`;
}

// Smaller variant for cart/checkout/related
function productMiniVisualHtml(product){
  if(product.imageUrl){
    return `<img src="${product.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0">`;
  }
  return `<div class="gradient ${product.gradient}"></div><div class="ic" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.6rem">${product.icon}</div>`;
}
