# AllNew.work ドメイン監査レポート

- **実施日**: 2026-06-13
- **対象**: `https://www.allnew.work` および `apps.allnew.work` 配下の全公開サイト（本リポジトリ `mueno/allnew-apps` から配信される静的ページ）
- **監査ページ数**: HTML 66 ページ（アプリLP 31、企業/法務 `ja`・`en`、`feedback` ポータル、`maclaw`/McNav サポート、`index.html` カタログ）
- **手法**: 静的解析（`html.parser` による全ページのメタデータ・リンク・画像・スクリプト・外部参照抽出）、リンク切れ検出、設定ファイル（`_headers` / `_redirects` / `vercel.json` / `robots.txt` / `sitemap.xml`）レビュー

> 本ファイルは内部資料です。`robots.txt`（`Disallow: /.planning/`）および `_redirects`（`/.planning/* 404`）で公開配信から除外されています。

---

## サイト構成（把握した実態）

両ドメインは本リポジトリの同一デプロイから配信されている:

| ホスト | 役割 | 主なパス |
|---|---|---|
| `apps.allnew.work` | アプリ・ランディングページ群 | `/`(カタログ), `/weightsnap/`, `/glucosnap/` ほか各アプリ |
| `www.allnew.work` | 企業サイト＋共通の法務ページ | `/?lang=ja#company`, `/ja/privacy`, `/en/terms` ほか |

`sitemap.xml` / `robots.txt` の正規ホストは `apps.allnew.work`。一方で法務リンクは `www.allnew.work` を参照しており、ドメインの役割分担と正規化（canonical）の整理が不十分。

---

## 重大度サマリ

| 重大度 | 件数 | 概要 |
|---|---|---|
| HIGH | 1 | ホスティング設定の二重化によるセキュリティヘッダ欠落リスク（配信先依存） |
| MEDIUM | 5 | サイトマップ網羅不足 / canonical 欠落 / OGP 欠落 / 連絡先メール不整合 / viewport 欠落 |
| LOW | 5 | 画像リンク切れ（孤立ページ）/ メタディスクリプション過長 / title 重複 / URL 形式ゆれ / ドメイン混在 |

セキュリティの基本設計（CSP・HSTS・X-Frame-Options DENY・各種プローブの 404 化）は良好。下記は主にSEO・運用一貫性・配信構成の改善余地。

---

## 詳細所見

### [HIGH-1] ホスティングヘッダ設定の二重化 — 配信先によりセキュリティヘッダが付かない恐れ
- **証拠**:
  - `_headers`（Cloudflare Pages 形式）は `/*` に対し X-Frame-Options / CSP / HSTS 等をグローバル適用。
  - `vercel.json` の `headers` は **`/feedback/(.*)` のみ**にしか適用されない（グローバル指定なし）。
  - `_redirects` も Cloudflare Pages 形式。
- **リスク**: もし実配信が Vercel 側なら、`_headers`・`_redirects` は無視され、`/feedback/` 以外の全ページがセキュリティヘッダ・攻撃パス 404 化なしで配信される。Cloudflare Pages 側ならその逆で `vercel.json` が無視される。**どちらが正本か不明瞭**な状態自体がリスク。
- **推奨**: 正本のホスティングを1つに確定する。両系統を残すなら、`vercel.json` にも `_headers` 相当のグローバルヘッダ（`source: "/(.*)"`）と主要リダイレクトを反映し、両環境でセキュリティパリティを担保する。実機で `curl -I https://apps.allnew.work/weightsnap/` と `https://www.allnew.work/` のレスポンスヘッダを照合して検証。

### [MEDIUM-1] sitemap.xml が大半のページを網羅していない
- **証拠**: `sitemap.xml` の URL は 13 件のみ。次の 15 アプリが未掲載:
  `basalsnap, cardvaultsnap, countsnap, hikae-cards, inlinememo, medreminder, minutepilot, pawpass, pillcue, pocketluma, pupmeds, settingsgenie, thermometersnap, vitalize, voicedeal`
  さらに `maclaw/*`、`ja/`・`en/` の企業/法務ページも未掲載。`<lastmod>` は大半が `2026-03-10` で陳腐化。
- **推奨**: 公開対象の全 URL を網羅し `lastmod` を更新。アプリ追加時に自動生成する仕組み（`landing-automation`）への組み込みを検討。

### [MEDIUM-2] canonical URL がほぼ全ページで欠落
- **証拠**: `<link rel="canonical">` を持つのは 66 ページ中 2 ページのみ。
- **リスク**: `apps.allnew.work` と `www.allnew.work` の両ホスト、`?lang=` クエリ、末尾スラッシュ有無で重複コンテンツ評価が分散。
- **推奨**: 各ページに自己参照 canonical を付与し、ホストとパス形式を1つに固定。

### [MEDIUM-3] OpenGraph / Twitter Card がほぼ全ページで欠落
- **証拠**: OGP メタを持つのは `index.html` のみ。残り 65 ページに `og:*` / `twitter:card` なし。
- **リスク**: SNS・チャット・AI 回答エンジンでの共有時にタイトル・説明・サムネイルが表示されず CTR 低下。
- **推奨**: 各アプリLPに `og:title` / `og:description` / `og:image`（既存の `*-promo.png` / `*-icon.png` を流用可）/ `og:url` / `twitter:card=summary_large_image` を付与。

### [MEDIUM-4] 連絡先メールアドレスの不整合
- **証拠**: 41 ページが `app-support@allnew.work` を使用する一方、`settingsgenie/index.html` のみ **別ドメインの `support@allnew.jp`** を3箇所で使用（L426 / L522 / L591）。
- **リスク**: `allnew.jp` が未運用/別主体の場合、問い合わせが届かない。ブランド一貫性も損なう。
- **推奨**: 監視中の正規アドレスへ統一（既定は `app-support@allnew.work`）。`allnew.jp` が意図的な別窓口でなければ要修正。※どちらの受信箱が実際に運用されているか確認の上で変更してください。

### [MEDIUM-5] 法務ページ4件で viewport メタが欠落
- **証拠**: `en/lp-privacy.html`, `en/lp-terms.html`, `ja/lp-privacy.html`, `ja/lp-terms.html` に `<meta name="viewport">` なし。
- **リスク**: モバイルで等倍レンダリングされ可読性低下。Google のモバイルフレンドリー評価にも影響。
- **推奨**: `<meta name="viewport" content="width=device-width, initial-scale=1">` を追加。

### [LOW-1] 孤立ページの画像リンク切れ（本PRで修正）
- **証拠**: `botto/index-app.html:117` と `weightsnap/index-app.html:117` が相対パス `promo.png` を参照するが当該ディレクトリに存在しない。実体はリポジトリ直下の `botto-promo.png` / `weightsnap-promo.png`。
- **補足**: `index-app.html` はどこからもリンクされていない孤立ページ（下書き相当）。影響は限定的だが明確な誤りのため本PRで修正済み。
- **推奨**: 不要なら `index-app.html` 群の削除も検討。

### [LOW-2] メタディスクリプションが過長
- **証拠**: `meishi-scanner/index.html`=600 文字、`pupmeds/index.html`=1271 文字（推奨は ~120–160 文字）。
- **リスク**: 検索結果で途中省略され、無駄なHTML肥大。
- **推奨**: 各ページ要点を 120–160 文字に圧縮。

### [LOW-3] title タグの重複
- **証拠**: `maclaw/`（McNav）の7ページ全てが同一 `<title>McNav Support</title>`。リダイレクト用ページ群も同一 title を共有。
- **リスク**: ページ識別性低下、SEO上の重複。
- **推奨**: 各ページ固有の title（例: `McNav プライバシーポリシー`, `McNav 利用規約`）に変更。

### [LOW-4] 法務リンクの URL 形式ゆれ
- **証拠**: `www.allnew.work/ja/privacy`（拡張子なし）と `www.allnew.work/ja/privacy.html`（拡張子あり）が混在。
- **リスク**: ホスティングのクリーンURL設定次第で 404 / リダイレクト増加、canonical 分散。
- **推奨**: どちらかの形式に統一し、サイト全体のリンクを揃える。

### [LOW-5] ドメイン参照の混在
- **証拠**: ページ内絶対URLで `apps.allnew.work`（28箇所）と `www.allnew.work`（11箇所）が混在。
- **推奨**: 役割（アプリ=apps / 企業・法務=www）を明文化し、各ページの内部リンク・canonical をその規約に従って統一。

---

## 良好だった点（指摘なし）

- **CSP**: `_headers` / `vercel.json` ともに `default-src 'self'`、`object-src 'none'`、`base-uri 'self'`、`frame-ancestors 'none'`、`upgrade-insecure-requests` を含む厳格な設定。
- **HSTS**: `max-age=31536000; includeSubDomains; preload`。
- **クリックジャッキング対策**: `X-Frame-Options: DENY` + `frame-ancestors 'none'`。
- **外部スクリプトは最小限**: Apple ID 認証と Vercel Insights の2本のみ。いずれも CSP allowlist 内。
- **攻撃面の縮小**: `_redirects` で WordPress/PHP プローブ、ドットファイル（`.env`/`.git`/`.ssh`/`.aws`）、内部 `landing-automation`・`test-results`・`.planning` を 404 化。
- **AIボット制御**: 学習系ボット（GPTBot/CCBot/ClaudeBot 等）を `robots.txt` で遮断しつつ、検索・引用系（OAI-SearchBot/PerplexityBot/Claude-SearchBot 等）は許可。
- **混在コンテンツなし**: `http://` の外部リンク・リソース参照は0件。`target="_blank"` の `noopener` 欠落も0件。
- **著作権表記**: 全ページ 2026 年で統一。

---

## 推奨対応の優先順位

1. **(HIGH)** 正本ホスティングの確定と、両環境でのセキュリティヘッダ・リダイレクトのパリティ確保（実機ヘッダ検証込み）。
2. **(MEDIUM)** `sitemap.xml` の全URL網羅と `lastmod` 更新。
3. **(MEDIUM)** 連絡先メール `support@allnew.jp` の正否確認と統一。
4. **(MEDIUM)** 全LPへの canonical / OGP メタ付与（テンプレ化 → `landing-automation` で自動注入）。
5. **(MEDIUM)** 法務ページ4件への viewport 追加。
6. **(LOW)** メタディスクリプション短縮、`maclaw` title 個別化、URL形式・ドメイン参照の統一、孤立 `index-app.html` の整理。
