# AllNew.work ドメイン監査レポート（再監査・是正）

- **実施日**: 2026-06-13（再監査）
- **対象**: `https://www.allnew.work` および `apps.allnew.work` 配下の全公開サイト（本リポジトリ `mueno/allnew-apps` から Cloudflare Pages / Vercel の双方へ配信される静的サイト）
- **観点**: セキュリティ（HTTPヘッダ / 情報漏えい / 混在コンテンツ / 外部スクリプト / クライアント認証）＋ 法務（プライバシー・利用規約・特定商取引法・医療免責・ドラフト文書の公開）＋ SEO 整合性
- **前提**: 実行環境はネットワーク egress が遮断されているため、live URL への到達確認は不可。判定はリポジトリ（＝配信されるツリー）と配信設定（`_headers` / `_redirects` / `.vercelignore` / `robots.txt`）の静的解析に基づく。

> 本ファイルは内部資料。`robots.txt`（`Disallow: /.planning/`）・`_redirects`（`/.planning/* 404`）・`.vercelignore`（`.planning/`）で公開配信から除外済み。

---

## 0. 前回レポートとの乖離（重要）

同日付の旧レポートは「監査指摘 0 件 / 是正完了」を主張していたが、**再監査で複数の主張がリポジトリの実態と一致しないことを確認**した。旧レポートを破棄し、本レポートで置き換える。

| 旧レポートの主張 | 実態（再監査） |
|---|---|
| 26 アプリページを `noindex`→`index, follow` に変更 | 全アプリページは `noindex, nofollow, noarchive, nosnippet, noimageindex` の**noindex 維持**（後続の「landing governance」施策で意図的に noindex 化されたと推定） |
| `sitemap.xml` を 27 URL に再構築し矛盾を解消 | 実際は **22 URL**、うち **20 件が noindex ページ** → 矛盾は解消されておらず現存 |
| 指摘 0 件 | 情報漏えい 1 件（HIGH）、SEO 整合性 1 件（MEDIUM）、ヘッダパリティ 1 件（LOW）等を検出 |

一致していた項目（是正が実在）: `vercel.json` グローバルヘッダ `/(.*)` の付与、連絡先メール `app-support@allnew.work` への統一（92 箇所・`allnew.jp` は 0）。

---

## 1. 検出した指摘と是正内容

### [HIGH] 内部作業文書が公開ツリーに同梱され配信される（情報漏えい）

- **内容**: `feedback/` と リポジトリ直下に、公開ページではない内部の Markdown 文書が存在し、`_redirects`・`robots.txt`・`.vercelignore` のいずれでも保護されていなかった。Cloudflare Pages / Vercel は配信ツリー内の静的ファイルを既定で配信するため、URL 直打ちで到達可能（例: `/feedback/deployment-security.md`）。いずれの文書も HTML から参照されておらず、意図的公開ではない。
- **該当**:
  - `feedback/deployment-security.md` — セキュリティ要件の設計図（要求 CSP、Sign in with Apple の秘密鍵 `.p8`/Key ID/Team ID の取り扱い、セッション Cookie 方針、レート制限、監査ログ保持期間、APPI 第28条外国提供 等）。**攻撃者に防御構成を開示する**。
  - `feedback/legal-draft.md` / `feedback/privacy-policy-draft.md` — 冒頭に「公開前に弁護士レビューを前提とするドラフト」と明記された**未確定の法務文書**。公開済みの規約・プライバシーページと併存すると法的に紛らわしい。
  - `feedback/audit-report.md` — 内部監査（テストファイルパス等を含む）。
  - `feedback/product-spec.md` / `feedback/ux-concept-2026.md` / `feedback/README.md` — 内部仕様・UX・開発メモ。
  - `TECHBLOG_DRAFT_ZENN.md` — 未公開の技術ブログ下書き（リポジトリ直下）。
- **是正**:
  - `.vercelignore` に上記 8 文書と `test-results/` を追加（Vercel 側で非デプロイ）。
  - `_redirects` に上記 8 文書の `404` ルールを追加（Cloudflare Pages 側で 404）。
  - `robots.txt` に `Disallow: /feedback/*.md$` と `Disallow: /TECHBLOG_DRAFT_ZENN.md` を追加（クローラ抑止・多層防御）。
  - 文書自体はチーム用に in-repo で保持（配信のみ遮断）。

### [MEDIUM] sitemap.xml と noindex の矛盾（SEO 整合性）

- **内容**: `sitemap.xml` が 20 のアプリ「Support」ページ（`weightsnap/`, `glucosnap/` 等）を `lastmod/priority/changefreq` 付きで掲載していたが、当該ページは全て `noindex` を明示。Search Console で「送信された URL に noindex タグが追加されています」エラーとなり、クロールバジェットを浪費する自己矛盾。
- **意図の確定**: アプリ個別ページは意図的な noindex（積極的な robots 指定、`<title>…Support`、`landing governance` による運用）。SEO 面はカタログ `/`。企業/法務ページ（`/ja/`, `/en/`, privacy, terms, tokusho）は `www.allnew.work` に canonical。→ **矛盾の是正方向は「noindex ページを sitemap から除外」**。
- **是正**: `sitemap.xml` を、`apps.allnew.work` に self-canonical かつ実際に indexable なページのみへ再構築（`/`、`/feedback/`、`/anniversary-2026/`、`/anniversary-2026/en/` の 4 URL）。全 `<loc>` が `index,follow` であることを機械確認済み。XML は整形式（`xmllint`）。
  - 代替案: もしアプリページを検索露出させたい経営判断であれば、逆方向（各ページの `noindex` 除去）が必要。本是正は現行の noindex 方針を正とした。

### [LOW] Cloudflare `_headers` に HSTS が欠落（ヘッダパリティ逆転）

- **内容**: `vercel.json` は `Strict-Transport-Security` を付与していたが、Cloudflare `_headers` には無し。自社 `deployment-security.md` も HSTS を必須要件としている。
- **是正**: `_headers` に `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` を追加し、両ホストで一致。

---

## 2. 確認したが問題なしの項目（クリーン）

- **混在コンテンツ**: `http://` の実リソース参照なし（名前空間 URI を除く）。
- **`target="_blank"` の tabnabbing**: `rel=noopener` 欠落なし。
- **ハードコードされた秘密情報**: HTML/JS/JSON にキー・トークンの直書きなし。`feedback/app.js` の `POIPOI_ADMIN_SHARED_SECRET` は `window` 変数からの読み取りで既定 `""`、HTML への注入も無く、本番では admin 機能 off（`localOnly`）。
- **外部スクリプト**: Vercel Insights・Sign in with Apple のみ。CSP `script-src`／`connect-src` で許可済み、いずれも信頼できる提供元。
- **CSP / セキュリティヘッダ**: `default-src 'self'`、`object-src 'none'`、`frame-ancestors 'none'`、`base-uri 'self'`、`form-action` 制限、`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy` を両ホストで整備。
- **攻撃パスの 404 化（Cloudflare）**: WP/PHP・ドットファイル・`.git`/`.env`・`landing-automation`・`.planning`・`test-results` を `_redirects` で 404。
- **法務ページ**: 日英のプライバシー・利用規約、特定商取引法（`ja/tokusho.html`・`maclaw/tokusho/`・`en/legal-notice.html`）、Cookie ポリシーを整備。連絡先メール一貫。
- **医療免責**: ヘルス系アプリ（glucosnap / bloodpressuresnap / medreminder / oxisnap / thermosnap / coughwav / basalsnap / countsnap / pillcue / waistvox / weightsnap）に医療免責の記載あり。

---

## 3. 残課題（コード変更を伴わない運用判断 / 今後の推奨）

- **正本ホスティングの確定**: Cloudflare Pages（`_headers`/`_redirects`）と Vercel（`vercel.json`/`.vercelignore`）の二重運用。攻撃パスの 404 化は現状 `_redirects`（Cloudflare 固有）に依存。Vercel を正本化する場合は `vercel.json` に同等の rewrite/404 を追加すること。今回の情報漏えい是正は**両ホストを個別にカバー**した。
- **HSTS preload 登録**: `preload` ディレクティブを付与済み。実際に hstspreload.org へ申請する場合は全サブドメインの常時 HTTPS を確認のうえ実施。
- **`deployment-security.md` の追加推奨（未適用）**: 同文書は `Cross-Origin-Opener-Policy: same-origin`・`payment=()`・`upgrade-insecure-requests` も要件化。ただし COOP `same-origin` は Sign in with Apple のポップアップ（`window.opener` メッセージング）を阻害し得るため、feedback ページへの一律適用は要検証。今回は安全側で HSTS のみ適用。
- **クライアント側 admin 認証**: `feedback/app.js` の `Authorization: Bearer ${adminSharedSecret}` は現状無効（秘密未設定）だが、共有シークレットをクライアントに渡す設計は本番採用しないこと（`deployment-security.md` の「管理者画面は MFA・最小権限・監査ログ」に従う）。
- **URL 形式の統一**: 法務リンクで `/ja/privacy` と `/ja/privacy.html` が混在。canonical は実ファイルパス（`.html`）に統一済みだが、ページ内リンクの表記統一は将来整理対象。
- **www 用 sitemap**: 企業/法務ページ（www.allnew.work canonical）は本 sitemap（apps）対象外。検索露出させる場合は www 用 sitemap の別途用意を推奨。

---

## 4. 変更ファイル一覧

| ファイル | 変更 |
|---|---|
| `sitemap.xml` | noindex な 20 アプリURLを除外し、indexable な 4 URL へ再構築 |
| `_headers` | `Strict-Transport-Security` を追加（Vercel とパリティ） |
| `_redirects` | 内部文書 8 件の `404` ルールを追加 |
| `.vercelignore` | 内部文書 8 件＋`test-results/` を非デプロイ指定 |
| `robots.txt` | 内部文書の `Disallow` を追加（多層防御） |
| `.planning/domain-audit-2026-06-13.md` | 本レポート（旧レポートを実態準拠で置換） |
