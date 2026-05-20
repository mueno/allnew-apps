# Deployment Security Requirements

AllNew App Factory Feedback を本番公開する場合の最低限のセキュリティ要件です。

## Required HTTP Headers

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://appleid.apple.com; frame-src https://appleid.apple.com; object-src 'none'; base-uri 'none'; form-action 'self' https://appleid.apple.com; frame-ancestors 'none'; upgrade-insecure-requests
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
```

`style-src 'unsafe-inline'` は現在の静的プロトタイプがインライン CSS を使うための暫定許可です。本番実装では CSS を外部ファイル化し、`style-src 'self'` に縮小することを推奨します。

## Application Controls

- Sign in with Apple JS を使い、認証結果はサーバーで検証する
- セッション Cookie は `HttpOnly`, `Secure`, `SameSite=Lax` 以上にする。管理者系は `SameSite=Strict` を原則にする
- 投稿 API は CSRF トークン、Origin チェック、レート制限を必須にする
- Cookie/外部送信ポリシーとして、必須Cookie、セッションCookie、外部送信先、送信項目、送信目的、送信先利用目的、オプトアウト可否、SameSite/Secure/HttpOnly属性、有効期間を本番公開前に明示する
- 投稿、通報、削除申出、開示等請求、ログイン試行にはユーザー単位・IP単位・Apple sub単位のレート制限と通報スパム対策を設定する
- 投稿本文は保存時・表示時の両方で HTML エスケープする
- 管理者画面は MFA、最小権限、監査ログを必須にする
- 公開前審査キューと公開データを分離する
- 個人情報を含む投稿は公開しない
- 公開用要約、削除、編集、統合、非公開化は運営担当者が確認して実行する。AIその他の自動処理は補助に限り、人間の承認なしに公開判断を確定しない
- Apple ID 連携解除とアカウント削除時に token revocation を行う
- Apple server-to-server notification 受信用エンドポイントは、署名検証、aud/iss/sub検証、リプレイ防止、冪等処理、アカウント無効化、監査ログ保存を必須にする
- Sign in with Apple に伴う Apple Inc.（米国）への認証関連情報送信について、個人情報保護法第28条に基づく外国第三者提供同意、国名、外国制度情報、提供先の保護措置、本人求めへの情報提供方法を本番公開前に明示する
- 採用時特典を提供する場合は、App Store Connect で発行および管理される公式プロモコード、オファーコードその他 Apple が認める公式コードに限定する。当社独自の利用クレジット、独自コード、残高管理、ポイント台帳、独自失効管理は実装しない
- 公開審査キューは内部管理画面に限定し、公開面には個別の内部ID、禁止カテゴリ、詳細審査理由を表示しない
- 監査ログは同意文言バージョン、規約バージョン、投稿ID、審査判断、削除処理、管理者操作を保存し、改ざん検知とアクセス制限を行う。生のIPアドレスとUser-Agentは原則6か月で削除、匿名化、または不可逆ハッシュ化し、同意ログと権利譲渡証跡は10年を上限に保存する

## Verification Before Release

- プライバシーポリシー、開示等請求、アカウント削除、事業者情報、Apple通知、外国第三者提供同意、Cookie/外部送信表示、18歳以上・日本国内在住確認、監査ログ保存期間、通報・削除申出、著作権法第27条および第28条の特掲、採用時特典の非対価性・App Store Connect公式コード限定・独自管理機能なしの表示が未実装の場合は公開しない
- CSP 違反がブラウザコンソールに出ていないこと
- HSTS、CSP、X-Content-Type-Options、Referrer-Policy、Permissions-Policy、COOP がHTTPレスポンスヘッダーとして出ていること
- 投稿本文に `<script>alert(1)</script>` を入れても文字列として表示されること
- 未ログイン状態で投稿 API が拒否されること
- 禁止カテゴリ選択時に投稿 API が拒否されること
- アカウント削除導線から削除リクエストと Apple token revocation が実行されること
- Apple server-to-server notification の署名検証、リプレイ拒否、冪等処理、アカウント無効化、監査ログ保存がテストされていること
- 投稿、通報、削除申出、開示等請求、ログイン試行のレート制限と通報スパム対策が機能すること
- 通報、ブロック、非公開化、監査ログが機能すること
