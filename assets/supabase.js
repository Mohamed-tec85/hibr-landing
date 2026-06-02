/* ============================================================
   CHATTLLE — SUPABASE CLIENT
   ============================================================
   Connection, products, orders, authentication, file storage.
   ============================================================ */

const SUPABASE_URL = 'https://opwqklcttccnixvzspdx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SwP52S6BniqaRHoL0Zqvmw_8rqttMUI';

// Initialize client (supabase-js loaded via CDN in HTML)
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================
   PRODUCTS
   ============================================================ */

// Map a DB row to the JS product shape used by the site
function mapProduct(row){
  return {
    id: row.id,
    slug: row.slug,
    icon: row.icon || '📦',
    gradient: row.gradient || 'grad-1',
    badge: row.badge || 'new',
    category: row.category,
    prices: {
      current: parseFloat(row.price_current),
      old: row.price_old ? parseFloat(row.price_old) : null
    },
    rating: parseFloat(row.rating) || 5.0,
    reviews: row.reviews_count || 0,
    imageUrl: row.image_url || null,
    previewImages: Array.isArray(row.preview_images) ? row.preview_images : [],
    fileUrl: row.file_url || null,
    isActive: row.is_active !== false,
    displayOrder: row.display_order || 0,
    ar: {
      title: row.title_ar,
      desc: row.desc_ar || '',
      longDesc: row.long_desc_ar || row.desc_ar || '',
      features: Array.isArray(row.features_ar) ? row.features_ar : [],
      format: row.format || '—',
      size: row.size || '—',
      language: row.language || '—'
    },
    en: {
      title: row.title_en,
      desc: row.desc_en || '',
      longDesc: row.long_desc_en || row.desc_en || '',
      features: Array.isArray(row.features_en) ? row.features_en : [],
      format: row.format || '—',
      size: row.size || '—',
      language: row.language || '—'
    }
  };
}

// Fetch ALL active products (for public site)
async function sbFetchProducts(){
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('id', { ascending: true });

  if(error){
    console.error('Failed to fetch products:', error);
    return [];
  }
  return data.map(mapProduct);
}

// Fetch ALL products (active + inactive — for admin)
async function sbFetchAllProducts(){
  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('display_order', { ascending: true })
    .order('id', { ascending: true });

  if(error){
    console.error('Failed to fetch all products:', error);
    return [];
  }
  return data.map(mapProduct);
}

// Single product by ID
async function sbFetchProduct(id){
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if(error || !data) return null;
  return mapProduct(data);
}

// Create new product (admin only)
async function sbCreateProduct(productData){
  const { data, error } = await sb
    .from('products')
    .insert([productData])
    .select()
    .single();

  if(error){
    console.error('Create failed:', error);
    return { success: false, error: error.message };
  }
  return { success: true, product: mapProduct(data) };
}

// Update product (admin only)
async function sbUpdateProduct(id, updates){
  const { data, error } = await sb
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if(error){
    console.error('Update failed:', error);
    return { success: false, error: error.message };
  }
  return { success: true, product: mapProduct(data) };
}

// Delete product (admin only)
async function sbDeleteProduct(id){
  const { error } = await sb
    .from('products')
    .delete()
    .eq('id', id);

  if(error){
    console.error('Delete failed:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/* ============================================================
   FILE UPLOADS
   ============================================================ */

// Upload product image to public bucket
async function sbUploadProductImage(file, productSlug){
  const ext = file.name.split('.').pop().toLowerCase();
  const filename = `${productSlug}-${Date.now()}.${ext}`;

  const { data, error } = await sb.storage
    .from('product-images')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false
    });

  if(error){
    console.error('Image upload failed:', error);
    return { success: false, error: error.message };
  }

  // Get public URL
  const { data: urlData } = sb.storage
    .from('product-images')
    .getPublicUrl(filename);

  return { success: true, url: urlData.publicUrl, path: filename };
}

// Upload product file (PDF, ZIP, etc.) to private bucket
async function sbUploadProductFile(file, productSlug){
  const ext = file.name.split('.').pop().toLowerCase();
  const filename = `${productSlug}-${Date.now()}.${ext}`;

  const { data, error } = await sb.storage
    .from('product-files')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false
    });

  if(error){
    console.error('File upload failed:', error);
    return { success: false, error: error.message };
  }

  return { success: true, path: filename };
}

// Delete file from storage
async function sbDeleteFile(bucket, path){
  const { error } = await sb.storage
    .from(bucket)
    .remove([path]);
  return { success: !error, error: error?.message };
}

// Generate a temporary signed URL for downloading a product file
// Valid for 1 hour by default — security via short expiry
async function sbGetSignedFileUrl(filePath, expiresIn = 3600){
  if(!filePath){
    return { success: false, error: 'No file path provided' };
  }
  const { data, error } = await sb.storage
    .from('product-files')
    .createSignedUrl(filePath, expiresIn);

  if(error){
    console.error('Signed URL creation failed:', error);
    return { success: false, error: error.message };
  }
  return { success: true, url: data.signedUrl };
}

/* ============================================================
   ORDERS
   ============================================================ */

// Save an order (any visitor can place)
async function sbCreateOrder(orderData){
  const { data, error } = await sb
    .from('orders')
    .insert([{
      order_number: orderData.id,
      customer_name: orderData.customer.name,
      customer_email: orderData.customer.email,
      customer_phone: orderData.customer.phone,
      customer_country: orderData.customer.country || 'SA',
      items: orderData.items.map(i => ({
        product_id: i.id,
        product_title: i.product.ar.title,
        qty: i.qty,
        unit_price: i.product.prices.current,
        line_total: i.lineTotal
      })),
      subtotal: orderData.subtotal,
      vat: orderData.vat,
      total: orderData.total,
      payment_method: orderData.method,
      status: orderData.status || 'completed'
    }])
    .select()
    .single();

  if(error){
    console.error('Order save failed:', error);
    return { success: false, error: error.message };
  }
  return { success: true, order: data };
}

// Fetch orders (admin only)
async function sbFetchOrders(){
  const { data, error } = await sb
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if(error){
    console.error('Failed to fetch orders:', error);
    return [];
  }
  return data;
}

/* ============================================================
   AUTHENTICATION
   ============================================================ */

async function sbSignIn(email, password){
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if(error) return { success: false, error: error.message };
  return { success: true, user: data.user };
}

async function sbSignOut(){
  await sb.auth.signOut();
}

async function sbGetCurrentUser(){
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

async function sbIsAuthenticated(){
  const user = await sbGetCurrentUser();
  return !!user;
}
