# Claude向け引き継ぎ（AllNew / allnew-apps）

- 作成日: 2026-02-15
- 対象リポジトリ: `/Users/masa/Development/projects/allnew-apps`
- 目的: このセッションで構築した仕組み・作成Skill・ASC連動手順をClaudeへ正確に引き継ぐ

## 1. このセッションで実装した内容（要約）

### 1-1. ランディングページ自動更新基盤の構築

- ASCイベント（審査提出 / 公開）をトリガーに、LPデータを自動更新する仕組みを構築。
- LPの既存デザインは維持し、更新対象はデータ中心に限定。
- 個別ページ（`/<app>/index.html`）に影響しない設計。

主なファイル:
- `/Users/masa/Development/projects/allnew-apps/.github/workflows/landing-auto-update.yml`
- `/Users/masa/Development/projects/allnew-apps/landing-automation/scripts/update_landing_data.py`
- `/Users/masa/Development/projects/allnew-apps/landing-automation/runtime/landing-runtime.js`
- `/Users/masa/Development/projects/allnew-apps/data/landing-apps.generated.json`
- `/Users/masa/Development/projects/allnew-apps/landing-automation/state/landing_state.json`

### 1-2. ASC → GitHub の中継リレーを実装

- 本番推奨: Cloudflare Worker
- ローカル代替: Python relay
- Webhook署名検証・リプレイ防止・サイズ制限を実装済み

主なファイル:
- `/Users/masa/Development/projects/allnew-apps/landing-automation/cloudflare-worker/src/index.js`
- `/Users/masa/Development/projects/allnew-apps/landing-automation/cloudflare-worker/config/app_slug_map.json`
- `/Users/masa/Development/projects/allnew-apps/landing-automation/webhook-relay/asc_webhook_relay.py`
- `/Users/masa/Development/projects/allnew-apps/landing-automation/cloudflare-worker/README.md`

### 1-3. LP表示ロジックの更新（自動化に合わせた機能）

- Featuredを `New Release` セクション化
- 最新リリース日を `YYYY.MM.DD` 表示
- `Health Apps` を `released && is_health_app` 件数で自動計算
- カード画像を各アプリのオンボーディング1枚目に寄せる
- カードタグを `input_methods` から自動生成（固定文言の更新作業を不要化）
- `?lang=ja|en` のランディング言語切替を実装
- `APPS` ナビゲーション動作修正

### 1-4. 信頼性・セキュリティ強化

- repository_dispatch バースト時の競合回避（workflow concurrency + push retry/rebase）
- ActionsのSHA pin
- Worker/Python relayで署名必須・イベント鮮度検証・重複イベント拒否
- 画像取得を `https + allowlist domain + MIME/size` で制限

## 2. 主要コミット（このセッション関連）

- `0a67889` fix: harden per-app landing pages — CSP, DOM API, frame-busting, event delegation
- `567017c` docs: add Claude handoff for per-app security fixes
- `2d99ef8` fix: harden webhook relay security controls
- `39b8dbf` feat: add landing language switch and dot date format
- `cb9faaf` feat: add new-release featured section and dynamic app method tags
- `de4ed7e` tweak: tighten center colorization trigger to -70%
- `d18ff3b` tweak: delay center colorization timing
- `1445eed` feat: colorize cards on hover or center viewport
- `bc78ba6` feat: grayscale app card images until hover or tap
- `8ec2138` fix: use onboarding image for featured app
- `c5a079f` feat: update landing health count and onboarding card images

## 3. 作成した Skill（今回作成・運用投入）

運用/DevOps系:
- `/Users/masa/.codex/skills/github-ops-docs/SKILL.md`
- `/Users/masa/.codex/skills/cloudflare-workers-ops-docs/SKILL.md`
- `/Users/masa/.codex/skills/vercel-ops-docs/SKILL.md`

セキュリティ監査系:
- `/Users/masa/.codex/skills/security-audit-cloud-threat-docs/SKILL.md`
- `/Users/masa/.codex/skills/security-audit-cloud-threat-docs/references/security-framework-mapping.md`

法務リサーチ系:
- `/Users/masa/.codex/skills/japan-corporate-tax-law-docs/SKILL.md`
- `/Users/masa/.codex/skills/japan-local-tax-law-docs/SKILL.md`
- `/Users/masa/.codex/skills/japan-personal-information-protection-law-docs/SKILL.md`
- `/Users/masa/.codex/skills/japan-telecommunications-business-law-docs/SKILL.md`
- `/Users/masa/.codex/skills/japan-employment-security-law-docs/SKILL.md`
- `/Users/masa/.codex/skills/japan-consumer-contract-law-docs/SKILL.md`
- `/Users/masa/.codex/skills/japan-unfair-competition-prevention-law-docs/SKILL.md`
- `/Users/masa/.codex/skills/japan-specified-commercial-transactions-law-docs/SKILL.md`

## 4. 現在の自動更新アーキテクチャ（ASC連動）

1. ASC でアプリ状態が変化（審査提出 / 公開）
2. ASC Webhook が Cloudflare Worker に `POST /webhooks/asc`
3. Worker が署名検証・正規化・重複検査
4. Worker が `repository_dispatch` を `mueno/allnew-apps` に送信
5. `landing-auto-update.yml` が `update_landing_data.py` を実行
6. `data/landing-apps.generated.json` と `landing_state.json`（必要時は screenshot）を更新・コミット
7. GitHub Pages に反映

## 5. 重要: 「新規アプリをASC申請する時」にパイプラインへ追加すべき手順

ここが未整備だと、新アプリがASCで動いても LP 側でslug解決できず、自動反映が不完全になる。

### 5-1. 追加対象（必須）

新規アプリごとに、**ASC申請前**に以下を allnew-apps に反映する。

1. `app_catalog.json` へアプリ定義追加
- File: `/Users/masa/Development/projects/allnew-apps/landing-automation/config/app_catalog.json`
- 最低限必要なキー:
  - `slug`, `name`, `name_ja`
  - `description_ja`, `description_en`
  - `icon_path`, `card_image_path`（オンボーディング1枚目）
  - `input_methods`, `is_health_app`
  - `support_path`（`<slug>/?lang=ja`）
  - `bundle_id`, `asc_app_id`
  - `sort_order`, `featured_priority`

2. `app_slug_map.json` へ対応追加（Worker側slug解決）
- File: `/Users/masa/Development/projects/allnew-apps/landing-automation/cloudflare-worker/config/app_slug_map.json`
- `by_bundle_id` と（分かるなら）`by_app_id` を追加

3. オンボーディング1枚目画像を配置
- Path例: `/Users/masa/Development/projects/allnew-apps/assets/onboarding/<slug>-onboarding1.jpeg`

4. 個別ページを配置
- Path: `/Users/masa/Development/projects/allnew-apps/<slug>/index.html`

### 5-2. ASC側のWebhook設定（必須）

各アプリで ASC Webhook を設定:
- URL: `https://allnew-asc-webhook-relay.<subdomain>.workers.dev/webhooks/asc`
- Secret: Worker の `ASC_WEBHOOK_SECRET` と同一
- 想定対象状態: `WAITING_FOR_REVIEW`, `IN_REVIEW`, `READY_FOR_DISTRIBUTION` など

### 5-3. アプリ開発パイプラインに追加する運用（推奨）

「ASCへ提出」ジョブの中に、以下の自動化ステップを追加する。

#### Step A: 事前同期チェック（submit前）

- allnew-apps 側で次を満たすかCIで検証:
  - `app_catalog.json` に対象 `bundle_id`/`slug` がある
  - `app_slug_map.json` に対象 `bundle_id` がある
  - `assets/onboarding/<slug>-onboarding1.jpeg` が存在する
- 不足時は submit を止め、allnew-apps への同期PR作成を要求

#### Step B: submit直後の通知（fallback dispatch）

- ASC webhook の補完として、パイプラインから直接 `repository_dispatch` を送る（任意だが強く推奨）
- event_type: `asc_app_submitted`
- payload 例:

```json
{
  "event_id": "<uuid>",
  "event_date": "2026-02-15T09:30:00Z",
  "app": {
    "slug": "<slug>",
    "status": "submitted",
    "bundle_id": "<bundle_id>",
    "asc_app_id": "<asc_app_id>",
    "app_store_url": "",
    "first_screenshot_url": "",
    "release_date": "",
    "input_methods": ["camera_ocr", "voice_input"]
  }
}
```

#### Step C: 公開確定時の通知（fallback dispatch）

- event_type: `asc_app_released`
- payload には可能なら以下を含める:
  - `app_store_url`
  - `first_screenshot_url`（ASCの1枚目）
  - `release_date`

これで LP の New Release / カード表示 / App Store CTA が即時同期される。

### 5-4. Dispatch送信サンプル（アプリ側CIで使用）

```bash
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${ALLNEW_APPS_DISPATCH_TOKEN}" \
  https://api.github.com/repos/mueno/allnew-apps/dispatches \
  -d @dispatch.json
```

`dispatch.json`:

```json
{
  "event_type": "asc_app_released",
  "client_payload": {
    "event_id": "release-<slug>-<build_or_version>-<timestamp>",
    "event_date": "2026-02-15T09:45:00Z",
    "app": {
      "slug": "<slug>",
      "status": "READY_FOR_DISTRIBUTION",
      "bundle_id": "<bundle_id>",
      "asc_app_id": "<asc_app_id>",
      "app_store_url": "https://apps.apple.com/app/...",
      "first_screenshot_url": "https://.../first-screenshot.jpg",
      "release_date": "2026-02-15",
      "input_methods": ["camera_ocr", "voice_input"]
    }
  }
}
```

### 5-5. 運用ルール（重複/失敗対策）

- `event_id` は一意にする（重複イベントは拒否される）
- `event_date` は UTC ISO8601 を使う（古い日時は拒否される）
- webhook 送信失敗時だけ fallback dispatch を送る運用でも可
- 連続イベント時は workflow 側で再試行ロジックあり（実装済み）

## 6. 現在の監査状態（個別ページ）

- 直近再監査結果:
  - Critical: 0
  - High: 0
  - Medium: 1（本番レスポンスヘッダ未設定）
  - Low: 0
- DOM系リスク（innerHTML/inline onclick）は解消済み
- 次の改善候補: Cloudflareでレスポンスヘッダ注入（CSP/XFO/Referrer/XCTO）

## 7. Claudeへの依頼テンプレート

- まずこのファイルを読んで現状を把握する
- 新規アプリ追加時の「事前同期チェック + fallback dispatch」を各アプリ開発パイプラインへ組み込む設計を提案
- 可能ならテンプレートworkflow（再利用可能）を作成

