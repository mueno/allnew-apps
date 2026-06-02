const appCatalogFallback = [
  { name: "WeightSnap", label: "WeightSnap | 体重", theme: "#006ee6", icon: "https://apps.allnew.work/weightsnap-icon.png" },
  { name: "ThermoSnap", label: "ThermoSnap | 体温", theme: "#f05423", icon: "https://apps.allnew.work/thermosnap-icon.png" },
  { name: "BPSnap", label: "BPSnap | 血圧", theme: "#f3255f", icon: "https://apps.allnew.work/bpsnap-icon.png" },
  { name: "GlucoSnap", label: "GlucoSnap | 血糖値", theme: "#0b8d62", icon: "https://apps.allnew.work/glucosnap-icon.png" },
  { name: "WaistVox", label: "WaistVox | ウエスト", theme: "#3f76dc", icon: "https://apps.allnew.work/waistvox-icon.png" },
  { name: "CoughWav", label: "CoughWav | 咳", theme: "#0a9995", icon: "https://apps.allnew.work/coughwav-icon.png" },
  { name: "PupWeight", label: "PupWeight | ペット体重", theme: "#f26a10", icon: "https://apps.allnew.work/pupweight-icon.png" },
  { name: "BOTTO", label: "BOTTO | 集中タイマー", theme: "#1f2937", icon: "https://apps.allnew.work/botto-icon.png" }
];

let appCatalog = [...appCatalogFallback];

const statusItems = [
  {
    id: "AF-1042",
    app: "WeightSnap",
    appIcon: "https://apps.allnew.work/weightsnap-icon.png",
    appTheme: "#006ee6",
    category: "記録・同期",
    status: "対応しています",
    title: "週ごとのグラフを見たい",
    acceptedDate: "2026-02-15",
    updatedDate: "2026-05-03",
    detail: "日ごとの変化だけでなく、週単位の傾向を見たいというご意見です。",
    good: 142,
    owned: false,
    timeline: [
      ["2026/02/15", "ご要望を受け付けました"],
      ["2026/03/08", "アップデート作業に着手しています"],
      ["2026/04/21", "アップデート版アプリのテストをしています"],
      ["2026/05/03", "アップストアの審査準備をしています"]
    ]
  },
  {
    id: "AF-1037",
    app: "GlucoSnap",
    appIcon: "https://apps.allnew.work/glucosnap-icon.png",
    appTheme: "#0b8d62",
    category: "使いやすさ",
    status: "検討しています",
    title: "メモ候補を増やしたい",
    acceptedDate: "2026-03-10",
    updatedDate: "2026-03-18",
    detail: "食事や運動など、記録時のメモ候補を選びやすくしてほしいというご意見です。",
    good: 88,
    owned: false,
    timeline: [
      ["2026/03/10", "ご要望を受け付けました"],
      ["2026/03/18", "似たご意見とあわせて検討しています"]
    ]
  },
  {
    id: "AF-1029",
    app: "ThermoSnap",
    appIcon: "https://apps.allnew.work/thermosnap-icon.png",
    appTheme: "#f05423",
    category: "見た目・表示",
    status: "出来ました",
    title: "表示を見やすくしてほしい",
    acceptedDate: "2026-01-24",
    updatedDate: "2026-05-12",
    detail: "記録一覧の読みやすさについてのご意見に対応しました。",
    good: 204,
    owned: false,
    timeline: [
      ["2026/01/24", "ご要望を受け付けました"],
      ["2026/02/09", "アップデート作業に着手しました"],
      ["2026/04/18", "アップデート版アプリのテストをしました"],
      ["2026/05/08", "アップストアの審査待ちです"],
      ["2026/05/12", "🎊アップデート版が公開されました👏👏👏👏"]
    ]
  },
  {
    id: "AF-1051",
    app: "New App Idea",
    appEmoji: "🚀",
    appDisplayName: "新しいアプリ案",
    appFilterable: false,
    appTheme: "#0a7dff",
    category: "新しい機能",
    status: "受け付けました",
    title: "集中タイマーのアプリ案",
    acceptedDate: "2026-05-18",
    updatedDate: "2026-05-18",
    detail: "新しいアプリの案として受け付け、内容を確認しています。",
    good: 36,
    owned: false,
    timeline: [
      ["2026/05/18", "新しいアプリ案を受け付けました"]
    ]
  },
  {
    id: "AF-1048",
    app: "",
    appEmoji: "•",
    appDisplayName: "対象アプリなし",
    appFilterable: false,
    appTheme: "#9aa3b2",
    category: "その他",
    status: "見送り・保留",
    title: "今回は見送り・保留になりました",
    acceptedDate: "2026-04-30",
    updatedDate: "2026-05-02",
    detail: "今回は対応を見送らせていただきました。",
    good: 9,
    owned: false,
    timeline: [
      ["2026/04/30", "ご意見を受け付けました"],
      ["2026/05/02", "公開できる範囲で結果を表示しました"]
    ]
  }
];

const filters = {
  status: "all",
  category: "all",
  app: "all",
  query: "",
  sort: "updated-desc"
};

const goodStorageKey = "poipoiStatusBoardGood:v1";
let goodVotes = loadGoodVotes();

const listEl = document.getElementById("statusList");
const emptyEl = document.getElementById("statusEmpty");
const resultEl = document.getElementById("resultCount");
const searchEl = document.getElementById("boardSearchInput");
const sortEl = document.getElementById("boardSortSelect");
const appEl = document.getElementById("appFilterSelect");
const releaseAppEl = document.getElementById("releaseAppFilterSelect");
const detailDialog = document.getElementById("detailDialog");
const detailBody = document.getElementById("detailContent");

function loadGoodVotes() {
  try {
    return JSON.parse(localStorage.getItem(goodStorageKey) || "{}") || {};
  } catch {
    return {};
  }
}

function saveGoodVotes() {
  try {
    localStorage.setItem(goodStorageKey, JSON.stringify(goodVotes));
  } catch {
    // Goodは補助機能なので保存できなくても閲覧は止めない。
  }
}

function parseDate(value) {
  const date = new Date(`${value}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getGoodCount(item) {
  return item.good + (goodVotes[item.id] ? 1 : 0);
}

function updateMetrics() {
  const counts = statusItems.reduce((acc, item) => {
    acc.all += 1;
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, { all: 0 });

  document.querySelectorAll("[data-metric-count]").forEach((node) => {
    const status = node.closest("[data-status-filter]")?.dataset.statusFilter || "all";
    node.textContent = `${counts[status] || 0}件`;
  });
}

function itemMatches(item) {
  const statusMatch = filters.status === "all" || item.status === filters.status;
  const categoryMatch = filters.category === "all" || item.category === filters.category;
  const appMatch = filters.app === "all" || item.app === filters.app;
  const query = filters.query.trim().toLowerCase();
  const queryMatch = !query || `${item.id} ${item.app} ${item.appDisplayName || ""} ${item.category} ${item.title} ${item.detail}`.toLowerCase().includes(query);
  return statusMatch && categoryMatch && appMatch && queryMatch;
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    if (filters.sort === "accepted-asc") return parseDate(a.acceptedDate) - parseDate(b.acceptedDate);
    if (filters.sort === "accepted-desc") return parseDate(b.acceptedDate) - parseDate(a.acceptedDate);
    if (filters.sort === "updated-asc") return parseDate(a.updatedDate) - parseDate(b.updatedDate);
    if (filters.sort === "good-desc") return getGoodCount(b) - getGoodCount(a);
    return parseDate(b.updatedDate) - parseDate(a.updatedDate);
  });
}

function createAppBadge(item) {
  const badge = document.createElement("span");
  badge.className = "request-app";
  badge.style.setProperty("--app-theme", item.appTheme || findAppMeta(item.app)?.theme || "var(--blue)");
  if (item.appIcon) {
    const icon = document.createElement("img");
    icon.src = item.appIcon;
    icon.alt = "";
    icon.loading = "lazy";
    icon.decoding = "async";
    icon.addEventListener("error", () => icon.remove(), { once: true });
    badge.append(icon);
  } else {
    const emoji = document.createElement("span");
    emoji.className = "emoji-icon";
    emoji.textContent = item.appEmoji || "•";
    badge.append(emoji);
  }
  badge.append(document.createTextNode(item.appDisplayName || item.app));
  return badge;
}

function getStatusIcon(status) {
  return {
    "受け付けました": "＋",
    "検討しています": "？",
    "対応しています": "⚒",
    "出来ました": "✓",
    "見送り・保留": "—"
  }[status] || "•";
}

function createTimeline(item, compact = false) {
  const timeline = document.createElement("div");
  timeline.className = "request-timeline";
  const rows = compact ? item.timeline.slice(0, 3) : item.timeline;
  rows.forEach(([date, label]) => {
    const row = document.createElement("div");
    row.className = "timeline-row";
    const time = document.createElement("time");
    time.textContent = date;
    const span = document.createElement("span");
    span.textContent = label;
    row.append(time, span);
    timeline.append(row);
  });
  return timeline;
}

function createCard(item) {
  const card = document.createElement("article");
  card.className = "request-card";
  card.dataset.status = item.status;
  card.dataset.requestId = item.id;

  const top = document.createElement("div");
  top.className = "request-card-top";
  const meta = document.createElement("div");
  meta.className = "request-meta";
  const id = document.createElement("span");
  id.textContent = item.id;
  meta.append(id, createAppBadge(item));
  const pill = document.createElement("b");
  pill.className = "status-pill";
  const pillIcon = document.createElement("span");
  pillIcon.className = "status-pill-icon";
  pillIcon.textContent = getStatusIcon(item.status);
  pill.append(pillIcon, document.createTextNode(item.status));
  top.append(meta, pill);

  const title = document.createElement("h3");
  title.textContent = item.title;
  const timing = document.createElement("p");
  timing.className = "request-timing";
  timing.textContent = `受付 ${item.acceptedDate.replaceAll("-", "/")} / 更新 ${item.updatedDate.replaceAll("-", "/")}`;
  const detail = document.createElement("p");
  detail.className = "request-detail";
  detail.textContent = item.detail;
  const compactStatus = document.createElement("p");
  compactStatus.className = "request-latest";
  const latest = item.timeline[item.timeline.length - 1];
  compactStatus.textContent = latest ? `最新: ${latest[1]}` : item.status;

  const actions = document.createElement("div");
  actions.className = "request-card-actions";
  const good = document.createElement("button");
  good.className = `good-button${goodVotes[item.id] ? " is-voted" : ""}`;
  good.type = "button";
  good.setAttribute("aria-pressed", goodVotes[item.id] ? "true" : "false");
  good.innerHTML = `👍 Good <strong>${getGoodCount(item)}</strong>`;
  good.addEventListener("click", () => {
    goodVotes[item.id] = !goodVotes[item.id];
    if (!goodVotes[item.id]) delete goodVotes[item.id];
    saveGoodVotes();
    render();
  });
  const detailButton = document.createElement("button");
  detailButton.className = "ghost-button";
  detailButton.type = "button";
  detailButton.textContent = "詳しく見る";
  detailButton.addEventListener("click", () => openDetail(item));
  actions.append(good, detailButton);

  card.append(top, title, timing, detail, compactStatus, actions);
  return card;
}

function openDetail(item) {
  if (!detailDialog || !detailBody) return;
  detailBody.replaceChildren();
  const close = document.createElement("button");
  close.className = "detail-close";
  close.type = "button";
  close.textContent = "×";
  close.addEventListener("click", () => detailDialog.close());
  const meta = document.createElement("div");
  meta.className = "request-meta";
  meta.append(document.createTextNode(item.id), createAppBadge(item));
  const status = document.createElement("b");
  status.className = "status-pill";
  const statusIcon = document.createElement("span");
  statusIcon.className = "status-pill-icon";
  statusIcon.textContent = getStatusIcon(item.status);
  status.append(statusIcon, document.createTextNode(item.status));
  const title = document.createElement("h2");
  title.textContent = item.title;
  const detail = document.createElement("p");
  detail.className = "request-detail";
  detail.textContent = item.detail;
  const timelineTitle = document.createElement("h3");
  timelineTitle.className = "detail-section-title";
  timelineTitle.textContent = "これまでの流れ";
  detailBody.append(close, meta, status, title, detail, timelineTitle, createTimeline(item, false));
  detailDialog.showModal();
}

function render() {
  updateMetrics();
  document.querySelectorAll("[data-status-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.statusFilter === filters.status);
    button.setAttribute("aria-pressed", button.dataset.statusFilter === filters.status ? "true" : "false");
  });
  document.querySelectorAll("[data-category-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.categoryFilter === filters.category);
    button.setAttribute("aria-pressed", button.dataset.categoryFilter === filters.category ? "true" : "false");
  });

  const visible = sortItems(statusItems.filter(itemMatches));
  listEl.replaceChildren(...visible.map(createCard));
  emptyEl.hidden = visible.length !== 0;
  resultEl.textContent = `${visible.length}件を表示しています（全${statusItems.length}件）。`;
}

function findAppMeta(name) {
  return appCatalog.find((app) => app.name === name);
}

async function loadAppCatalog() {
  try {
    const response = await fetch("https://apps.allnew.work/?lang=ja", { mode: "cors" });
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const itemList = [...doc.querySelectorAll('script[type="application/ld+json"]')]
      .map((script) => {
        try {
          return JSON.parse(script.textContent || "{}");
        } catch {
          return null;
        }
      })
      .find((json) => json?.["@type"] === "ItemList" && Array.isArray(json.itemListElement));

    const parsed = itemList?.itemListElement
      ?.map((entry) => entry.item)
      ?.filter((item) => item?.name)
      ?.map((item) => ({
        name: item.name,
        label: `${item.name} | ${item.alternateName || item.description?.split("。")[0] || "アプリ"}`,
        theme: appCatalogFallback.find((fallback) => fallback.name === item.name)?.theme || "#0a7dff",
        icon: item.image || appCatalogFallback.find((fallback) => fallback.name === item.name)?.icon
      }));

    if (parsed?.length) appCatalog = parsed;
  } catch {
    appCatalog = [...appCatalogFallback];
  }

  const catalogByName = new Map(appCatalog.map((app) => [app.name, app]));
  statusItems.forEach((item) => {
    const meta = catalogByName.get(item.app);
    if (meta) {
      item.appIcon = item.appIcon || meta.icon;
      item.appTheme = item.appTheme || meta.theme;
    }
  });
}

function setupAppFilter() {
  appEl.querySelectorAll("option:not([value='all'])").forEach((option) => option.remove());
  releaseAppEl?.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());

  appCatalog.forEach((app) => {
    const option = document.createElement("option");
    option.value = app.name;
    option.textContent = app.label;
    appEl.append(option);

    if (releaseAppEl) {
      const releaseOption = document.createElement("option");
      releaseOption.value = app.name;
      releaseOption.textContent = app.label;
      releaseAppEl.append(releaseOption);
    }
  });
}

document.querySelectorAll("[data-status-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    filters.status = button.dataset.statusFilter || "all";
    render();
  });
});

document.querySelectorAll("[data-category-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    filters.category = button.dataset.categoryFilter || "all";
    render();
  });
});

searchEl.addEventListener("input", () => {
  filters.query = searchEl.value || "";
  render();
});

sortEl.addEventListener("change", () => {
  filters.sort = sortEl.value || "updated-desc";
  render();
});

appEl.addEventListener("change", () => {
  filters.app = appEl.value || "all";
  render();
});

releaseAppEl?.addEventListener("change", () => {
  const value = releaseAppEl.value || "all";
  document.querySelectorAll("[data-release-app]").forEach((row) => {
    row.hidden = value !== "all" && row.dataset.releaseApp !== value;
  });
});

detailDialog?.addEventListener("click", (event) => {
  if (event.target === detailDialog) detailDialog.close();
});

loadAppCatalog().finally(() => {
  setupAppFilter();
  render();
});
