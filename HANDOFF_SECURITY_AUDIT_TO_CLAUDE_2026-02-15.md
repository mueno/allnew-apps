# 引き継ぎ: 各アプリ個別ページのセキュリティ是正

- 作成日: 2026-02-15
- プロジェクト: `/Users/masa/Development/projects/allnew-apps`
- 対象: 各アプリ個別ページ (`/<app>/index.html`) のみ

## 1. 目的

各アプリ個別ページのセキュリティ監査で検出された指摘事項を是正し、再監査で指摘 0 件にする。

## 2. 対象ファイル

- `/Users/masa/Development/projects/allnew-apps/babyvox/index.html`
- `/Users/masa/Development/projects/allnew-apps/bloodpressuresnap/index.html`
- `/Users/masa/Development/projects/allnew-apps/botto/index.html`
- `/Users/masa/Development/projects/allnew-apps/coughwav/index.html`
- `/Users/masa/Development/projects/allnew-apps/glucosnap/index.html`
- `/Users/masa/Development/projects/allnew-apps/mofulens/index.html`
- `/Users/masa/Development/projects/allnew-apps/oxisnap/index.html`
- `/Users/masa/Development/projects/allnew-apps/pupweight/index.html`
- `/Users/masa/Development/projects/allnew-apps/thermometersnap/index.html`
- `/Users/masa/Development/projects/allnew-apps/thermosnap/index.html`
- `/Users/masa/Development/projects/allnew-apps/waistvox/index.html`
- `/Users/masa/Development/projects/allnew-apps/weightsnap/index.html`

## 3. 現在の監査結果（修正対象）

### F-001 [Medium]
各ページでセキュリティヘッダ/ポリシーが不足。

- 代表確認:
  - `curl -sI 'https://mueno.github.io/allnew-apps/weightsnap/?lang=ja'`
  - `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy` などが未確認。

### F-002 [Low]
10ページに `innerHTML` 代入が残存（言語切替部分）。

- `/Users/masa/Development/projects/allnew-apps/babyvox/index.html:1388`
- `/Users/masa/Development/projects/allnew-apps/bloodpressuresnap/index.html:1390`
- `/Users/masa/Development/projects/allnew-apps/coughwav/index.html:1382`
- `/Users/masa/Development/projects/allnew-apps/glucosnap/index.html:1390`
- `/Users/masa/Development/projects/allnew-apps/oxisnap/index.html:1390`
- `/Users/masa/Development/projects/allnew-apps/pupweight/index.html:1382`
- `/Users/masa/Development/projects/allnew-apps/thermometersnap/index.html:1404`
- `/Users/masa/Development/projects/allnew-apps/thermosnap/index.html:1390`
- `/Users/masa/Development/projects/allnew-apps/waistvox/index.html:1380`
- `/Users/masa/Development/projects/allnew-apps/weightsnap/index.html:1436`

補足: `botto` と `mofulens` は `innerHTML` 代入なし。

## 4. 実装方針（必須）

1. `innerHTML` を全廃する。
- `textContent` と `createElement('br')` で代替。

2. 個別ページに HTML 側で可能な範囲の防御を追加する。
- `meta http-equiv="Content-Security-Policy"`
- `meta name="referrer"`
- そのほか GitHub Pages の制約で HTTP レスポンスヘッダに載せられない項目は、残余リスクとして明記する。

3. クリックジャッキング対策を補完する。
- 可能なら `frame-ancestors` を CSP で設定。
- ヘッダ設定が不可の場合は、静的配信制約下の代替策（最小限）を実装し、残余リスクを記録。

## 5. 制約（厳守）

- ページデザインは変更しない。
- 法務文面の意味を変更しない。
- `?lang=ja` / `?lang=en` の挙動を壊さない。
- 変更範囲は上記12ページの `index.html` を基本とし、必要最小限に限定する。

## 6. 完了条件

以下を満たしたら完了:

1. `innerHTML` 検索結果 0 件（対象12ページ）
2. 日本語/英語切替とページ内リンクが正常動作
3. 監査再実施で指摘 0 件
4. 変更内容と残余リスク（あれば）を短く報告

## 7. 検証コマンド

```bash
rg -n "innerHTML\\s*=" /Users/masa/Development/projects/allnew-apps/{babyvox,bloodpressuresnap,botto,coughwav,glucosnap,mofulens,oxisnap,pupweight,thermometersnap,thermosnap,waistvox,weightsnap}/index.html
```

```bash
curl -sI 'https://mueno.github.io/allnew-apps/weightsnap/?lang=ja'
```

## 8. 期待する納品

- 修正コード一式
- 再監査結果（指摘 0 件）
- 実施内容サマリ（何をどう修正したか）
- 残余リスクと今後の推奨事項（必要時のみ）
