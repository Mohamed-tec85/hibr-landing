/* ============================================================
   CHATTLLE — SEO SCHEMA GENERATOR
   ============================================================
   Auto-generates Schema.org structured data for each page type:
   - Organization (sitewide)
   - WebSite (with SearchAction)
   - BreadcrumbList
   - Product (product pages)
   - Article/BlogPosting (blog pages)
   - FAQPage (FAQ page)
   - LocalBusiness (Saudi Arabia)
   ============================================================ */

(function(){

  const SITE = {
    name: 'Chattlle',
    url: 'https://chattlle.com',
    logo: 'https://chattlle.com/assets/logo.png',
    description: 'منصة الجيل الجديد لبيع الملفات الإلكترونية المُولّدة بالذكاء الاصطناعي',
    descriptionEn: 'Next-generation digital files marketplace powered by AI',
    email: 'hello@chattlle.com',
    phone: '+966500000000',
    address: {
      country: 'SA',
      region: 'Eastern Province',
      city: 'Dammam'
    },
    social: [
      'https://twitter.com/chattlle',
      'https://instagram.com/chattlle',
      'https://tiktok.com/@chattlle'
    ]
  };

  // Helper: Inject schema as JSON-LD script
  function injectSchema(schema, id){
    // Remove old schema if exists
    if (id){
      const old = document.getElementById(id);
      if (old) old.remove();
    }
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    if (id) script.id = id;
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  // ============================================================
  // 1. ORGANIZATION SCHEMA (Every page)
  // ============================================================
  function injectOrganizationSchema(){
    const schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": SITE.url + '/#organization',
      "name": SITE.name,
      "url": SITE.url,
      "logo": {
        "@type": "ImageObject",
        "url": SITE.logo,
        "width": 200,
        "height": 200
      },
      "description": SITE.description,
      "email": SITE.email,
      "address": {
        "@type": "PostalAddress",
        "addressCountry": SITE.address.country,
        "addressRegion": SITE.address.region,
        "addressLocality": SITE.address.city
      },
      "sameAs": SITE.social,
      "areaServed": [
        { "@type": "Country", "name": "Saudi Arabia" },
        { "@type": "Country", "name": "United Arab Emirates" },
        { "@type": "Country", "name": "Kuwait" },
        { "@type": "Country", "name": "Qatar" },
        { "@type": "Country", "name": "Bahrain" },
        { "@type": "Country", "name": "Oman" },
        { "@type": "Country", "name": "Egypt" }
      ]
    };
    injectSchema(schema, 'schema-organization');
  }

  // ============================================================
  // 2. WEBSITE SCHEMA (with Search Action)
  // ============================================================
  function injectWebsiteSchema(){
    const schema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": SITE.url + '/#website',
      "url": SITE.url,
      "name": SITE.name,
      "description": SITE.description,
      "publisher": { "@id": SITE.url + '/#organization' },
      "inLanguage": ["ar", "en"],
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": SITE.url + '/blog.html?search={search_term_string}'
        },
        "query-input": "required name=search_term_string"
      }
    };
    injectSchema(schema, 'schema-website');
  }

  // ============================================================
  // 3. BREADCRUMB SCHEMA (Auto-detected from URL)
  // ============================================================
  function injectBreadcrumbSchema(){
    const path = window.location.pathname;
    const segments = path.split('/').filter(s => s && s !== 'index.html');

    if (segments.length === 0) return; // No breadcrumb for home

    const breadcrumbs = [
      { name: 'الرئيسية', url: SITE.url }
    ];

    let currentPath = SITE.url;
    segments.forEach((seg, i) => {
      currentPath += '/' + seg;
      const cleanName = seg.replace('.html', '').replace(/-/g, ' ');
      const arabicNames = {
        'about': 'من نحن',
        'contact': 'اتصل بنا',
        'blog': 'المدوّنة',
        'blog post': 'مقالة',
        'ai tools': 'أدوات AI',
        'product': 'منتج',
        'cart': 'السلة',
        'checkout': 'الدفع',
        'faq': 'الأسئلة الشائعة',
        'terms': 'الشروط',
        'privacy': 'الخصوصية'
      };
      breadcrumbs.push({
        name: arabicNames[cleanName] || cleanName,
        url: currentPath
      });
    });

    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((b, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": b.name,
        "item": b.url
      }))
    };
    injectSchema(schema, 'schema-breadcrumb');
  }

  // ============================================================
  // 4. PRODUCT SCHEMA (product.html)
  // ============================================================
  window.injectProductSchema = function(product){
    if (!product) return;

    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.title_ar || product.title || product.name,
      "description": product.description_ar || product.description || product.desc,
      "image": product.image || product.image_url,
      "brand": {
        "@type": "Brand",
        "name": SITE.name
      },
      "offers": {
        "@type": "Offer",
        "url": window.location.href,
        "priceCurrency": "SAR",
        "price": product.price,
        "availability": "https://schema.org/InStock",
        "itemCondition": "https://schema.org/NewCondition",
        "seller": {
          "@type": "Organization",
          "name": SITE.name
        }
      }
    };

    // Add rating if available
    if (product.rating){
      schema.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": product.rating,
        "reviewCount": product.reviews_count || 1,
        "bestRating": "5",
        "worstRating": "1"
      };
    }

    injectSchema(schema, 'schema-product');
  };

  // ============================================================
  // 5. ARTICLE/BLOG POST SCHEMA
  // ============================================================
  window.injectArticleSchema = function(article){
    if (!article) return;

    const schema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": article.title_ar || article.title,
      "description": article.excerpt_ar || article.excerpt,
      "image": article.image_url,
      "datePublished": article.published_at || article.created_at,
      "dateModified": article.updated_at || article.published_at,
      "author": {
        "@type": "Organization",
        "name": SITE.name,
        "url": SITE.url
      },
      "publisher": {
        "@type": "Organization",
        "name": SITE.name,
        "logo": {
          "@type": "ImageObject",
          "url": SITE.logo
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": window.location.href
      },
      "inLanguage": article.language || "ar",
      "articleSection": article.category || "AI",
      "wordCount": article.content_ar ? article.content_ar.length / 5 : undefined
    };

    if (article.views_count) {
      schema.interactionStatistic = {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/ReadAction",
        "userInteractionCount": article.views_count
      };
    }

    injectSchema(schema, 'schema-article');
  };

  // ============================================================
  // 6. FAQ SCHEMA (FAQ page)
  // ============================================================
  function injectFAQSchema(){
    if (!window.location.pathname.includes('faq')) return;

    // Auto-extract FAQs from page
    const faqs = [];
    document.querySelectorAll('.faq-item, .faq-q, .faq-question').forEach(item => {
      const q = item.querySelector('.faq-q, .question, h3')?.textContent?.trim();
      const a = item.querySelector('.faq-a, .answer, p')?.textContent?.trim();
      if (q && a) faqs.push({ q, a });
    });

    // Fallback: Hardcoded FAQs (common questions)
    if (faqs.length === 0){
      faqs.push(
        { q: 'كيف أشتري منتج من Chattlle؟', a: 'اختر المنتج، أضفه للسلة، أكمل بيانات الدفع، ستصلك روابط التحميل فورًا على إيميلك.' },
        { q: 'هل يمكنني استرداد المبلغ؟', a: 'نعم، خلال 7 أيام إذا كان المنتج معطوبًا أو لا يطابق الوصف.' },
        { q: 'ما طرق الدفع المتاحة؟', a: 'مدى، Visa، Mastercard، STC Pay، وApple Pay - كلها آمنة 100%.' },
        { q: 'هل المنتجات أصلية؟', a: 'نعم، جميع منتجاتنا أصلية ومُولّدة بأحدث تقنيات الذكاء الاصطناعي.' },
        { q: 'كيف أتواصل مع الدعم؟', a: 'عبر صفحة "اتصل بنا" أو إيميل hello@chattlle.com - نرد خلال 24 ساعة.' }
      );
    }

    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.a
        }
      }))
    };
    injectSchema(schema, 'schema-faq');
  }

  // ============================================================
  // 7. ITEMLIST SCHEMA (Blog listing, Products listing)
  // ============================================================
  window.injectItemListSchema = function(items, listType){
    if (!items || items.length === 0) return;

    const schema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "numberOfItems": items.length,
      "itemListElement": items.map((item, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "url": item.url,
        "name": item.name
      }))
    };
    injectSchema(schema, 'schema-itemlist');
  };

  // ============================================================
  // META TAGS OPTIMIZATION
  // ============================================================
  function optimizeMetaTags(){
    // Ensure viewport
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0';
      document.head.appendChild(viewport);
    }

    // Ensure charset
    if (!document.querySelector('meta[charset]')) {
      const charset = document.createElement('meta');
      charset.setAttribute('charset', 'UTF-8');
      document.head.insertBefore(charset, document.head.firstChild);
    }

    // Ensure language
    if (!document.documentElement.lang) {
      document.documentElement.lang = 'ar';
    }

    // Add hreflang for SEO multi-language
    if (!document.querySelector('link[rel="alternate"][hreflang="ar"]')) {
      const currentUrl = window.location.href.split('?')[0];
      const baseUrl = currentUrl.split('#')[0];

      const arLink = document.createElement('link');
      arLink.rel = 'alternate';
      arLink.hreflang = 'ar';
      arLink.href = baseUrl;
      document.head.appendChild(arLink);

      const enLink = document.createElement('link');
      enLink.rel = 'alternate';
      enLink.hreflang = 'en';
      enLink.href = baseUrl + '?lang=en';
      document.head.appendChild(enLink);

      const xDefault = document.createElement('link');
      xDefault.rel = 'alternate';
      xDefault.hreflang = 'x-default';
      xDefault.href = baseUrl;
      document.head.appendChild(xDefault);
    }

    // Add canonical if missing
    if (!document.querySelector('link[rel="canonical"]')) {
      const canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = window.location.href.split('?')[0].split('#')[0];
      document.head.appendChild(canonical);
    }

    // Add robots meta if missing
    if (!document.querySelector('meta[name="robots"]')) {
      const robots = document.createElement('meta');
      robots.name = 'robots';
      robots.content = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
      document.head.appendChild(robots);
    }

    // Add author
    if (!document.querySelector('meta[name="author"]')) {
      const author = document.createElement('meta');
      author.name = 'author';
      author.content = SITE.name;
      document.head.appendChild(author);
    }

    // Add theme-color (for mobile browsers)
    if (!document.querySelector('meta[name="theme-color"]')) {
      const theme = document.createElement('meta');
      theme.name = 'theme-color';
      theme.content = '#0a0613';
      document.head.appendChild(theme);
    }
  }

  // ============================================================
  // INIT
  // ============================================================
  function init(){
    optimizeMetaTags();
    injectOrganizationSchema();
    injectWebsiteSchema();
    injectBreadcrumbSchema();
    injectFAQSchema();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
