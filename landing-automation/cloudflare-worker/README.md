# Cloudflare Worker Relay (Recommended)

ASC Webhook を受けて GitHub `repository_dispatch` に中継する本番向けリレー。

## 役割

- 受信: `POST /webhooks/asc`
- 検証: Webhook署名検証（HMAC-SHA256）
- 正規化: ASC payload を LP更新向け payload に変換
- 中継: GitHub `repository_dispatch` を発火

## コスト

用途的には Cloudflare Workers Free の範囲で運用可能。

## セットアップ

```bash
cd /Users/masa/Development/projects/allnew-apps/landing-automation/cloudflare-worker
npm install
```

### Secrets

```bash
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_OWNER
wrangler secret put GITHUB_REPO
wrangler secret put ASC_WEBHOOK_SECRET
```

### Deploy

```bash
npm run deploy
```

デプロイ後のURL例:

- `https://allnew-asc-webhook-relay.<subdomain>.workers.dev/webhooks/asc`

このURLを ASC Webhook 設定に登録する。

## dispatch イベント

- `asc_app_submitted`
- `asc_app_released`
- `asc_status_changed`

`client_payload` には正規化済み `app` 情報が入る。

## slug 解決

`config/app_slug_map.json` の `by_app_id` / `by_bundle_id` で解決する。

新アプリ追加時はこのマップを更新して再デプロイする。
