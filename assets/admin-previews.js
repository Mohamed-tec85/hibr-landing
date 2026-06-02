/* ============================================================
   CHATTLLE — Product Preview Images (admin)
   ------------------------------------------------------------
   Adds a "preview/sample images" uploader to the product modal.
   Images are uploaded to the existing `product-images` bucket and
   stored as a JSON array in products.preview_images.
   Shown to customers under the cover image on product.html.

   Integration is non-invasive:
   - wraps openProductModal()  -> loads/resets the gallery
   - wraps sbCreateProduct/sbUpdateProduct -> injects preview_images
     ONLY while the product modal is open (so unrelated updates,
     e.g. toggling active state, are never touched).
   Requires a container element: <div id="chPreviewUploader"></div>
   ============================================================ */
(function () {
  var previews = [];

  function lang(){ try { return getCurrentLang(); } catch (e) { return 'ar'; } }
  function isModalOpen(){
    var m = document.getElementById('productModal');
    return !!(m && m.classList.contains('show'));
  }

  function render(){
    var box = document.getElementById('chPreviewUploader');
    if(!box) return;
    var ar = lang() === 'ar';

    var thumbs = previews.map(function (u, i) {
      return '' +
        '<div style="position:relative;width:84px;height:84px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#0f0a1c">' +
          '<img src="' + u + '" alt="" style="width:100%;height:100%;object-fit:cover">' +
          '<button type="button" data-rm="' + i + '" title="' + (ar ? 'إزالة' : 'Remove') + '" ' +
            'style="position:absolute;top:3px;' + (ar ? 'left' : 'right') + ':3px;width:22px;height:22px;border:none;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;cursor:pointer;font-size:14px;line-height:22px;text-align:center;padding:0">×</button>' +
        '</div>';
    }).join('');

    box.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;gap:.6rem;align-items:center">' +
        thumbs +
        '<button type="button" id="chPrevAddBtn" ' +
          'style="width:84px;height:84px;border:1px dashed var(--line);border-radius:10px;background:transparent;color:var(--ink-mute,#9a96aa);cursor:pointer;font-size:1.7rem;line-height:1">+</button>' +
      '</div>' +
      '<input type="file" id="chPrevFile" accept="image/*" multiple style="display:none">' +
      '<div id="chPrevProgress" style="font-size:.8rem;color:var(--ink-mute,#9a96aa);margin-top:.5rem;display:none">' +
        (ar ? 'جارٍ الرفع…' : 'Uploading…') +
      '</div>';

    var addBtn = document.getElementById('chPrevAddBtn');
    var file = document.getElementById('chPrevFile');
    if(addBtn && file){
      addBtn.onclick = function(){ file.click(); };
      file.onchange = onFiles;
    }
    Array.prototype.forEach.call(box.querySelectorAll('[data-rm]'), function (b) {
      b.onclick = function(){
        var i = parseInt(b.getAttribute('data-rm'), 10);
        previews.splice(i, 1);
        render();
      };
    });
  }

  async function onFiles(e){
    var files = Array.prototype.slice.call(e.target.files || []);
    if(!files.length) return;
    var ar = lang() === 'ar';
    var prog = document.getElementById('chPrevProgress');
    if(prog) prog.style.display = 'block';

    var titleEn = (document.getElementById('fTitleEn') || {}).value || 'preview';
    var slug = (titleEn.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 24)) || 'preview';

    for(var i = 0; i < files.length; i++){
      try {
        var res = await sbUploadProductImage(files[i], 'preview-' + slug);
        if(res && res.success){ previews.push(res.url); }
        else { try { showToast((ar ? 'فشل رفع صورة' : 'Upload failed') + ': ' + ((res && res.error) || ''), '✕'); } catch (_) {} }
      } catch (err) { /* skip a failed file, continue */ }
    }

    if(prog) prog.style.display = 'none';
    e.target.value = '';
    render();
    try { showToast(ar ? 'تم تحديث صور المعاينة' : 'Preview images updated', '✓'); } catch (_) {}
  }

  /* ---------- safe integration with existing modal + save ---------- */
  function integrate(){
    if(typeof window.openProductModal === 'function' && !window.__chPrevOpen){
      var _open = window.openProductModal;
      window.openProductModal = function(productId){
        _open.apply(this, arguments);
        try {
          if(productId && typeof allProducts !== 'undefined'){
            var p = allProducts.find(function (pr) { return pr.id === productId; });
            previews = (p && Array.isArray(p.previewImages)) ? p.previewImages.slice() : [];
          } else {
            previews = [];
          }
        } catch (e) { previews = []; }
        render();
      };
      window.__chPrevOpen = true;
    }

    if(typeof window.sbCreateProduct === 'function' && !window.__chPrevCreate){
      var _c = window.sbCreateProduct;
      window.sbCreateProduct = function(data){
        try { if(isModalOpen() && data) data.preview_images = previews.slice(); } catch (e) {}
        return _c.apply(this, arguments);
      };
      window.__chPrevCreate = true;
    }

    if(typeof window.sbUpdateProduct === 'function' && !window.__chPrevUpdate){
      var _u = window.sbUpdateProduct;
      window.sbUpdateProduct = function(id, updates){
        try { if(isModalOpen() && updates) updates.preview_images = previews.slice(); } catch (e) {}
        return _u.apply(this, arguments);
      };
      window.__chPrevUpdate = true;
    }
  }

  function boot(){ integrate(); render(); }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
