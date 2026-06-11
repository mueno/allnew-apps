const appCatalogFallback = [
  { name: "WeightSnap", label: "WeightSnap | 体重", theme: "#006ee6", icon: "https://apps.allnew.work/weightsnap-icon.png" },
  { name: "ThermoSnap", label: "ThermoSnap | 体温", theme: "#f05423", icon: "https://apps.allnew.work/thermosnap-icon.png" },
  { name: "BPSnap", label: "BPSnap | 血圧", theme: "#f3255f", icon: "https://apps.allnew.work/bpsnap-icon.png" },
  { name: "GlucoSnap", label: "GlucoSnap | 血糖値", theme: "#0b8d62", icon: "https://apps.allnew.work/glucosnap-icon.png" },
  { name: "WaistVox", label: "WaistVox | ウエスト", theme: "#3f76dc", icon: "https://apps.allnew.work/waistvox-icon.png" },
  { name: "CoughWav", label: "CoughWav | 咳", theme: "#0a9995", icon: "https://apps.allnew.work/coughwav-icon.png" },
  { name: "PupWeight", label: "PupWeight | ペット体重", theme: "#f26a10", icon: "https://apps.allnew.work/pupweight-icon.png" },
  { name: "BOTTO", label: "BOTTO | 集中タイマー", theme: "#1f2937", icon: "https://apps.allnew.work/botto-icon.png" },
  { name: "HIKAE Cards", label: "HIKAE Cards | カード控え", theme: "#0a7dff", icon: "https://apps.allnew.work/hikae-cards-icon.png" }
];

let appCatalog = [...appCatalogFallback];

const publicStatusItems = [];

const publicStatusApiUrl = "https://allnew-mobile-baas.vercel.app/api/feedback/public/list?limit=50";

const PUBLIC_STATUS_TIMELINE_NOTES = {
  "受け付けました": "ご要望を受け付けました",
  "検討しています": "チームで検討しています",
  "対応しています": "対応を進めています",
  "出来ました": "アップデートを公開しました",
  "ごめんなさい": "今回は見送りとなりました"
};

function formatBoardDate(value) {
  const date = String(value || "").slice(0, 10);
  return date ? date.replaceAll("-", "/") : "日付未記録";
}

function normalizeSimilarRequests(entry) {
  const requests = Array.isArray(entry.similarRequests) ? entry.similarRequests : [];
  return requests
    .map((request) => ({
      id: request.id || "",
      title: request.title || "",
      submitterName: request.submitterName || "匿名ユーザー",
      submittedAt: request.submittedAt || "",
      publicStatus: request.publicStatus || entry.publicStatus || "受け付けました"
    }))
    .filter((request) => request.id || request.title || request.submittedAt)
    .slice(0, 8);
}

function mapPublicApiItem(entry) {
  const isVirtual = Boolean(entry.app?.isVirtual);
  const appName = entry.app?.name || (isVirtual ? "New App Idea" : "アプリ");
  const accepted = String(entry.createdAt || "").slice(0, 10);
  const updated = String(entry.updatedAt || entry.createdAt || "").slice(0, 10) || accepted;
  const status = entry.publicStatus || "受け付けました";
  const similarRequests = normalizeSimilarRequests(entry);
  const similarRequestCount = Math.max(Number(entry.similarRequestCount) || 0, similarRequests.length || 1);
  const timeline = [[accepted.replaceAll("-", "/"), "ご要望を受け付けました"]];
  if (status !== "受け付けました" && updated && updated !== accepted) {
    timeline.push([updated.replaceAll("-", "/"), PUBLIC_STATUS_TIMELINE_NOTES[status] || status]);
  }
  return {
    id: entry.id,
    app: isVirtual ? "New App Idea" : appName,
    appEmoji: isVirtual ? "□" : "•",
    appDisplayName: isVirtual ? "新しいアプリ案" : appName,
    appFilterable: !isVirtual,
    appTheme: "#0a7dff",
    category: entry.type || "ご意見",
    status,
    title: entry.title || "（タイトルなし）",
    acceptedDate: accepted,
    updatedDate: updated,
    detail: entry.summary || "",
    good: Number(entry.goodCount) || 0,
    owned: false,
    similarRequestCount,
    similarRequests,
    timeline
  };
}

async function loadPublicStatusItems() {
  try {
    const response = await fetch(publicStatusApiUrl, { mode: "cors", cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    const items = Array.isArray(payload?.items) ? payload.items.map(mapPublicApiItem) : [];
    publicStatusItems.length = 0;
    publicStatusItems.push(...items);
  } catch {
    // ライブ取得に失敗しても「自分の受付」ビューと閲覧は止めない。
  }
}

const filters = {
  status: "all",
  category: "all",
  app: "all",
  query: "",
  sort: "updated-desc"
};

const goodStorageKey = "poipoiStatusBoardGood:v1";
const myReceptionStorageKey = "poipoi_my_receptions_v1";
const authSessionCookieName = "poipoi_feedback_session";
let goodVotes = loadGoodVotes();
let boardView = loadMyReceptions().length > 0 ? "mine" : "public";

const listEl = document.getElementById("statusList");
const emptyEl = document.getElementById("statusEmpty");
const resultEl = document.getElementById("resultCount");
const searchEl = document.getElementById("boardSearchInput");
const sortEl = document.getElementById("boardSortSelect");
const appEl = document.getElementById("appFilterSelect");
const releaseAppEl = document.getElementById("releaseAppFilterSelect");
const detailDialog = document.getElementById("detailDialog");
const detailBody = document.getElementById("detailContent");
const boardProfileLabel = document.getElementById("boardProfileLabel");
const boardViewButtons = Array.from(document.querySelectorAll("[data-board-view]"));
const myBoardPanel = document.getElementById("myBoardPanel");
const myBoardNickname = document.getElementById("myBoardNickname");

function getCookieValue(name) {
  const prefix = `${name}=`;
  const entry = document.cookie.split("; ").find((cookie) => cookie.startsWith(prefix));
  if (!entry) return "";
  return decodeURIComponent(entry.slice(prefix.length));
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

function loadMyReceptions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(myReceptionStorageKey) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id).slice(0, 30) : [];
  } catch {
    return [];
  }
}

function getCurrentNickname() {
  return getJsonCookie(authSessionCookieName)?.nickname || loadMyReceptions()[0]?.nickname || "";
}

function mapMyReceptionToStatusItem(item) {
  const accepted = item.acceptedAt ? item.acceptedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const updated = item.updatedAt ? item.updatedAt.slice(0, 10) : accepted;
  return {
    id: item.id,
    app: item.appName || "New App Idea",
    appEmoji: item.appName === "New App Idea" ? "□" : "•",
    appIcon: item.appName === "New App Idea" ? "./assets/new-app-idea-icon.png?v=20260606-blank-state" : item.appIcon,
    appDisplayName: item.appName === "New App Idea" ? "新しいアプリ案" : item.appName || "受付内容",
    appFilterable: item.appName !== "New App Idea",
    appTheme: "#0a7dff",
    category: item.type || "自分の受付",
    status: item.publicStatus || "受け付けました",
    title: item.title || "受付内容",
    acceptedDate: accepted,
    updatedDate: updated,
    detail: item.body || "受付内容はこの端末に控えています。公開ボードでは要約される場合があります。",
    good: 0,
    owned: true,
    timeline: [
      [accepted.replaceAll("-", "/"), "ポイナが受付しました"],
      [updated.replaceAll("-", "/"), item.publicStatus || "受け付けました"]
    ]
  };
}

function getBoardItems() {
  return boardView === "mine"
    ? loadMyReceptions().map(mapMyReceptionToStatusItem)
    : publicStatusItems;
}

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
  const baseItems = getBoardItems();
  const counts = baseItems.reduce((acc, item) => {
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
  const similarText = (item.similarRequests || [])
    .map((request) => `${request.id} ${request.title} ${request.submitterName}`)
    .join(" ");
  const queryMatch = !query || `${item.id} ${item.app} ${item.appDisplayName || ""} ${item.category} ${item.title} ${item.detail} ${similarText}`.toLowerCase().includes(query);
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

function createSimilarRequestsBlock(item, { compact = true } = {}) {
  if (item.owned || Number(item.similarRequestCount || 0) <= 1) return null;
  const requests = Array.isArray(item.similarRequests) ? item.similarRequests : [];
  if (!requests.length) return null;

  const block = document.createElement("div");
  block.className = "request-similar";

  const head = document.createElement("div");
  head.className = "request-similar-head";
  const label = document.createElement("strong");
  label.textContent = `同じ声 ${item.similarRequestCount}件`;
  const caption = document.createElement("span");
  caption.textContent = "受付履歴";
  head.append(label, caption);

  const list = document.createElement("ul");
  const visibleRequests = compact ? requests.slice(0, 3) : requests;
  visibleRequests.forEach((request) => {
    const row = document.createElement("li");
    const when = document.createElement("time");
    when.textContent = formatBoardDate(request.submittedAt);
    const who = document.createElement("strong");
    who.textContent = request.submitterName || "匿名ユーザー";
    const title = document.createElement("span");
    title.textContent = `${request.id ? `${request.id} / ` : ""}${request.title || item.title}`;
    row.append(when, who, title);
    list.append(row);
  });

  if (compact && requests.length > visibleRequests.length) {
    const more = document.createElement("li");
    more.className = "request-similar-more";
    more.textContent = `ほか ${requests.length - visibleRequests.length}件は「詳しく見る」で確認できます。`;
    list.append(more);
  }

  block.append(head, list);
  return block;
}

function createCard(item) {
  const card = document.createElement("article");
  card.className = `request-card${item.owned ? " is-owned" : ""}`;
  card.dataset.status = item.status;
  card.dataset.requestId = item.id;

  const top = document.createElement("div");
  top.className = "request-card-top";
  const meta = document.createElement("div");
  meta.className = "request-meta";
  const id = document.createElement("span");
  id.textContent = item.id;
  meta.append(id, createAppBadge(item));
  if (item.owned) {
    const owned = document.createElement("span");
    owned.className = "owned-badge";
    owned.textContent = "あなたの受付";
    meta.append(owned);
  }
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
  const similarBlock = createSimilarRequestsBlock(item, { compact: true });
  const compactStatus = document.createElement("p");
  compactStatus.className = "request-latest";
  const latest = item.timeline[item.timeline.length - 1];
  compactStatus.textContent = latest ? `最新: ${latest[1]}` : item.status;

  const actions = document.createElement("div");
  actions.className = "request-card-actions";
  const good = document.createElement("button");
  if (!item.owned) {
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
  }
  const detailButton = document.createElement("button");
  detailButton.className = "ghost-button";
  detailButton.type = "button";
  detailButton.textContent = "詳しく見る";
  detailButton.addEventListener("click", () => openDetail(item));
  if (!item.owned) actions.append(good);
  actions.append(detailButton);

  card.append(top, title, timing, detail);
  if (similarBlock) card.append(similarBlock);
  card.append(compactStatus, actions);
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
  const similarBlock = createSimilarRequestsBlock(item, { compact: false });
  const timelineTitle = document.createElement("h3");
  timelineTitle.className = "detail-section-title";
  timelineTitle.textContent = "これまでの流れ";
  detailBody.append(close, meta, status, title, detail);
  if (similarBlock) detailBody.append(similarBlock);
  detailBody.append(timelineTitle, createTimeline(item, false));
  detailDialog.showModal();
}

function render() {
  const baseItems = getBoardItems();
  document.body.classList.toggle("is-my-board", boardView === "mine");
  document.body.classList.toggle("is-empty-public-board", boardView === "public" && baseItems.length === 0);
  updateMetrics();
  boardViewButtons.forEach((button) => {
    const isActive = button.dataset.boardView === boardView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  if (myBoardPanel) myBoardPanel.hidden = boardView !== "mine";
  const nickname = getCurrentNickname();
  if (myBoardNickname) {
    myBoardNickname.textContent = nickname
      ? `ポイナはあなたを「${nickname}」と呼びます。`
      : "Appleでサインインすると、ポイナが呼び名を決めます。";
  }
  if (boardProfileLabel) {
    boardProfileLabel.textContent = nickname && boardView === "mine" ? `${nickname}の受付` : "公開ボード";
  }
  document.querySelectorAll("[data-status-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.statusFilter === filters.status);
    button.setAttribute("aria-pressed", button.dataset.statusFilter === filters.status ? "true" : "false");
  });
  document.querySelectorAll("[data-category-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.categoryFilter === filters.category);
    button.setAttribute("aria-pressed", button.dataset.categoryFilter === filters.category ? "true" : "false");
  });

  const visible = sortItems(baseItems.filter(itemMatches));
  listEl.replaceChildren(...visible.map(createCard));
  emptyEl.hidden = visible.length !== 0;
  resultEl.textContent = boardView === "mine"
    ? `${visible.length}件の自分の受付を表示しています。`
    : `${visible.length}件を表示しています（全${baseItems.length}件）。`;
}

function findAppMeta(name) {
  return appCatalog.find((app) => app.name === name);
}

async function loadAppCatalog() {
  try {
    const response = await fetch(window.PoipoiI18n?.catalogUrl?.() || "https://apps.allnew.work/?lang=ja", { mode: "cors" });
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
  publicStatusItems.forEach((item) => {
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

boardViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    boardView = button.dataset.boardView === "public" ? "public" : "mine";
    filters.status = "all";
    filters.category = "all";
    filters.app = "all";
    filters.query = "";
    if (searchEl) searchEl.value = "";
    if (appEl) appEl.value = "all";
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

Promise.allSettled([loadPublicStatusItems(), loadAppCatalog()]).finally(() => {
  setupAppFilter();
  render();
});
