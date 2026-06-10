document.addEventListener("DOMContentLoaded", () => {
  const appsCatalogUrl = window.PoipoiI18n?.catalogUrl?.() || "https://apps.allnew.work/?lang=ja";
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
  const appleAuthConfigApiUrl =
    window.POIPOI_APPLE_AUTH_CONFIG_API_URL ||
    feedbackChatApiUrl.replace(/\/api\/feedback\/chat$/, "/api/auth/apple/config");
  const appleAuthSessionApiUrl =
    window.POIPOI_APPLE_AUTH_SESSION_API_URL ||
    feedbackChatApiUrl.replace(/\/api\/feedback\/chat$/, "/api/auth/apple/session");
  const adminSharedSecret = window.POIPOI_ADMIN_SHARED_SECRET || "";
  const appStoreIdByName = Object.freeze({
    WeightSnap: "6758825019",
    OxiSnap: "6759076145",
    ThermoSnap: "6759076372",
    BPSnap: "6759076255",
    GlucoSnap: "6759076419",
    WaistVox: "6759076494",
    CoughWav: "6759076606",
    PupWeight: "6759076505",
    BabyVox: "6759076543",
    BOTTO: "6759169189",
    PawPass: "6768502509",
    MedReminder: "6767980716",
    "HIKAE Cards": "6772018672"
  });
  const appSearchAliasesByName = Object.freeze({
    WeightSnap: "体重 体重管理 weight scale",
    OxiSnap: "血中酸素 SpO2 酸素 oxygen",
    ThermoSnap: "体温 熱 fever temperature",
    BPSnap: "血圧 blood pressure",
    GlucoSnap: "血糖値 血糖 メモ glucose",
    WaistVox: "腹囲 ウエスト waist",
    CoughWav: "咳 せき cough",
    PupWeight: "ペット 犬 猫 体重 pet dog cat",
    BabyVox: "赤ちゃん 育児 成長記録 baby child",
    BOTTO: "集中 没頭 タイマー focus timer",
    PawPass: "ペット 診察券 保険証 薬 犬 猫 pet",
    MedReminder: "服薬 通知 処方箋 薬 リマインダー medicine pill reminder",
    "HIKAE Cards": "カード 控え 診察券 会員証 保険証 ウォレット wallet card holder ひかえ",
    "New App Idea": "新しい提案 新アプリ案 アイデア idea"
  });
  const newAppIdea = Object.freeze({
    id: "newapp",
    name: "New App Idea",
    category: "新しい提案",
    icon: "□",
    iconUrl: "./assets/new-app-idea-icon.png?v=20260606-blank-state",
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
      iconUrl: "https://apps.allnew.work/weightsnap-icon.png?v=20260605-appstore-icon"
    },
    {
      id: "thermosnap",
      name: "ThermoSnap",
      category: "体温",
      filterGroup: "health",
      appStoreId: "6759076372",
      catalogUrl: "https://apps.allnew.work/thermosnap/",
      iconUrl: "https://apps.allnew.work/thermosnap-icon.png?v=20260605-appstore-icon"
    },
    {
      id: "bpsnap",
      name: "BPSnap",
      category: "血圧",
      filterGroup: "health",
      appStoreId: "6759076255",
      catalogUrl: "https://apps.allnew.work/bloodpressuresnap/",
      iconUrl: "https://apps.allnew.work/bpsnap-icon.png?v=20260605-appstore-icon"
    },
    {
      id: "glucosnap",
      name: "GlucoSnap",
      category: "血糖値",
      filterGroup: "health",
      appStoreId: "6759076419",
      catalogUrl: "https://apps.allnew.work/glucosnap/",
      iconUrl: "https://apps.allnew.work/glucosnap-icon.png?v=20260605-appstore-icon"
    },
    {
      id: "waistvox",
      name: "WaistVox",
      category: "腹囲記録",
      filterGroup: "health",
      appStoreId: "6759076494",
      catalogUrl: "https://apps.allnew.work/waistvox/",
      iconUrl: "https://apps.allnew.work/waistvox-icon.png?v=20260605-appstore-icon"
    },
    {
      id: "coughwav",
      name: "CoughWav",
      category: "咳",
      filterGroup: "health",
      appStoreId: "6759076606",
      catalogUrl: "https://apps.allnew.work/coughwav/",
      iconUrl: "https://apps.allnew.work/coughwav-icon.png?v=20260605-appstore-icon"
    },
    {
      id: "pupweight",
      name: "PupWeight",
      category: "ペット体重",
      filterGroup: "pet",
      appStoreId: "6759076505",
      catalogUrl: "https://apps.allnew.work/pupweight/",
      iconUrl: "https://apps.allnew.work/pupweight-icon.png?v=20260605-appstore-icon"
    },
    {
      id: "botto",
      name: "BOTTO",
      category: "集中タイマー",
      filterGroup: "focus",
      appStoreId: "6759169189",
      catalogUrl: "https://apps.allnew.work/botto/",
      iconUrl: "https://apps.allnew.work/botto-icon.png?v=20260605-appstore-icon"
    }
  ]);
  const releasedAppStoreSupplements = Object.freeze([
    {
      id: "oxisnap",
      name: "OxiSnap",
      category: "血中酸素",
      filterGroup: "health",
      appStoreId: "6759076145",
      catalogUrl: "https://apps.allnew.work/oxisnap/",
      appStoreUrl: "https://apps.apple.com/jp/app/oxisnap-spo2%E3%82%92%E5%A3%B0%E3%81%A7%E8%A8%98%E9%8C%B2/id6759076145?uo=4",
      iconUrl: "https://apps.allnew.work/oxisnap-icon.png?v=20260605-appstore-icon"
    },
    {
      id: "babyvox",
      name: "BabyVox",
      category: "育児記録",
      filterGroup: "health",
      appStoreId: "6759076543",
      catalogUrl: "https://apps.allnew.work/babyvox/",
      appStoreUrl: "https://apps.apple.com/jp/app/babyvox-%E8%B5%A4%E3%81%A1%E3%82%83%E3%82%93%E3%81%AE%E6%88%90%E9%95%B7%E8%A8%98%E9%8C%B2%E3%83%8E%E3%83%BC%E3%83%88/id6759076543?uo=4",
      iconUrl: "https://apps.allnew.work/babyvox-icon.png?v=20260605-appstore-icon"
    },
    {
      id: "pawpass",
      name: "PawPass",
      category: "ペット管理",
      filterGroup: "pet",
      appStoreId: "6768502509",
      catalogUrl: "https://apps.allnew.work/pawpass/",
      appStoreUrl: "https://apps.apple.com/jp/app/pawpass/id6768502509?uo=4",
      iconUrl: "https://apps.allnew.work/pawpass-icon.png?v=20260605-appstore-icon"
    },
    {
      id: "medreminder",
      name: "MedReminder",
      category: "服薬リマインダー",
      filterGroup: "health",
      appStoreId: "6767980716",
      catalogUrl: "https://apps.allnew.work/medreminder/",
      appStoreUrl: "https://apps.apple.com/jp/app/ai%E6%9C%8D%E8%96%AC%E9%80%9A%E7%9F%A5-%E5%87%A6%E6%96%B9%E7%AE%8B%E3%83%AA%E3%83%9E%E3%82%A4%E3%83%B3%E3%83%80%E3%83%BC/id6767980716?uo=4",
      iconUrl: "https://apps.allnew.work/medreminder-icon.png?v=20260605-appstore-icon"
    },
    {
      id: "hikaecards",
      name: "HIKAE Cards",
      category: "カード控え",
      filterGroup: "life",
      appStoreId: "6772018672",
      catalogUrl: "https://apps.allnew.work/hikae-cards/",
      appStoreUrl: "https://apps.apple.com/jp/app/id6772018672?uo=4",
      iconUrl: "https://apps.allnew.work/hikae-cards-icon.png"
    }
  ]);
  const canonicalReceptionApps = Object.freeze([
    ...fallbackAppsData,
    ...releasedAppStoreSupplements
  ]);
  let appsData = withNewAppIdea(canonicalReceptionApps.map((app) => ({ ...app })));

  const prefixes = ["爆速の", "癒やしの", "無敵の", "陽気な", "秘密の", "孤高の", "奇跡の", "前向きな", "お茶目な", "ふんわりな"];
  const roles = ["開発者", "応援団", "研究員", "旅人", "キャプテン", "サポーター", "ひらめき王"];
  const suffixes = ["ぷに助", "もっちー", "トントン", "まるこ", "ピポパ"];
  const authSessionCookieName = "poipoi_feedback_session";
  const appleRedirectStateCookieName = "poipoi_apple_redirect_state";
  const goodVoteCookieName = "poipoi_good_votes";
  const poinaReceptionVisitCookieName = "poipoi_reception_visit_count";
  const myReceptionStorageKey = "poipoi_my_receptions_v1";
  const authSessionMaxAgeSeconds = 60 * 60 * 24 * 90;
  const preferenceCookieMaxAgeSeconds = 60 * 60 * 24 * 180;

  let isAuthenticated = false;
  let selectedApp = null;
  let selectedType = null;
  let selectedReceptionIntent = "";
  let pendingReceptionType = "";
  let currentNickname = "";
  let currentFeedbackToken = "";
  let heroCompleted = false;
  let activeAppFilter = window.location.hash === "#idea" ? "idea" : "all";
  let appSearchQuery = "";
  let poinaReceptionVisitCounted = false;
  const adminPreviewEnabled = new URLSearchParams(window.location.search).get("admin") === "preview";
  const presetAppSlug = (new URLSearchParams(window.location.search).get("app") || "").trim().toLowerCase();
  let moderationWarningCount = 0;
  let previewUserSuspended = false;
  let adminReports = [];
  let poipoiChatHistory = [];
  let poipoiChatStopped = false;
  let latestChatDraft = null;
  let latestReview = null;
  let guestBoardView = "mine";
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
  const guestBoardViewButtons = Array.from(document.querySelectorAll("[data-guest-board-view]"));
  const publicStatusSummary = document.getElementById("publicStatusSummary");
  const publicStatusTools = document.getElementById("publicStatusTools");
  const myReceptionPanel = document.getElementById("myReceptionPanel");
  const myReceptionList = document.getElementById("myReceptionList");
  const myReceptionEmpty = document.getElementById("myReceptionEmpty");
  const myReceptionNickname = document.getElementById("myReceptionNickname");
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

  const poinaReceptionSection = document.getElementById("poinaReceptionSection");
  const poinaReceptionTitle = document.getElementById("poinaReceptionTitle");
  const poinaReceptionLead = document.getElementById("poinaReceptionLead");
  const poinaReceptionGuide = document.getElementById("poinaReceptionGuide");
  const poinaSelectedIntentNote = document.getElementById("poinaSelectedIntentNote");
  const poinaIntentButtons = Array.from(document.querySelectorAll("[data-poina-intent]"));
  const appPickerSection = document.getElementById("appPickerSection");
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
  const poipoiSubmitSummary = document.getElementById("poipoiSubmitSummary");
  const poipoiSummaryApp = document.getElementById("poipoiSummaryApp");
  const poipoiSummaryType = document.getElementById("poipoiSummaryType");
  const poipoiSummaryBody = document.getElementById("poipoiSummaryBody");
  const poipoiSummaryNote = document.getElementById("poipoiSummaryNote");
  const editFeedbackDraftBtn = document.getElementById("editFeedbackDraftBtn");
  const submitFeedbackBtn = document.getElementById("submitFeedbackBtn");
  const adminReviewPanel = document.getElementById("adminReviewPanel");
  const adminReportList = document.getElementById("adminReportList");
  const termsModal = document.getElementById("termsModal");
  const closeTermsBtn = document.getElementById("closeTermsBtn");
  const cancelTermsBtn = document.getElementById("cancelTermsBtn");
  const acceptTermsBtn = document.getElementById("acceptTermsBtn");
  const termsErrorText = document.getElementById("termsErrorText");
  const appleOfficialAuthZone = document.getElementById("appleOfficialAuthZone");
  const appleFooterAuthSlot = document.getElementById("appleFooterAuthSlot");
  const appleIdSigninButton = document.getElementById("appleid-signin");
  const appleSigninConfigNotice = document.getElementById("appleSigninConfigNotice");
  const appleSigninReadyText = document.getElementById("appleSigninReadyText");
  const localApplePreviewBtn = document.getElementById("localApplePreviewBtn");
  const termsFooterNote = document.getElementById("termsFooterNote");
  const registrationConsentChecks = Array.from(document.querySelectorAll(".registration-consent-check"));
  const legalDocDisclosures = Array.from(document.querySelectorAll(".legal-doc-disclosure"));
  const cookieConsentBanner = document.getElementById("cookieConsentBanner");
  const cookieConsentAccept = document.getElementById("cookieConsentAccept");
  const isLocalPreviewHost = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
  let termsModalRequiresRegistrationConsent = false;
  let termsModalReturnFocusTarget = null;
  let appleSignInRuntimeConfig = null;
  let appleSignInConfigPromise = null;
  let appleSignInInitialized = false;
  let appleProgrammaticSignInReady = false;
  let appleSignInPreparing = false;
  let appleSignInSetupFailed = false;

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
    if (normalizedName === "pupweight" || normalizedName === "pawpass" || normalizedCategory.includes("ペット")) return "pet";
    if (normalizedName === "botto" || normalizedCategory.includes("集中")) return "focus";
    if (normalizedName === "hikae cards" || normalizedCategory.includes("カード")) return "life";
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

  function mergeCatalogWithCanonicalApps(catalogApps) {
    const catalogById = new Map();
    const catalogByName = new Map();
    catalogApps.forEach((app) => {
      if (app.appStoreId) catalogById.set(String(app.appStoreId), app);
      catalogByName.set(app.name, app);
    });

    const used = new Set();
    const merged = canonicalReceptionApps.map((canonical) => {
      const catalog = catalogById.get(String(canonical.appStoreId)) || catalogByName.get(canonical.name);
      if (!catalog) return { ...canonical };

      used.add(catalog);
      return {
        ...canonical,
        ...catalog,
        id: canonical.id || catalog.id,
        category: canonical.category || catalog.category,
        filterGroup: canonical.filterGroup || catalog.filterGroup,
        appStoreId: canonical.appStoreId || catalog.appStoreId,
        appStoreUrl: catalog.appStoreUrl || canonical.appStoreUrl,
        catalogUrl: catalog.catalogUrl || canonical.catalogUrl,
        iconUrl: canonical.iconUrl || catalog.iconUrl
      };
    });

    catalogApps.forEach((app) => {
      const alreadyCanonical = canonicalReceptionApps.some((canonical) =>
        canonical.name === app.name || String(canonical.appStoreId) === String(app.appStoreId || "")
      );
      if (!used.has(app) && !alreadyCanonical) {
        merged.push(app);
      }
    });

    return merged;
  }

  function withNewAppIdea(apps) {
    return [...apps.filter((app) => app.id !== newAppIdea.id), { ...newAppIdea }];
  }

  function cookieSecureAttribute() {
    return window.location.protocol === "https:" ? "; Secure" : "";
  }

  function getCookieValue(name) {
    const prefix = `${name}=`;
    const entry = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith(prefix));
    if (!entry) return "";
    return decodeURIComponent(entry.slice(prefix.length));
  }

  function setCookieValue(name, value, maxAgeSeconds) {
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${cookieSecureAttribute()}`;
  }

  function clearCookieValue(name) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${cookieSecureAttribute()}`;
  }

  function getJsonCookie(name) {
    const value = getCookieValue(name);
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function setJsonCookie(name, value, maxAgeSeconds) {
    setCookieValue(name, JSON.stringify(value), maxAgeSeconds);
  }

  function loadMyReceptions() {
    try {
      const parsed = JSON.parse(localStorage.getItem(myReceptionStorageKey) || "[]");
      return Array.isArray(parsed) ? parsed.filter((item) => item?.id).slice(0, 30) : [];
    } catch {
      return [];
    }
  }

  function saveMyReceptions(items) {
    try {
      localStorage.setItem(myReceptionStorageKey, JSON.stringify(items.slice(0, 30)));
    } catch {
      // マイ受付は再訪時の補助表示なので、保存できなくても送信自体は止めない。
    }
  }

  function rememberMyReception(payload, report) {
    const now = new Date();
    const receivedAt = report.createdAt || now.toISOString();
    const next = {
      id: report.id,
      appName: payload.appName || "New App Idea",
      type: payload.type || "未分類",
      title: payload.title || payload.body?.slice(0, 48) || "受付内容",
      body: payload.body || "",
      publicStatus: report.publicStatus || "受け付けました",
      acceptedAt: receivedAt,
      updatedAt: report.updatedAt || receivedAt,
      nickname: currentNickname || generateNickname()
    };
    const existing = loadMyReceptions().filter((item) => item.id !== next.id);
    saveMyReceptions([next, ...existing]);
  }

  function formatDateForReception(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(window.PoipoiI18n?.language === "en" ? "en-US" : "ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  }

  function formatDateTimeForReception(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    if (window.PoipoiI18n?.language === "en") {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    }
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}時${pad(date.getMinutes())}分`;
  }

  function getStoredPoinaReceptionVisitCount() {
    const count = Number.parseInt(getCookieValue(poinaReceptionVisitCookieName) || "0", 10);
    return Number.isFinite(count) && count > 0 ? Math.min(count, 99) : 0;
  }

  function markPoinaReceptionVisit() {
    if (poinaReceptionVisitCounted) return getStoredPoinaReceptionVisitCount();

    const nextCount = Math.min(getStoredPoinaReceptionVisitCount() + 1, 99);
    setCookieValue(poinaReceptionVisitCookieName, String(nextCount), preferenceCookieMaxAgeSeconds);
    poinaReceptionVisitCounted = true;
    return nextCount;
  }

  function getPoinaReceptionScript(visitCount = getStoredPoinaReceptionVisitCount()) {
    if (visitCount <= 1) {
      return {
        title: "ポイナです。POIPOI受付へようこそ。",
        lead: "AllNewアプリの不具合、改善アイデア、新しいアプリ案を送れます。",
        guide: "今日はどのようなご用件でしょうか？"
      };
    }

    if (visitCount === 2) {
      return {
        title: "おかえりなさい。今日もポイナがうかがいます。",
        lead: "前回の続きでも、新しい内容でも大丈夫です。",
        guide: "今日はどのようなご用件でしょうか？"
      };
    }

    return {
      title: "いつもありがとうございます。",
      lead: "",
      guide: "今日はどのようなご用件でしょうか？"
    };
  }

  function updatePoinaReceptionScript(visitCount = getStoredPoinaReceptionVisitCount()) {
    const script = getPoinaReceptionScript(visitCount);
    if (poinaReceptionTitle) poinaReceptionTitle.textContent = script.title;
    if (poinaReceptionLead) {
      poinaReceptionLead.textContent = script.lead;
      poinaReceptionLead.hidden = !script.lead;
    }
    if (poinaReceptionGuide) {
      poinaReceptionGuide.textContent = script.guide;
      poinaReceptionGuide.hidden = !script.guide;
    }
    window.PoipoiI18n?.setLanguage?.(window.PoipoiI18n.language || "ja", { updateUrl: false });
  }

  function scrollToPoinaReception(options = {}) {
    const target = poinaReceptionSection || document.getElementById("wizardStep1Section");
    if (!target || options.scroll === false) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToAppPicker(options = {}) {
    if (options.scroll === false) return;
    const target = appPickerSection || appsScroller || document.getElementById("wizardStep1Section");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hasCookieConsentNotice() {
    return getCookieValue("af_cookie_notice") === "accepted";
  }

  function setCookieConsentNotice() {
    setCookieValue("af_cookie_notice", "accepted", preferenceCookieMaxAgeSeconds);
  }

  function setCookieBannerVisible(isVisible) {
    if (!cookieConsentBanner) return;
    cookieConsentBanner.hidden = !isVisible;
    cookieConsentBanner.inert = !isVisible;
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

    if (window.matchMedia("(max-width: 640px)").matches) {
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

  function isGeneratedPoinaNickname(value) {
    const nickname = String(value || "").trim();
    if (!nickname) return false;
    return prefixes.some((prefix) => roles.some((role) => suffixes.some((suffix) => nickname === `${prefix}${role} ${suffix}`)));
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

  function getDisplayFeedbackType(type) {
    if (type === "不具合メモ") return "不具合";
    if (type === "改善の要望") return "改善アイデア";
    if (type === "新しいアプリ案") return "新しいアプリ案";
    return type || "ご意見";
  }

  function getSelectedAppDisplayName() {
    return selectedApp?.isVirtual ? "新しいアプリ案" : selectedApp?.name || "未選択";
  }

  function getChatPlaceholder() {
    const appName = selectedApp?.name || "アプリ";
    const type = selectedType || pendingReceptionType;
    if (selectedApp?.isVirtual || type === "新しいアプリ案") {
      return "どなたが、どのような場面で困るかを教えてください。";
    }
    if (type === "不具合メモ") {
      return `${appName}で起きていることを教えてください。`;
    }
    if (type === "改善の要望") {
      return `${appName}で、こうなると助かることを教えてください。`;
    }
    return "気になったことをそのまま教えてください。";
  }

  function updateChatPlaceholder() {
    if (poipoiChatInput) {
      poipoiChatInput.placeholder = getChatPlaceholder();
    }
  }

  function isNewAppIdeaPayload(payload = getDraftPayload()) {
    return selectedApp?.isVirtual || payload.type === "新しいアプリ案" || payload.appName === newAppIdea.name;
  }

  function hideSubmitSummary() {
    if (poipoiSubmitSummary) {
      poipoiSubmitSummary.hidden = true;
      poipoiSubmitSummary.classList.remove("is-idea-reception");
      const summaryList = poipoiSubmitSummary.querySelector(".poipoi-submit-summary-list");
      if (summaryList) summaryList.hidden = false;
    }
    if (editFeedbackDraftBtn) {
      editFeedbackDraftBtn.hidden = true;
    }
  }

  function setSubmitButtonIdleLabel(payload = getDraftPayload()) {
    if (!submitFeedbackBtn) return;
    submitFeedbackBtn.textContent = isNewAppIdeaPayload(payload) ? "このまま送る →" : "確認して送る →";
  }

  function updateSubmitSummary(payload = getDraftPayload()) {
    if (!poipoiSubmitSummary) return;
    const body = String(payload.body || payload.title || "").trim();
    if (!body) {
      hideSubmitSummary();
      return;
    }

    const isIdea = isNewAppIdeaPayload(payload);
    const summaryList = poipoiSubmitSummary.querySelector(".poipoi-submit-summary-list");
    poipoiSubmitSummary.classList.toggle("is-idea-reception", isIdea);
    if (summaryList) summaryList.hidden = isIdea;

    if (isIdea) {
      if (poipoiSubmitSummary.querySelector(".poipoi-submit-summary-title")) {
        poipoiSubmitSummary.querySelector(".poipoi-submit-summary-title").textContent = "ありがとうございます。AllNewで検討します。";
      }
      if (poipoiSummaryNote) {
        poipoiSummaryNote.textContent = "いただいたアイデアは、AllNewの新しいアプリ案としてお預かりします。氏名や連絡先などの個人情報は書かず、このまま送信してください。送信後に受付番号が表示されます。";
      }
      poipoiSubmitSummary.hidden = false;
      if (editFeedbackDraftBtn) {
        editFeedbackDraftBtn.hidden = false;
      }
      setSubmitButtonIdleLabel(payload);
      return;
    }

    if (poipoiSubmitSummary.querySelector(".poipoi-submit-summary-title")) {
      poipoiSubmitSummary.querySelector(".poipoi-submit-summary-title").textContent = "送信前に内容を確認してください。";
    }
    if (poipoiSummaryApp) poipoiSummaryApp.textContent = payload.appName || getSelectedAppDisplayName();
    if (poipoiSummaryType) poipoiSummaryType.textContent = getDisplayFeedbackType(payload.type);
    if (poipoiSummaryBody) poipoiSummaryBody.textContent = body.length > 180 ? `${body.slice(0, 180)}...` : body;
    if (poipoiSummaryNote) {
      poipoiSummaryNote.textContent = payload.appName === "WeightSnap"
        ? "体重などの数値は書かないでください。状況だけでお預かりできます。送信後に受付番号が表示され、あとで受付状況を確認できます。"
        : "氏名、連絡先、住所、パスワードなどの個人情報は書かないでください。状況だけでお預かりできます。送信後に受付番号が表示されます。";
    }
    poipoiSubmitSummary.hidden = false;
    if (editFeedbackDraftBtn) {
      editFeedbackDraftBtn.hidden = false;
    }
    setSubmitButtonIdleLabel(payload);
  }

  const poinaReceptionIntents = Object.freeze({
    bug: {
      type: "不具合メモ",
      filter: "all",
      note: "不具合ですね。対象アプリを選択してください。"
    },
    improvement: {
      type: "改善の要望",
      filter: "all",
      note: "改善アイデアですね。対象アプリを選択してください。"
    },
    idea: {
      type: "新しいアプリ案",
      filter: "idea",
      note: "新しいアプリ案ですね。アイデアについてお聞かせください。"
    }
  });

  function updatePoinaIntentButtonState() {
    poinaIntentButtons.forEach((button) => {
      const isActive = button.dataset.poinaIntent === selectedReceptionIntent;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function selectPoinaReceptionIntent(intentKey, options = {}) {
    if (intentKey === "status") {
      window.location.href = "status-board.html";
      return;
    }

    const intent = poinaReceptionIntents[intentKey];
    if (!intent) return;

    selectedReceptionIntent = intentKey;
    pendingReceptionType = intent.type;
    selectedType = intent.type;
    activeAppFilter = intent.filter || "all";
    appSearchQuery = "";
    if (appSearchInput) appSearchInput.value = "";
    if (poinaSelectedIntentNote) {
      poinaSelectedIntentNote.textContent = intent.note;
      poinaSelectedIntentNote.hidden = false;
    }
    updatePoinaIntentButtonState();
    setAppPickerSkippedForIdea(false);

    if (intentKey === "idea") {
      startNewAppIdeaReception();
      return;
    }

    renderAppSelectors();
    resetAppScrollPosition();
    scrollToAppPicker(options);
  }

  function setAppPickerSkippedForIdea(shouldSkip) {
    const shouldShowAppPicker = !shouldSkip && Boolean(selectedReceptionIntent);
    if (appPickerSection) appPickerSection.hidden = !shouldShowAppPicker;
    if (confirmAppPanel) {
      const shouldHideConfirm = shouldSkip || !shouldShowAppPicker;
      confirmAppPanel.hidden = shouldHideConfirm;
      if (shouldHideConfirm) confirmAppPanel.classList.remove("is-open");
    }
  }

  function getNewAppIdeaApp() {
    return appsData.find((app) => app.isVirtual) || newAppIdea;
  }

  function startNewAppIdeaReception() {
    selectedApp = getNewAppIdeaApp();
    selectedType = "新しいアプリ案";
    pendingReceptionType = "新しいアプリ案";
    appsScroller.classList.add("has-selection");
    confirmAppPanel.classList.remove("is-open");
    renderAppSelectors();
    resetAppScrollPosition();
    setAppPickerSkippedForIdea(true);
    confirmAppSelection();
  }

  function getConfirmAppSelectionLabel(app) {
    if (app?.isVirtual) {
      return "新しいアプリ案として進めますか？";
    }
    if (pendingReceptionType) {
      return `${app.name}の${getDisplayFeedbackType(pendingReceptionType)}ですね。進めますか？`;
    }
    return `${app.name}についてですね。この内容で進めますか？`;
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

  function appendReceptionReceipt(payload, report) {
    const message = document.createElement("div");
    message.className = "chat-message bot chat-receipt-message";

    const intro = document.createElement("p");
    intro.className = "chat-receipt-intro";
    intro.textContent = "下記の内容で受け付けました。";

    const title = document.createElement("strong");
    title.className = "chat-receipt-title";
    title.textContent = "受付内容";

    const rows = document.createElement("div");
    rows.className = "chat-receipt-rows";
    [
      ["【日時】", formatDateTimeForReception(report.createdAt || new Date())],
      ["【受付No.】", report.id],
      ["【対象】", payload.appName || "New App Idea"],
      ["【内容】", payload.body || payload.title || "受付内容"]
    ].forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "chat-receipt-row";
      const labelNode = document.createElement("span");
      labelNode.className = "chat-receipt-label";
      labelNode.textContent = label;
      const valueNode = document.createElement("span");
      valueNode.className = "chat-receipt-value";
      valueNode.textContent = value;
      row.append(labelNode, valueNode);
      rows.append(row);
    });

    message.append(intro, title, rows);
    feedbackChatLog.append(message);
    feedbackChatLog.scrollTop = feedbackChatLog.scrollHeight;
    return message;
  }

  function disableReceptionActionButtons(message) {
    message.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
  }

  function appendPostReceptionActions() {
    const message = document.createElement("div");
    message.className = "chat-message bot chat-post-reception-message";

    const prompt = document.createElement("p");
    prompt.className = "chat-post-reception-prompt";
    prompt.textContent = "他にも何かお気づきの点がございましたら、お聞かせください。";

    const actions = document.createElement("div");
    actions.className = "chat-post-reception-actions";

    const continueButton = document.createElement("button");
    continueButton.type = "button";
    continueButton.className = "chat-post-reception-button secondary";
    continueButton.textContent = "続ける";
    continueButton.addEventListener("click", () => {
      disableReceptionActionButtons(message);
      resetWizard();
      showSubmissionEntry({ behavior: "smooth" });
    });

    const finishButton = document.createElement("button");
    finishButton.type = "button";
    finishButton.className = "chat-post-reception-button primary";
    finishButton.textContent = "終了する";
    finishButton.addEventListener("click", () => {
      disableReceptionActionButtons(message);
      appendChatMessage("assistant", "本日はご利用ありがとうございました。");
      window.setTimeout(() => {
        resetWizard();
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 1800);
    });

    actions.append(continueButton, finishButton);
    message.append(prompt, actions);
    feedbackChatLog.append(message);
    feedbackChatLog.scrollTop = feedbackChatLog.scrollHeight;
    return message;
  }

  function getPoinaOpeningMessage() {
    const appName = selectedApp?.name || "このアプリ";
    if (selectedApp?.isVirtual) {
      return "新しいアプリ案ですね。アイデアについてお聞かせください。どなたが、どのような場面で困るかを、思いつく範囲で教えてください。";
    }

    const receptionType = selectedType || pendingReceptionType;
    if (receptionType === "不具合メモ") {
      return `${appName}の不具合ですね。ご不便をおかけして申し訳ありません。差し支えない範囲で、具体的な内容を教えていただけますか？`;
    }
    if (receptionType === "改善の要望") {
      return `${appName}の改善アイデアですね。より使いやすくするために、こうなると助かることを1つ教えていただけますか？`;
    }
    return `${appName}についてお聞かせください。気になったことをそのまま教えてください。`;
  }

  function renderFeedbackChat() {
    poipoiChatHistory = [];
    poipoiChatStopped = false;
    latestChatDraft = null;
    latestReview = null;
    selectedType = selectedApp?.isVirtual ? "新しいアプリ案" : pendingReceptionType;
    feedbackChatLog.replaceChildren();
    aiReviewPreview.hidden = true;
    submitFeedbackBtn.hidden = true;
    hideSubmitSummary();
    poipoiChatForm.hidden = false;
    poipoiChatInput.disabled = false;
    poipoiChatSend.disabled = false;
    poipoiChatSend.textContent = "送る";
    appendChatMessage("assistant", getPoinaOpeningMessage());
    poipoiChatInput.value = "";
    updateChatPlaceholder();
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
    const titleText = String(payload.title || "").trim();
    const bodyText = String(payload.body || "").trim();
    const fullText = bodyText && titleText && bodyText !== titleText
      ? `${titleText}\n${bodyText}`.trim()
      : (bodyText || titleText);
    const isAppBugReport = payload.type === "不具合メモ";
    const appBugContextPattern = /不具合|バグ|認識|表示|保存|同期|撮影|画像|画面|データ|ダミー|エラー|動かない|できない|うまくできない|読み取|OCR|camera|image|dummy|error|bug|display|recogn/i;
    const flags = prohibitedTopicRules.filter((rule) => {
      if (
        isAppBugReport
        && rule.label === "医療助言・診断に近い内容"
        && appBugContextPattern.test(fullText)
      ) {
        return false;
      }
      return rule.pattern.test(fullText);
    });
    const blockingFlags = flags.filter((flag) => flag.severity === "block");
    const warningFlags = flags.filter((flag) => flag.severity === "warn");
    const detailLength = fullText.replace(/\s/g, "").length;
    const repeatedNoise = /(.)\1{9,}/.test(fullText);

    if (blockingFlags.length > 0 || repeatedNoise) {
      return {
        decision: "block",
        publicStatus: "ごめんなさい",
        flags,
        message: `恐れ入りますが、この内容はそのままでは送信できません。${blockingFlags.map((flag) => flag.label).join("、") || "いたずらの疑い"}にあたる可能性があります。表現を変えてください。`,
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
        message: `送る前に確認が必要です。${warningFlags.map((flag) => flag.label).join("、")}にあたる情報が含まれていないか見直してください。`,
        adminSummary: "注意情報の混入可能性。投稿前にユーザーへ見直しを促す。",
        nextAction: "ユーザーへ見直し依頼。"
      };
    }

    return {
      decision: "accept",
      publicStatus: "受け付けました",
      flags: [],
      message: "この内容でお預かりできます。",
      adminSummary: `${payload.appName} / ${payload.type} として検討に値する内容。公開前に人間の運営管理者が要約とマスキングを確認する。`,
      nextAction: payload.type === "新しいアプリ案" ? "新しいアプリ案として運営が確認します。" : "対象アプリの改善・不具合として運営が確認します。"
    };
  }

  function updateAiReviewPreview() {
    const payload = getDraftPayload();
    const review = evaluateSubmission(payload);
    aiReviewPreview.classList.remove("is-ok", "is-warn", "is-block");
    if (!payload.title && !payload.body) {
      aiReviewPreview.hidden = true;
      aiReviewMessage.textContent = "入力された内容は、送信前に送れる状態か確認します。";
      hideSubmitSummary();
      return review;
    }

    aiReviewPreview.hidden = false;
    aiReviewPreview.classList.add(review.decision === "accept" ? "is-ok" : review.decision === "block" ? "is-block" : "is-warn");
    aiReviewMessage.textContent = review.message;
    if (review.decision === "accept") {
      updateSubmitSummary(payload);
    } else {
      hideSubmitSummary();
    }
    return review;
  }

  function inferFeedbackType(message) {
    if (selectedApp?.isVirtual) return "新しいアプリ案";
    if (selectedType === "不具合メモ" || selectedType === "改善の要望") return selectedType;
    if (pendingReceptionType === "不具合メモ" || pendingReceptionType === "改善の要望") return pendingReceptionType;
    if (/不具合|バグ|落ちる|固まる|保存されない|表示されない|おかしい|エラー|クラッシュ|bug|error|crash|broken|breaks?|not working|doesn'?t work|cannot|can't|icon|display/i.test(message)) {
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
    let reply = "";
    if (riskLabels.includes("個人情報・秘密情報の混入")) {
      reply = "個人情報や秘密情報に見える内容が含まれているようです。恐れ入りますが、その部分を伏せて、起きたことやご要望だけを書き直してください。";
    } else if (riskLabels.includes("医療助言・診断に近い内容") && inferredType !== "不具合メモ") {
      reply = "ありがとうございます。診断や治療の判断にあたる内容は、この受付では扱えません。アプリの表示、操作、記録のしやすさについて気になった点を教えてください。";
    } else if (review.decision === "block") {
      reply = "恐れ入りますが、この内容はそのままではお預かりできません。アプリの不具合、使いにくさ、あったらいい機能のどれかに絞って書き直してください。";
    } else if (needsMore) {
      reply = inferredType === "新しいアプリ案"
        ? "ありがとうございます。どなたが、どのような場面で困るかを、もう少しだけ教えてください。個人情報は不要です。"
        : buildStableCollectingReply({ extracted: { type: inferredType } });
    } else if (inferredType === "不具合メモ") {
      reply = "お知らせいただき、ありがとうございました。すぐに担当者と確認いたします。";
    } else if (inferredType === "新しいアプリ案") {
      reply = "ありがとうございます。その困りごとは、AllNewで検討します。送信後に受付番号が表示されます。";
    } else {
      reply = `ありがとうございます。${selectedApp?.name || "このアプリ"}の改善のご意見として、お預かりいたします。内部で確認の上、検討を進めてまいります。`;
    }

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

  function isAllowedInlineLatinToken(value) {
    return /^(YouTube|Instagram|POIPOI|STUDIO|App|AI|URL|SNS|iPhone|Android)/i.test(value);
  }

  function hasSuspiciousLatinJapaneseBlend(text) {
    const matches = String(text || "").match(/[A-Za-z]{3,}[ぁ-んァ-ヶ一-龯]/g) || [];
    return matches.some((match) => !isAllowedInlineLatinToken(match));
  }

  function getUserChatMessages() {
    return poipoiChatHistory
      .filter((item) => item.role === "user")
      .map((item) => String(item.content || "").trim())
      .filter(Boolean);
  }

  function getLastUserChatMessage() {
    const messages = getUserChatMessages();
    return messages[messages.length - 1] || "";
  }

  function compactReceptionText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/。{2,}/g, "。")
      .trim();
  }

  function buildFaithfulDraftBody() {
    const messages = getUserChatMessages().map(compactReceptionText).filter(Boolean);
    if (!messages.length) return "";
    const latest = messages[messages.length - 1];
    if (latest.replace(/\s/g, "").length >= 12) return latest;
    return [...new Set(messages)].join("。").replace(/。{2,}/g, "。").trim();
  }

  function getReceptionTypeFromResult(result) {
    if (selectedApp?.isVirtual) return "新しいアプリ案";
    const value = result?.extracted?.type || selectedType || pendingReceptionType || "";
    if (/不具合|バグ/.test(value)) return "不具合メモ";
    if (/改善|要望/.test(value)) return "改善の要望";
    return value || inferFeedbackType(result?.extracted?.summary || getLastUserChatMessage());
  }

  function inferBugTopicFromUserMessages() {
    const text = getUserChatMessages().join(" ");
    if (/アイコン|icon/i.test(text)) return "アイコン表示";
    if (/通知|notification/i.test(text)) return "通知";
    if (/ログイン|サインイン|login|sign[ -]?in/i.test(text)) return "ログイン";
    if (/保存|記録|save|record/i.test(text)) return "保存";
    if (/表示|画面|レイアウト|display|screen|layout/i.test(text)) return "表示";
    return "不具合";
  }

  function buildStableCollectingReply(result) {
    const appName = selectedApp?.name || "このアプリ";
    const type = getReceptionTypeFromResult(result);
    if (selectedApp?.isVirtual || type === "新しいアプリ案") {
      return "ありがとうございます。どなたが、どのような場面で困るかを、もう少しだけ教えてください。";
    }
    if (type === "不具合メモ") {
      return `ありがとうございます。${inferBugTopicFromUserMessages()}の不具合ですね。`;
    }
    return `ありがとうございます。${appName}をより使いやすくするご提案ですね。どのように変わると助かるか、1つだけ教えていただけますか？`;
  }

  function replyAsksForMoreAfterReady(text) {
    return /もう少し|教えて|いただけますか|ください|どんな使い方|どの画面|いつ、どこ|再現条件|再現手順|環境情報/i.test(String(text || ""));
  }

  function replyNeedsReceptionRewrite(text, result) {
    const reply = String(text || "");
    const type = getReceptionTypeFromResult(result);
    if (!reply.trim()) return true;
    if (/おさわがせ|確認しました|記録しますので|改善案を一緒|AI一次|下のAI|再現条件|再現手順|環境情報|クリック動作|未特定|現象を詳しく|どのアイコンが|まず「|次に、/.test(reply)) {
      return true;
    }
    if (type === "不具合メモ" && /医療判断|医療助言|診断や治療|法律に抵触|期待に添えず|ご要望はございませんか/.test(reply)) return true;
    if (type === "不具合メモ" && /改善案/.test(reply)) return true;
    if (type === "不具合メモ" && (reply.match(/教えてください/g) || []).length > 1) return true;
    return false;
  }

  function buildStablePoinaReply(result) {
    const appName = selectedApp?.name || "このアプリ";
    const type = getReceptionTypeFromResult(result);
    if (result?.status === "ready") {
      if (selectedApp?.isVirtual || type === "新しいアプリ案") {
        return "ありがとうございます。その困りごとは、AllNewで検討します。送信後に受付番号が表示されます。";
      }
      if (type === "不具合メモ") {
        return "お知らせいただき、ありがとうございました。すぐに担当者と確認いたします。";
      }
      return `ありがとうございます。${appName}の改善のご意見として、お預かりいたします。内部で確認の上、検討を進めてまいります。`;
    }

    if (result?.status === "blocked") {
      return "恐れ入りますが、この内容はそのままではお預かりできません。個人情報や秘密情報を入れず、アプリの不具合や改善案に絞って書き直してください。";
    }

    return buildStableCollectingReply(result);
  }

  function polishPoinaResultForDisplay(result) {
    const reply = String(result?.reply || "");
    if (!result || typeof result !== "object") return buildLocalChatResult("");
    const lastUserMessage = [...poipoiChatHistory].reverse().find((item) => item.role === "user")?.content
      || result.extracted?.detail
      || result.extracted?.summary
      || "";
    if (selectedApp?.isVirtual && result.status !== "blocked") {
      const localIdeaResult = buildLocalChatResult(lastUserMessage);
      if (localIdeaResult.status === "ready") {
        return {
          ...localIdeaResult,
          reply: buildStablePoinaReply(localIdeaResult)
        };
      }
    }
    const localResult = buildLocalChatResult(lastUserMessage);
    if (
      getReceptionTypeFromResult(localResult) === "不具合メモ"
      && localResult.status === "ready"
      && (
        result.status !== "ready"
        || replyNeedsReceptionRewrite(reply, result)
        || /医療判断|医療助言|診断や治療|法律に抵触|期待に添えず/.test(reply)
      )
    ) {
      return {
        ...localResult,
        reply: buildStablePoinaReply(localResult)
      };
    }
    const isIdeaReady = result.status === "ready"
      && (selectedApp?.isVirtual || result.extracted?.type === "新しいアプリ案");
    if (isIdeaReady || hasSuspiciousLatinJapaneseBlend(reply) || replyNeedsReceptionRewrite(reply, result) || (result.status === "ready" && replyAsksForMoreAfterReady(reply))) {
      return { ...result, reply: buildStablePoinaReply(result) };
    }
    return result;
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
        feedbackToken: currentFeedbackToken,
        poinaReview
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      throw new Error(result.error || `feedback_submit_${response.status}`);
    }
    return result.item;
  }

  function getUserFacingSubmitError(error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (message.includes("feedback_store_not_configured")) {
      return "受付内容の保存先がまだ有効になっていません。内容は失われないよう、この画面に残しています。運営側で保存先を有効化してから、もう一度送信してください。";
    }
    if (message.includes("rate_limited")) {
      return "短時間に送信が集中しています。少し時間をおいてから、もう一度送信してください。";
    }
    if (message.includes("unauthorized")) {
      return "受付内容の保存に必要な認証に失敗しました。ページを再読み込みして、もう一度お試しください。";
    }
    return "受付内容の送信に失敗しました。通信状況を確認して、もう一度お試しください。";
  }

  function reviewFromChatResult(result) {
    const riskFlags = Array.isArray(result.extracted?.riskFlags) ? result.extracted.riskFlags : [];
    const decision = result.status === "ready" ? "accept" : result.status === "blocked" ? "block" : "warn";
    return {
      decision,
      publicStatus: result.publicStatus || (decision === "accept" ? "受け付けました" : decision === "block" ? "ごめんなさい" : "下書き確認"),
      flags: riskFlags.map((label) => ({ label, severity: decision === "block" ? "block" : "warn" })),
      message: decision === "accept"
        ? "この内容でお預かりできます。"
        : decision === "block"
          ? "恐れ入りますが、この内容はそのままでは送信できません。表現を変えてください。"
          : "もう少し情報を足すと、内容が伝わりやすくなります。",
      adminSummary: result.adminReport?.summary || "",
      nextAction: result.adminReport?.nextAction || "運営が内容を確認する。"
    };
  }

  function applyChatResult(result) {
    const extracted = result.extracted || {};
    const lastUserMessage = getLastUserChatMessage();
    const faithfulBody = buildFaithfulDraftBody();
    const extractedBody = extracted.detail || extracted.summary || "";
    const draftBody = result.status === "ready"
      ? faithfulBody || extractedBody || lastUserMessage
      : extractedBody || faithfulBody || lastUserMessage;
    if (extracted.type && extracted.type !== "未分類" && extracted.type !== "受付不可") {
      selectedType = selectedApp?.isVirtual ? "新しいアプリ案" : extracted.type;
    }
    latestChatDraft = {
      appId: selectedApp?.id || "",
      appName: selectedApp?.name || "",
      type: selectedType || extracted.type || "未分類",
      title: extracted.title || draftBody.replace(/\s+/g, " ").slice(0, 48),
      body: draftBody
    };
    latestReview = reviewFromChatResult(result);
    aiReviewPreview.classList.remove("is-ok", "is-warn", "is-block");
    aiReviewPreview.classList.add(
      latestReview.decision === "accept" ? "is-ok" : latestReview.decision === "block" ? "is-block" : "is-warn"
    );
    aiReviewPreview.hidden = false;
    aiReviewMessage.textContent = latestReview.message;
    submitFeedbackBtn.hidden = latestReview.decision !== "accept";

    if (latestReview.decision === "accept") {
      updateSubmitSummary();
      stopPoipoiChat();
      return;
    }

    hideSubmitSummary();

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

  function resumePoipoiDraftEditing() {
    const draftBody = latestChatDraft?.body || latestChatDraft?.title || "";
    poipoiChatStopped = false;
    poipoiChatForm.hidden = false;
    poipoiChatInput.disabled = false;
    poipoiChatSend.disabled = false;
    poipoiChatSend.textContent = "送り直す";
    poipoiChatInput.value = draftBody;
    updateChatPlaceholder();
    resizePoipoiChatInput();
    latestChatDraft = null;
    latestReview = null;
    submitFeedbackBtn.hidden = true;
    aiReviewPreview.hidden = true;
    aiReviewMessage.textContent = "修正した内容を送ると、もう一度確認します。";
    hideSubmitSummary();
    appendChatMessage("assistant", "内容を修正できます。直した内容をもう一度送ってください。");
    poipoiChatInput.focus({ preventScroll: true });
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
          "申し訳ありません。いまポイナにつながりませんでした。少し時間をおいて、もう一度送ってください。"
        );
        setPoipoiChatBusy(false);
        poipoiChatInput.focus({ preventScroll: true });
        return;
      }
    }

    typingMessage.remove();
    result = polishPoinaResultForDisplay(result);
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
          ? "管理者Go。開発対応の確認へ進みます。"
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
      empty.textContent = "まだレポートはありません。投稿が届くと、ここに確認レポートが表示されます。";
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

  function hasStoredAuthSession() {
    return Boolean(getJsonCookie(authSessionCookieName)?.signedIn);
  }

  function hasAppleRedirectAuthorizationFragment() {
    const params = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
    return params.has("code") || params.has("id_token") || params.has("error");
  }

  function shouldEnterReceptionDirectly() {
    return isAuthenticated || hasStoredAuthSession() || hasAppleRedirectAuthorizationFragment();
  }

  function skipOpeningAnimationForReception() {
    heroCompleted = true;
    try {
      video?.pause();
    } catch {
      // Removal below is enough if the browser rejects pause before metadata is ready.
    }
    video?.removeAttribute("autoplay");
    video?.remove();
    welcomeHeroImg?.classList.add("active");
    if (skipVideoBtn) skipVideoBtn.style.display = "none";
    heroWrapper?.classList.remove("is-opening-floating", "is-docking");
    revealHeroCopy();
  }

  function showCompactReceptionHeader() {
    accountStrip?.setAttribute("aria-label", "受付中");
    if (userNicknameDisplay) {
      userNicknameDisplay.textContent = "";
      userNicknameDisplay.hidden = true;
    }
    if (accountBoardLink) accountBoardLink.hidden = true;
    if (logoutTrigger) logoutTrigger.hidden = true;
  }

  function restoreAccountHeaderControls() {
    accountStrip?.removeAttribute("aria-label");
    if (userNicknameDisplay) {
      userNicknameDisplay.hidden = false;
      userNicknameDisplay.textContent = "匿名ユーザー";
    }
    if (accountBoardLink) accountBoardLink.hidden = false;
    if (logoutTrigger) logoutTrigger.hidden = false;
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

    if (shouldEnterReceptionDirectly()) {
      skipOpeningAnimationForReception();
      return;
    }

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

  function unlockGatedContent(options = {}) {
    gatedContentArea.classList.add("is-unlocked");
    gatedContentArea.setAttribute("aria-hidden", "false");
    accountStrip.classList.remove("u-hidden");
    showCompactReceptionHeader();

    applySubmissionHashIntent({ scroll: false });
    if (options.scroll !== false) {
      scrollToPoinaReception(options);
    }
  }

  function createMyReceptionCard(item) {
    const card = document.createElement("li");
    card.className = "my-reception-card";

    const head = document.createElement("div");
    head.className = "my-reception-card-head";
    const id = document.createElement("span");
    id.className = "my-reception-id";
    id.textContent = item.id;
    const status = document.createElement("span");
    status.className = "my-reception-status";
    status.textContent = item.publicStatus || "受け付けました";
    head.append(id, status);

    const title = document.createElement("h4");
    title.className = "my-reception-card-title";
    title.textContent = item.title || "受付内容";

    const detail = document.createElement("p");
    detail.className = "my-reception-card-detail";
    const body = String(item.body || "").replace(/\s+/g, " ").trim();
    detail.textContent = body
      ? (body.length > 120 ? `${body.slice(0, 120)}...` : body)
      : "受付内容は本人確認用にこの端末だけで控えています。公開ボードでは要約される場合があります。";

    const meta = document.createElement("p");
    meta.className = "my-reception-card-meta";
    const accepted = formatDateForReception(item.acceptedAt);
    const updated = formatDateForReception(item.updatedAt || item.acceptedAt);
    meta.textContent = `${item.appName || "New App Idea"} / ${getDisplayFeedbackType(item.type)}${accepted ? ` / 受付 ${accepted}` : ""}${updated ? ` / 更新 ${updated}` : ""}`;

    card.append(head, title, detail, meta);
    return card;
  }

  function renderMyReceptionPanel() {
    if (!myReceptionPanel || !myReceptionList || !myReceptionEmpty) return;
    const receptions = loadMyReceptions();
    if (myReceptionNickname) {
      const nickname = currentNickname || getJsonCookie(authSessionCookieName)?.nickname || generateNickname();
      myReceptionNickname.textContent = `ポイナはあなたを「${nickname}」と呼びます。`;
    }
    myReceptionList.replaceChildren(...receptions.map(createMyReceptionCard));
    myReceptionEmpty.hidden = receptions.length !== 0;
  }

  function syncGuestBoardViewVisibility() {
    const showMine = isAuthenticated && guestBoardView === "mine";
    const hasPublicItems = guestStatusItems.length > 0;
    if (myReceptionPanel) myReceptionPanel.hidden = !showMine;
    if (publicStatusSummary) publicStatusSummary.hidden = showMine || !hasPublicItems;
    if (publicStatusTools) publicStatusTools.hidden = showMine || !hasPublicItems;
    if (guestStatusList) guestStatusList.hidden = showMine || !hasPublicItems;
    if (guestStatusEmptyState && showMine) guestStatusEmptyState.hidden = true;
    guestBoardViewButtons.forEach((button) => {
      const isActive = (button.dataset.guestBoardView || "public") === (showMine ? "mine" : "public");
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function setGuestBoardView(view) {
    guestBoardView = view === "public" ? "public" : "mine";
    renderMyReceptionPanel();
    applyGuestBoardFiltersAndSort();
  }

  function setGuestStatusBoardVisible(isVisible, options = {}) {
    if (!guestStatusBoard) return;

    guestStatusBoard.hidden = !isVisible;
    document.body.classList.toggle("is-guest-viewing", isVisible);

    if (isVisible && options.scroll !== false) {
      guestBoardView = isAuthenticated ? "mine" : "public";
      renderMyReceptionPanel();
      renderGuestGoodVotes();
      applyGuestBoardFiltersAndSort();
      setTimeout(() => {
        guestStatusBoard.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    } else if (isVisible) {
      guestBoardView = isAuthenticated ? "mine" : "public";
      renderMyReceptionPanel();
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
    syncGuestBoardViewVisibility();
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
    return getJsonCookie(goodVoteCookieName) || {};
  }

  function saveGuestGoodVotes() {
    try {
      setJsonCookie(goodVoteCookieName, guestGoodVotes, preferenceCookieMaxAgeSeconds);
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

  function normalizeAuthNickname(value) {
    const nickname = String(value || "").trim().slice(0, 80);
    return isGeneratedPoinaNickname(nickname) ? nickname : generateNickname();
  }

  function saveAuthSession(nickname) {
    const existing = getJsonCookie(authSessionCookieName);
    setJsonCookie(authSessionCookieName, {
      signedIn: true,
      nickname: normalizeAuthNickname(nickname),
      feedbackToken: currentFeedbackToken || existing?.feedbackToken || "",
      createdAt: new Date().toISOString()
    }, authSessionMaxAgeSeconds);
  }

  function restoreAuthSession() {
    const session = getJsonCookie(authSessionCookieName);
    if (!session?.signedIn) return false;
    currentFeedbackToken = session.feedbackToken || "";
    const nickname = normalizeAuthNickname(session.nickname);
    if (nickname !== session.nickname) saveAuthSession(nickname);
    signIn(nickname, { delayMs: 0, persist: false, scroll: true });
    return true;
  }

  function signIn(nickname = generateNickname(), options = {}) {
    isAuthenticated = true;
    currentNickname = normalizeAuthNickname(nickname);
    if (options.persist !== false) {
      saveAuthSession(currentNickname);
    }
    document.body.classList.add("is-authenticated");
    updatePoinaReceptionScript(markPoinaReceptionVisit());
    setGuestStatusBoardVisible(false, { scroll: false });
    renderGuestGoodVotes();
    applyGuestBoardFiltersAndSort();
    setSignedInButtonLabel();
    mockAppleLoginBtn.style.pointerEvents = "none";

    setTimeout(
      () => unlockGatedContent({ scroll: options.scroll !== false }),
      Number.isFinite(options.delayMs) ? options.delayMs : 600
    );
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

    const message = document.createElement("p");
    message.className = "legal-doc-loading";
    message.textContent = "この環境では文書を表示できませんでした。";
    container.replaceChildren(message);
    container.dataset.loaded = "error";
  }

  function buildLegalDocInlineArticle(doc) {
    const source = doc.querySelector(".legal-card") || doc.querySelector("article") || doc.querySelector("main") || doc.body;
    if (!source) return null;

    const clone = source.cloneNode(true);
    clone.querySelectorAll("script, style, link, .back-link").forEach((node) => node.remove());
    clone.querySelectorAll("a[href]").forEach((link) => {
      const replacementText = link.textContent?.trim() || link.getAttribute("href") || "";
      link.replaceWith(document.createTextNode(replacementText));
    });
    clone.querySelectorAll("h1").forEach((heading) => {
      const replacement = document.createElement("h4");
      replacement.replaceChildren(...Array.from(heading.childNodes));
      heading.replaceWith(replacement);
    });
    clone.querySelectorAll("h2").forEach((heading) => {
      const replacement = document.createElement("h5");
      replacement.replaceChildren(...Array.from(heading.childNodes));
      heading.replaceWith(replacement);
    });

    const article = document.createElement("article");
    article.className = "legal-doc-inline";
    article.replaceChildren(...Array.from(clone.childNodes));
    return article;
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
      const legalArticle = buildLegalDocInlineArticle(parsedDoc);
      if (!legalArticle) throw new Error("Empty legal document");

      container.replaceChildren(legalArticle);
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
    termsModal.hidden = !isVisible;
    termsModal.inert = !isVisible;
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
    if (
      appleSignInInitialized &&
      appleSignInRuntimeConfig?.clientId &&
      appleSignInRuntimeConfig?.redirectURI &&
      appleSignInRuntimeConfig?.state &&
      appleSignInRuntimeConfig?.nonce
    ) {
      return true;
    }

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

  function getFallbackAppleSignInMeta(name) {
    const content = document.querySelector(`meta[name="${name}"]`)?.content?.trim() ?? "";
    if (!content || content.startsWith("__") || content.endsWith("__")) return "";
    return content;
  }

  function fallbackAppleSignInConfig() {
    if (!appleSignInConfigReady()) return null;
    return {
      clientId: getFallbackAppleSignInMeta("appleid-signin-client-id"),
      redirectURI: getFallbackAppleSignInMeta("appleid-signin-redirect-uri"),
      scope: getFallbackAppleSignInMeta("appleid-signin-scope") || "name email",
      state: getFallbackAppleSignInMeta("appleid-signin-state"),
      nonce: getFallbackAppleSignInMeta("appleid-signin-nonce"),
      usePopup: true
    };
  }

  async function ensureAppleSignInConfigured() {
    if (appleSignInInitialized && appleSignInRuntimeConfig) {
      return appleSignInRuntimeConfig;
    }

    if (appleSignInConfigPromise) {
      return appleSignInConfigPromise;
    }

    appleSignInConfigPromise = (async () => {
      const response = await fetch(appleAuthConfigApiUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "omit"
      });

      if (!response.ok) {
        throw new Error("apple_signin_config_unavailable");
      }

      const config = await response.json();
      if (!config.clientId || !config.redirectURI || !config.state || !config.nonce) {
        throw new Error("apple_signin_config_invalid");
      }

      if (!window.AppleID?.auth?.init) {
        throw new Error("apple_signin_script_unavailable");
      }

      window.AppleID.auth.init({
        clientId: config.clientId,
        scope: config.scope || "name email",
        redirectURI: config.redirectURI,
        state: config.state,
        nonce: config.nonce,
        usePopup: config.usePopup !== false
      });

      appleSignInRuntimeConfig = config;
      appleSignInInitialized = true;
      return config;
    })();

    try {
      return await appleSignInConfigPromise;
    } catch (error) {
      const fallbackConfig = fallbackAppleSignInConfig();
      if (!fallbackConfig || !window.AppleID?.auth?.init) {
        throw error;
      }

      window.AppleID.auth.init(fallbackConfig);
      appleSignInRuntimeConfig = fallbackConfig;
      appleSignInInitialized = true;
      return fallbackConfig;
    } finally {
      appleSignInConfigPromise = null;
    }
  }

  async function loadAppleRedirectConfig() {
    const response = await fetch(appleAuthConfigApiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit"
    });

    if (!response.ok) {
      throw new Error("apple_signin_config_unavailable");
    }

    const config = await response.json();
    if (!config.clientId || !config.redirectURI || !config.state || !config.nonce) {
      throw new Error("apple_signin_config_invalid");
    }

    appleSignInRuntimeConfig = config;
    return config;
  }

  function resetAppleOfficialAuthZone() {
    appleProgrammaticSignInReady = false;
    appleSignInPreparing = false;
    appleSignInSetupFailed = false;
    appleOfficialAuthZone.hidden = true;
    appleFooterAuthSlot.hidden = true;
    appleIdSigninButton.hidden = true;
    appleSigninConfigNotice.hidden = true;
    appleSigninReadyText.hidden = false;
    appleSigninReadyText.textContent = "Appleサインインを準備しています。";
    localApplePreviewBtn.textContent = "この環境で動きを確認する";
    localApplePreviewBtn.classList.remove("apple-js-signin-button");
    localApplePreviewBtn.disabled = false;
    localApplePreviewBtn.hidden = true;
    acceptTermsBtn.classList.remove("is-apple-signin-action", "is-loading");
    acceptTermsBtn.removeAttribute("aria-busy");
  }

  function updateTermsFooterNote(message, isError = false) {
    if (!termsFooterNote) return;
    termsFooterNote.textContent = message;
    termsFooterNote.classList.toggle("is-error", Boolean(isError));
  }

  function prepareAppleSignInForTermsModal() {
    appleOfficialAuthZone.hidden = true;
    appleIdSigninButton.hidden = true;
    appleSigninConfigNotice.hidden = true;
    appleSigninReadyText.hidden = false;
    appleSigninReadyText.textContent = "Appleサインインを準備しています。";
    appleProgrammaticSignInReady = false;
    appleSignInPreparing = true;
    appleSignInSetupFailed = false;
    localApplePreviewBtn.textContent = "Appleでサインイン";
    localApplePreviewBtn.classList.add("apple-js-signin-button");
    localApplePreviewBtn.disabled = true;
    localApplePreviewBtn.hidden = true;
    updateTermsActionState();

    loadAppleRedirectConfig()
      .then(() => {
        appleProgrammaticSignInReady = Boolean(
          appleSignInRuntimeConfig?.clientId
          && appleSignInRuntimeConfig?.redirectURI
          && appleSignInRuntimeConfig?.state
          && appleSignInRuntimeConfig?.nonce
        );
        appleSignInSetupFailed = !appleProgrammaticSignInReady;
        appleOfficialAuthZone.hidden = true;
        localApplePreviewBtn.textContent = "Appleでサインイン";
        localApplePreviewBtn.classList.add("apple-js-signin-button");
        localApplePreviewBtn.disabled = !appleProgrammaticSignInReady;
        localApplePreviewBtn.hidden = true;
      })
      .catch(() => {
        appleProgrammaticSignInReady = false;
        appleSignInSetupFailed = true;
        appleOfficialAuthZone.hidden = true;
        if (allRegistrationConsentsChecked() && !isLocalPreviewHost) {
          termsErrorText.textContent = "Appleサインインを準備できませんでした。ページを再読み込みしてもう一度お試しください。";
          termsErrorText.hidden = false;
        }
      })
      .finally(() => {
        appleSignInPreparing = false;
        updateTermsActionState();
      });
  }

  function updateTermsActionState() {
    if (!termsModalRequiresRegistrationConsent) {
      acceptTermsBtn.disabled = false;
      acceptTermsBtn.textContent = "閉じる";
      acceptTermsBtn.classList.remove("is-apple-signin-action", "is-loading");
      acceptTermsBtn.removeAttribute("aria-busy");
      acceptTermsBtn.hidden = false;
      appleFooterAuthSlot.hidden = true;
      appleIdSigninButton.hidden = true;
      localApplePreviewBtn.hidden = true;
      updateTermsFooterNote("内容を確認したら閉じてください。");
      return;
    }

    const checked = allRegistrationConsentsChecked();
    const localFallbackReady = isLocalPreviewHost && appleSignInSetupFailed;
    const waitingForApple = checked && appleSignInPreparing && !appleProgrammaticSignInReady && !localFallbackReady;
    const unavailable = checked && appleSignInSetupFailed && !localFallbackReady;
    const redirectReady = checked && appleProgrammaticSignInReady && !waitingForApple && !unavailable && !localFallbackReady;

    acceptTermsBtn.classList.add("is-apple-signin-action");
    acceptTermsBtn.classList.toggle("is-loading", waitingForApple);
    acceptTermsBtn.setAttribute("aria-busy", waitingForApple ? "true" : "false");
    acceptTermsBtn.textContent = localFallbackReady
      ? "この環境で動きを確認する"
      : waitingForApple
        ? "Appleサインインを準備中..."
        : "Appleでサインイン";
    acceptTermsBtn.hidden = localFallbackReady;
    acceptTermsBtn.disabled = !checked || waitingForApple || unavailable;
    appleFooterAuthSlot.hidden = true;
    appleIdSigninButton.hidden = true;
    localApplePreviewBtn.hidden = !localFallbackReady;
    localApplePreviewBtn.disabled = !localFallbackReady;

    if (!checked) {
      updateTermsFooterNote("3つの確認にチェックすると、Appleでサインインできます。");
    } else if (waitingForApple) {
      updateTermsFooterNote("Appleサインインを準備しています。");
    } else if (unavailable) {
      updateTermsFooterNote("Appleサインインを準備できませんでした。ページを再読み込みしてもう一度お試しください。", true);
    } else if (localFallbackReady) {
      updateTermsFooterNote("ローカル確認環境のため、仮のサインインで動きを確認します。");
    } else {
      updateTermsFooterNote(redirectReady
        ? "同意内容を確認したうえで、Appleの認証画面へ進みます。"
        : "Appleサインインを準備しています。");
    }
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
    if (requiresRegistrationConsent) {
      prepareAppleSignInForTermsModal();
    }
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

    if (isLocalPreviewHost && appleSignInSetupFailed) {
      startLocalApplePreview();
      return;
    }

    if (!appleProgrammaticSignInReady) {
      termsErrorText.textContent = appleSignInPreparing
        ? "Appleサインインを準備しています。少し待ってからもう一度お試しください。"
        : "Appleサインインを準備できませんでした。ページを再読み込みしてもう一度お試しください。";
      termsErrorText.hidden = false;
      updateTermsActionState();
      return;
    }

    termsErrorText.hidden = true;
    startAppleRedirectSignIn();
  }

  async function exchangeAppleAuthorization(authorization, expected = {}) {
    const response = await fetch(appleAuthSessionApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      body: JSON.stringify({
        authorization,
        expectedState: expected.state || appleSignInRuntimeConfig?.state || "",
        expectedNonce: expected.nonce || appleSignInRuntimeConfig?.nonce || ""
      })
    });

    if (!response.ok) {
      throw new Error("Apple authorization exchange failed");
    }

    return response.json();
  }

  function extractAppleAuthorizationPayload(source) {
    const detail = source?.detail ?? source ?? {};
    return (
      detail.authorization ||
      detail.data?.authorization ||
      detail.data ||
      detail
    );
  }

  async function completeAppleAuthorization(authorization, expected = {}) {
    try {
      const session = await exchangeAppleAuthorization(authorization ?? {}, expected);
      currentFeedbackToken = (session && session.feedbackToken) || "";
      closeTermsModal();
      signIn(generateNickname());
    } catch {
      termsErrorText.textContent = "Apple認証のサーバー検証に失敗しました。時間をおいてもう一度お試しください。";
      termsErrorText.hidden = false;
    }
  }

  async function handleAppleSignInSuccess(event) {
    await completeAppleAuthorization(extractAppleAuthorizationPayload(event));
  }

  function buildAppleAuthorizeUrl(config) {
    const url = new URL("https://appleid.apple.com/auth/authorize");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectURI);
    url.searchParams.set("response_type", "code id_token");
    url.searchParams.set("response_mode", "fragment");
    url.searchParams.set("state", config.state);
    url.searchParams.set("nonce", config.nonce);
    return url;
  }

  function startAppleRedirectSignIn() {
    if (!appleSignInRuntimeConfig?.clientId || !appleSignInRuntimeConfig?.state || !appleSignInRuntimeConfig?.nonce) {
      termsErrorText.textContent = "Appleサインインを準備できませんでした。ページを再読み込みしてもう一度お試しください。";
      termsErrorText.hidden = false;
      return;
    }

    setJsonCookie(appleRedirectStateCookieName, {
      state: appleSignInRuntimeConfig.state,
      nonce: appleSignInRuntimeConfig.nonce,
      createdAt: Date.now()
    }, 60 * 10);

    window.location.assign(buildAppleAuthorizeUrl(appleSignInRuntimeConfig).toString());
  }

  function parseAppleRedirectFragment() {
    const rawHash = window.location.hash || "";
    if (!rawHash.startsWith("#")) return null;
    const params = new URLSearchParams(rawHash.slice(1));
    if (!params.has("code") && !params.has("id_token") && !params.has("error")) return null;
    return {
      code: params.get("code") || "",
      id_token: params.get("id_token") || "",
      state: params.get("state") || "",
      error: params.get("error") || "",
      user: params.get("user") || ""
    };
  }

  function clearAppleRedirectFragment() {
    if (!window.history?.replaceState) return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  async function handleAppleRedirectCallback() {
    const authorization = parseAppleRedirectFragment();
    if (!authorization) return false;

    clearAppleRedirectFragment();
    const expected = getJsonCookie(appleRedirectStateCookieName) || {};
    clearCookieValue(appleRedirectStateCookieName);

    if (authorization.error) {
      openTermsModal(true);
      termsErrorText.textContent = "Appleでサインインを完了できませんでした。もう一度お試しください。";
      termsErrorText.hidden = false;
      return true;
    }

    if (!expected.state || authorization.state !== expected.state || !expected.nonce) {
      openTermsModal(true);
      termsErrorText.textContent = "Appleサインインの確認情報が一致しませんでした。ページを再読み込みしてもう一度お試しください。";
      termsErrorText.hidden = false;
      return true;
    }

    await completeAppleAuthorization(authorization, expected);
    return true;
  }

  function handleAppleSignInFailure() {
    termsErrorText.textContent = "Appleでサインインを完了できませんでした。もう一度お試しください。";
    termsErrorText.hidden = false;
    updateTermsActionState();
  }

  async function startAppleProgrammaticSignIn() {
    if (!appleProgrammaticSignInReady || !window.AppleID?.auth?.signIn) {
      termsErrorText.textContent = "Appleサインインを準備できませんでした。ページを再読み込みしてもう一度お試しください。";
      termsErrorText.hidden = false;
      return;
    }

    termsErrorText.hidden = true;
    acceptTermsBtn.disabled = true;
    acceptTermsBtn.classList.add("is-loading");
    acceptTermsBtn.setAttribute("aria-busy", "true");
    acceptTermsBtn.textContent = "Appleへ接続しています...";
    updateTermsFooterNote("Appleの認証画面を開いています。");
    try {
      const result = await window.AppleID.auth.signIn();
      await completeAppleAuthorization(extractAppleAuthorizationPayload(result));
    } catch {
      handleAppleSignInFailure();
    } finally {
      acceptTermsBtn.classList.remove("is-loading");
      acceptTermsBtn.removeAttribute("aria-busy");
      updateTermsActionState();
    }
  }

  function handleAppleAuthAction() {
    if (appleProgrammaticSignInReady) {
      startAppleProgrammaticSignIn();
      return;
    }

    if (isLocalPreviewHost) {
      startLocalApplePreview();
    }
  }

  function startLocalApplePreview() {
    if (!allRegistrationConsentsChecked()) {
      termsErrorText.hidden = false;
      return;
    }
    closeTermsModal();
    signIn(generateNickname(), { persist: false });
  }

  function signOut() {
    isAuthenticated = false;
    currentNickname = "";
    currentFeedbackToken = "";
    clearCookieValue(authSessionCookieName);
    document.body.classList.remove("is-authenticated");
    gatedContentArea.classList.remove("is-unlocked");
    gatedContentArea.setAttribute("aria-hidden", "true");
    restoreAccountHeaderControls();
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
      hideSubmitSummary();
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
        if (app.isVirtual) {
          confirmAppPanel.classList.remove("is-open");
          setAppPickerSkippedForIdea(true);
          confirmAppSelection();
          return;
        }

        setAppPickerSkippedForIdea(false);
        confirmAppLabel.textContent = getConfirmAppSelectionLabel(app);
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
    selectedReceptionIntent = "idea";
    pendingReceptionType = "新しいアプリ案";
    selectedType = "新しいアプリ案";
    appSearchQuery = "";
    if (appSearchInput) appSearchInput.value = "";
    if (poinaSelectedIntentNote) {
      poinaSelectedIntentNote.textContent = poinaReceptionIntents.idea.note;
    }
    updatePoinaIntentButtonState();
    setAppPickerSkippedForIdea(false);
    if (isAuthenticated) {
      startNewAppIdeaReception();
      return true;
    }
    renderAppSelectors();
    resetAppScrollPosition();
    if (options.scroll !== false && isAuthenticated) {
      scrollToPoinaReception(options);
    }
    return true;
  }

  function scrollToSigninEntry(options = {}) {
    const stage = document.querySelector("[data-scrolly-stage]");
    if (!stage) return false;

    setGuestStatusBoardVisible(false, { scroll: false });

    const panels = Array.from(stage.querySelectorAll("[data-scrolly-panel]"));
    const signinIndex = panels.findIndex((panel) => panel.id === "join" || panel.classList.contains("signin-scene"));
    const stepIndex = signinIndex >= 0 ? signinIndex : Math.max(panels.length - 1, 0);
    const behavior = options.behavior || "smooth";

    if (stage.classList.contains("is-static-list")) {
      const signinScene = mockAppleLoginBtn.closest(".signin-scene") || stage;
      signinScene.scrollIntoView({ behavior, block: "center" });
      return true;
    }

    const rect = stage.getBoundingClientRect();
    const viewportHeight = Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 1);
    const scrollableDistance = Math.max(stage.offsetHeight - viewportHeight, 1);
    const stageTop = window.scrollY + rect.top;
    const sticky = stage.querySelector(".welcome-scrolly-sticky");
    const stickyTop = sticky ? Number.parseFloat(window.getComputedStyle(sticky).top) || 0 : 0;
    const safeMaxScrollY = sticky
      ? stageTop + stage.offsetHeight - sticky.offsetHeight - stickyTop
      : stageTop + scrollableDistance;
    const stepSpan = scrollableDistance / Math.max(panels.length, 1);
    const centeredTarget = stepIndex <= 0
      ? stageTop
      : stageTop + stepSpan * (stepIndex + 0.5);
    const target = stepIndex >= panels.length - 1
      ? Math.min(centeredTarget, safeMaxScrollY)
      : centeredTarget;

    setScrollyStep(stage, stepIndex);
    window.scrollTo({
      top: Math.max(stageTop, Math.min(target, safeMaxScrollY)),
      behavior
    });

    window.setTimeout(() => setScrollyStep(stage, stepIndex), behavior === "smooth" ? 520 : 0);
    return true;
  }

  function applyJoinHashIntent(options = {}) {
    if (window.location.hash !== "#join") return false;
    if (isAuthenticated) {
      showSubmissionEntry(options);
      return true;
    }
    scrollToSigninEntry(options);
    return true;
  }

  function showSubmissionEntry(options = {}) {
    activeAppFilter = "all";
    appSearchQuery = "";
    if (appSearchInput) appSearchInput.value = "";
    setAppPickerSkippedForIdea(false);
    renderAppSelectors();
    resetAppScrollPosition();
    setGuestStatusBoardVisible(false, { scroll: false });
    scrollToPoinaReception(options);
  }

  function applySendHashIntent(options = {}) {
    if (window.location.hash !== "#send") return false;

    if (!isAuthenticated) {
      scrollToSigninEntry(options);
      return true;
    }

    showSubmissionEntry(options);
    return true;
  }

  function applySubmissionHashIntent(options = {}) {
    return applyJoinHashIntent(options) || applySendHashIntent(options) || applyIdeaHashIntent(options);
  }

  function findPresetApp(apps) {
    if (!presetAppSlug) return null;
    const normalizedSlug = presetAppSlug.replace(/[^a-z0-9]+/g, "");
    if (!normalizedSlug) return null;
    return (
      apps.find((app) => {
        if (!app || app.isVirtual) return false;
        const urlSlug = (String(app.catalogUrl || "")
          .toLowerCase()
          .match(/apps\.allnew\.work\/([a-z0-9-]+)/) || [])[1] || "";
        return (
          app.id === normalizedSlug ||
          urlSlug === presetAppSlug ||
          urlSlug.replace(/[^a-z0-9]+/g, "") === normalizedSlug
        );
      }) || null
    );
  }

  function applyPresetAppSelection() {
    if (selectedApp || !presetAppSlug) return;
    const preset = findPresetApp(appsData);
    if (!preset) return;
    selectedApp = preset;
    renderAppSelectors();
    const selectedNode = appsScroller.querySelector(".app-selector-node.is-selected");
    if (selectedNode) {
      appsScroller.classList.add("has-selection");
      selectedNode.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }

  async function hydrateAppStoreAppSelectors() {
    try {
      const catalogApps = mergeCatalogWithCanonicalApps(await loadAllNewAppCatalog());

      const storeById = await lookupAppStoreApps(catalogApps);
      appsData = withNewAppIdea(mergeAppStoreData(catalogApps, storeById));
      renderAppSelectors();
      applyPresetAppSelection();
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
    selectedReceptionIntent = "";
    pendingReceptionType = "";
    setAppPickerSkippedForIdea(false);
    updatePoinaIntentButtonState();
    if (poinaSelectedIntentNote) {
      poinaSelectedIntentNote.textContent = "";
      poinaSelectedIntentNote.hidden = true;
    }
    wizardStep2Section.classList.remove("is-open");
    poipoiChatHistory = [];
    latestChatDraft = null;
    latestReview = null;
    document.body.classList.remove("is-chat-active");
    aiReviewPreview.hidden = true;
    submitFeedbackBtn.hidden = true;
    hideSubmitSummary();
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
    selectedReceptionIntent = "";
    pendingReceptionType = "";
    setAppPickerSkippedForIdea(false);
    poipoiChatHistory = [];
    latestChatDraft = null;
    latestReview = null;
    document.body.classList.remove("is-chat-active");
    appsScroller.classList.remove("has-selection");
    document.querySelectorAll(".app-selector-node").forEach((node) => node.classList.remove("is-selected"));
    confirmAppPanel.classList.remove("is-open");
    wizardStep2Section.classList.remove("is-open");
    updatePoinaIntentButtonState();
    if (poinaSelectedIntentNote) {
      poinaSelectedIntentNote.textContent = "";
      poinaSelectedIntentNote.hidden = true;
    }
    feedbackChatLog.replaceChildren();
    aiReviewPreview.hidden = true;
    submitFeedbackBtn.hidden = true;
    submitFeedbackBtn.disabled = false;
    setSubmitButtonIdleLabel();
    hideSubmitSummary();
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
      alert("送信前に、もう少し内容を見直してください。送信前チェックの表示を確認してください。");
      return;
    }

    submitFeedbackBtn.disabled = true;
    submitFeedbackBtn.textContent = "内容を送信中...";

    let persistedItem = null;
    try {
      persistedItem = await persistFeedbackSubmission(payload, review);
    } catch (error) {
      if (!shouldUseLocalPersistenceFallback()) {
        submitFeedbackBtn.disabled = false;
        setSubmitButtonIdleLabel(payload);
        alert(`受付内容を送信できませんでした。\n\n${getUserFacingSubmitError(error)}`);
        return;
      }
      console.warn("POIPOI feedback submit API fallback.", error);
    }

    const report = createAdminReport(payload, review, persistedItem);
    saveAdminReport(report);
    rememberMyReception(payload, report);
    renderMyReceptionPanel();

    submitFeedbackBtn.disabled = false;
    setSubmitButtonIdleLabel(payload);
    submitFeedbackBtn.hidden = true;
    aiReviewPreview.hidden = true;
    latestChatDraft = null;
    latestReview = null;
    hideSubmitSummary();
    appendReceptionReceipt(payload, report);
    appendPostReceptionActions();
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
  guestBoardViewButtons.forEach((button) => {
    button.addEventListener("click", () => setGuestBoardView(button.dataset.guestBoardView || "public"));
  });
  poinaIntentButtons.forEach((button) => {
    button.addEventListener("click", () => selectPoinaReceptionIntent(button.dataset.poinaIntent));
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
  localApplePreviewBtn.addEventListener("click", handleAppleAuthAction);
  registrationConsentChecks.forEach((check) => check.addEventListener("change", updateTermsActionState));
  legalDocDisclosures.forEach((disclosure) => disclosure.addEventListener("toggle", handleLegalDocDisclosureToggle));
  document.addEventListener("AppleIDSignInOnSuccess", handleAppleSignInSuccess);
  document.addEventListener("AppleIDSignInOnFailure", handleAppleSignInFailure);
  document.addEventListener("keydown", handleTermsModalKeydown);
  poipoiChatForm.addEventListener("submit", sendPoipoiChatMessage);
  poipoiChatInput.addEventListener("input", resizePoipoiChatInput);
  let poipoiCompositionEndedAt = 0;
  poipoiChatInput.addEventListener("compositionstart", () => {
    poipoiChatInput.dataset.composing = "true";
  });
  poipoiChatInput.addEventListener("compositionend", () => {
    poipoiChatInput.dataset.composing = "false";
    poipoiCompositionEndedAt = performance.now();
  });
  poipoiChatInput.addEventListener("keydown", (event) => {
    const justFinishedCompositionEnter = event.key === "Enter" && performance.now() - poipoiCompositionEndedAt < 120;
    if (event.isComposing || event.keyCode === 229 || poipoiChatInput.dataset.composing === "true" || justFinishedCompositionEnter) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      poipoiChatForm.requestSubmit();
    }
  });
  editFeedbackDraftBtn?.addEventListener("click", resumePoipoiDraftEditing);
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
  updatePoinaReceptionScript();
  updatePoinaIntentButtonState();
  renderGuestGoodVotes();
  renderAppSelectors();
  applyPresetAppSelection();
  handleAppleRedirectCallback().then((handled) => {
    if (!handled) restoreAuthSession();
  }).catch(() => {
    openTermsModal(true);
    termsErrorText.textContent = "Apple認証の確認中にエラーが発生しました。もう一度お試しください。";
    termsErrorText.hidden = false;
  });
  applySubmissionHashIntent({ scroll: false });
  hydrateAppStoreAppSelectors();
});
