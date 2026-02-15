(function () {
  'use strict';

  const DATA_PATH = 'data/landing-apps.generated.json';
  const SUPPORTED_LANGS = new Set(['ja', 'en']);
  const VISIBLE_STATUSES = new Set(['submitted', 'released']);
  const HEALTH_CATEGORIES = new Set(['camera', 'voice', 'sound']);
  const INPUT_METHOD_LABELS = {
    camera_ocr: 'Camera + OCR',
    voice_input: 'Voice Input',
    sound_detection: 'Sound Detection',
    camera_ar: 'Camera + AR'
  };

  const CATEGORY_TARGETS = {
    camera: { gridId: 'camera-grid', tag: 'Camera + OCR' },
    voice: { gridId: 'voice-grid', tag: 'Voice Input' },
    sound: { gridId: 'sound-grid', tag: 'Sound Detection' }
  };
  let cachedPayload = null;
  let currentLang = 'ja';

  function detectLanguage() {
    if (typeof window !== 'undefined' && typeof window.getLandingLanguage === 'function') {
      const resolved = window.getLandingLanguage();
      if (SUPPORTED_LANGS.has(resolved)) return resolved;
    }

    const params = new URLSearchParams(window.location.search);
    const langParam = (params.get('lang') || '').toLowerCase();
    if (SUPPORTED_LANGS.has(langParam)) return langParam;

    const htmlLang = (document.documentElement.lang || '').toLowerCase();
    if (SUPPORTED_LANGS.has(htmlLang)) return htmlLang;
    return 'ja';
  }

  function syncLanguage() {
    currentLang = detectLanguage();
  }

  function resolveGridCategory(app) {
    if (app && app.category && CATEGORY_TARGETS[app.category]) {
      return app.category;
    }
    return null;
  }

  function isHealthApp(app) {
    if (!app) return false;
    if (typeof app.is_health_app === 'boolean') return app.is_health_app;
    return HEALTH_CATEGORIES.has(app.category);
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

  function parseDateValue(value) {
    if (!value) return 0;
    const text = String(value).trim();
    if (!text) return 0;

    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? (text + 'T00:00:00Z') : text;
    const timestamp = Date.parse(normalized);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  function toReleaseTimestamp(app) {
    if (!app) return 0;
    const releaseTimestamp =
      parseDateValue(app.release_date) ||
      parseDateValue(app.released_at);
    const updatedTimestamp = parseDateValue(app.updated_at);
    return Math.max(releaseTimestamp, updatedTimestamp);
  }

  function formatReleaseDate(app) {
    const timestamp = toReleaseTimestamp(app);
    if (!timestamp) return '----.--.--';

    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return year + '.' + month + '.' + day;
  }

  function pickAppDescription(app) {
    if (!app) return '';
    if (currentLang === 'en') return app.description_en || app.description_ja || '';
    return app.description_ja || app.description_en || '';
  }

  function withLangParam(path, lang) {
    if (!path || isExternalPath(path)) return path;

    const hashIndex = path.indexOf('#');
    const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
    const beforeHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
    const queryIndex = beforeHash.indexOf('?');
    const pathname = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
    const queryString = queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : '';
    const params = new URLSearchParams(queryString);
    params.set('lang', lang);
    const search = params.toString();
    return pathname + (search ? ('?' + search) : '') + hash;
  }

  function resolveSupportPath(app) {
    const basePath = (app && app.support_path) || ((app && app.slug ? app.slug : '') + '/');
    return withLangParam(basePath, currentLang);
  }

  function buildInputMethodLabel(app, fallbackTag) {
    if (app && typeof app.input_methods_label === 'string' && app.input_methods_label.trim()) {
      return app.input_methods_label.trim();
    }

    const methods = Array.isArray(app && app.input_methods) ? app.input_methods : [];
    if (methods.length > 0) {
      return methods
        .map(function (method) {
          const key = String(method || '').trim().toLowerCase();
          return INPUT_METHOD_LABELS[key] || String(method || '').trim();
        })
        .filter(Boolean)
        .join(' + ');
    }

    return (app && app.category_label) || fallbackTag || '';
  }

  function updateHealthAppCount(apps) {
    const countEl = document.getElementById('health-app-count');
    if (countEl) {
      const publishedHealthCount = apps.filter(function (app) {
        return app.status === 'released' && isHealthApp(app);
      }).length;
      countEl.textContent = String(publishedHealthCount);
    }
  }

  function buildWorkCard(app, fallbackTag) {
    const supportPath = resolveSupportPath(app);
    const promoImage = normalizeImagePath(app.card_image_path || app.promo_image_path);
    const iconPath = normalizeImagePath(app.icon_path);
    const baseTag = buildInputMethodLabel(app, fallbackTag);
    const statusTag = app.status === 'submitted' ? (currentLang === 'en' ? 'In Review' : '審査中') : '';
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
      '    <p class="work-card-desc">' + safeText(pickAppDescription(app)) + '</p>',
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
        const timeDiff = toReleaseTimestamp(b) - toReleaseTimestamp(a);
        if (timeDiff !== 0) return timeDiff;
        return Number(a.featured_priority || 999) - Number(b.featured_priority || 999);
      });

    return featured[0] || apps[0] || null;
  }

  function updateFeatured(app) {
    if (!app) return;

    const heading = document.getElementById('featured-heading');
    if (heading) heading.textContent = formatReleaseDate(app);

    const eyebrow = document.getElementById('featured-eyebrow');
    if (eyebrow) eyebrow.textContent = buildInputMethodLabel(app, 'App');

    const nameEl = document.getElementById('featured-name');
    if (nameEl) nameEl.textContent = app.name;

    const jaEl = document.getElementById('featured-ja');
    if (jaEl) {
      const statusSuffix = app.status === 'submitted' ? (currentLang === 'en' ? ' (In Review)' : '（審査中）') : '';
      jaEl.textContent = (app.name_ja || '') + statusSuffix;
    }

    const descEl = document.getElementById('featured-desc');
    if (descEl) descEl.textContent = pickAppDescription(app);

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
      supportBtn.href = resolveSupportPath(app);
    }

    const imageEl = document.getElementById('featured-image');
    const imagePath = normalizeImagePath(app.card_image_path || app.promo_image_path);
    if (imageEl && imagePath) {
      imageEl.src = imagePath;
      imageEl.alt = app.name;
    }
  }

  function updateFooterLists(apps) {
    const camera = apps.filter(function (app) { return resolveGridCategory(app) === 'camera'; }).map(function (app) { return app.name; });
    const voice = apps.filter(function (app) { return resolveGridCategory(app) === 'voice'; }).map(function (app) { return app.name; });
    const sound = apps.filter(function (app) { return resolveGridCategory(app) === 'sound'; }).map(function (app) { return app.name; });
    const labels = currentLang === 'en'
      ? { camera: 'Camera', voice: 'Voice', sound: 'Sound' }
      : { camera: 'カメラ', voice: '音声', sound: '音検出' };

    const footerCamera = document.getElementById('footer-apps-camera');
    if (footerCamera && camera.length > 0) footerCamera.textContent = labels.camera + ': ' + camera.join(', ');

    const footerVoice = document.getElementById('footer-apps-voice');
    if (footerVoice && voice.length > 0) footerVoice.textContent = labels.voice + ': ' + voice.join(', ');

    const footerSound = document.getElementById('footer-apps-sound');
    if (footerSound && sound.length > 0) footerSound.textContent = labels.sound + ': ' + sound.join(', ');
  }

  function applyData(payload) {
    syncLanguage();
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
        cachedPayload = payload || {};
        applyData(cachedPayload);
      })
      .catch(function (error) {
        console.warn('[landing-runtime] using static fallback:', error);
      });
  }

  window.addEventListener('landing:langchange', function () {
    syncLanguage();
    if (cachedPayload) {
      applyData(cachedPayload);
    }
  });

  window.addEventListener('DOMContentLoaded', loadAndApply);
})();
