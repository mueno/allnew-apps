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
  "first_screenshot_url": "https://.../first-screenshot.jpg"
}
```

- `status` は ASC状態名でも、`submitted` / `released` でも可
- `first_screenshot_url` は ASCのプロモーション1枚目を指定する

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
- `slug` がない場合は `app_catalog.json` の `asc_app_id` / `bundle_id` で解決
- 解決したイベントは `asc_app_submitted` / `asc_app_released` / `asc_status_changed` に変換して送信
