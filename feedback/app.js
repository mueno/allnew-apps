    const statuses = ["すべて", "受け付けました", "検討しています", "ごめんなさい", "対応しています", "出来ました"];
    const isLocalPreview = location.protocol === "file:"
      || location.hostname === "127.0.0.1"
      || location.hostname === "localhost";
    const demoAuthEnabled = isLocalPreview;
    const prohibitedValues = new Set([
      "crime",
      "antisocial",
      "religion",
      "politics",
      "dating",
      "adult",
      "regulated",
      "tobacco",
      "counterfeit",
      "fraud",
      "hate",
      "consumerSafety"
    ]);
    const nicknameDictionaries = {
      ja: {
        fallback: "陽気な応援団長 ぷに助",
        prefixes: [
          "爆速の", "癒やしの", "無敵の", "伝説の", "陽気な", "秘密の", "孤高の", "黄金の", "猛烈な", "爽快な",
          "奇跡の", "甘党の", "爆笑の", "冷静な", "情熱の", "眠れる", "変幻自在の", "腹ペコの", "宇宙一の", "懐かしの",
          "華麗なる", "前向きな", "天才的な", "頼れる", "キラキラな", "お茶目な", "ふんわりな", "全力投球の", "完璧主義の", "直感型の"
        ],
        roles: [
          "開発者", "エンジニア", "冒険家", "職人", "貴公子", "案内役", "詩人", "皇帝", "アスリート", "指揮者",
          "探偵", "ロボット", "コメディアン", "分析官", "熱血漢", "獅子", "カメレオン", "グルメ王", "司令官", "守護神",
          "スイマー", "芸術家", "釣り人", "参謀", "編集長", "アーティスト", "魔法使い", "旅人", "読書家", "応援団長"
        ],
        suffixes: [
          "ぷに助", "たんたん", "もこ太郎", "ぽん太", "ルンルン", "ぴょん吉", "ネオ丸", "ギガ美", "ふわ彦", "ちび蔵",
          "めがねちゃん", "どんちゃん", "ミルク嬢", "ゲラ吉", "シブ男", "モエ子", "ねむねむ隊員", "カメ吉", "モグ太郎", "ウチュ美",
          "ほのぼの君", "スプラッシュ", "アートん", "魚座の君", "ほし子", "まる夫", "ぷぷ太", "きらら", "よみ助", "ゆめ子"
        ]
      },
      en: {
        fallback: "Sunny Cheer Captain Puni",
        prefixes: [
          "Swift", "Cozy", "Bright", "Legendary", "Sunny", "Secret", "Independent", "Golden", "Energetic", "Breezy",
          "Lucky", "Sweet-Toothed", "Laughing", "Calm", "Passionate", "Sleepy", "Shape-Shifting", "Snack-Seeking", "Starry", "Retro",
          "Graceful", "Forward-Looking", "Inventive", "Reliable", "Sparkly", "Playful", "Soft-Spoken", "All-In", "Detail-Loving", "Intuitive"
        ],
        roles: [
          "Builder", "Engineer", "Explorer", "Craftsperson", "Gentle Star", "Guide", "Poet", "Strategist", "Athlete", "Conductor",
          "Detective", "Robot", "Comedian", "Analyst", "Coach", "Planner", "Chameleon", "Foodie", "Coordinator", "Guardian",
          "Swimmer", "Artist", "Angler", "Advisor", "Editor", "Creator", "Wonder-Maker", "Traveler", "Reader", "Cheer Captain"
        ],
        suffixes: [
          "Puni", "Tantan", "Moco", "Ponta", "Lulu", "Pyon", "Neo", "Giga", "Fuwa", "Chibi",
          "Specs", "Donnie", "Milky", "Gera", "Shibo", "Moe", "Napper", "Kame", "Mogu", "Uchu",
          "Hono", "Splash", "Arton", "Star Pal", "Hoshi", "Maru", "Pupu", "Kirara", "Yomi", "Yume"
        ]
      }
    };
    const prohibitedNicknameTerms = [
      "反社", "犯罪", "違法", "薬物", "武器", "詐欺", "なりすまし", "宗教", "政治", "選挙",
      "アダルト", "ポルノ", "差別", "ヘイト", "暴力", "自傷", "殺", "死", "暴走", "運び屋",
      "god", "holy", "sacred", "jesus", "allah", "buddha", "devil", "demon", "hell", "hate",
      "adult", "weapon", "drug", "fraud", "politic", "religion", "violent", "war", "nazi", "kill"
    ];
    let activeStatus = "すべて";
    let authenticated = false;
    let defaultVisibility = "private";
    let accountNickname = "陽気な応援団長 ぷに助";
    let postNickname = "陽気な応援団長 ぷに助";
    let accountNicknameLanguage = "ja";
    let postNicknameLanguage = "ja";
    let requests = [
      {
        id: "AF-1042",
        type: "改善要望",
        app: "ThermoSnap",
        visibility: "public",
        nickname: "陽気な応援団長 ぷに助",
        nicknameLanguage: "ja",
        title: "測定履歴を週単位で比較したい",
        status: "対応しています",
        votes: 142,
        updated: "2026-05-18",
        summary: "日ごとの変化だけでなく、週単位で傾向を確認したいという要望。",
        report: "グラフ描画とアクセシビリティ表示を検証中。完成や公開は保証しません。"
      },
      {
        id: "AF-1037",
        type: "改善要望",
        app: "GlucoSnap",
        visibility: "public",
        nickname: "冷静な分析官 ネオ丸",
        nicknameLanguage: "ja",
        title: "記録時のメモ候補を増やしたい",
        status: "検討しています",
        votes: 88,
        updated: "2026-05-16",
        summary: "食事、運動、体調のメモ候補を選びやすくしてほしいという要望。",
        report: "入力負担を増やさない候補表示を検討しています。"
      },
      {
        id: "AF-1029",
        type: "新規アプリ案",
        app: "New App Idea",
        visibility: "public",
        nickname: "未来のひらめき係 アイデアさん",
        nicknameLanguage: "ja",
        title: "家族が使いやすい服薬リマインダー",
        status: "受け付けました",
        votes: 51,
        updated: "2026-05-12",
        summary: "家族が代理で通知設定を確認できる新規アプリ案。",
        report: "投稿ガイドラインとプラットフォーム要件に沿う範囲を確認します。"
      },
      {
        id: "AF-1014",
        type: "改善要望",
        app: "WeightSnap",
        visibility: "public",
        nickname: "頼れる編集長 ルンルン",
        nicknameLanguage: "ja",
        title: "App Store の表示名を短くしてほしい",
        status: "出来ました",
        votes: 36,
        updated: "2026-05-08",
        summary: "検索結果でアプリ名が途中で切れる問題への対応。",
        report: "表示名とサブタイトルを短縮し、次回メタデータ更新へ反映しました。"
      },
      {
        id: "AF-1008",
        type: "改善要望",
        app: "WeightSnap",
        visibility: "public",
        nickname: "爽快な参謀 ほし子",
        nicknameLanguage: "ja",
        title: "古いOS向けの専用表示を残してほしい",
        status: "ごめんなさい",
        votes: 12,
        updated: "2026-05-02",
        summary: "サポート対象外OSへの表示継続に関する要望。",
        report: "安全性、保守性、審査対応の観点から、今回は対応を見送りました。"
      }
    ];
    const usedNicknames = new Set(
      requests
        .filter((item) => item.visibility !== "private" && item.nickname)
        .map((item) => item.nickname)
    );

    const requestList = document.getElementById("requestList");
    const emptyState = document.getElementById("emptyState");
    const filters = document.getElementById("filters");
    const sortSelect = document.getElementById("sortSelect");
    const formNotice = document.getElementById("formNotice");
    const screens = document.querySelectorAll("[data-screen]");
    const screenNames = new Set([...screens].map((screen) => screen.dataset.screen));
    const menuBackdrop = document.getElementById("menuBackdrop");
    const menuDrawer = document.getElementById("menuDrawer");
    const openMenuButton = document.getElementById("openMenu");
    const closeMenuButton = document.getElementById("closeMenu");
    const topicSearch = document.getElementById("topicSearch");
    const appsScroller = document.getElementById("appsScroller");
    const appsScrollPrev = document.getElementById("appsScrollPrev");
    const appsScrollNext = document.getElementById("appsScrollNext");
    const defaultVisibilityInputs = document.querySelectorAll('input[name="defaultVisibility"]');
    const postVisibilityInputs = document.querySelectorAll('input[name="postVisibility"]');
    const accountNicknameLanguageInputs = document.querySelectorAll('input[name="accountNicknameLanguage"]');
    const postNicknameLanguageInputs = document.querySelectorAll('input[name="postNicknameLanguage"]');
    const accountNicknamePanel = document.getElementById("accountNicknamePanel");
    const accountNicknameValue = document.getElementById("accountNickname");
    const postNicknamePanel = document.getElementById("postNicknamePanel");
    const postNicknameValue = document.getElementById("postNickname");
    const rerollAccountNickname = document.getElementById("rerollAccountNickname");
    const rerollPostNickname = document.getElementById("rerollPostNickname");

    function statusClass(status) {
      if (status === "ごめんなさい") return "declined";
      if (status === "対応しています") return "doing";
      if (status === "出来ました") return "done";
      return "";
    }

    function getCheckedValue(name) {
      return document.querySelector(`input[name="${name}"]:checked`)?.value;
    }

    function setCheckedValue(name, value) {
      const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
      if (input) input.checked = true;
    }

    function randomItem(items) {
      return items[Math.floor(Math.random() * items.length)];
    }

    function formatNickname(language, prefix, role, suffix) {
      return language === "en" ? `${prefix} ${role} ${suffix}` : `${prefix}${role} ${suffix}`;
    }

    function isNicknameBlocked(nickname) {
      const normalized = nickname.toLowerCase();
      return prohibitedNicknameTerms.some((term) => normalized.includes(term.toLowerCase()));
    }

    function isNicknameUnavailable(nickname) {
      return usedNicknames.has(nickname) || isNicknameBlocked(nickname);
    }

    function generateNickname(language = "ja") {
      const dictionary = nicknameDictionaries[language] || nicknameDictionaries.ja;
      const maxAttempts = 120;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const nickname = formatNickname(
          language,
          randomItem(dictionary.prefixes),
          randomItem(dictionary.roles),
          randomItem(dictionary.suffixes)
        );
        if (!isNicknameUnavailable(nickname)) return nickname;
      }
      for (const prefix of dictionary.prefixes) {
        for (const role of dictionary.roles) {
          for (const suffix of dictionary.suffixes) {
            const nickname = formatNickname(language, prefix, role, suffix);
            if (!isNicknameUnavailable(nickname)) return nickname;
          }
        }
      }
      return dictionary.fallback;
    }

    function rerollNickname(target) {
      const language = target === "account" ? accountNicknameLanguage : postNicknameLanguage;
      const nickname = generateNickname(language);
      const valueNode = target === "account" ? accountNicknameValue : postNicknameValue;
      valueNode.classList.remove("rolling");
      void valueNode.offsetWidth;
      valueNode.classList.add("rolling");
      if (target === "account") {
        accountNickname = nickname;
        accountNicknameValue.textContent = nickname;
        if (defaultVisibility === "public") {
          postNickname = nickname;
          postNicknameValue.textContent = nickname;
        }
        return;
      }
      postNickname = nickname;
      postNicknameValue.textContent = nickname;
    }

    function updateAccountVisibility() {
      defaultVisibility = getCheckedValue("defaultVisibility") || "private";
      const isPublic = defaultVisibility === "public";
      accountNicknamePanel.hidden = !isPublic;
      if (isPublic) {
        if (isNicknameUnavailable(accountNickname)) accountNickname = generateNickname(accountNicknameLanguage);
        accountNicknameValue.textContent = accountNickname;
        postNicknameLanguage = accountNicknameLanguage;
        setCheckedValue("postNicknameLanguage", postNicknameLanguage);
        postNickname = accountNickname;
        postNicknameValue.textContent = postNickname;
      }
    }

    function updatePostVisibility() {
      const isPublic = getCheckedValue("postVisibility") === "public";
      postNicknamePanel.hidden = !isPublic;
      if (isPublic) {
        if (isNicknameUnavailable(postNickname)) postNickname = generateNickname(postNicknameLanguage);
        postNicknameValue.textContent = postNickname;
      }
    }

    function applyDefaultVisibilityToForm() {
      const input = document.querySelector(`input[name="postVisibility"][value="${defaultVisibility}"]`);
      if (input) input.checked = true;
      if (defaultVisibility === "public") {
        if (isNicknameUnavailable(accountNickname)) accountNickname = generateNickname(accountNicknameLanguage);
        accountNicknameValue.textContent = accountNickname;
        postNicknameLanguage = accountNicknameLanguage;
        setCheckedValue("postNicknameLanguage", postNicknameLanguage);
        postNickname = accountNickname;
        postNicknameValue.textContent = postNickname;
      }
      updatePostVisibility();
    }

    function updateAuthState() {
      document.getElementById("authDot").classList.toggle("on", authenticated);
      document.getElementById("authLabel").textContent = authenticated ? "登録済み" : "未登録";
      document.getElementById("openLogin").textContent = authenticated
        ? "登録済み"
        : demoAuthEnabled ? "Sign in with Apple" : "Apple ID 準備中";
    }

    function closeMenu() {
      menuBackdrop.classList.remove("show");
      menuDrawer.classList.remove("show");
      menuBackdrop.hidden = true;
      menuDrawer.setAttribute("aria-hidden", "true");
      openMenuButton.setAttribute("aria-expanded", "false");
    }

    function openMenu() {
      menuBackdrop.hidden = false;
      menuDrawer.setAttribute("aria-hidden", "false");
      openMenuButton.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => {
        menuBackdrop.classList.add("show");
        menuDrawer.classList.add("show");
      });
    }

    function showScreen(screenName, shouldScroll = true) {
      screens.forEach((screen) => {
        screen.classList.toggle("active", screen.dataset.screen === screenName);
      });
      document.body.dataset.currentScreen = screenName;
      closeMenu();
      if (shouldScroll) window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function updateAppScrollControls() {
      const maxScroll = appsScroller.scrollWidth - appsScroller.clientWidth;
      const edgeSlack = 24;
      const hasOverflow = maxScroll > 2;
      const canScrollLeft = hasOverflow && appsScroller.scrollLeft > edgeSlack;
      const canScrollRight = hasOverflow && appsScroller.scrollLeft < maxScroll - edgeSlack;
      appsScrollPrev.disabled = !canScrollLeft;
      appsScrollNext.disabled = !canScrollRight;
      appsScroller.parentElement.classList.toggle("can-scroll-left", canScrollLeft);
      appsScroller.parentElement.classList.toggle("can-scroll-right", canScrollRight);
    }

    function scrollApps(direction) {
      appsScroller.scrollBy({
        left: direction * Math.max(160, appsScroller.clientWidth * 0.72),
        behavior: "smooth"
      });
    }

    function renderFilters() {
      const buttons = statuses.map((status) => {
        const active = status === activeStatus ? " active" : "";
        const button = document.createElement("button");
        button.className = `chip${active}`;
        button.type = "button";
        button.dataset.status = status;
        button.textContent = status;
        return button;
      });
      filters.replaceChildren(...buttons);
    }

    function renderRequests() {
      const publicRequests = requests.filter((item) => item.visibility !== "private");
      const sorted = [...publicRequests].sort((a, b) => {
        if (sortSelect.value === "votes") return b.votes - a.votes;
        return b.updated.localeCompare(a.updated);
      });
      const visible = activeStatus === "すべて" ? sorted : sorted.filter((item) => item.status === activeStatus);
      const articles = visible.map((item) => {
        const article = document.createElement("article");
        article.className = "request";
        article.dataset.status = item.status;

        const stateRow = document.createElement("div");
        stateRow.className = "request-state";

        const status = document.createElement("span");
        status.className = `status-pill ${statusClass(item.status)}`.trim();
        status.textContent = item.status;

        const meta = document.createElement("div");
        meta.className = "request-meta";
        meta.textContent = `${item.id} / ${item.type} / ${item.app} / 投稿者 ${item.nickname || "AllNewユーザー"} / 更新 ${item.updated}`;
        stateRow.append(status, meta);

        const title = document.createElement("h3");
        title.textContent = item.title;

        const summary = document.createElement("p");
        summary.className = "request-summary";
        summary.textContent = item.summary;

        const report = document.createElement("div");
        report.className = "request-report";
        const reportLabel = document.createElement("strong");
        reportLabel.textContent = "状況・結果報告:";
        report.append(reportLabel, ` ${item.report}`);

        const votes = document.createElement("div");
        votes.className = "request-meta";
        votes.textContent = `賛同 ${item.votes}`;

        const reportButton = document.createElement("button");
        reportButton.className = "chip";
        reportButton.type = "button";
        reportButton.setAttribute("aria-label", `${item.id}を問題報告する`);
        reportButton.textContent = "問題を報告";

        const footer = document.createElement("div");
        footer.className = "request-footer";
        footer.append(votes, reportButton);

        article.append(stateRow, title, summary, report, footer);
        return article;
      });
      requestList.replaceChildren(...articles);
      emptyState.hidden = articles.length > 0;

      document.getElementById("metricTotal").textContent = publicRequests.length;
      document.getElementById("metricDoing").textContent = publicRequests.filter((item) => item.status === "対応しています").length;
      document.getElementById("metricDone").textContent = publicRequests.filter((item) => item.status === "出来ました").length;
      document.getElementById("metricIdeas").textContent = publicRequests.filter((item) => item.type === "新規アプリ案").length;
    }

    function showNotice(message, isError = false) {
      formNotice.textContent = message;
      formNotice.className = `notice show${isError ? " error" : ""}`;
    }

    filters.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-status]");
      if (!button) return;
      activeStatus = button.dataset.status;
      renderFilters();
      renderRequests();
    });

    sortSelect.addEventListener("change", renderRequests);

    document.getElementById("requestForm").addEventListener("submit", (event) => {
      event.preventDefault();
      if (!authenticated) {
        showNotice(
          demoAuthEnabled
            ? "投稿には Apple ID 連携が必要です。"
            : "公開版は現在閲覧専用です。Apple ID認証とサーバー保存を接続後に投稿受付を有効化します。",
          true
        );
        document.getElementById("loginModal").classList.add("show");
        return;
      }
      const riskCategory = document.getElementById("riskCategory").value;
      if (prohibitedValues.has(riskCategory)) {
        showNotice("選択された内容は受付不可カテゴリに該当します。投稿は審査へ送信されません。", true);
        return;
      }
      const now = new Date();
      const visibility = getCheckedValue("postVisibility") || "private";
      const publicNickname = visibility === "public" ? postNickname : "";
      const publicNicknameLanguage = visibility === "public" ? postNicknameLanguage : "";
      const request = {
        id: `AF-${String(1100 + requests.length)}`,
        type: document.getElementById("requestType").value,
        app: document.getElementById("targetApp").value,
        visibility,
        nickname: publicNickname,
        nicknameLanguage: publicNicknameLanguage,
        title: document.getElementById("title").value.trim(),
        status: "受け付けました",
        votes: 0,
        updated: now.toISOString().slice(0, 10),
        summary: document.getElementById("body").value.trim(),
        report: visibility === "public"
          ? "公開前審査後に公開受付します。検討、対応、完成、公開を約束するものではありません。"
          : "非公開で受け付けました。公開ボードには表示しません。"
      };
      requests = [request, ...requests];
      if (publicNickname) usedNicknames.add(publicNickname);
      activeStatus = "すべて";
      renderFilters();
      renderRequests();
      event.target.reset();
      applyDefaultVisibilityToForm();
      if (visibility === "public") {
        showNotice(`投稿を受け付けました。公開前審査後、${publicNickname} として公開されます。`);
        showScreen("board");
        return;
      }
      showNotice("非公開で受け付けました。運営が確認しますが、公開ボードには表示しません。");
    });

    document.getElementById("resetForm").addEventListener("click", () => {
      document.getElementById("requestForm").reset();
      applyDefaultVisibilityToForm();
      formNotice.className = "notice";
      formNotice.textContent = "";
    });

    document.getElementById("openLogin").addEventListener("click", () => {
      if (!authenticated) document.getElementById("loginModal").classList.add("show");
    });

    openMenuButton.addEventListener("click", () => {
      if (menuDrawer.classList.contains("show")) {
        closeMenu();
        return;
      }
      openMenu();
    });

    closeMenuButton.addEventListener("click", closeMenu);
    menuBackdrop.addEventListener("click", closeMenu);

    document.querySelectorAll("[data-screen-target]").forEach((button) => {
      button.addEventListener("click", () => {
        showScreen(button.dataset.screenTarget);
      });
    });

    appsScrollPrev.addEventListener("click", () => scrollApps(-1));
    appsScrollNext.addEventListener("click", () => scrollApps(1));
    appsScroller.addEventListener("scroll", updateAppScrollControls, { passive: true });
    window.addEventListener("resize", updateAppScrollControls);

    defaultVisibilityInputs.forEach((input) => {
      input.addEventListener("change", () => {
        updateAccountVisibility();
        if (authenticated) applyDefaultVisibilityToForm();
      });
    });

    accountNicknameLanguageInputs.forEach((input) => {
      input.addEventListener("change", () => {
        accountNicknameLanguage = getCheckedValue("accountNicknameLanguage") || "ja";
        rerollNickname("account");
        if (authenticated && defaultVisibility === "public") applyDefaultVisibilityToForm();
      });
    });

    postVisibilityInputs.forEach((input) => {
      input.addEventListener("change", updatePostVisibility);
    });

    postNicknameLanguageInputs.forEach((input) => {
      input.addEventListener("change", () => {
        postNicknameLanguage = getCheckedValue("postNicknameLanguage") || "ja";
        rerollNickname("post");
      });
    });

    rerollAccountNickname.addEventListener("click", () => {
      rerollNickname("account");
      if (authenticated) applyDefaultVisibilityToForm();
    });

    rerollPostNickname.addEventListener("click", () => {
      rerollNickname("post");
    });

    document.querySelectorAll("button").forEach((button) => {
      button.addEventListener("pointerdown", () => {
        button.classList.remove("press-pop");
        void button.offsetWidth;
        button.classList.add("press-pop");
      });
      button.addEventListener("animationend", () => {
        button.classList.remove("press-pop");
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    document.getElementById("openTerms").addEventListener("click", () => {
      document.getElementById("termsModal").classList.add("show");
    });

    document.querySelectorAll("[data-close]").forEach((button) => {
      button.addEventListener("click", () => {
        document.getElementById(button.dataset.close).classList.remove("show");
      });
    });

    document.getElementById("completeLogin").addEventListener("click", () => {
      if (!demoAuthEnabled) {
        document.getElementById("loginNotice").textContent = "公開版は現在閲覧専用です。Apple ID認証とサーバー保存を接続後に投稿受付を有効化します。";
        document.getElementById("loginNotice").classList.add("show");
        return;
      }
      const checks = [...document.querySelectorAll(".login-check")];
      const ok = checks.every((input) => input.checked);
      document.getElementById("loginNotice").classList.toggle("show", !ok);
      if (!ok) return;
      authenticated = true;
      updateAccountVisibility();
      applyDefaultVisibilityToForm();
      updateAuthState();
      document.getElementById("loginModal").classList.remove("show");
    });

    topicSearch.addEventListener("input", () => {
      const query = topicSearch.value.trim().toLowerCase();
      document.querySelectorAll("[data-searchable]").forEach((item) => {
        const text = item.dataset.searchable.toLowerCase();
        item.hidden = query.length > 0 && !text.includes(query);
      });
      requestAnimationFrame(updateAppScrollControls);
    });

    renderFilters();
    renderRequests();
    updateAccountVisibility();
    applyDefaultVisibilityToForm();
    updateAuthState();
    if (!demoAuthEnabled) {
      document.getElementById("completeLogin").textContent = "公開版では投稿受付を準備中";
    }
    const requestedScreen = new URLSearchParams(window.location.search).get("screen");
    showScreen(screenNames.has(requestedScreen) ? requestedScreen : "home", false);
    requestAnimationFrame(() => {
      appsScroller.scrollLeft = 0;
      updateAppScrollControls();
    });
