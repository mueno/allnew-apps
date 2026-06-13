# AllNew.work ドメイン監査レポート（是正完了）

- **実施日**: 2026-06-13
- **対象**: `https://www.allnew.work` および `apps.allnew.work` 配下の全公開サイト（本リポジトリ `mueno/allnew-apps` から配信される静的ページ）
- **最終状態**: **監査指摘 0 件**（56 ページ）/ 自動再監査でクリーン

> 本ファイルは内部資料です。`robots.txt`（`Disallow: /.planning/`）および `_redirects`（`/.planning/* 404`）で公開配信から除外されています。

---

## サイト構成（確定）

両ドメインは本リポジトリの同一デプロイから配信:

| ホスト | 役割 | 例 |
|---|---|---|
| `apps.allnew.work` | アプリのランディング/サポートページ群 + カタログ | `/`, `/weightsnap/`, `/feedback/` |
| `www.allnew.work` | 企業サイト + 共通の法務ページ | `/?lang=ja#company`, `/ja/privacy.html`, `/en/terms.html` |

### インデックス方針（是正後）
- **公開インデックス対象**: ルートカタログ + 各アプリページ（26）+ `feedback` + 企業/法務ページ（`ja`・`en`）。
- **noindex 維持**: リダイレクト/エイリアスのスタブ（`meishibridge`→`meishi-scanner`、`pet-health-cards`→`hikae-cards`、`thermometersnap`→`thermosnap`、`*/lp-privacy`・`*/lp-terms`）と McNav（`maclaw/*`）。
- **AI 学習ボットは全ページで遮断維持**（`GPTBot`/`CCBot`/`anthropic-ai`/`Google-Extended` は noindex のまま、検索系は許可）。

---

## 是正内容サマリ

| 区分 | 対応 |
|---|---|
| **HIGH: ホスティングヘッダ二重化** | `vercel.json` に `/(.*)` グローバルヘッダ（X-Frame-Options DENY / X-Content-Type-Options / Referrer-Policy / Permissions-Policy / HSTS / CSP）を追加し、Cloudflare `_headers` とセキュリティパリティを確保。 |
| **MEDIUM: インデックス/サイトマップ矛盾** | 26 アプリページを `noindex`→`index, follow` に変更。`sitemap.xml` をルート + 25 実アプリ + feedback の **27 URL** に再構築し `lastmod` を更新。リダイレクト/重複エイリアスは sitemap から除外。 |
| **MEDIUM: canonical 欠落** | 全インデックス対象ページに自己参照 canonical を付与（`apps`/`www` のホスト規約に準拠）。リダイレクトスタブの canonical はリダイレクト先に設定。 |
| **MEDIUM: OGP/Twitter Card 欠落** | 全インデックス対象ページに `og:*` + `twitter:card`（`summary_large_image`）を付与。og:image は各アプリの `*-promo.png`/`*-icon.png`、企業/法務ページは `apple-touch-icon.png`。 |
| **MEDIUM: 連絡先メール不整合** | `settingsgenie` の `support@allnew.jp`（3 箇所）を正規の `app-support@allnew.work` に統一。全ページで単一アドレスに収束。 |
| **MEDIUM: viewport 欠落** | 法務系4ページ（`*/lp-*`）等に viewport を補完。 |
| **LOW: メタディスクリプション過長** | `meishi-scanner`（595→142 字）、`pupmeds`（1266→156 字）を要約。 |
| **LOW: title 重複** | `maclaw` の7ページを個別タイトル化。`thermometersnap`（ThermoSnap 重複エイリアス）は noindex + canonical→`thermosnap` で集約。 |
| **LOW: 画像リンク切れ / 孤立ドラフト** | 未リンクの未完成ドラフト `*/index-app.html`（10件、画像切れ含む）を削除。 |

---

## 最終監査結果

自動再監査（noindex 認識・リンク切れ・タイトル一意性・メール一貫性・サイトマップ網羅を含む）:

```
PAGES AUDITED: 56
TOTAL FINDINGS: 0
*** 0 FINDINGS — CLEAN ***
```

チェック項目: title 有無/長さ、meta description 有無/長さ（インデックス対象のみ）、html lang、charset、viewport、canonical（同）、OGP（同）、img alt、リンク切れ、`http://` 混在、`target=_blank` の noopener、インデックス対象間の title 重複、連絡先メール一貫性、サイトマップ網羅。

---

## 残課題（コード変更を伴わない運用判断）

- **正本ホスティングの確定**: Cloudflare Pages（`_headers`/`_redirects`）と Vercel（`vercel.json`）の双方に設定が存在。ヘッダのパリティは確保したが、攻撃パスの 404 化（WP/PHP/ドットファイル）は Cloudflare の `_redirects` 固有のため、Vercel を正本にする場合は同等の rewrite 設定が別途必要。実機で両ホストのレスポンスヘッダ照合を推奨。
- **URL 形式の統一**: 法務リンクで `/ja/privacy` と `/ja/privacy.html` が混在。canonical は実ファイルパス（`.html`）に統一済みだが、ページ内リンクの形式統一は将来の整理対象。
