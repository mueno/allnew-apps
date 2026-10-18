# 12本のサポートページ運用を、1つの `app-data.js` で回すようにした話

こんにちは。合同会社AllNewの開発で、
`/Users/masa/Development/projects/allnew-apps` を運用している中でやった、
「サポート/法務ページの共通化」について書きます。

## 先に結論

- アプリ固有情報を `app-data.js` に集約
- 法務ページは `data-app` 属性を埋め込むだけのテンプレート化
- `applyAppData(lang)` でページ描画時に差し替え

この形にしたことで、**アプリ追加や文言修正の変更点をかなり減らせる**構成になりました。

## 背景: 1アプリ1HTMLで回すと、すぐ重くなる

`allnew-apps` には複数アプリのサポートページがあります。

実際に `index.html` の行数を見ると、アプリディレクトリだけでこんな感じです。

- 12ファイル
- 平均 `1492.2` 行
- 最小 `1012` 行 (`mofulens/index.html`)
- 最大 `1602` 行 (`weightsnap/index.html`)

ページ単体で見るとわかりやすいんですが、
文言改定や法務更新が入るたびに「似た変更を複数ファイルへ反映」が発生します。

## やったこと: データを1箇所に寄せる

### 1. アプリ差分を `app-data.js` に集約

`/Users/masa/Development/projects/allnew-apps/app-data.js`

このファイルに、アプリごとの `ja/en` 文言をまとめています。
現在のキー数は `13` です（例: `weightsnap`, `botto`, `mofulens` など）。

```js
const APP_DATA = {
  weightsnap: {
    name: "WeightSnap",
    supportEmail: "app-support@allnew.work",
    ja: { subtitle: "体重記録アプリ", ... },
    en: { subtitle: "Weight Recording App", ... }
  },
  // ...
}
```

### 2. テンプレート側は `data-app` を置くだけ

例: `/Users/masa/Development/projects/allnew-apps/ja/privacy.html`

```html
<h1><span data-app="name">WeightSnap</span> プライバシーポリシー</h1>
<strong>重要:</strong> <span data-app="importantNote">...</span>
```

### 3. `applyAppData` で埋め込み

`/Users/masa/Development/projects/allnew-apps/app-data.js`

```js
function getAppConfig(lang) {
  const params = new URLSearchParams(window.location.search);
  const appId = params.get('app') || 'weightsnap';
  const app = APP_DATA[appId];
  if (!app) return null;
  const langData = app[lang];
  if (!langData) return null;
  return { id: appId, name: app.name, supportEmail: app.supportEmail, ...langData };
}

function applyAppData(lang) {
  const config = getAppConfig(lang);
  if (!config) return null;

  document.querySelectorAll('[data-app]').forEach(el => {
    const key = el.getAttribute('data-app');
    if (config[key] !== undefined) el.innerHTML = config[key];
  });

  document.querySelectorAll('a[data-app-email]').forEach(el => {
    el.href = 'mailto:' + config.supportEmail + '?subject=' + encodeURIComponent(config.name + ' : ');
    el.textContent = config.supportEmail;
  });
}
```

## FAQだけは「配列をループ生成」にした

FAQは固定HTMLにすると差分管理がつらいので、
`config.faq` を回してDOM生成しています。

例: `/Users/masa/Development/projects/allnew-apps/ja/faq.html`

```js
const config = getAppConfig('ja');
config.faq.forEach((item, index) => {
  const div = document.createElement('div');
  div.className = 'faq-item' + (index === 0 ? ' open' : '');
  div.innerHTML = '<div class="faq-question">' + item.q + '</div>' +
                  '<div class="faq-answer">' + item.a + '</div>';
  container.appendChild(div);
});
```

## この構成で地味に効いたポイント

1. **法務文言修正の心理コストが下がる**
   - 「12ファイルを直すか…」から「まず `app-data.js` を直すか」に変わる。
2. **日英の整合を取りやすい**
   - 同じキー構造で `ja/en` を持てるので、漏れが見つけやすい。
3. **メールリンクやアプリ名の差し替えミスが減る**
   - `data-app-email` で一括置換できる。

## まだ課題はある

- `?app=` パラメータの実運用導線をもっと明確にする余地がある
- アプリID命名に揺れがある（例: `bpsnap` と `bloodpressuresnap`）
- さらに進めるなら、`APP_DATA` をJSON化 + バリデーション導入で運用を固くしたい

## まとめ

アプリ数が増えると、「1ページごとの差分管理」はすぐ破綻します。
今回のように、

- 差分はデータへ寄せる
- テンプレートは薄く保つ
- 描画時に埋め込む

を徹底するだけで、静的HTML運用でもだいぶラクになります。

同じように「小さなアプリ群を複数運用している」チームには、
このパターンはかなり相性がいいと思います。
