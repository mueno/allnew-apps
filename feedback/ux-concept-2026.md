# AllNew App Factory Feedback Portal UX Concept 2026

## 1. Service Concept

AllNew App Factory Feedback Portal は、通常の問い合わせ窓口ではなく、ユーザーの「小さな困りごと」や「新しいアプリの種」を、運営が安全に受け取り、公開できる範囲で進捗と結果を共有する場所です。

このサービスの価値は、次の3つに集約します。

1. **言える**: アプリ利用中の不便、改善要望、新規アプリ案を迷わず送れる。
2. **見える**: 受け付けられた要望の状態と結果が、公開可能な範囲で見える。
3. **安心できる**: 公開/非公開、権利譲渡、対価請求不可、結果非保証、受付不可カテゴリが、投稿前に理解できる。

目指す印象は、Apple Support アプリに近い「迷わない・軽い・信頼できる」体験に、Google One AI Plans のような「新しい可能性を発見していく」高揚感を重ねたものです。AllNew ではこれを **ひらめきファクトリー** と呼び、投稿フォームではなく「アイデアが生まれ、旅をして、アプリに近づく場所」として体験設計します。

## 2. Primary Users

| User | Situation | Main job |
|---|---|---|
| Casual app user | アプリを使っていて少し困った | 要望を短く送る |
| Idea contributor | 新しいアプリ案を思いついた | アイデアを投稿する |
| Returning user | 自分や他人の要望がどうなったか気になる | 公開ボードで状況を見る |
| Careful user | 投稿前に権利や公開範囲が気になる | ルールを確認する |
| Operator | 投稿を受け取り公開可否を判断する | 公開前審査、要約、ステータス更新 |

## 3. Product Promise

ユーザーに約束すること:

- Apple ID 連携だけで投稿できる。
- 投稿ごとに公開/非公開を選べる。
- 公開時も自由入力名ではなく、ルーレット生成ニックネームだけを表示する。
- 使用済みニックネームは次の候補から外す。
- 公開前に運営が確認し、個人情報、健康情報、秘密情報、権利侵害のおそれがある情報を公開しない。
- ステータスと結果報告は公開可能な範囲で示す。

ユーザーに約束しないこと:

- 採用、実装、完成、公開、継続提供。
- 報酬、対価、ロイヤリティ、利益分配。
- 投稿が秘密情報として扱われること。
- ニックネームによる完全な匿名性。

## 4. UX Principles for 2026

1. **Task-first mobile hub**  
   初回画面では、説明より「送る」「見る」「対象アプリを選ぶ」を優先する。PC/iPad は余白を増やすが、情報構造はスマホを正本にする。

2. **Progressive disclosure**  
   法務・プライバシー・禁止カテゴリは常時長文で見せず、投稿直前、ルール画面、モーダルに分けて提示する。重要同意は隠さず、必要な場面で必ず確認させる。

3. **Confidence before submission**  
   投稿前に、対象アプリ、公開設定、ニックネーム、受付不可カテゴリ、結果非保証を一目で確認できるようにする。

4. **Public board as accountability**  
   公開ボードは「運営の透明性」を担う画面。運営都合の内部審査理由は出さず、ユーザーに意味のあるステータス、状況報告、結果報告だけを表示する。

5. **Joy without dark patterns**  
   ワクワク感は、ルーレット名、押下反応、軽い浮遊感、明るい青の階調で作る。投稿を急かす演出、報酬を期待させる表現、他アプリ購入を前提にする導線は避ける。

6. **Discovery playground**
   トップ画面は単なる操作一覧にせず、「今週のひらめき」「アイデアの旅」「AllNewのアプリ」を短いカードで配置する。スクロールするほど、投稿が次の改善や新アプリにつながる期待を感じられる構成にする。

7. **Accessible by default**
   主要操作は44px以上、フォームはラベル必須、テキストは高コントラスト、状態は色だけで伝えない。キーボード操作、フォーカス、スクリーンリーダーで破綻しない構造にする。

8. **Trust-safe identity**
   Apple ID の氏名、メール、識別子は公開名に使わない。公開名は生成ニックネームのみ。非公開投稿は公開ボード、公開統計、公開ステータスの対象外にする。

## 5. Ideal User Flow

### Flow A: Improvement Request

1. Home
2. 対象アプリを選ぶ、または「要望・アイデアを投稿」
3. 投稿フォーム
4. 種類: 改善要望
5. タイトルと説明を入力
6. 受付不可カテゴリを自己確認
7. 公開/非公開を選ぶ
8. 公開する場合は日本語/英語ニックネームをルーレットで選ぶ
9. 同意事項を確認
10. Apple ID 連携
11. 送信
12. 公開希望なら公開前審査へ、非公開なら運営確認のみ

### Flow B: New App Idea

1. Home
2. 「New App Idea」または「送る」
3. 投稿フォーム
4. 種類: 新規アプリ案
5. 対象: New App Idea
6. 以降は Flow A と同じ

### Flow C: Status Check

1. Home
2. 「見る」または「公開ボードを見る」
3. 公開ボード
4. ステータスで絞り込み
5. 要望カードで状況・結果報告を読む
6. 問題があれば通報導線へ

### Flow D: Careful User

1. Home
2. 投稿前のルール
3. 利用条件、受付不可カテゴリ、公開前審査、健康関連境界を確認
4. 納得したら投稿へ

## 6. Screen Architecture

| Screen | Purpose | Primary action | Secondary action |
|---|---|---|---|
| Home | 入口。何ができるかを即時理解 | 送る | 見る |
| Submit | 投稿、公開設定、同意 | 送信して審査へ | クリア |
| Public Board | 公開済み要望の状況確認 | 絞り込み・並び替え | 問題報告 |
| Status | 5つの状態の意味を理解 | 投稿へ戻る | ルール確認 |
| Rules | 不安解消と法務理解 | 投稿へ進む | ガイドライン確認 |
| Menu | 補助ナビゲーション | 目的画面へ移動 | 登録状態確認 |

## 7. Home Screen Design

Home は説明ページではなく、操作ハブにする。

優先順位:

1. Brand and menu
2. Page title
3. Search
4. Hero with `送る` and `見る`
5. 今週のひらめき
6. Target apps carousel
7. Support tools
8. アイデアの旅
9. Optional discovery: AllNew apps
10. Common items

Hero copy:

- Main: 小さな願いが、次のアプリのはじまりになります。
- Support: メモ感覚で送信。公開アイデアは旅のように進みます。
- CTA: 送る / 見る

Discovery copy:

- 今週のひらめき: 忘れる前に、さっと送る。
- アイデアの旅: 受付から結果報告まで、公開できる範囲で進み具合を確認できます。
- 出来ました: できたことが、ちゃんと残る。

## 8. Submit Screen Design

Submit は1ページ内でも、心理的には3段階に分ける。

1. **何を送るか**: 種類、対象アプリ、タイトル、説明
2. **どう扱うか**: 公開/非公開、ニックネーム、受付不可カテゴリ
3. **同意して送る**: 権利譲渡、年齢、出願予定なし、結果非保証

改善方針:

- 長い同意文は視覚的に重いので、チェック項目をカード化して読みやすくする。
- 公開設定は投稿フォームの中盤に置き、送信直前の不安を減らす。
- 公開ニックネームは「遊び」だが、匿名保証ではない注意を近くに置く。

## 9. Public Board Design

Public Board は「透明性」と「安心」を担う。

改善方針:

- ステータスチップをカード上部に固定し、見出しより先に状態が分かるようにする。
- 結果報告は本文より小さくしすぎず、運営が何をしたかを読めるようにする。
- 非公開投稿数は表示しない。
- 内部審査理由、禁止カテゴリ詳細、投稿者を推測できる情報は表示しない。

## 10. Design References

- Apple Human Interface Guidelines: navigation, controls, visual hierarchy, accessibility
- WCAG 2.2: target size, focus, consistent help, accessible forms
- web.dev: mobile forms, performance, responsive behavior

These references are design constraints, not visual cloning targets. AllNew の画面は、AllNew ロゴカラー、青い階調、生成ニックネームの遊びを中心に独自性を出します。
