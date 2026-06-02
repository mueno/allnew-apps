document.addEventListener("DOMContentLoaded", () => {
  const appsCatalogUrl = "https://apps.allnew.work/?lang=ja";
  const appStoreLookupEndpoint = "https://itunes.apple.com/lookup";
  const feedbackChatApiUrl =
    window.POIPOI_FEEDBACK_CHAT_API_URL ||
    "https://allnew-mobile-baas.vercel.app/api/feedback/chat";
  const feedbackSubmitApiUrl =
    window.POIPOI_FEEDBACK_SUBMIT_API_URL ||
    feedbackChatApiUrl.replace(/\/api\/feedback\/chat$/, "/api/feedback/submit");
  const feedbackGoodApiUrl =
    window.POIPOI_FEEDBACK_GOOD_API_URL ||
    feedbackChatApiUrl.replace(/\/api\/feedback\/chat$/, "/api/feedback/good");
  const feedbackAdminDecisionApiUrl =
    window.POIPOI_FEEDBACK_ADMIN_DECISION_API_URL ||
    feedbackChatApiUrl.replace(/\/api\/feedback\/chat$/, "/api/feedback/admin/decision");
  const feedbackAdminListApiUrl =
    window.POIPOI_FEEDBACK_ADMIN_LIST_API_URL ||
    feedbackChatApiUrl.replace(/\/api\/feedback\/chat$/, "/api/feedback/admin/list");
  const adminSharedSecret = window.POIPOI_ADMIN_SHARED_SECRET || "";
  const appStoreIdByName = Object.freeze({
    WeightSnap: "6758825019",
    ThermoSnap: "6759076372",
    BPSnap: "6759076255",
    GlucoSnap: "6759076419",
    WaistVox: "6759076494",
    CoughWav: "6759076606",
    PupWeight: "6759076505",
    BOTTO: "6759169189"
  });
  const appSearchAliasesByName = Object.freeze({
    WeightSnap: "体重 体重管理 weight scale",
    ThermoSnap: "体温 熱 fever temperature",
    BPSnap: "血圧 blood pressure",
    GlucoSnap: "血糖値 血糖 メモ glucose",
    WaistVox: "腹囲 ウエスト waist",
    CoughWav: "咳 せき cough",
    PupWeight: "ペット 犬 猫 体重 pet dog cat",
    BOTTO: "集中 没頭 タイマー focus timer",
    "New App Idea": "新しい提案 新アプリ案 アイデア idea"
  });
  const newAppIdea = Object.freeze({
    id: "newapp",
    name: "New App Idea",
    category: "新しい提案",
    icon: "🚀",
    filterGroup: "idea",
    isVirtual: true
  });
  const fallbackAppsData = Object.freeze([
    {
      id: "weightsnap",
      name: "WeightSnap",
      category: "体重",
      filterGroup: "health",
      appStoreId: "6758825019",
      catalogUrl: "https://apps.allnew.work/weightsnap/",
      appStoreUrl: "https://apps.apple.com/app/weightsnap/id6758825019",
      iconUrl: "https://apps.allnew.work/weightsnap-icon.png"
    },
    {
      id: "thermosnap",
      name: "ThermoSnap",
      category: "体温",
      filterGroup: "health",
      appStoreId: "6759076372",
      catalogUrl: "https://apps.allnew.work/thermosnap/",
      iconUrl: "https://apps.allnew.work/thermosnap-icon.png"
    },
    {
      id: "bpsnap",
      name: "BPSnap",
      category: "血圧",
      filterGroup: "health",
      appStoreId: "6759076255",
      catalogUrl: "https://apps.allnew.work/bloodpressuresnap/",
      iconUrl: "https://apps.allnew.work/bpsnap-icon.png"
    },
    {
      id: "glucosnap",
      name: "GlucoSnap",
      category: "血糖値",
      filterGroup: "health",
      appStoreId: "6759076419",
      catalogUrl: "https://apps.allnew.work/glucosnap/",
      iconUrl: "https://apps.allnew.work/glucosnap-icon.png"
    },
    {
      id: "waistvox",
      name: "WaistVox",
      category: "腹囲記録",
      filterGroup: "health",
      appStoreId: "6759076494",
      catalogUrl: "https://apps.allnew.work/waistvox/",
      iconUrl: "https://apps.allnew.work/waistvox-icon.png"
    },
    {
      id: "coughwav",
      name: "CoughWav",
      category: "咳",
      filterGroup: "health",
      appStoreId: "6759076606",
      catalogUrl: "https://apps.allnew.work/coughwav/",
      iconUrl: "https://apps.allnew.work/coughwav-icon.png"
    },
    {
      id: "pupweight",
      name: "PupWeight",
      category: "ペット体重",
      filterGroup: "pet",
      appStoreId: "6759076505",
      catalogUrl: "https://apps.allnew.work/pupweight/",
      iconUrl: "https://apps.allnew.work/pupweight-icon.png"
    },
    {
      id: "botto",
      name: "BOTTO",
      category: "集中タイマー",
      filterGroup: "focus",
      appStoreId: "6759169189",
      catalogUrl: "https://apps.allnew.work/botto/",
      iconUrl: "https://apps.allnew.work/botto-icon.png"
    }
  ]);
  let appsData = [...fallbackAppsData.map((app) => ({ ...app })), { ...newAppIdea }];

  const prefixes = ["爆速の", "癒やしの", "無敵の", "陽気な", "秘密の", "孤高の", "奇跡の", "前向きな", "お茶目な", "ふんわりな"];
  const roles = ["開発者", "応援団", "研究員", "旅人", "キャプテン", "サポーター", "ひらめき王"];
  const suffixes = ["ぷに助", "もっちー", "トントン", "まるこ", "ピポパ"];

  let isAuthenticated = false;
  let selectedApp = null;
  let selectedType = null;
  let currentNickname = "";
  let heroCompleted = false;
  let activeAppFilter = window.location.hash === "#idea" ? "idea" : "all";
  let appSearchQuery = "";
  const adminPreviewEnabled = new URLSearchParams(window.location.search).get("admin") === "preview";
  let moderationWarningCount = 0;
  let previewUserSuspended = false;
  let adminReports = [];
  let poipoiChatHistory = [];
  let poipoiChatStopped = false;
  let latestChatDraft = null;
  let latestReview = null;
  const goodVoteStorageKey = "poipoiGoodVotes:v1";
  let guestGoodVotes = loadGuestGoodVotes();
  let guestGoodRemoteCounts = {};
  const guestBoardFilters = {
    statuses: new Set(),
    apps: new Set(),
    periods: new Set(),
    mineOnly: false,
    query: "",
    customStart: "",
    customEnd: "",
    sort: "updated-desc"
  };
  const prohibitedTopicRules = Object.freeze([
    { label: "誹謗中傷・攻撃的表現", pattern: /死ね|消えろ|殺す|バカ|馬鹿|クソ|くそ|無能|カス|晒す|差別/i, severity: "block" },
    { label: "犯罪・違法行為の助長", pattern: /違法|犯罪|詐欺|盗む|ハッキング|不正アクセス|薬物|爆弾|殺害/i, severity: "block" },
    { label: "アダルト・出会い系用途", pattern: /アダルト|性的|出会い|マッチング|援交|わいせつ|裸|セックス/i, severity: "block" },
    { label: "政治・宗教の主張", pattern: /政党|選挙|政治活動|宗教|信仰|布教|教団/i, severity: "block" },
    { label: "個人情報・秘密情報の混入", pattern: /住所|電話番号|メールアドレス|パスワード|秘密情報|社外秘|診断書|マイナンバー/i, severity: "block" },
    { label: "医療助言・診断に近い内容", pattern: /インスリン|投薬|服薬量|薬の量|処方|診断|治療方針|医療助言/i, severity: "warn" },
    { label: "いたずら・スパムの疑い", pattern: /(.)\1{9,}|https?:\/\/|無料で稼げる|副業/i, severity: "warn" }
  ]);

  const video = document.getElementById("openingVideo");
  const heroStage = document.getElementById("heroStage");
  const heroWrapper = document.getElementById("heroWrapper");
  const welcomeHeroImg = document.getElementById("welcomeHeroImg");
  const skipVideoBtn = document.getElementById("skipVideoBtn");
  const gatedContentArea = document.getElementById("gatedContentArea");
  const mockAppleLoginBtn = document.getElementById("mockAppleLoginBtn");
  const guestStatusViewBtn = document.getElementById("guestStatusViewBtn");
  const guestStatusBoard = document.getElementById("guestStatusBoard");
  const guestStatusSignInBtn = document.getElementById("guestStatusSignInBtn");
  const guestStatusFilterButtons = Array.from(document.querySelectorAll("[data-guest-status-filter]"));
  const guestStatusItems = Array.from(document.querySelectorAll("[data-public-status]"));
  const guestStatusList = document.querySelector(".guest-status-list");
  const guestBoardSearchInput = document.getElementById("guestBoardSearchInput");
  const guestBoardSortSelect = document.getElementById("guestBoardSortSelect");
  const guestPeriodFilterButtons = Array.from(document.querySelectorAll("[data-guest-period-filter]"));
  const guestAppFilterButtons = Array.from(document.querySelectorAll("[data-guest-app-filter]"));
  const guestDateStartInput = document.getElementById("guestDateStartInput");
  const guestDateEndInput = document.getElementById("guestDateEndInput");
  const guestMineFilterButton = document.getElementById("guestMineFilterButton");
  const guestFilterResetButton = document.getElementById("guestFilterResetButton");
  const guestFilterResultCount = document.getElementById("guestFilterResultCount");
  const guestFilterActiveChips = document.getElementById("guestFilterActiveChips");
  const guestStatusEmptyState = document.getElementById("guestStatusEmptyState");
  const guestGoodButtons = Array.from(document.querySelectorAll("[data-good-button]"));
  const accountStrip = document.getElementById("accountStrip");
  const userNicknameDisplay = document.getElementById("userNicknameDisplay");
  const accountBoardLink = document.getElementById("accountBoardLink");
  const logoutTrigger = document.getElementById("logoutTrigger");

  const appsScroller = document.getElementById("appsScroller");
  const appSearchInput = document.getElementById("appSearchInput");
  const appFilterButtons = Array.from(document.querySelectorAll("[data-app-filter]"));
  const appEmptyState = document.getElementById("appEmptyState");
  const appsScrollLeft = document.getElementById("appsScrollLeft");
  const appsScrollRight = document.getElementById("appsScrollRight");
  const confirmAppPanel = document.getElementById("confirmAppPanel");
  const confirmAppLabel = document.getElementById("confirmAppLabel");
  const wizardStep2Section = document.getElementById("wizardStep2Section");
  const step2ContextBadgeSlot = document.getElementById("step2ContextBadgeSlot");
  const feedbackChatLog = document.getElementById("feedbackChatLog");
  const poipoiChatForm = document.getElementById("poipoiChatForm");
  const poipoiChatInput = document.getElementById("poipoiChatInput");
  const poipoiChatSend = document.getElementById("poipoiChatSend");
  const aiReviewPreview = document.getElementById("aiReviewPreview");
  const aiReviewMessage = document.getElementById("aiReviewMessage");
  const submitFeedbackBtn = document.getElementById("submitFeedbackBtn");
  const adminReviewPanel = document.getElementById("adminReviewPanel");
  const adminReportList = document.getElementById("adminReportList");
  const termsModal = document.getElementById("termsModal");
  const closeTermsBtn = document.getElementById("closeTermsBtn");
  const cancelTermsBtn = document.getElementById("cancelTermsBtn");
  const acceptTermsBtn = document.getElementById("acceptTermsBtn");
  const termsErrorText = document.getElementById("termsErrorText");
  const appleOfficialAuthZone = document.getElementById("appleOfficialAuthZone");
  const appleIdSigninButton = document.getElementById("appleid-signin");
  const appleSigninConfigNotice = document.getElementById("appleSigninConfigNotice");
  const appleSigninReadyText = document.getElementById("appleSigninReadyText");
  const localApplePreviewBtn = document.getElementById("localApplePreviewBtn");
  const registrationConsentChecks = Array.from(document.querySelectorAll(".registration-consent-check"));
  const legalDocDisclosures = Array.from(document.querySelectorAll(".legal-doc-disclosure"));
  const cookieConsentBanner = document.getElementById("cookieConsentBanner");
  const cookieConsentAccept = document.getElementById("cookieConsentAccept");
  let termsModalRequiresRegistrationConsent = false;
  let termsModalReturnFocusTarget = null;

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function toAppId(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function getInstallAppStoreId(installUrl) {
    const match = String(installUrl || "").match(/\/id(\d+)/);
    return match ? match[1] : "";
  }

  function getAppFilterGroup(name, category) {
    const normalizedName = String(name || "").toLowerCase();
    const normalizedCategory = String(category || "");
    if (normalizedName === "new app idea") return "idea";
    if (normalizedName === "pupweight" || normalizedCategory.includes("ペット")) return "pet";
    if (normalizedName === "botto" || normalizedCategory.includes("集中")) return "focus";
    return "health";
  }

  function normalizeCatalogApp(listItem) {
    const item = listItem?.item || listItem;
    const name = item?.name;
    if (!name) return null;
    const appStoreId = appStoreIdByName[name] || getInstallAppStoreId(item.installUrl);
    const category = item.alternateName || "iOSアプリ";

    return {
      id: toAppId(name),
      name,
      category,
      filterGroup: getAppFilterGroup(name, category),
      description: item.description || "",
      catalogUrl: item.url || "",
      appStoreUrl: item.installUrl || (appStoreId ? `https://apps.apple.com/app/id${appStoreId}` : ""),
      appStoreId,
      iconUrl: item.image || ""
    };
  }

  function extractCatalogAppsFromHtml(htmlText) {
    const doc = new DOMParser().parseFromString(htmlText, "text/html");
    const jsonLdScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));

    for (const script of jsonLdScripts) {
      let parsed;
      try {
        parsed = JSON.parse(script.textContent || "");
      } catch {
        continue;
      }

      const entries = Array.isArray(parsed) ? parsed : [parsed];
      const itemList = entries.find((entry) => entry?.["@type"] === "ItemList" && Array.isArray(entry.itemListElement));
      if (itemList) {
        return itemList.itemListElement.map(normalizeCatalogApp).filter(Boolean);
      }
    }

    return [];
  }

  async function loadAllNewAppCatalog() {
    const response = await fetch(appsCatalogUrl, { cache: "no-store", mode: "cors" });
    if (!response.ok) throw new Error(`App catalog fetch failed: ${response.status}`);
    return extractCatalogAppsFromHtml(await response.text());
  }

  function loadItunesJsonp(lookupUrl) {
    return new Promise((resolve, reject) => {
      const callbackName = `allnewAppStoreLookup${Date.now()}${Math.floor(Math.random() * 100000)}`;
      const separator = lookupUrl.includes("?") ? "&" : "?";
      const script = document.createElement("script");
      let timeoutId;

      function cleanup() {
        clearTimeout(timeoutId);
        if (script.parentNode) script.remove();
        try {
          delete window[callbackName];
        } catch {
          window[callbackName] = undefined;
        }
      }

      window[callbackName] = (payload) => {
        cleanup();
        resolve(payload);
      };

      script.async = true;
      script.src = `${lookupUrl}${separator}callback=${encodeURIComponent(callbackName)}`;
      script.onerror = () => {
        cleanup();
        reject(new Error("App Store lookup script failed"));
      };
      timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error("App Store lookup timed out"));
      }, 6000);

      document.head.append(script);
    });
  }

  async function lookupAppStoreApps(catalogApps) {
    const appStoreIds = [...new Set(catalogApps.map((app) => app.appStoreId).filter(Boolean))];
    if (!appStoreIds.length) return new Map();

    const lookupUrl = `${appStoreLookupEndpoint}?id=${encodeURIComponent(appStoreIds.join(","))}&country=jp&entity=software`;
    const payload = await loadItunesJsonp(lookupUrl);
    const results = Array.isArray(payload?.results) ? payload.results : [];
    const byId = new Map();

    results.forEach((result) => {
      if (result?.trackId) {
        byId.set(String(result.trackId), result);
      }
    });

    return byId;
  }

  function mergeAppStoreData(catalogApps, storeById) {
    return catalogApps.map((app) => {
      const storeApp = storeById.get(String(app.appStoreId));
      if (!storeApp) return app;

      return {
        ...app,
        appStoreName: storeApp.trackName || app.name,
        appStoreUrl: storeApp.trackViewUrl || app.appStoreUrl,
        sellerName: storeApp.sellerName || storeApp.artistName || "",
        iconUrl: storeApp.artworkUrl512 || storeApp.artworkUrl100 || app.iconUrl
      };
    });
  }

  function withNewAppIdea(apps) {
    return [...apps.filter((app) => app.id !== newAppIdea.id), { ...newAppIdea }];
  }

  function hasCookieConsentNotice() {
    return document.cookie.split("; ").some((cookie) => cookie.startsWith("af_cookie_notice=accepted"));
  }

  function setCookieConsentNotice() {
    document.cookie = "af_cookie_notice=accepted; Max-Age=15552000; Path=/; SameSite=Lax";
  }

  function setCookieBannerVisible(isVisible) {
    if (!cookieConsentBanner) return;
    cookieConsentBanner.classList.toggle("is-visible", isVisible);
    cookieConsentBanner.setAttribute("aria-hidden", isVisible ? "false" : "true");
  }

  function initCookieConsentNotice() {
    if (!cookieConsentBanner || !cookieConsentAccept) return;

    if (!hasCookieConsentNotice()) {
      const showBanner = () => {
        const stage = document.querySelector("[data-scrolly-stage]");
        const stageStep = Number(stage?.dataset.scrollyStep || "0");
        const shouldWaitForSigninScene = stage
          && !stage.classList.contains("is-static-list")
          && !isAuthenticated
          && stageStep < 3;

        if (shouldWaitForSigninScene) {
          const showAfterSigninScene = () => {
            if (Number(stage.dataset.scrollyStep || "0") < 3) return;
            stage.removeEventListener("scrollyStepChanged", showAfterSigninScene);
            window.setTimeout(() => setCookieBannerVisible(true), 1800);
          };

          stage.addEventListener("scrollyStepChanged", showAfterSigninScene);
          return;
        }

        setTimeout(() => setCookieBannerVisible(true), 9000);
      };
      if (document.body.classList.contains("hero-animation-completed")) {
        showBanner();
      } else {
        document.addEventListener("heroAnimationCompleted", showBanner, { once: true });
      }
    }

    cookieConsentAccept.addEventListener("click", () => {
      setCookieConsentNotice();
      setCookieBannerVisible(false);
    });
  }

  function setScrollyStep(stage, stepIndex) {
    const previousStep = stage.dataset.scrollyStep;
    const panels = Array.from(stage.querySelectorAll("[data-scrolly-panel]"));
    const dots = Array.from(stage.querySelectorAll("[data-scrolly-dot]"));

    panels.forEach((panel, index) => {
      const isActive = index === stepIndex;
      panel.classList.toggle("is-active", isActive);
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
    });

    dots.forEach((dot, index) => {
      const isActive = index === stepIndex;
      dot.classList.toggle("is-active", isActive);
      if (isActive) {
        dot.setAttribute("aria-current", "step");
      } else {
        dot.removeAttribute("aria-current");
      }
    });

    stage.style.setProperty("--scrolly-active-index", String(stepIndex));
    stage.dataset.scrollyStep = String(stepIndex);

    if (previousStep !== String(stepIndex)) {
      stage.dispatchEvent(new CustomEvent("scrollyStepChanged", { detail: { stepIndex } }));
    }
  }

  function showScrollyPanelsAsStaticList(stage) {
    stage.classList.add("is-static-list");
    stage.querySelectorAll("[data-scrolly-panel]").forEach((panel) => {
      panel.classList.add("is-active");
      panel.setAttribute("aria-hidden", "false");
    });
    stage.querySelectorAll("[data-scrolly-dot]").forEach((dot) => dot.removeAttribute("aria-current"));
  }

  function initScrollyCapabilities() {
    const stage = document.querySelector("[data-scrolly-stage]");
    if (!stage) return;

    const panels = Array.from(stage.querySelectorAll("[data-scrolly-panel]"));
    if (!panels.length) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      showScrollyPanelsAsStaticList(stage);
      return;
    }

    function getScrollyViewportHeight() {
      return Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 1);
    }

    function syncScrollyViewportSize() {
      const viewportHeight = getScrollyViewportHeight();
      const isCompact = window.matchMedia("(max-width: 640px)").matches;
      const stickyRatio = isCompact ? 0.68 : 0.58;
      const minStickyHeight = isCompact ? 390 : 360;
      const maxStickyHeight = isCompact ? 560 : 520;
      const stickyHeight = Math.min(
        Math.max(Math.round(viewportHeight * stickyRatio), minStickyHeight),
        maxStickyHeight
      );

      stage.style.setProperty("--scrolly-viewport-height", `${viewportHeight}px`);
      stage.style.setProperty("--scrolly-sticky-height", `${stickyHeight}px`);
    }

    syncScrollyViewportSize();

    const viewportHeight = getScrollyViewportHeight();
    if (stage.offsetHeight <= viewportHeight + 24) {
      showScrollyPanelsAsStaticList(stage);
      return;
    }

    let ticking = false;
    let magneticSnapTimer = 0;
    let isScrollyPointerDown = false;
    let isMagneticSnapping = false;
    let lastScrollyScrollY = window.scrollY;
    let lastScrollyDirection = 0;

    function getScrollyMetrics() {
      syncScrollyViewportSize();

      const rect = stage.getBoundingClientRect();
      const viewportHeight = getScrollyViewportHeight();
      const scrollableDistance = Math.max(stage.offsetHeight - viewportHeight, 1);
      const progress = Math.min(Math.max(-rect.top / scrollableDistance, 0), 0.9999);
      const sticky = stage.querySelector(".welcome-scrolly-sticky");
      const stickyTop = sticky ? Number.parseFloat(window.getComputedStyle(sticky).top) || 0 : 0;
      const stageTop = window.scrollY + rect.top;
      const safeMaxScrollY = sticky
        ? stageTop + stage.offsetHeight - sticky.offsetHeight - stickyTop
        : stageTop + scrollableDistance;

      return {
        progress,
        rect,
        safeMaxScrollY,
        scrollableDistance,
        stageTop,
        viewportHeight
      };
    }

    function getScrollyStepFromProgress(progress) {
      return Math.min(panels.length - 1, Math.floor(progress * panels.length));
    }

    function getScrollySnapTarget(stepIndex, metrics = getScrollyMetrics()) {
      const stepSpan = metrics.scrollableDistance / panels.length;
      const centeredTarget = stepIndex <= 0
        ? metrics.stageTop
        : metrics.stageTop + stepSpan * (stepIndex + 0.5);
      const target = stepIndex >= panels.length - 1
        ? Math.min(centeredTarget, metrics.safeMaxScrollY)
        : centeredTarget;

      return Math.max(metrics.stageTop, Math.min(target, metrics.safeMaxScrollY));
    }

    function snapScrollyToIndex(stepIndex, behavior = "smooth") {
      if (isAuthenticated || stage.classList.contains("is-static-list")) return;

      const metrics = getScrollyMetrics();
      const target = getScrollySnapTarget(stepIndex, metrics);
      setScrollyStep(stage, stepIndex);

      if (Math.abs(window.scrollY - target) < 2) return;

      isMagneticSnapping = true;
      stage.classList.add("is-magnetizing");
      window.scrollTo({ top: target, behavior });

      window.setTimeout(() => {
        isMagneticSnapping = false;
        stage.classList.remove("is-magnetizing");
        requestScrollyStepUpdate();
      }, behavior === "smooth" ? 460 : 0);
    }

    function scheduleMagneticSnap(delay = 180) {
      if (isAuthenticated || isMagneticSnapping || stage.classList.contains("is-static-list")) return;
      if (lastScrollyDirection < 0) {
        window.clearTimeout(magneticSnapTimer);
        return;
      }
      window.clearTimeout(magneticSnapTimer);

      magneticSnapTimer = window.setTimeout(() => {
        if (isScrollyPointerDown) {
          scheduleMagneticSnap(90);
          return;
        }

        const metrics = getScrollyMetrics();
        const stageIsVisible = metrics.rect.top < metrics.viewportHeight && metrics.rect.bottom > 0;
        if (!stageIsVisible) return;

        snapScrollyToIndex(getScrollyStepFromProgress(metrics.progress));
      }, delay);
    }

    setScrollyStep(stage, 0);

    function updateScrollyStepFromScroll() {
      ticking = false;
      const metrics = getScrollyMetrics();
      const nextIndex = getScrollyStepFromProgress(metrics.progress);

      if (!isAuthenticated && nextIndex === panels.length - 1) {
        const sticky = stage.querySelector(".welcome-scrolly-sticky");
        if (sticky) {
          if (window.scrollY > metrics.safeMaxScrollY + 1) {
            setScrollyStep(stage, nextIndex);
            window.scrollTo({
              top: Math.max(metrics.stageTop, metrics.safeMaxScrollY),
              behavior: "auto"
            });
            return;
          }
        }
      }

      setScrollyStep(stage, nextIndex);
    }

    function requestScrollyStepUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateScrollyStepFromScroll);
    }

    function handleScrollyScroll() {
      const currentScrollY = window.scrollY;
      const deltaY = currentScrollY - lastScrollyScrollY;
      if (Math.abs(deltaY) > 1) {
        lastScrollyDirection = deltaY > 0 ? 1 : -1;
      }
      lastScrollyScrollY = currentScrollY;
      requestScrollyStepUpdate();
      scheduleMagneticSnap(180);
    }

    window.addEventListener("scroll", handleScrollyScroll, { passive: true });
    window.addEventListener("scrollend", () => scheduleMagneticSnap(0), { passive: true });
    window.addEventListener("resize", () => {
      requestScrollyStepUpdate();
      scheduleMagneticSnap(120);
    });
    window.addEventListener("touchstart", () => {
      isScrollyPointerDown = true;
      window.clearTimeout(magneticSnapTimer);
    }, { passive: true });
    window.addEventListener("touchend", () => {
      isScrollyPointerDown = false;
      scheduleMagneticSnap(80);
    }, { passive: true });
    window.addEventListener("touchcancel", () => {
      isScrollyPointerDown = false;
      scheduleMagneticSnap(80);
    }, { passive: true });
    window.addEventListener("wheel", () => scheduleMagneticSnap(120), { passive: true });
    window.visualViewport?.addEventListener("resize", () => {
      requestScrollyStepUpdate();
      scheduleMagneticSnap(120);
    }, { passive: true });
    window.visualViewport?.addEventListener("scroll", requestScrollyStepUpdate, { passive: true });
    updateScrollyStepFromScroll();

    stage.querySelectorAll("[data-scrolly-dot]").forEach((dot) => {
      dot.addEventListener("click", () => {
        const dotIndex = Number(dot.getAttribute("data-scrolly-dot") || "0");
        snapScrollyToIndex(Math.min(Math.max(dotIndex, 0), panels.length - 1));
      });
    });
  }

  function generateNickname() {
    return `${randomItem(prefixes)}${randomItem(roles)} ${randomItem(suffixes)}`;
  }

  function resetLoginButtonLabel() {
    mockAppleLoginBtn.replaceChildren(document.createTextNode("Appleでサインイン"));
    mockAppleLoginBtn.classList.remove("signed-in");
  }

  function setSignedInButtonLabel() {
    mockAppleLoginBtn.replaceChildren(document.createTextNode("✓ サインイン完了"));
    mockAppleLoginBtn.classList.add("signed-in");
  }

  function appendAppIcon(iconFrame, app) {
    if (app.iconUrl) {
      const icon = document.createElement("img");
      icon.className = "app-icon-img";
      icon.src = app.iconUrl;
      icon.alt = "";
      icon.loading = "lazy";
      icon.decoding = "async";
      icon.onerror = () => {
        icon.remove();
        appendAppIcon(iconFrame, { icon: app.icon || "📱" });
      };
      iconFrame.append(icon);
      return;
    }

    const icon = document.createElement("span");
    icon.className = "app-icon-fallback";
    icon.textContent = app.icon || "📱";
    iconFrame.append(icon);
  }

  function appendContextIcon(badge, app) {
    if (app.iconUrl) {
      const icon = document.createElement("img");
      icon.className = "locked-context-app-icon";
      icon.src = app.iconUrl;
      icon.alt = "";
      icon.loading = "lazy";
      icon.decoding = "async";
      icon.onerror = () => {
        icon.remove();
        appendContextIcon(badge, { icon: app.icon || "📱" });
      };
      badge.append(icon);
      return;
    }

    const icon = document.createElement("span");
    icon.className = "locked-context-fallback-icon";
    icon.textContent = app.icon || "📱";
    badge.append(icon);
  }

  function getAppSearchText(app) {
    return [
      app.name,
      app.category,
      app.description,
      app.appStoreName,
      app.sellerName,
      appSearchAliasesByName[app.name],
      app.filterGroup,
      app.id
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function getVisibleApps() {
    const query = appSearchQuery.trim().toLowerCase();

    return appsData.filter((app) => {
      const matchesFilter = activeAppFilter === "all" || app.filterGroup === activeAppFilter;
      const matchesQuery = !query || getAppSearchText(app).includes(query);
      return matchesFilter && matchesQuery;
    });
  }

  function updateAppFilterButtonState() {
    appFilterButtons.forEach((button) => {
      const isActive = button.dataset.appFilter === activeAppFilter;
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function updateAppScrollButtons() {
    if (!appsScroller || !appsScrollLeft || !appsScrollRight) return;

    const maxScrollLeft = Math.max(appsScroller.scrollWidth - appsScroller.clientWidth, 0);
    appsScrollLeft.disabled = maxScrollLeft <= 1 || appsScroller.scrollLeft <= 2;
    appsScrollRight.disabled = maxScrollLeft <= 1 || appsScroller.scrollLeft >= maxScrollLeft - 2;
  }

  function resetAppScrollPosition() {
    if (!appsScroller) return;
    appsScroller.scrollTo({ left: 0, behavior: "smooth" });
    window.setTimeout(updateAppScrollButtons, 260);
  }

  function scrollApps(direction) {
    if (!appsScroller) return;
    const distance = Math.max(Math.round(appsScroller.clientWidth * 0.78), 220);
    appsScroller.scrollBy({ left: direction * distance, behavior: "smooth" });
    window.setTimeout(updateAppScrollButtons, 280);
  }

  function selectedAppIsVisible(visibleApps) {
    return Boolean(selectedApp && visibleApps.some((app) => app.id === selectedApp.id));
  }

  function createContextBadge(app, text, isTypeBadge = false) {
    const badge = document.createElement("div");
    badge.className = "locked-context-badge";
    if (isTypeBadge) {
      badge.style.background = "rgba(175, 82, 222, 0.15)";
      badge.style.color = "var(--amber)";
      badge.style.borderColor = "var(--amber)";
    }
    appendContextIcon(badge, app);
    badge.append(document.createTextNode(text));
    return badge;
  }

  function createChatMessage(text, role = "bot") {
    const message = document.createElement("div");
    message.className = `chat-message ${role}`;
    message.textContent = text;
    return message;
  }

  function appendChatMessage(role, text) {
    const messageRole = role === "user" ? "user" : role === "error" ? "error" : "bot";
    const message = createChatMessage(text, messageRole);
    feedbackChatLog.append(message);
    feedbackChatLog.scrollTop = feedbackChatLog.scrollHeight;
    return message;
  }

  function getPoinaOpeningMessage() {
    const appName = selectedApp?.name || "このアプリ";
    if (selectedApp?.isVirtual) {
      return "いらっしゃいませ、ポイナです。新しいアプリの案ですね。まだ名前がなくても大丈夫です。ポイナがいっしょに整理しますので、どんな人が、どんな時に使うものか、思いついたまま書いてください。";
    }
    return `いらっしゃいませ、ポイナです。${appName} のことでお話をうかがいます。不具合でも、改善アイデアでも大丈夫です。ポイナがお預かりしますので、まずは気になったことをそのまま書いてください。`;
  }

  function renderFeedbackChat() {
    poipoiChatHistory = [];
    poipoiChatStopped = false;
    latestChatDraft = null;
    latestReview = null;
    selectedType = selectedApp?.isVirtual ? "新しいアプリ案" : "";
    feedbackChatLog.replaceChildren();
    aiReviewPreview.hidden = true;
    submitFeedbackBtn.hidden = true;
    poipoiChatForm.hidden = false;
    poipoiChatInput.disabled = false;
    poipoiChatSend.disabled = false;
    poipoiChatSend.textContent = "送る";
    appendChatMessage("assistant", getPoinaOpeningMessage());
    poipoiChatInput.value = "";
    poipoiChatInput.focus({ preventScroll: true });
  }

  function getDraftPayload() {
    if (latestChatDraft) {
      return {
        appId: selectedApp?.id || latestChatDraft.appId || "",
        appName: selectedApp?.name || latestChatDraft.appName || "",
        type: latestChatDraft.type || selectedType || "",
        title: latestChatDraft.title || "",
        body: latestChatDraft.body || "",
        nickname: currentNickname
      };
    }

    const lastUserMessage = [...poipoiChatHistory].reverse().find((item) => item.role === "user")?.content || "";
    return {
      appId: selectedApp?.id || "",
      appName: selectedApp?.name || "",
      type: selectedType || "",
      title: lastUserMessage.slice(0, 48),
      body: lastUserMessage,
      nickname: currentNickname
    };
  }

  function evaluateSubmission(payload) {
    const fullText = `${payload.title}\n${payload.body}`.trim();
    const flags = prohibitedTopicRules.filter((rule) => rule.pattern.test(fullText));
    const blockingFlags = flags.filter((flag) => flag.severity === "block");
    const warningFlags = flags.filter((flag) => flag.severity === "warn");
    const detailLength = fullText.replace(/\s/g, "").length;
    const repeatedNoise = /(.)\1{9,}/.test(fullText);

    if (blockingFlags.length > 0 || repeatedNoise) {
      return {
        decision: "block",
        publicStatus: "ごめんなさい",
        flags,
        message: `この内容は受付できません。${blockingFlags.map((flag) => flag.label).join("、") || "いたずらの疑い"}にあたる可能性があります。表現を変えてください。`,
        adminSummary: "受付不可カテゴリに該当する可能性があるため、公開・受付せず警告対象とする。",
        nextAction: "警告。一定回数を超えた場合は利用停止。"
      };
    }

    if (detailLength < 18) {
      return {
        decision: "warn",
        publicStatus: "下書き確認",
        flags: warningFlags,
        message: "もう少しだけ具体的に書くと、開発チームが判断しやすくなります。",
        adminSummary: "情報量不足。投稿前に追記を促す。",
        nextAction: "ユーザーへ追記依頼。"
      };
    }

    if (warningFlags.length > 0) {
      return {
        decision: "warn",
        publicStatus: "下書き確認",
        flags: warningFlags,
        message: `受付前に確認が必要です。${warningFlags.map((flag) => flag.label).join("、")}にあたる情報が含まれていないか見直してください。`,
        adminSummary: "注意情報の混入可能性。投稿前にユーザーへ見直しを促す。",
        nextAction: "ユーザーへ見直し依頼。"
      };
    }

    return {
      decision: "accept",
      publicStatus: "受け付けました",
      flags: [],
      message: "受付できそうです。送信すると、AI一次審査レポートを作成して運営管理画面へ送ります。",
      adminSummary: `${payload.appName} / ${payload.type} として検討に値する内容。公開前に人間の運営管理者が要約とマスキングを確認する。`,
      nextAction: payload.type === "新しいアプリ案" ? "新規アプリ案として検討キューへ。" : "対象アプリの改善・不具合キューへ。"
    };
  }

  function updateAiReviewPreview() {
    const payload = getDraftPayload();
    const review = evaluateSubmission(payload);
    aiReviewPreview.classList.remove("is-ok", "is-warn", "is-block");
    if (!payload.title && !payload.body) {
      aiReviewPreview.hidden = true;
      aiReviewMessage.textContent = "入力された内容は、送信前にAIが受付できる内容か確認します。";
      return review;
    }

    aiReviewPreview.hidden = false;
    aiReviewPreview.classList.add(review.decision === "accept" ? "is-ok" : review.decision === "block" ? "is-block" : "is-warn");
    aiReviewMessage.textContent = review.message;
    return review;
  }

  function inferFeedbackType(message) {
    if (selectedApp?.isVirtual) return "新しいアプリ案";
    if (/不具合|バグ|落ちる|固まる|保存されない|表示されない|おかしい|エラー|クラッシュ/i.test(message)) {
      return "不具合メモ";
    }
    return "改善の要望";
  }

  function buildLocalChatResult(message) {
    const inferredType = inferFeedbackType(message);
    const payload = {
      appId: selectedApp?.id || "",
      appName: selectedApp?.name || "",
      type: inferredType,
      title: message.replace(/\s+/g, " ").slice(0, 48),
      body: message,
      nickname: currentNickname
    };
    const review = evaluateSubmission(payload);
    const riskLabels = review.flags.map((flag) => flag.label);
    const needsMore = review.decision === "warn";
    const accepted = review.decision === "accept";
    const reply = riskLabels.includes("個人情報・秘密情報の混入")
      ? "個人情報が入力されたため、このチャットは停止されました。記録はされません。お手数ですが最初からやり直してください。"
      : riskLabels.includes("医療助言・診断に近い内容")
        ? "ご提案ありがとうございます。大変申し訳ありませんが、医療判断となるアドバイスはできません。法律に抵触する可能性があるためです。ご期待に添えず申し訳ありません。何か他にご要望はございませんか？"
        : review.decision === "block"
          ? `すみません。ポイナ受付では、この内容はそのままだとお預かりできません。アプリの不具合や「あったらいいな」にしぼって、言い方を変えて送ってください。`
          : needsMore
            ? "ありがとうございます。もう少しだけ教えてください。いつ、どの画面で、どうなったか。もしくは、だれが、どんな時に使うアプリなのかを書いてもらえると、ぐっと受付しやすくなります。"
            : inferredType === "不具合メモ"
              ? "ご不便をおかけして申し訳ございません。不具合としてお預かりいたします。発生した時間帯など、もう少し詳しく教えていただけると助かります。"
              : inferredType === "新しいアプリ案"
                ? "なるほどぉ〜、いいですね。もう少し詳しいイメージを教えていただけますか？"
                : "ありがとうございます。だいじなひとこと、受け取れそうです。内容を受付に進める準備ができました。";

    return {
      reply,
      status: accepted ? "ready" : review.decision === "block" ? "blocked" : riskLabels.length > 0 ? "warning" : "collecting",
      publicStatus: accepted ? "受け付けました" : review.decision === "block" ? "ごめんなさい" : "下書き確認",
      warningLevel: review.decision === "block" ? "block" : needsMore ? "warn" : "none",
      extracted: {
        title: payload.title,
        type: inferredType,
        summary: payload.body,
        detail: payload.body,
        riskFlags: riskLabels
      },
      adminReport: {
        suggestedDecision: accepted ? "accept" : review.decision === "block" ? "reject" : "request_more_info",
        suggestedStatus: accepted ? "検討しています" : review.decision === "block" ? "ごめんなさい" : "受付ました",
        summary: review.adminSummary,
        riskFlags: riskLabels,
        nextAction: review.nextAction
      }
    };
  }

  async function callFeedbackChatApi(message) {
    const response = await fetch(feedbackChatApiUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": "allnew-feedback-portal",
        "X-User-Id": "poipoi-preview-user"
      },
      body: JSON.stringify({
        message,
        history: poipoiChatHistory.slice(-12),
        context: {
          selectedApp: selectedApp ? {
            id: selectedApp.id,
            name: selectedApp.name,
            category: selectedApp.category,
            isVirtual: Boolean(selectedApp.isVirtual)
          } : null,
          nickname: currentNickname,
          locale: "ja-JP"
        }
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.error || `feedback_chat_${response.status}`);
    }
    return payload;
  }

  function shouldUseLocalChatFallback() {
    return ["file:", "http:"].includes(window.location.protocol)
      && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
  }

  function shouldUseLocalPersistenceFallback() {
    return window.location.protocol === "file:" || shouldUseLocalChatFallback();
  }

  function toHeaderSafeUserId(value) {
    if (!value) return "poipoi-user";
    return encodeURIComponent(String(value)).slice(0, 180) || "poipoi-user";
  }

  async function persistFeedbackSubmission(payload, review) {
    const poinaReview = {
      reply: poipoiChatHistory.filter((item) => item.role === "assistant").slice(-1)[0]?.content || "",
      status: review.decision === "accept" ? "ready" : review.decision === "block" ? "blocked" : "warning",
      publicStatus: review.publicStatus,
      warningLevel: review.decision === "block" ? "block" : review.decision === "warn" ? "warn" : "none",
      extracted: {
        title: payload.title,
        type: payload.type,
        summary: payload.body,
        detail: payload.body,
        riskFlags: review.flags.map((flag) => flag.label)
      },
      adminReport: {
        suggestedDecision: review.decision === "accept" ? "accept" : review.decision === "block" ? "reject" : "request_more_info",
        suggestedStatus: review.decision === "accept" ? "検討しています" : review.decision === "block" ? "ごめんなさい" : "受付ました",
        summary: review.adminSummary,
        riskFlags: review.flags.map((flag) => flag.label),
        nextAction: review.nextAction
      }
    };

    const response = await fetch(feedbackSubmitApiUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": "allnew-feedback-portal",
        "X-User-Id": toHeaderSafeUserId(currentNickname)
      },
      body: JSON.stringify({
        selectedApp: selectedApp ? {
          id: selectedApp.id,
          name: selectedApp.name,
          category: selectedApp.category,
          isVirtual: Boolean(selectedApp.isVirtual)
        } : null,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        nickname: currentNickname,
        visibility: "public",
        poinaReview
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      throw new Error(result.error || `feedback_submit_${response.status}`);
    }
    return result.item;
  }

  function reviewFromChatResult(result) {
    const riskFlags = Array.isArray(result.extracted?.riskFlags) ? result.extracted.riskFlags : [];
    const decision = result.status === "ready" ? "accept" : result.status === "blocked" ? "block" : "warn";
    return {
      decision,
      publicStatus: result.publicStatus || (decision === "accept" ? "受け付けました" : decision === "block" ? "ごめんなさい" : "下書き確認"),
      flags: riskFlags.map((label) => ({ label, severity: decision === "block" ? "block" : "warn" })),
      message: decision === "accept"
        ? "受付できそうです。ボタンを押すと、AI一次審査レポートを作成して運営管理画面へ送ります。"
        : decision === "block"
          ? "この内容は受付できません。表現を変えてください。"
          : "もう少し会話で情報を足すと、受付しやすくなります。",
      adminSummary: result.adminReport?.summary || "",
      nextAction: result.adminReport?.nextAction || "人間の運営管理者が内容を確認する。"
    };
  }

  function applyChatResult(result) {
    const extracted = result.extracted || {};
    const lastUserMessage = [...poipoiChatHistory].reverse().find((item) => item.role === "user")?.content || "";
    if (extracted.type && extracted.type !== "未分類" && extracted.type !== "受付不可") {
      selectedType = selectedApp?.isVirtual ? "新しいアプリ案" : extracted.type;
    }
    latestChatDraft = {
      appId: selectedApp?.id || "",
      appName: selectedApp?.name || "",
      type: selectedType || extracted.type || "未分類",
      title: extracted.title || lastUserMessage.replace(/\s+/g, " ").slice(0, 48),
      body: extracted.detail || extracted.summary || lastUserMessage
    };
    latestReview = reviewFromChatResult(result);
    aiReviewPreview.classList.remove("is-ok", "is-warn", "is-block");
    aiReviewPreview.classList.add(
      latestReview.decision === "accept" ? "is-ok" : latestReview.decision === "block" ? "is-block" : "is-warn"
    );
    aiReviewPreview.hidden = false;
    aiReviewMessage.textContent = latestReview.message;
    submitFeedbackBtn.hidden = latestReview.decision !== "accept";

    if (latestReview.decision === "block") {
      stopPoipoiChat();
      const nextCount = getModerationWarningCount() + 1;
      setModerationWarningCount(nextCount);
      if (nextCount >= 3) {
        suspendCurrentPreviewUser();
      }
    }
  }

  function setPoipoiChatBusy(isBusy) {
    poipoiChatSend.disabled = poipoiChatStopped || isBusy;
    poipoiChatInput.disabled = poipoiChatStopped || isBusy;
    poipoiChatSend.textContent = isBusy ? "確認中" : "送る";
  }

  function stopPoipoiChat() {
    poipoiChatStopped = true;
    poipoiChatInput.value = "";
    poipoiChatInput.disabled = true;
    poipoiChatSend.disabled = true;
    poipoiChatForm.hidden = true;
  }

  function resizePoipoiChatInput() {
    poipoiChatInput.style.height = "auto";
    poipoiChatInput.style.height = `${Math.min(poipoiChatInput.scrollHeight, 150)}px`;
  }

  async function sendPoipoiChatMessage(event) {
    event.preventDefault();
    if (!selectedApp || poipoiChatStopped || isSuspendedPreviewUser()) return;

    const message = poipoiChatInput.value.trim();
    if (!message) return;

    appendChatMessage("user", message);
    poipoiChatHistory.push({ role: "user", content: message });
    poipoiChatInput.value = "";
    resizePoipoiChatInput();

    const typingMessage = appendChatMessage("assistant", "ポイナが、内容をたしかめています...");
    setPoipoiChatBusy(true);

    let result;
    try {
      result = await callFeedbackChatApi(message);
    } catch (error) {
      console.warn("POIPOI feedback chat API fallback.", error);
      if (shouldUseLocalChatFallback()) {
        result = buildLocalChatResult(message);
      } else {
        typingMessage.remove();
        appendChatMessage(
          "assistant",
          "すみません。ポイナのAI受付につながりませんでした。少し時間をおいて、もう一度送ってください。"
        );
        setPoipoiChatBusy(false);
        poipoiChatInput.focus({ preventScroll: true });
        return;
      }
    }

    typingMessage.remove();
    appendChatMessage("assistant", result.reply);
    poipoiChatHistory.push({ role: "assistant", content: result.reply });
    applyChatResult(result);
    setPoipoiChatBusy(false);
    if (!poipoiChatStopped) {
      poipoiChatInput.focus({ preventScroll: true });
    }
  }

  function getModerationWarningCount() {
    return moderationWarningCount;
  }

  function setModerationWarningCount(count) {
    moderationWarningCount = count;
  }

  function suspendCurrentPreviewUser() {
    previewUserSuspended = true;
    submitFeedbackBtn.disabled = true;
    aiReviewPreview.classList.add("is-block");
    aiReviewMessage.textContent = "警告回数が上限に達したため、このプレビュー環境では送信を停止しました。";
  }

  function isSuspendedPreviewUser() {
    return previewUserSuspended;
  }

  function createAdminReport(payload, review, persistedItem = null) {
    const now = new Date();
    const flags = review.flags.map((flag) => flag.label);
    return {
      id: persistedItem?.id || `AF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      createdAt: now.toISOString(),
      appName: payload.appName,
      type: payload.type,
      title: payload.title,
      nickname: payload.nickname,
      aiDecision: review.decision,
      publicStatus: persistedItem?.publicStatus || review.publicStatus,
      adminState: persistedItem?.adminState || "needs_review",
      factoryJobId: persistedItem?.factoryJobId || null,
      suggestedNextStatus: review.decision === "accept" ? "検討しています" : "ごめんなさい",
      flags,
      adminSummary: review.adminSummary,
      nextAction: review.nextAction
    };
  }

  function getAdminReports() {
    return adminReports;
  }

  function saveAdminReport(report) {
    adminReports = [report, ...getAdminReports()].slice(0, 20);
    renderAdminReports();
  }

  async function applyAdminDecisionFromPreview(report, decision) {
    const decisionLabel = decision === "go" ? "Go" : decision === "no_go" ? "No Go" : "保留";
    const localOnly = !adminSharedSecret;
    if (localOnly) {
      const factoryJobId = decision === "go" ? `FJ-${report.id}` : null;
      adminReports = adminReports.map((item) => item.id === report.id ? {
        ...item,
        adminState: decision === "go" ? "factory_queued" : decision === "no_go" ? "closed" : "hold",
        publicStatus: decision === "go" ? "対応しています" : decision === "no_go" ? "ごめんなさい" : "検討しています",
        factoryJobId,
        nextAction: decision === "go"
          ? "管理者Go。factoryキューへ投入されます。"
          : decision === "no_go"
            ? "管理者No Go。公開可能な範囲でごめんなさいへ。"
            : "管理者保留。追加確認または後日判断。"
      } : item);
      renderAdminReports();
      alert(`${decisionLabel} にしました。\n\nプレビュー環境のため、BaaSへの管理者更新は行っていません。`);
      return;
    }

    const response = await fetch(feedbackAdminDecisionApiUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminSharedSecret}`
      },
      body: JSON.stringify({
        id: report.id,
        decision,
        adminComment: report.adminSummary,
        decidedBy: "poipoi-admin-preview",
        target: "asc_submit"
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      throw new Error(result.error || `admin_decision_${response.status}`);
    }
    const updatedReport = {
      ...report,
      publicStatus: result.item?.publicStatus || report.publicStatus,
      adminState: result.item?.adminState || report.adminState,
      factoryJobId: result.factoryJob?.id || result.item?.factoryJobId || null
    };
    adminReports = adminReports.map((item) => item.id === report.id ? updatedReport : item);
    renderAdminReports();
    alert(`${decisionLabel} を保存しました。\n\n${updatedReport.factoryJobId ? `factory job: ${updatedReport.factoryJobId}` : "factory jobは作成されていません。"}`);
  }

  function renderAdminReports() {
    if (!adminReportList) return;
    const reports = getAdminReports();
    adminReportList.replaceChildren();
    if (!reports.length) {
      const empty = document.createElement("div");
      empty.className = "admin-report-card";
      empty.textContent = "まだレポートはありません。投稿が受付されると、ここにAI一次審査レポートが表示されます。";
      adminReportList.append(empty);
      return;
    }

    reports.forEach((report) => {
      const card = document.createElement("article");
      card.className = "admin-report-card";
      [
        { text: `${report.id} / ${report.publicStatus}`, strong: true },
        { text: `${report.appName} / ${report.type} / ${report.title}` },
        { text: `管理状態: ${report.adminState || "needs_review"}${report.factoryJobId ? ` / ${report.factoryJobId}` : ""}` },
        { text: `AI判定: ${report.aiDecision} / 次の候補: ${report.suggestedNextStatus}` },
        { text: `要約: ${report.adminSummary}` },
        { text: `対応: ${report.nextAction}` }
      ].forEach((row) => {
        const node = document.createElement(row.strong ? "strong" : "span");
        node.textContent = row.text;
        card.append(node);
      });
      const actions = document.createElement("div");
      actions.className = "admin-report-actions";
      [
        ["go", "Go / factoryへ送る"],
        ["hold", "保留"],
        ["no_go", "No Go"]
      ].forEach(([decision, label]) => {
        const button = document.createElement("button");
        button.className = `action-button ${decision === "go" ? "primary" : "secondary"}`;
        button.type = "button";
        button.textContent = label;
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            await applyAdminDecisionFromPreview(report, decision);
          } catch (error) {
            alert(`管理者判断を保存できませんでした: ${error instanceof Error ? error.message : "unknown"}`);
          } finally {
            button.disabled = false;
          }
        });
        actions.append(button);
      });
      card.append(actions);
      adminReportList.append(card);
    });
  }

  function completeHeroAnimation() {
    if (heroCompleted) return;
    heroCompleted = true;
    video?.classList.add("fade-out");
    welcomeHeroImg?.classList.add("active");
    if (skipVideoBtn) skipVideoBtn.style.display = "none";

    setTimeout(dockHeroToPage, 520);

    setTimeout(() => {
      if (video?.parentNode) video.remove();
    }, 1000);
  }

  function revealHeroCopy() {
    document.body.classList.add("hero-animation-completed");
    document.dispatchEvent(new CustomEvent("heroAnimationCompleted"));
  }

  function dockHeroToPage() {
    if (!heroStage || !heroWrapper || !heroWrapper.classList.contains("is-opening-floating")) {
      revealHeroCopy();
      return;
    }

    const destination = heroStage.getBoundingClientRect();
    heroStage.style.minHeight = `${destination.height}px`;

    Object.assign(heroWrapper.style, {
      top: `${destination.top}px`,
      left: `${destination.left}px`,
      width: `${destination.width}px`,
      height: `${destination.height}px`,
      transform: "none"
    });
    heroWrapper.classList.add("is-docking");

    const finishDocking = () => {
      heroWrapper.classList.remove("is-opening-floating", "is-docking");
      for (const property of ["top", "left", "width", "height", "transform"]) {
        heroWrapper.style.removeProperty(property);
      }
      heroStage.style.removeProperty("min-height");
      revealHeroCopy();
    };

    heroWrapper.addEventListener("transitionend", finishDocking, { once: true });
    setTimeout(() => {
      if (heroWrapper.classList.contains("is-opening-floating")) finishDocking();
    }, 1200);
  }

  function initOpeningInteraction() {
    document.body.classList.add("motion-ready");

    if (!video || !welcomeHeroImg) {
      completeHeroAnimation();
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      heroWrapper?.classList.remove("is-opening-floating");
      completeHeroAnimation();
      return;
    }

    video.addEventListener("timeupdate", () => {
      if (video.duration && video.duration - video.currentTime < 1.0) {
        welcomeHeroImg.classList.add("active");
      }
    });

    video.addEventListener("ended", completeHeroAnimation, { once: true });
    video.addEventListener("error", completeHeroAnimation, { once: true });
    skipVideoBtn?.addEventListener("click", completeHeroAnimation);

    const playAttempt = video.play();
    if (playAttempt?.catch) {
      playAttempt.catch(completeHeroAnimation);
    }

    setTimeout(() => {
      if (!heroCompleted && video.readyState === 0) completeHeroAnimation();
    }, 2500);

    setTimeout(() => {
      if (!heroCompleted) completeHeroAnimation();
    }, 7000);
  }

  function unlockGatedContent() {
    gatedContentArea.classList.add("is-unlocked");
    gatedContentArea.setAttribute("aria-hidden", "false");
    accountStrip.classList.remove("u-hidden");
    userNicknameDisplay.textContent = currentNickname;

    applySubmissionHashIntent({ scroll: false });
    document.getElementById("wizardStep1Section").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setGuestStatusBoardVisible(isVisible, options = {}) {
    if (!guestStatusBoard) return;

    guestStatusBoard.hidden = !isVisible;
    document.body.classList.toggle("is-guest-viewing", isVisible);

    if (isVisible && options.scroll !== false) {
      renderGuestGoodVotes();
      applyGuestBoardFiltersAndSort();
      setTimeout(() => {
        guestStatusBoard.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    } else if (isVisible) {
      renderGuestGoodVotes();
      applyGuestBoardFiltersAndSort();
    }
  }

  function applyGuestStatusFilter(status) {
    const activeStatus = status || "all";
    if (activeStatus === "all") {
      guestBoardFilters.statuses.clear();
    } else if (guestBoardFilters.statuses.has(activeStatus)) {
      guestBoardFilters.statuses.delete(activeStatus);
    } else {
      guestBoardFilters.statuses.add(activeStatus);
    }
    applyGuestBoardFiltersAndSort();
  }

  function getGuestItemDate(item, field) {
    const value = item.dataset[field] || "";
    const date = new Date(`${value}T00:00:00+09:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getGuestPeriodStart(period) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const daysByPeriod = {
      "7d": 7,
      "1m": 31,
      "3m": 92,
      "6m": 184,
      "1y": 366
    };
    const days = daysByPeriod[period];
    if (!days) return null;
    start.setDate(start.getDate() - days + 1);
    return start;
  }

  function guestPeriodMatches(item) {
    if (guestBoardFilters.periods.size === 0 && !guestBoardFilters.customStart && !guestBoardFilters.customEnd) {
      return true;
    }

    const acceptedDate = getGuestItemDate(item, "acceptedDate");
    if (!acceptedDate) return false;

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const presetMatch = Array.from(guestBoardFilters.periods).some((period) => {
      const start = getGuestPeriodStart(period);
      return start && acceptedDate >= start && acceptedDate <= now;
    });

    const customStart = guestBoardFilters.customStart
      ? new Date(`${guestBoardFilters.customStart}T00:00:00+09:00`)
      : null;
    const customEnd = guestBoardFilters.customEnd
      ? new Date(`${guestBoardFilters.customEnd}T23:59:59+09:00`)
      : null;
    const customMatch = (customStart || customEnd)
      ? (!customStart || acceptedDate >= customStart) && (!customEnd || acceptedDate <= customEnd)
      : false;

    return presetMatch || customMatch;
  }

  function getGuestGoodCountForItem(item) {
    const requestId = item.dataset.requestId;
    const baseCount = Number.parseInt(item.dataset.goodBaseCount || "0", 10) || 0;
    const remoteAdditionalCount = Number.parseInt(String(guestGoodRemoteCounts[requestId] ?? ""), 10);
    const additionalCount = Number.isFinite(remoteAdditionalCount) ? remoteAdditionalCount : 0;
    return baseCount + Math.max(additionalCount, guestGoodVotes[requestId] ? 1 : 0);
  }

  function guestItemMatchesFilters(item) {
    const statusMatch = guestBoardFilters.statuses.size === 0
      || guestBoardFilters.statuses.has(item.dataset.publicStatus || "");
    const appMatch = guestBoardFilters.apps.size === 0
      || guestBoardFilters.apps.has(item.dataset.appName || "");
    const mineMatch = !guestBoardFilters.mineOnly
      || (isAuthenticated && item.dataset.ownedByCurrentUser === "true");
    const periodMatch = guestPeriodMatches(item);
    const query = guestBoardFilters.query.trim().toLowerCase();
    const queryMatch = !query
      || `${item.dataset.requestId || ""} ${item.dataset.appName || ""} ${item.innerText || ""}`.toLowerCase().includes(query);

    return statusMatch && appMatch && mineMatch && periodMatch && queryMatch;
  }

  function compareGuestItems(a, b) {
    const sort = guestBoardFilters.sort;
    const acceptedA = getGuestItemDate(a, "acceptedDate")?.getTime() || 0;
    const acceptedB = getGuestItemDate(b, "acceptedDate")?.getTime() || 0;
    const updatedA = getGuestItemDate(a, "updatedDate")?.getTime() || acceptedA;
    const updatedB = getGuestItemDate(b, "updatedDate")?.getTime() || acceptedB;
    const goodA = getGuestGoodCountForItem(a);
    const goodB = getGuestGoodCountForItem(b);

    if (sort === "accepted-asc") return acceptedA - acceptedB || goodB - goodA;
    if (sort === "accepted-desc") return acceptedB - acceptedA || goodB - goodA;
    if (sort === "updated-asc") return updatedA - updatedB || goodB - goodA;
    if (sort === "good-desc") return goodB - goodA || updatedB - updatedA;
    return updatedB - updatedA || goodB - goodA;
  }

  function updateGuestFilterButtonState() {
    guestStatusFilterButtons.forEach((button) => {
      const value = button.dataset.guestStatusFilter || "all";
      const isActive = value === "all"
        ? guestBoardFilters.statuses.size === 0
        : guestBoardFilters.statuses.has(value);
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    const periodAllActive = guestBoardFilters.periods.size === 0
      && !guestBoardFilters.customStart
      && !guestBoardFilters.customEnd;
    guestPeriodFilterButtons.forEach((button) => {
      const value = button.dataset.guestPeriodFilter || "all";
      const isActive = value === "all" ? periodAllActive : guestBoardFilters.periods.has(value);
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    guestAppFilterButtons.forEach((button) => {
      const value = button.dataset.guestAppFilter || "all";
      const isActive = value === "all"
        ? guestBoardFilters.apps.size === 0
        : guestBoardFilters.apps.has(value);
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    guestMineFilterButton?.classList.toggle("is-active", guestBoardFilters.mineOnly);
    guestMineFilterButton?.setAttribute("aria-pressed", guestBoardFilters.mineOnly ? "true" : "false");
  }

  function renderGuestActiveFilterChips() {
    if (!guestFilterActiveChips) return;

    const periodLabels = { "7d": "1週間", "1m": "1ヶ月", "3m": "3ヶ月", "6m": "半年", "1y": "1年" };
    const chips = [
      ...Array.from(guestBoardFilters.statuses).map((value) => `ステータス: ${value}`),
      ...Array.from(guestBoardFilters.periods).map((value) => `期間: ${periodLabels[value] || value}`),
      ...Array.from(guestBoardFilters.apps).map((value) => `アプリ: ${value}`),
      guestBoardFilters.mineOnly ? "自分の投稿" : "",
      guestBoardFilters.customStart ? `開始: ${guestBoardFilters.customStart}` : "",
      guestBoardFilters.customEnd ? `終了: ${guestBoardFilters.customEnd}` : "",
      guestBoardFilters.query ? `検索: ${guestBoardFilters.query}` : ""
    ].filter(Boolean);

    guestFilterActiveChips.replaceChildren(...chips.map((label) => {
      const chip = document.createElement("span");
      chip.className = "guest-filter-active-chip";
      chip.textContent = label;
      return chip;
    }));
  }

  function applyGuestBoardFiltersAndSort() {
    if (!guestStatusList) return;

    const sortedItems = [...guestStatusItems].sort(compareGuestItems);
    sortedItems.forEach((item) => guestStatusList.appendChild(item));

    let visibleCount = 0;
    sortedItems.forEach((item) => {
      const shouldShow = guestItemMatchesFilters(item);
      item.hidden = !shouldShow;
      if (shouldShow) visibleCount += 1;
    });

    updateGuestFilterButtonState();
    renderGuestActiveFilterChips();

    if (guestFilterResultCount) {
      const totalCount = guestStatusItems.length;
      guestFilterResultCount.textContent = `${visibleCount}件を表示しています（全${totalCount}件）。`;
    }
    if (guestStatusEmptyState) {
      guestStatusEmptyState.hidden = visibleCount !== 0;
    }
  }

  function resetGuestBoardFilters() {
    guestBoardFilters.statuses.clear();
    guestBoardFilters.apps.clear();
    guestBoardFilters.periods.clear();
    guestBoardFilters.mineOnly = false;
    guestBoardFilters.query = "";
    guestBoardFilters.customStart = "";
    guestBoardFilters.customEnd = "";
    guestBoardFilters.sort = "updated-desc";
    if (guestBoardSearchInput) guestBoardSearchInput.value = "";
    if (guestBoardSortSelect) guestBoardSortSelect.value = guestBoardFilters.sort;
    if (guestDateStartInput) guestDateStartInput.value = "";
    if (guestDateEndInput) guestDateEndInput.value = "";
    applyGuestBoardFiltersAndSort();
  }

  function loadGuestGoodVotes() {
    try {
      const parsed = JSON.parse(localStorage.getItem(goodVoteStorageKey) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveGuestGoodVotes() {
    try {
      localStorage.setItem(goodVoteStorageKey, JSON.stringify(guestGoodVotes));
    } catch {
      // Goodは補助的な応援機能なので、保存に失敗しても画面操作は止めない。
    }
  }

  function renderGuestGoodVotes() {
    guestGoodButtons.forEach((button) => {
      const item = button.closest("[data-request-id]");
      if (!item) return;

      const requestId = item.dataset.requestId;
      const baseCount = Number.parseInt(item.dataset.goodBaseCount || "0", 10) || 0;
      const isVoted = Boolean(guestGoodVotes[requestId]);
      const remoteAdditionalCount = Number.parseInt(String(guestGoodRemoteCounts[requestId] ?? ""), 10);
      const additionalCount = Number.isFinite(remoteAdditionalCount) ? remoteAdditionalCount : 0;
      const count = baseCount + Math.max(additionalCount, isVoted ? 1 : 0);
      const countNode = button.querySelector("[data-good-count]");
      const noteNode = item.querySelector("[data-good-note]");

      if (countNode) countNode.textContent = String(count);
      button.classList.toggle("is-voted", isVoted);
      button.setAttribute("aria-pressed", isVoted ? "true" : "false");
      button.setAttribute("aria-label", isVoted ? `Goodを取り消す ${count}` : `Goodする ${count}`);

      if (noteNode) {
        if (!isAuthenticated) {
          noteNode.textContent = "ログインするとGoodできます。";
        } else if (isVoted) {
          noteNode.textContent = "Goodしました。応援ありがとうございます。";
        } else {
          noteNode.textContent = "このご意見にGoodできます。";
        }
      }
    });
  }

  async function persistGuestGoodVote(requestId, voted) {
    if (shouldUseLocalPersistenceFallback() && !window.POIPOI_FEEDBACK_GOOD_API_URL) {
      return null;
    }

    const response = await fetch(feedbackGoodApiUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": "allnew-feedback-portal",
        "X-User-Id": toHeaderSafeUserId(currentNickname || "poipoi-user")
      },
      body: JSON.stringify({ requestId, voted })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.error || `feedback_good_${response.status}`);
    }
    return payload;
  }

  async function handleGuestGoodClick(button) {
    const item = button.closest("[data-request-id]");
    const requestId = item?.dataset.requestId;
    const noteNode = item?.querySelector("[data-good-note]");
    if (!requestId) return;

    if (!isAuthenticated) {
      if (noteNode) {
        noteNode.textContent = "GoodするにはAppleでサインインしてください。";
      }
      button.classList.add("is-login-required");
      window.setTimeout(() => button.classList.remove("is-login-required"), 600);
      return;
    }

    const nextVoted = !guestGoodVotes[requestId];
    if (nextVoted) {
      guestGoodVotes[requestId] = true;
    } else {
      delete guestGoodVotes[requestId];
    }
    saveGuestGoodVotes();
    renderGuestGoodVotes();
    applyGuestBoardFiltersAndSort();

    try {
      const payload = await persistGuestGoodVote(requestId, nextVoted);
      if (!payload) return;

      guestGoodRemoteCounts[requestId] = Number.parseInt(String(payload.goodCount ?? "0"), 10) || 0;
      if (payload.voted) {
        guestGoodVotes[requestId] = true;
      } else {
        delete guestGoodVotes[requestId];
      }
      saveGuestGoodVotes();
      renderGuestGoodVotes();
      applyGuestBoardFiltersAndSort();
    } catch {
      if (noteNode) {
        noteNode.textContent = nextVoted
          ? "Goodしました。通信できたら反映されます。"
          : "Goodを取り消しました。通信できたら反映されます。";
      }
    }
  }

  function signIn(nickname = generateNickname()) {
    isAuthenticated = true;
    currentNickname = nickname;
    document.body.classList.add("is-authenticated");
    setGuestStatusBoardVisible(false, { scroll: false });
    renderGuestGoodVotes();
    applyGuestBoardFiltersAndSort();
    setSignedInButtonLabel();
    mockAppleLoginBtn.style.pointerEvents = "none";

    setTimeout(unlockGatedContent, 600);
  }

  function getTermsModalFocusableElements() {
    return Array.from(termsModal.querySelectorAll(
      'a[href], button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), summary, iframe, [tabindex]:not([tabindex="-1"])'
    )).filter((node) => node.offsetParent !== null);
  }

  function focusTermsModalStart() {
    document.getElementById("termsTitle")?.focus({ preventScroll: true });
  }

  function updateLegalDocDisclosureLabels() {
    legalDocDisclosures.forEach((disclosure) => {
      const label = disclosure.querySelector(".legal-doc-toggle-label");
      if (label) {
        label.textContent = disclosure.open ? "閉じる" : "開く";
      }
    });
  }

  function renderLegalDocFallback(container) {
    const fallbackTemplateId = container.dataset.legalDocFallback;
    const fallbackTemplate = fallbackTemplateId ? document.getElementById(fallbackTemplateId) : null;
    if (fallbackTemplate instanceof HTMLTemplateElement) {
      container.replaceChildren(fallbackTemplate.content.cloneNode(true));
      container.dataset.loaded = "fallback";
      return;
    }

    container.innerHTML = '<p class="legal-doc-loading">この環境では文書を表示できませんでした。</p>';
    container.dataset.loaded = "error";
  }

  function normalizeLegalDocMarkup(doc) {
    const source = doc.querySelector(".legal-card") || doc.querySelector("article") || doc.querySelector("main") || doc.body;
    if (!source) return "";

    const clone = source.cloneNode(true);
    clone.querySelectorAll("script, style, link, .back-link").forEach((node) => node.remove());
    clone.querySelectorAll("a[href]").forEach((link) => {
      const replacementText = link.textContent?.trim() || link.getAttribute("href") || "";
      link.replaceWith(document.createTextNode(replacementText));
    });
    clone.querySelectorAll("h1").forEach((heading) => {
      const replacement = document.createElement("h4");
      replacement.innerHTML = heading.innerHTML;
      heading.replaceWith(replacement);
    });
    clone.querySelectorAll("h2").forEach((heading) => {
      const replacement = document.createElement("h5");
      replacement.innerHTML = heading.innerHTML;
      heading.replaceWith(replacement);
    });

    return clone.innerHTML;
  }

  async function loadLegalDocContent(disclosure) {
    const container = disclosure.querySelector(".legal-doc-content");
    if (!container || container.dataset.loaded) return;

    const sourceUrl = container.dataset.legalDocUrl;
    const isExternalSource = sourceUrl && /^https?:\/\//.test(sourceUrl) && !sourceUrl.startsWith(window.location.origin);
    if (!sourceUrl || window.location.protocol === "file:" || isExternalSource) {
      renderLegalDocFallback(container);
      return;
    }

    try {
      const fetchUrl = new URL(sourceUrl, window.location.href);
      fetchUrl.searchParams.set("v", "20260602-legal-scope");
      const response = await fetch(fetchUrl.href, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const text = await response.text();
      const parsedDoc = new DOMParser().parseFromString(text, "text/html");
      const bodyMarkup = normalizeLegalDocMarkup(parsedDoc);
      if (!bodyMarkup) throw new Error("Empty legal document");

      container.innerHTML = `<article class="legal-doc-inline">${bodyMarkup}</article>`;
      container.dataset.loaded = "true";
    } catch (error) {
      renderLegalDocFallback(container);
    }
  }

  function handleLegalDocDisclosureToggle(event) {
    const disclosure = event.currentTarget;
    if (!(disclosure instanceof HTMLDetailsElement)) return;

    if (disclosure.open) {
      loadLegalDocContent(disclosure);
      legalDocDisclosures.forEach((otherDisclosure) => {
        if (otherDisclosure !== disclosure) {
          otherDisclosure.open = false;
        }
      });
    }
    updateLegalDocDisclosureLabels();
  }

  function setTermsModalVisible(isVisible) {
    termsModal.classList.toggle("show", isVisible);
    termsModal.setAttribute("aria-hidden", isVisible ? "false" : "true");
    if (isVisible) {
      window.setTimeout(focusTermsModalStart, 0);
    }
    if (!isVisible) {
      termsErrorText.hidden = true;
      if (termsModalReturnFocusTarget?.isConnected) {
        termsModalReturnFocusTarget.focus({ preventScroll: true });
      }
      termsModalReturnFocusTarget = null;
    }
  }

  function handleTermsModalKeydown(event) {
    if (!termsModal.classList.contains("show")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeTermsModal();
      return;
    }

    if (event.key !== "Tab") return;
    const focusableNodes = getTermsModalFocusableElements();
    if (!focusableNodes.length) return;

    const firstNode = focusableNodes[0];
    const lastNode = focusableNodes[focusableNodes.length - 1];
    if (event.shiftKey && document.activeElement === firstNode) {
      event.preventDefault();
      lastNode.focus();
    } else if (!event.shiftKey && document.activeElement === lastNode) {
      event.preventDefault();
      firstNode.focus();
    }
  }

  function allRegistrationConsentsChecked() {
    return registrationConsentChecks.every((check) => check.checked);
  }

  function appleSignInConfigReady() {
    const requiredMetaNames = [
      "appleid-signin-client-id",
      "appleid-signin-redirect-uri",
      "appleid-signin-state",
      "appleid-signin-nonce"
    ];

    return requiredMetaNames.every((name) => {
      const content = document.querySelector(`meta[name="${name}"]`)?.content?.trim() ?? "";
      return content && !content.startsWith("__") && !content.endsWith("__");
    });
  }

  function resetAppleOfficialAuthZone() {
    appleOfficialAuthZone.hidden = true;
    appleIdSigninButton.hidden = true;
    appleSigninConfigNotice.hidden = true;
    appleSigninReadyText.hidden = false;
    localApplePreviewBtn.hidden = true;
  }

  function revealAppleOfficialAuthZone() {
    const isConfigured = appleSignInConfigReady();
    appleOfficialAuthZone.hidden = false;
    appleIdSigninButton.hidden = !isConfigured;
    appleSigninConfigNotice.hidden = isConfigured;
    appleSigninReadyText.hidden = !isConfigured;
    localApplePreviewBtn.hidden = isConfigured;
  }

  function updateTermsActionState() {
    if (!termsModalRequiresRegistrationConsent) {
      acceptTermsBtn.disabled = false;
      acceptTermsBtn.textContent = "閉じる";
      return;
    }

    acceptTermsBtn.textContent = "同意して次へ";
    acceptTermsBtn.disabled = !allRegistrationConsentsChecked();
  }

  function openTermsModal(requiresRegistrationConsent = false) {
    if (!termsModal.classList.contains("show")) {
      termsModalReturnFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    termsModalRequiresRegistrationConsent = requiresRegistrationConsent;
    termsErrorText.hidden = true;
    if (requiresRegistrationConsent) {
      registrationConsentChecks.forEach((check) => {
        check.checked = false;
      });
    }
    acceptTermsBtn.hidden = false;
    termsErrorText.textContent = "登録に進むには、3つの確認にチェックしてください。";
    legalDocDisclosures.forEach((disclosure) => {
      disclosure.open = false;
    });
    updateLegalDocDisclosureLabels();
    resetAppleOfficialAuthZone();
    updateTermsActionState();
    setTermsModalVisible(true);
  }

  function closeTermsModal() {
    setTermsModalVisible(false);
  }

  function acceptTermsModal() {
    if (!termsModalRequiresRegistrationConsent) {
      closeTermsModal();
      return;
    }

    if (!allRegistrationConsentsChecked()) {
      termsErrorText.hidden = false;
      updateTermsActionState();
      return;
    }

    termsErrorText.hidden = true;
    revealAppleOfficialAuthZone();
    acceptTermsBtn.hidden = true;

    setTimeout(() => {
      const modalContent = document.querySelector(".modal-content");
      modalContent?.scrollTo({
        top: modalContent.scrollHeight,
        behavior: "smooth"
      });
      appleOfficialAuthZone.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

  async function exchangeAppleAuthorization(authorization) {
    const response = await fetch("/api/auth/apple/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ authorization })
    });

    if (!response.ok) {
      throw new Error("Apple authorization exchange failed");
    }

    return response.json();
  }

  async function handleAppleSignInSuccess(event) {
    try {
      const session = await exchangeAppleAuthorization(event.detail?.authorization ?? {});
      closeTermsModal();
      signIn(session.nickname || generateNickname());
    } catch {
      termsErrorText.textContent = "Apple認証のサーバー検証に失敗しました。時間をおいてもう一度お試しください。";
      termsErrorText.hidden = false;
    }
  }

  function handleAppleSignInFailure() {
    termsErrorText.textContent = "Appleでサインインを完了できませんでした。もう一度お試しください。";
    termsErrorText.hidden = false;
  }

  function startLocalApplePreview() {
    if (!allRegistrationConsentsChecked()) {
      termsErrorText.hidden = false;
      return;
    }
    closeTermsModal();
    signIn();
  }

  function signOut() {
    isAuthenticated = false;
    currentNickname = "";
    document.body.classList.remove("is-authenticated");
    gatedContentArea.classList.remove("is-unlocked");
    gatedContentArea.setAttribute("aria-hidden", "true");
    accountStrip.classList.add("u-hidden");
    resetLoginButtonLabel();
    mockAppleLoginBtn.style.pointerEvents = "auto";
    setGuestStatusBoardVisible(false, { scroll: false });
    renderGuestGoodVotes();
    applyGuestBoardFiltersAndSort();
    resetWizard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderAppSelectors() {
    appsScroller.replaceChildren();
    const visibleApps = getVisibleApps();
    updateAppFilterButtonState();

    if (!selectedAppIsVisible(visibleApps)) {
      selectedApp = null;
      confirmAppPanel.classList.remove("is-open");
      wizardStep2Section.classList.remove("is-open");
      latestChatDraft = null;
      latestReview = null;
      aiReviewPreview.hidden = true;
      submitFeedbackBtn.hidden = true;
      appsScroller.classList.remove("has-selection");
    }

    if (appEmptyState) {
      appEmptyState.hidden = visibleApps.length > 0;
    }

    visibleApps.forEach((app) => {
      const node = document.createElement("button");
      node.type = "button";
      node.className = "app-selector-node";
      if (app.isVirtual) node.classList.add("is-virtual-app");
      node.setAttribute("aria-label", `${app.name} ${app.category}`);

      const iconFrame = document.createElement("div");
      iconFrame.className = "app-icon-frame";
      appendAppIcon(iconFrame, app);

      const title = document.createElement("strong");
      title.className = "app-node-title";
      title.textContent = app.name;

      const category = document.createElement("span");
      category.className = "app-node-category";
      category.textContent = app.category;

      node.append(iconFrame, title, category);

      if (selectedApp?.id === app.id) {
        selectedApp = app;
        node.classList.add("is-selected");
      }

      node.addEventListener("click", () => {
        if (!isAuthenticated) return;

        appsScroller.classList.add("has-selection");
        document.querySelectorAll(".app-selector-node").forEach((item) => item.classList.remove("is-selected"));
        node.classList.add("is-selected");

        selectedApp = app;
        confirmAppLabel.textContent = `「${app.name}」で間違いないですか？`;
        confirmAppPanel.classList.add("is-open");
      });

      appsScroller.append(node);
    });

    window.requestAnimationFrame(updateAppScrollButtons);
  }

  function handleAppSearchInput(event) {
    appSearchQuery = event.target.value;
    renderAppSelectors();
    resetAppScrollPosition();
  }

  function handleAppFilterClick(button) {
    activeAppFilter = button.dataset.appFilter || "all";
    renderAppSelectors();
    resetAppScrollPosition();
  }

  function applyIdeaHashIntent(options = {}) {
    if (window.location.hash !== "#idea") return false;
    activeAppFilter = "idea";
    appSearchQuery = "";
    if (appSearchInput) appSearchInput.value = "";
    renderAppSelectors();
    resetAppScrollPosition();
    if (options.scroll !== false && isAuthenticated) {
      document.getElementById("wizardStep1Section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return true;
  }

  function applySendHashIntent(options = {}) {
    if (window.location.hash !== "#send") return false;

    if (!isAuthenticated) {
      openTermsModal(true);
      return true;
    }

    activeAppFilter = "all";
    appSearchQuery = "";
    if (appSearchInput) appSearchInput.value = "";
    renderAppSelectors();
    resetAppScrollPosition();
    setGuestStatusBoardVisible(false, { scroll: false });
    if (options.scroll !== false) {
      document.getElementById("wizardStep1Section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return true;
  }

  function applySubmissionHashIntent(options = {}) {
    return applySendHashIntent(options) || applyIdeaHashIntent(options);
  }

  async function hydrateAppStoreAppSelectors() {
    try {
      const catalogApps = await loadAllNewAppCatalog();
      if (!catalogApps.length) return;

      const storeById = await lookupAppStoreApps(catalogApps);
      appsData = withNewAppIdea(mergeAppStoreData(catalogApps, storeById));
      renderAppSelectors();
    } catch (error) {
      console.warn("AllNew app catalog could not be refreshed.", error);
    }
  }

  function resetAppSelection() {
    appsScroller.classList.remove("has-selection");
    document.querySelectorAll(".app-selector-node").forEach((node) => node.classList.remove("is-selected"));
    confirmAppPanel.classList.remove("is-open");
    selectedApp = null;
    selectedType = null;
    wizardStep2Section.classList.remove("is-open");
    poipoiChatHistory = [];
    latestChatDraft = null;
    latestReview = null;
    document.body.classList.remove("is-chat-active");
    aiReviewPreview.hidden = true;
    submitFeedbackBtn.hidden = true;
  }

  function confirmAppSelection() {
    if (!selectedApp) return;
    step2ContextBadgeSlot.replaceChildren(createContextBadge(selectedApp, selectedApp.name));
    renderFeedbackChat();
    document.body.classList.add("is-chat-active");
    wizardStep2Section.classList.add("is-open");

    setTimeout(() => {
      wizardStep2Section.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  }

  function resetWizard() {
    selectedApp = null;
    selectedType = null;
    poipoiChatHistory = [];
    latestChatDraft = null;
    latestReview = null;
    document.body.classList.remove("is-chat-active");
    appsScroller.classList.remove("has-selection");
    document.querySelectorAll(".app-selector-node").forEach((node) => node.classList.remove("is-selected"));
    confirmAppPanel.classList.remove("is-open");
    wizardStep2Section.classList.remove("is-open");
    feedbackChatLog.replaceChildren();
    aiReviewPreview.hidden = true;
    submitFeedbackBtn.hidden = true;
    submitFeedbackBtn.disabled = false;
  }

  async function submitFeedback(event) {
    event.preventDefault();
    if (!selectedApp || !latestChatDraft) return;
    if (isSuspendedPreviewUser()) {
      suspendCurrentPreviewUser();
      return;
    }

    const payload = getDraftPayload();
    const review = latestReview || updateAiReviewPreview();

    if (review.decision === "block") {
      const nextCount = getModerationWarningCount() + 1;
      setModerationWarningCount(nextCount);
      if (nextCount >= 3) {
        suspendCurrentPreviewUser();
        alert("受付できない投稿が続いたため、このプレビュー環境では送信を停止しました。");
        return;
      }
      alert(`この内容は受付できません。表現を変えてください。\n\n警告 ${nextCount}/3`);
      return;
    }

    if (review.decision === "warn") {
      alert("送信前に、もう少し内容を見直してください。AI一次チェックの表示を確認してください。");
      return;
    }

    submitFeedbackBtn.disabled = true;
    submitFeedbackBtn.textContent = "受付へ送信中...";

    let persistedItem = null;
    try {
      persistedItem = await persistFeedbackSubmission(payload, review);
    } catch (error) {
      if (!shouldUseLocalPersistenceFallback()) {
        submitFeedbackBtn.disabled = false;
        submitFeedbackBtn.textContent = "この内容で受付へ進む →";
        alert(`受付キューへ送信できませんでした。\n\n${error instanceof Error ? error.message : "unknown error"}`);
        return;
      }
      console.warn("POIPOI feedback submit API fallback.", error);
    }

    const report = createAdminReport(payload, review, persistedItem);
    saveAdminReport(report);

    alert(`🎉 届きました！\n\n【受付ID】${report.id}\n【お届け先】${payload.appName}\n【種別】${payload.type}\n【公開ステータス】${report.publicStatus}\n\nAI一次審査レポートを作成し、運営管理者の確認キューへ送りました。`);

    submitFeedbackBtn.disabled = false;
    submitFeedbackBtn.textContent = "この内容で受付へ進む →";
    resetWizard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bindGuestStatusIconFallbacks() {
    document.querySelectorAll(".guest-status-app-icon").forEach((icon) => {
      icon.addEventListener("error", () => {
        icon.hidden = true;
      }, { once: true });
    });
  }

  guestStatusViewBtn?.addEventListener("click", () => {
    window.location.href = "status-board.html";
  });
  guestStatusFilterButtons.forEach((button) => {
    button.addEventListener("click", () => applyGuestStatusFilter(button.dataset.guestStatusFilter));
  });
  guestBoardSearchInput?.addEventListener("input", () => {
    guestBoardFilters.query = guestBoardSearchInput.value || "";
    applyGuestBoardFiltersAndSort();
  });
  guestBoardSortSelect?.addEventListener("change", () => {
    guestBoardFilters.sort = guestBoardSortSelect.value || "updated-desc";
    applyGuestBoardFiltersAndSort();
  });
  guestPeriodFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.guestPeriodFilter || "all";
      if (value === "all") {
        guestBoardFilters.periods.clear();
        guestBoardFilters.customStart = "";
        guestBoardFilters.customEnd = "";
        if (guestDateStartInput) guestDateStartInput.value = "";
        if (guestDateEndInput) guestDateEndInput.value = "";
      } else if (guestBoardFilters.periods.has(value)) {
        guestBoardFilters.periods.delete(value);
      } else {
        guestBoardFilters.periods.add(value);
      }
      applyGuestBoardFiltersAndSort();
    });
  });
  guestAppFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.guestAppFilter || "all";
      if (value === "all") {
        guestBoardFilters.apps.clear();
      } else if (guestBoardFilters.apps.has(value)) {
        guestBoardFilters.apps.delete(value);
      } else {
        guestBoardFilters.apps.add(value);
      }
      applyGuestBoardFiltersAndSort();
    });
  });
  const syncGuestDateRangeFilter = () => {
    guestBoardFilters.customStart = guestDateStartInput.value || "";
    guestBoardFilters.customEnd = guestDateEndInput.value || "";
    applyGuestBoardFiltersAndSort();
  };
  guestDateStartInput?.addEventListener("input", syncGuestDateRangeFilter);
  guestDateStartInput?.addEventListener("change", syncGuestDateRangeFilter);
  guestDateEndInput?.addEventListener("input", syncGuestDateRangeFilter);
  guestDateEndInput?.addEventListener("change", syncGuestDateRangeFilter);
  guestMineFilterButton?.addEventListener("click", () => {
    guestBoardFilters.mineOnly = !guestBoardFilters.mineOnly;
    applyGuestBoardFiltersAndSort();
  });
  guestFilterResetButton?.addEventListener("click", resetGuestBoardFilters);
  guestGoodButtons.forEach((button) => {
    button.addEventListener("click", () => handleGuestGoodClick(button));
  });
  guestStatusSignInBtn?.addEventListener("click", () => {
    setGuestStatusBoardVisible(false, { scroll: false });
    openTermsModal(true);
  });
  accountBoardLink?.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.href = "status-board.html";
  });
  mockAppleLoginBtn.addEventListener("click", () => openTermsModal(true));
  logoutTrigger.addEventListener("click", signOut);
  appSearchInput.addEventListener("input", handleAppSearchInput);
  appFilterButtons.forEach((button) => {
    button.addEventListener("click", () => handleAppFilterClick(button));
  });
  window.addEventListener("hashchange", () => applySubmissionHashIntent());
  appsScroller.addEventListener("scroll", updateAppScrollButtons, { passive: true });
  appsScrollLeft.addEventListener("click", () => scrollApps(-1));
  appsScrollRight.addEventListener("click", () => scrollApps(1));
  window.addEventListener("resize", updateAppScrollButtons);
  document.getElementById("btnAppNo").addEventListener("click", resetAppSelection);
  document.getElementById("btnAppYes").addEventListener("click", confirmAppSelection);
  closeTermsBtn.addEventListener("click", closeTermsModal);
  cancelTermsBtn.addEventListener("click", closeTermsModal);
  acceptTermsBtn.addEventListener("click", acceptTermsModal);
  localApplePreviewBtn.addEventListener("click", startLocalApplePreview);
  registrationConsentChecks.forEach((check) => check.addEventListener("change", updateTermsActionState));
  legalDocDisclosures.forEach((disclosure) => disclosure.addEventListener("toggle", handleLegalDocDisclosureToggle));
  document.addEventListener("AppleIDSignInOnSuccess", handleAppleSignInSuccess);
  document.addEventListener("AppleIDSignInOnFailure", handleAppleSignInFailure);
  document.addEventListener("keydown", handleTermsModalKeydown);
  poipoiChatForm.addEventListener("submit", sendPoipoiChatMessage);
  poipoiChatInput.addEventListener("input", resizePoipoiChatInput);
  poipoiChatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      poipoiChatForm.requestSubmit();
    }
  });
  submitFeedbackBtn.addEventListener("click", submitFeedback);

  if (adminPreviewEnabled) {
    adminReviewPanel.hidden = false;
  }
  renderAdminReports();
  if (isSuspendedPreviewUser()) {
    suspendCurrentPreviewUser();
  }

  initOpeningInteraction();
  initCookieConsentNotice();
  initScrollyCapabilities();
  bindGuestStatusIconFallbacks();
  renderGuestGoodVotes();
  renderAppSelectors();
  applySubmissionHashIntent({ scroll: false });
  hydrateAppStoreAppSelectors();
});
