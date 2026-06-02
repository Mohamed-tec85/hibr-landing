/* ============================================================
   Chattlle — Blog Article Ad (blog-post.html only)
   Waits until the article content is visible and rendered,
   then inserts a responsive AdSense unit at the end of the
   article body (before the share buttons) and requests the ad.
   This avoids "availableWidth=0" errors caused by inserting
   ads inside a hidden (display:none) container.
   ============================================================ */
(function () {
  var AD_CLIENT = "ca-pub-5949875363185588";
  var AD_SLOT   = "6021613908";
  var inserted  = false;

  function articleReady() {
    var wrap = document.getElementById("articleContent");
    var body = document.getElementById("articleBody");
    if (!wrap || !body) return false;
    var visible = window.getComputedStyle(wrap).display !== "none";
    var hasText = body.innerHTML.trim().length > 50;
    return visible && hasText;
  }

  function insertAd() {
    if (inserted) return;
    var body = document.getElementById("articleBody");
    if (!body || !articleReady()) return;
    inserted = true;

    var box = document.createElement("div");
    box.className = "ch-article-ad";
    box.style.cssText =
      "margin:2.5rem auto; text-align:center; min-height:100px; max-width:100%; overflow:hidden;";

    var label = document.createElement("div");
    label.textContent = "إعلان";
    label.style.cssText =
      "font-size:.7rem; color:#8a869a; opacity:.7; margin-bottom:.35rem; letter-spacing:.06em;";
    box.appendChild(label);

    var ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", AD_CLIENT);
    ins.setAttribute("data-ad-slot", AD_SLOT);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    box.appendChild(ins);

    // place right after the article text, before the share section
    body.parentNode.insertBefore(box, body.nextSibling);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) { /* loader not ready yet; AdSense will process the queue */ }
  }

  function watch(triesLeft) {
    if (inserted) return;
    insertAd();
    if (!inserted && triesLeft > 0) {
      setTimeout(function () { watch(triesLeft - 1); }, 400);
    }
  }

  function boot() { watch(40); } // ~16s window for the article to load

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
