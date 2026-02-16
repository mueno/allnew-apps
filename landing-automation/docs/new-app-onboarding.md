# 新規アプリ追加手順（Landing Page 自動更新パイプライン）

> 新しい iOS アプリを ASC に申請する前に、ランディングページの自動更新パイプラインに登録する手順。

## 前提

- allnew-apps リポ: `mueno/allnew-apps` (GitHub Pages でホスト)
- Cloudflare Worker: ASC Webhook → `repository_dispatch` リレー
- GitHub Actions: `landing-auto-update.yml` が `repository_dispatch` を受けて LP データを更新

## 全体フロー

```
[1] allnew-apps に登録 (本手順)
     ↓
[2] ASC に申請
     ↓
[3] Webhook or fallback dispatch で LP 自動更新
     ↓
[4] GitHub Pages に反映
```

---

## Step 1: allnew-apps への登録（ASC 申請前に必須）

### 1-1. app_catalog.json にエントリ追加

File: `landing-automation/config/app_catalog.json`

```json
{
  "slug": "newapp",
  "name": "NewApp",
  "name_ja": "新アプリ",
  "category": "camera",
  "category_label": "Camera + OCR",
  "description_ja": "説明文（日本語）",
  "description_en": "Description (English)",
  "icon_path": "newapp-icon.png",
  "fallback_image_path": "newapp-promo.png",
  "card_image_path": "assets/onboarding/newapp-onboarding1.jpeg",
  "input_methods": ["camera_ocr", "voice_input"],
  "is_health_app": true,
  "support_path": "newapp/?lang=ja",
  "app_store_url": "",
  "bundle_id": "jp.allnew.newapp",
  "asc_app_id": "",
  "sort_order": 120,
  "featured_priority": 120,
  "bootstrap_visible": false
}
```

**必須キー**: `slug`, `name`, `name_ja`, `bundle_id`, `description_ja`, `description_en`

**注意**:
- `bootstrap_visible: false` → ASC 提出/公開イベントで初めて LP に表示される
- `sort_order` → LP でのカード表示順（小さいほど上）
- `asc_app_id` → ASC にアプリ作成後に埋める（Webhook slug 解決に使用）

### 1-2. app_slug_map.json に対応追加

File: `landing-automation/cloudflare-worker/config/app_slug_map.json`

```json
{
  "by_app_id": {
    "NEW_ASC_APP_ID": "newapp"
  },
  "by_bundle_id": {
    "jp.allnew.newapp": "newapp"
  }
}
```

**Cloudflare Worker の再デプロイが必要**:
```bash
cd landing-automation/cloudflare-worker
npm run deploy
```

### 1-3. オンボーディング画像を配置

```bash
# Simulator で撮影した1枚目のオンボーディング画面を配置
cp /path/to/screenshot.jpeg assets/onboarding/newapp-onboarding1.jpeg
```

### 1-4. 個別ランディングページを配置

```bash
# 既存アプリのページをコピーして編集
cp -r weightsnap/ newapp/
# newapp/index.html を編集（アプリ名、説明文、アイコンパス等）
```

セキュリティ要件（全ページ共通）:
- CSP meta タグ
- referrer meta タグ
- frame-busting JS
- onclick → addEventListener イベント委譲

### 1-5. バリデーション実行

```bash
python3 landing-automation/scripts/validate_app_readiness.py \
  --bundle-id jp.allnew.newapp --slug newapp
```

4項目すべて PASS であることを確認。

### 1-6. コミット & プッシュ

```bash
git add -A
git commit -m "feat: add newapp to landing pipeline"
git push
```

---

## Step 2: アプリリポに CI を設定

### 2-1. caller workflow を生成

```bash
# 全アプリ一括
python3 landing-automation/scripts/generate_caller_workflows.py --write

# 単一アプリ
python3 landing-automation/scripts/generate_caller_workflows.py --slug newapp --write
```

### 2-2. GitHub Secret を設定

アプリリポの Settings → Secrets → Actions:

| Secret 名 | 値 |
|-----------|-----|
| `ALLNEW_APPS_DISPATCH_TOKEN` | `mueno/allnew-apps` への `repo` スコープ付き GitHub PAT |

### 2-3. 動作確認

アプリリポで push するか、Actions タブから `workflow_dispatch` → `validate` を実行。

---

## Step 3: ASC 申請後の自動連携

### 自動経路（ASC Webhook → Cloudflare Worker）

ASC で以下の状態変化が発生すると、Worker が自動で `repository_dispatch` を送信:

| ASC 状態 | dispatch event_type |
|----------|-------------------|
| WAITING_FOR_REVIEW, IN_REVIEW 等 | `asc_app_submitted` |
| READY_FOR_DISTRIBUTION 等 | `asc_app_released` |
| その他 | `asc_status_changed` |

### 手動経路（fallback dispatch）

ASC Webhook が動かない場合や補完として:

```bash
# 審査提出時
gh workflow run landing-sync.yml \
  -R mueno/NewApp \
  -f action=dispatch-submitted

# 公開時
gh workflow run landing-sync.yml \
  -R mueno/NewApp \
  -f action=dispatch-released \
  -f app_store_url="https://apps.apple.com/app/newapp/id1234567890"
```

---

## dispatch payload 要件

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `event_id` | ✅ | 一意な ID（重複イベントは拒否される） |
| `event_date` | ✅ | UTC ISO 8601（古い日時は拒否される） |
| `app.slug` | ✅ | catalog に登録済みの slug |
| `app.status` | ✅ | ASC 状態（`WAITING_FOR_REVIEW` 等） |
| `app.bundle_id` | 推奨 | slug 解決のフォールバック |
| `app.asc_app_id` | 推奨 | slug 解決のフォールバック |
| `app.app_store_url` | 任意 | 公開時にのみ意味がある |
| `app.release_date` | 任意 | 未指定なら `event_date` から推定 |
| `app.input_methods` | 任意 | LP のカードタグに反映 |

---

## チェックリスト

### ASC 申請前

- [ ] `app_catalog.json` にエントリ追加
- [ ] `app_slug_map.json` に `by_bundle_id` 追加
- [ ] `asc_app_id` が判明したら `by_app_id` にも追加
- [ ] `assets/onboarding/<slug>-onboarding1.jpeg` 配置
- [ ] `<slug>/index.html` 配置（セキュリティ要件満たす）
- [ ] `validate_app_readiness.py` で 4/4 PASS
- [ ] allnew-apps にコミット & プッシュ
- [ ] Cloudflare Worker 再デプロイ（slug_map 変更時）

### アプリリポ

- [ ] `.github/workflows/landing-sync.yml` 配置
- [ ] `ALLNEW_APPS_DISPATCH_TOKEN` secret 設定
- [ ] push 時の validate が PASS

### ASC 申請後

- [ ] Webhook が Cloudflare Worker に到達することを確認（Worker ログ）
- [ ] LP が更新されることを確認（`data/landing-apps.generated.json`）
