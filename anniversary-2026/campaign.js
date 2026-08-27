(() => {
  "use strict";

  const language = document.documentElement.lang === "en" ? "en" : "ja";
  const copy = {
    ja: {
      loadError: "アプリ一覧を読み込めませんでした。時間をおいて再度お試しください。",
      appStore: "App Storeで見る",
      appFree: "8/27限定 無料",
      unlockFree: "対象の買い切り機能も無料",
    },
    en: {
      loadError: "The app list could not be loaded. Please try again shortly.",
      appStore: "View on the App Store",
      appFree: "Free on Aug 27",
      unlockFree: "Eligible lifetime unlock also free",
    },
  }[language];

  const list = document.querySelector("[data-app-list]");
  const count = document.querySelector("[data-app-count]");

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function renderCard(app) {
    const localized = app[language];
    const card = element("article", "app-card");

    const icon = document.createElement("img");
    icon.className = "app-icon";
    icon.src = app.icon;
    icon.alt = "";
    icon.width = 82;
    icon.height = 82;
    icon.loading = "lazy";

    const body = element("div", "app-body");
    body.append(element("h2", "app-name", localized.name));
    body.append(element("p", "app-description", localized.description));

    const badges = element("div", "badges");
    badges.append(element("span", "badge badge-primary", copy.appFree));
    if (app.lifetimeUnlockFree) {
      badges.append(element("span", "badge", copy.unlockFree));
    }
    body.append(badges);

    const link = element("a", "store-link", copy.appStore);
    link.href = localized.url;
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${localized.name} — ${copy.appStore}`);
    body.append(link);

    card.append(icon, body);
    return card;
  }

  fetch("/anniversary-2026/apps.json", { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error("campaign_data_unavailable");
      return response.json();
    })
    .then((apps) => {
      count.textContent = String(apps.length);
      const fragment = document.createDocumentFragment();
      apps.forEach((app) => fragment.append(renderCard(app)));
      list.replaceChildren(fragment);
    })
    .catch(() => {
      list.replaceChildren(element("p", "load-error", copy.loadError));
    });
})();
