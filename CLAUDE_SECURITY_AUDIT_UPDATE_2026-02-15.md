# Claude連携: セキュリティ再監査結果（2026-02-15）

## 監査で使用した Skill

1. `context-loader`
- Path: `/Users/masa/Development/projects/ClaudeCodeオーケストレーション/.codex/skills/context-loader/SKILL.md`
- 用途: タスク開始時の共通コンテキスト読み込み手順

2. `security-audit-cloud-threat-docs`
- Path: `/Users/masa/.codex/skills/security-audit-cloud-threat-docs/SKILL.md`
- 参照マッピング: `/Users/masa/.codex/skills/security-audit-cloud-threat-docs/references/security-framework-mapping.md`
- 用途: 脅威モデル/クラウド監査観点（MITRE ATT&CK, CSA CCM, IPA）に沿った監査

## 対象範囲

- `/Users/masa/Development/projects/allnew-apps/<app>/index.html` の12ページ
  - babyvox, bloodpressuresnap, botto, coughwav, glucosnap, mofulens, oxisnap, pupweight, thermometersnap, thermosnap, waistvox, weightsnap

## 監査結果サマリ

- Critical: 0
- High: 0
- Medium: 1
- Low: 0

### Medium-1: 本番レスポンスにヘッダベースの保護が未設定

- 現象:
  - 本番URLに対する `curl -I` で以下ヘッダが未検出
    - `Content-Security-Policy`
    - `X-Frame-Options`
    - `Referrer-Policy`
    - `X-Content-Type-Options`
- 例:
  - `https://mueno.github.io/allnew-apps/weightsnap/?lang=ja`
- 補足:
  - HTML側にはCSP meta / referrer meta が実装済みだが、ヘッダ制御としては未達

## 改善済み確認（今回の再監査でOK）

- `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `eval` / `new Function`: 12ページすべて 0件
- `onclick` 等の inline event handler: 12ページすべて 0件
- 全12ページで公開URLは HTTP 200
- 全12ページに以下実装を確認
  - CSP meta
  - referrer meta
  - frame-busting fallback（`window.self !== window.top`）

## push状態の確認

- 修正コミット: `0a67889`
- `origin/main` と一致しており、再監査時点で push 済み

## 次アクション提案

1. カスタムドメイン + Cloudflare Response Header Transform でヘッダを注入
- 付与候補: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

2. ヘッダ適用後に再監査
- `curl -I` 実測で Medium-1 をクローズ

