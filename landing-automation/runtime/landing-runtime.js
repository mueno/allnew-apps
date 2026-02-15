(function () {
  'use strict';

  const DATA_PATH = 'data/landing-apps.generated.json';
  const VISIBLE_STATUSES = new Set(['submitted', 'released']);

  const CATEGORY_TARGETS = {
    camera: { gridId: 'camera-grid', tag: 'Camera + OCR' },
    voice: { gridId: 'voice-grid', tag: 'Voice Input' },
    sound: { gridId: 'sound-grid', tag: 'Sound Detection' }
  };

  function resolveGridCategory(app) {
    if (app && app.category && CATEGORY_TARGETS[app.category]) {
      return app.category;
    }
    return 'camera';
  }

  function safeText(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        default:
          return char;
      }
    });
  }

  function isExternalPath(path) {
    return /^https?:\/\//i.test(path || '');
  }

  function normalizeImagePath(path) {
    if (!path) return '';
    return isExternalPath(path) ? path : path.replace(/^\.\//, '');
  }

  function normalizeVisibleApps(apps) {
    return (apps || [])
      .filter(function (app) {
        return app && VISIBLE_STATUSES.has(app.status);
      })
      .sort(function (a, b) {
        return Number(a.sort_order || 999) - Number(b.sort_order || 999);
      });
  }

  function updateHealthAppCount(apps) {
    const countEl = document.getElementById('health-app-count');
    if (countEl) {
      countEl.textContent = String(apps.length);
    }
  }

  function buildWorkCard(app, fallbackTag) {
    const supportPath = app.support_path || (app.slug + '/?lang=ja');
    const promoImage = normalizeImagePath(app.promo_image_path);
    const iconPath = normalizeImagePath(app.icon_path);
    const baseTag = app.category_label || fallbackTag || '';
    const statusTag = app.status === 'submitted' ? '審査中' : '';
    const tag = statusTag ? (baseTag ? (baseTag + ' / ' + statusTag) : statusTag) : baseTag;

    return [
      '<a class="work-card visible" href="' + safeText(supportPath) + '">',
      '  <div class="work-card-img" style="background:#f5f5f5;">',
      promoImage
        ? '    <img src="' + safeText(promoImage) + '" alt="' + safeText(app.name) + '" loading="lazy">'
        : '',
      '  </div>',
      '  <div class="work-card-body">',
      '    <div class="work-card-meta">',
      iconPath
        ? '      <img src="' + safeText(iconPath) + '" alt="" class="work-card-icon">'
        : '      <div class="work-card-icon" aria-hidden="true"></div>',
      '      <div class="work-card-names">',
      '        <div class="work-card-name">' + safeText(app.name) + '</div>',
      '        <div class="work-card-ja">' + safeText(app.name_ja || '') + '</div>',
      '      </div>',
      '    </div>',
      '    <span class="work-card-tag">' + safeText(tag) + '</span>',
      '    <p class="work-card-desc">' + safeText(app.description_ja || '') + '</p>',
      '  </div>',
      '  <div class="work-card-arrow"><svg viewBox="0 0 16 16"><path d="M4.5 12L12 4.5M12 4.5H6M12 4.5V11"></path></svg></div>',
      '</a>'
    ].join('\n');
  }

  function renderCategoryGrids(apps) {
    Object.keys(CATEGORY_TARGETS).forEach(function (category) {
      const target = CATEGORY_TARGETS[category];
      const grid = document.getElementById(target.gridId);
      if (!grid) return;

      const categoryApps = apps.filter(function (app) {
        return resolveGridCategory(app) === category;
      });

      if (categoryApps.length === 0) {
        return;
      }

      grid.innerHTML = categoryApps
        .map(function (app) {
          return buildWorkCard(app, target.tag);
        })
        .join('\n\n');
    });
  }

  function pickFeaturedApp(apps) {
    const featured = apps
      .filter(function (app) {
        return app && app.status === 'released';
      })
      .sort(function (a, b) {
        return Number(a.featured_priority || 999) - Number(b.featured_priority || 999);
      });

    return featured[0] || apps[0] || null;
  }

  function updateFeatured(app) {
    if (!app) return;

    const heading = document.getElementById('featured-heading');
    if (heading) heading.textContent = app.name;

    const eyebrow = document.getElementById('featured-eyebrow');
    if (eyebrow) eyebrow.textContent = app.category_label || 'App';

    const nameEl = document.getElementById('featured-name');
    if (nameEl) nameEl.textContent = app.name;

    const jaEl = document.getElementById('featured-ja');
    if (jaEl) {
      const statusSuffix = app.status === 'submitted' ? '（審査中）' : '';
      jaEl.textContent = (app.name_ja || '') + statusSuffix;
    }

    const descEl = document.getElementById('featured-desc');
    if (descEl) descEl.textContent = app.description_ja || '';

    const appStoreBtn = document.getElementById('featured-app-store-link');
    if (appStoreBtn) {
      if (app.status === 'released' && app.app_store_url) {
        appStoreBtn.href = app.app_store_url;
        appStoreBtn.style.display = '';
      } else {
        appStoreBtn.style.display = 'none';
      }
    }

    const supportBtn = document.getElementById('featured-support-link');
    if (supportBtn) {
      supportBtn.href = app.support_path || (app.slug + '/?lang=ja');
    }

    const imageEl = document.getElementById('featured-image');
    const imagePath = normalizeImagePath(app.promo_image_path);
    if (imageEl && imagePath) {
      imageEl.src = imagePath;
      imageEl.alt = app.name;
    }
  }

  function updateFooterLists(apps) {
    const camera = apps.filter(function (app) { return resolveGridCategory(app) === 'camera'; }).map(function (app) { return app.name; });
    const voice = apps.filter(function (app) { return resolveGridCategory(app) === 'voice'; }).map(function (app) { return app.name; });
    const sound = apps.filter(function (app) { return resolveGridCategory(app) === 'sound'; }).map(function (app) { return app.name; });

    const footerCamera = document.getElementById('footer-apps-camera');
    if (footerCamera && camera.length > 0) footerCamera.textContent = 'Camera: ' + camera.join(', ');

    const footerVoice = document.getElementById('footer-apps-voice');
    if (footerVoice && voice.length > 0) footerVoice.textContent = 'Voice: ' + voice.join(', ');

    const footerSound = document.getElementById('footer-apps-sound');
    if (footerSound && sound.length > 0) footerSound.textContent = 'Sound: ' + sound.join(', ');
  }

  function applyData(payload) {
    const apps = normalizeVisibleApps(payload.apps || []);
    if (apps.length === 0) return;

    updateHealthAppCount(apps);
    renderCategoryGrids(apps);
    updateFeatured(pickFeaturedApp(apps));
    updateFooterLists(apps);

    if (typeof window.refreshLandingReveal === 'function') {
      window.refreshLandingReveal();
    }
  }

  function loadAndApply() {
    fetch(DATA_PATH, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load landing data: HTTP ' + response.status);
        }
        return response.json();
      })
      .then(function (payload) {
        applyData(payload || {});
      })
      .catch(function (error) {
        console.warn('[landing-runtime] using static fallback:', error);
      });
  }

  window.addEventListener('DOMContentLoaded', loadAndApply);
})();
