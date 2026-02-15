# Landing Automation

`/Users/masa/Development/projects/allnew-apps/index.html` を自動更新するための補助プロジェクト。

## 目的

- ランディングページの**見た目は維持**したまま、アプリ紹介データを自動更新する
- 個別サポートページ（`/<app>/` 配下）には影響を与えない
- ASCイベント（審査提出 / 公開）をトリガーにデータ更新する

## 変更対象

- `data/landing-apps.generated.json`
- `landing-automation/state/landing_state.json`
- `assets/asc-screenshots/*`（ASCの1枚目画像を保存）
- `assets/onboarding/*`（各アプリのオンボーディング1枚目画像）

## 変更しない対象

- 各アプリの個別ページ（例: `weightsnap/index.html`）
- `ja/` `en/` の法務ページ

## イベント入力仕様（repository_dispatch）

`client_payload.app` または `client_payload.apps[]` に以下を渡す。

```json
{
  "slug": "weightsnap",
  "status": "READY_FOR_DISTRIBUTION",
  "app_store_url": "https://apps.apple.com/app/weightsnap/id6743864029",
  "first_screenshot_url": "https://.../first-screenshot.jpg",
  "card_image_path": "assets/onboarding/weightsnap-onboarding1.jpeg",
  "release_date": "2026-02-15",
  "input_methods": ["camera_ocr", "voice_input"]
}
```

- `status` は ASC状態名でも、`submitted` / `released` でも可
- `first_screenshot_url` は ASCのプロモーション1枚目を指定する（Featured用）
- `card_image_path` は任意。未指定時は `app_catalog.json` の `card_image_path` を利用する
- `release_date` は任意。未指定時は ASCイベント日時 / `updated_at` から補完する
- `input_methods` は任意。例: `camera_ocr`, `voice_input`, `sound_detection`
- ランディングページの表示言語は `?lang=ja` / `?lang=en` で切替する
- `event_id` と `event_date` はリレーで必須（重複/リプレイ防止）

## ランディング表示ルール（画像・統計）

- 各アプリカード画像は `card_image_path`（オンボーディング1枚目）を優先表示
- `promo_image_path`（ASCの1枚目画像）は Featured 表示用として保持
- `Health Apps` は `status=released` かつ `is_health_app=true` の件数を表示
- Featuredは `released` アプリのうち `release_date` が最新の1件を表示
- Featured見出しは最新リリースの `YYYY.MM.DD` を表示
- カードタグは `input_methods` から自動生成（例: `Camera + OCR + Voice Input`）
- 言語切替時は動的カードも再描画し、説明文・審査中ラベル・サポートリンクの `lang` を同期する
- `first_screenshot_url` は `https` かつ許可ドメイン（既定: `mzstatic.com`, `apple.com`）のみ取得
- 画像レスポンスは `image/*` かつサイズ上限（既定: 10MB）を満たす場合のみ採用

## repository_dispatch 送信例

```bash
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <GITHUB_TOKEN>" \
  https://api.github.com/repos/<owner>/<repo>/dispatches \
  -d '{
    "event_type": "asc_status_changed",
    "client_payload": {
      "app": {
        "slug": "weightsnap",
        "status": "READY_FOR_DISTRIBUTION",
        "app_store_url": "https://apps.apple.com/app/weightsnap/id6743864029",
        "first_screenshot_url": "https://example.com/first-screenshot.jpg"
      }
    }
  }'
```

## ローカル実行

```bash
cd /Users/masa/Development/projects/allnew-apps
python3 landing-automation/scripts/update_landing_data.py --bootstrap
python3 landing-automation/scripts/update_landing_data.py --event-file /path/to/event.json
```

セキュリティ関連のオプション環境変数:

- `LANDING_ALLOWED_SCREENSHOT_DOMAINS` (default: `mzstatic.com,apple.com`)
- `LANDING_MAX_SCREENSHOT_BYTES` (default: `10485760`)

## submitted 表示ルール

- `status=submitted` のアプリは LP に表示する
- カードのタグに `審査中` を付与する
- Featured が `submitted` の場合、App Store ボタンは非表示にする

## 外部Webhookリレー運用

ASC Webhook は外部で受信し、GitHub `repository_dispatch` へ中継する。
本番推奨は Cloudflare Worker:

- `/Users/masa/Development/projects/allnew-apps/landing-automation/cloudflare-worker/`
- セットアップは `/Users/masa/Development/projects/allnew-apps/landing-automation/cloudflare-worker/README.md`

ローカル運用用の代替リレー（Python）:

```bash
cd /Users/masa/Development/projects/allnew-apps
python3 landing-automation/webhook-relay/asc_webhook_relay.py \
  --github-owner <owner> \
  --github-repo <repo> \
  --github-token <token> \
  --webhook-secret <asc-webhook-secret>
```

- 受信エンドポイント: `http://<host>:8787/webhooks/asc`
- 受信サイズ上限: 1MB（既定）
- `event_id` 必須、`event_date` 鮮度検証あり、同一イベントは TTL 内で再送拒否
- `slug` がない場合は `app_catalog.json` の `asc_app_id` / `bundle_id` で解決
- 解決したイベントは `asc_app_submitted` / `asc_app_released` / `asc_status_changed` に変換して送信
