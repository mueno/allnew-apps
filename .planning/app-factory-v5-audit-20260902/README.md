# App Factory v5 — 敵対的監査と是正計画（2026-09-02）

## 0. この文書の位置づけ

本書は App Factory v5（iOS アプリを企画→開発実装→リリース→販促まで自動実行する
Loop Engineering System）に対する**第三者視点の敵対的監査**の結果と、是正計画である。

判定カテゴリは v5 系の監査規約（`les-audit` skill）に合わせる。

| 記号 | 意味 |
|---|---|
| `[BLOCKER]` | 「完成」「リリース可」を主張する前に必ず直す |
| `[ISSUE]` | 公開報告・外部提供の前に直す |
| `[SUGGESTION]` | 改善するとよい |

**この文書は公開リポジトリ（`mueno/allnew-apps`）に置かれている。**
本番デプロイ経路の迂回手段を具体的に記載しているため、P0 是正の完了後に
プライベートリポジトリ（例: `mueno/allnew-policy`）へ移設することを推奨する。

---

## 1. 監査範囲と、監査できなかった範囲

証拠に基づく主張だけを行うため、到達できた対象を明示する。

| 対象 | コミット | 監査可否 |
|---|---|---|
| `mueno/factory-maker`（LES カーネル、v5 の一般化） | `624fd0c0d1468e218bab9c9487d54bfa9d5916a1` | 実行・再現込みで監査 |
| `mueno/allnew-apps`（リリース／販促スライス） | `b7b4d1299e05bb86f0557117a404f9b1a1a65bec` | 実行・再現込みで監査 |
| `ios-app-factory-v5` 本体（企画・開発実装フェーズ） | — | **到達不能。未監査** |

未検証事項も明示する。

- 本セッションのネットワークポリシーが `apps.allnew.work` と `itunes.apple.com`
  への外向き接続を拒否（CONNECT に 403）。**本番読み戻しの実地確認は行っていない。**
- したがって「本番が正しい」という主張は本書には一切含まれない。

企画・開発実装フェーズが未監査である以上、本書は
**「App Factory v5 全体が健全である」ことの証拠にはならない**。

---

## 2. 結論

**App Factory v5 は、成功状態に到達できない状態でループが閉じていない。**

根本原因は 1 行のコードである。`SUPPORTED_EXTERNAL_CLEARANCE_SCHEMES` が
空集合であるため、`release_ready` は**構造的に到達不能**になっている。
どれだけ正しく是正しても HOLD は解除されない。

その結果として、ガードが守られる代わりに**迂回**されている。
LES ガバナンスゲートは CI で一度も実行されておらず、リポジトリ自身の
公開文書（README / CHANGELOG / HANDOFF / LOOP_ENGINEERING_SYSTEM.md）は
**自分のゲートに全て不合格**である。そして誰も気づいていない。

これは本プロジェクト自身の研究テーゼ（過剰停止からの脱出）が予測した通りの
失敗モードである。**満たせないゲートは安全を生まず、迂回を生む。**

---

## 3. 所見

### 3.1 `[BLOCKER]` F-01: 成功状態が構造的に存在しない

`factory_maker/scripts/factory_runtime_enforcement.py:26`

```python
SUPPORTED_EXTERNAL_CLEARANCE_SCHEMES: frozenset[str] = frozenset()
```

同ファイル 230 行で、外部承認スキームがこの空集合に含まれない限り
`release_clearance_external_authority_not_implemented` を返す。
空集合に含まれる値は存在しない。

**再現（実行済み）**: 6 つの blocker family を全て `verified_closed` にし、
`verified_commit` / `evidence_sha256` / `independent_review_sha256` を含む
完全な clearance を与えても、結果は次のとおり。

```
release_ready : False
status        : hold
open blockers : 0
clearance err : ['release_clearance_external_authority_not_implemented']
```

**影響**: 是正作業に報酬がない。debt registry は 2026-07-10 の HOLD から
約 2 か月動いていないが、これは怠慢ではなく**仕様上動かせない**ためである。

**証拠**: `.planning/app-factory-v5-audit-20260902/verify_findings.py::finding_01`

---

### 3.2 `[BLOCKER]` F-02: ガバナンスゲートが CI で実行されていない

`factory_les_governance_gate.py` の docstring は
「CI が全 PR で実行できるよう決定論的かつ stdlib のみ」と述べる。実際には
**どのワークフローからも呼ばれていない**。

| 指標 | 値 |
|---|---|
| テストファイル総数 | 298 |
| CI が実行するテストファイル | 9 |
| 収集可能テスト総数 | 4,878 |
| CI が実行するテスト数 | 205 |
| 収集エラーになるモジュール数 | 39 |

唯一の強制手段は `.github/PULL_REQUEST_TEMPLATE.md:21` の
チェックボックス、すなわち**自己申告**である。これは本プロジェクト自身が
`gaming-patterns.md` で「Self-Evaluation」「Report-Only Completion」として
禁じているパターンそのものである。

さらに CLI 既定値が fail-open である。

```
exit(--require-allowed なし) = 0   # blocked=True でも 0
exit(--require-allowed あり) = 2
```

---

### 3.3 `[BLOCKER]` F-03: システムが自分自身のゲートに不合格

公開文書に対してゲートを実行した結果。

| ファイル | blocked | blocker 数 |
|---|---|---|
| `README.md` | True | 3 |
| `CHANGELOG.md` | True | 3 |
| `HANDOFF.md` | True | 3 |
| `docs/LOOP_ENGINEERING_SYSTEM.md` | True | 3 |

検出内容（README の例）:

```
critical runtime_enforcement_clearance_missing
high     promotion_report_missing
critical evaluation_artifact_manifest_missing_for_promotion_claim
```

`v47-v5-runtime-enforcement-audit-20260710.md` は
「全ての報告と PR は `generic LES release-ready: HOLD` の主張境界を使うこと」と
定めている。公開文書はこれに違反しており、F-02 のため検出もされない。

---

### 3.4 `[BLOCKER]` F-04: 主張検出器が容易に無効化できる

`READINESS_CLAIM_RE` にヒットしても、同一文中に
`CLAIM_NEGATION_MARKERS` の語が**部分文字列として**含まれると検出が取り消される。
マーカーには `hold`、`false`、`fail` が含まれる。

**再現（実行済み）**:

| 入力 | 検出 | 遮断 |
|---|---|---|
| `App Factory v5 is release-ready and production-ready.` | ✅ | ✅ |
| `... release-ready ... with zero false positives.` | ❌ | ❌ |
| `... release-ready across the whole holdout portfolio.` | ❌ | ❌ |
| `... release-ready: every gate met its threshold.` | ❌ | ❌ |
| `... has cleared every barrier and may ship to the App Store today.` | ❌ | ❌ |

`threshold` は `hold` を含む。**評価システムの最頻出語がガードを無効化する。**

これは監査規約 8「自然言語の断定より決定論的スクリプトとハッシュを優先せよ」に
自ら違反している。

---

### 3.5 `[BLOCKER]` F-05: 本番デプロイが fail-closed ゲートを迂回できる（3 経路）

**(a) `deploy.yml`** — `main` への push で無条件に Vercel 本番へデプロイする。
parity gate も live verify も走らない。

**(b) `landing-auto-update.yml` bootstrap モード** —
`workflow_dispatch` で `bootstrap=true, reconcile=false` の場合、

- `Landing sync` ステップの `if` が false → **parity gate をスキップ**
- `Live verification` の `if` は `steps.landing-sync.outcome == 'success'` を要求。
  outcome は `skipped` → **本番読み戻しもスキップ**
- 一方 `Commit changes` と `Deploy to Vercel` は実行される

すなわち**ゲートも読み戻しもゼロで本番公開できる**。

**(c) circuit breaker** — F-06 参照。

加えて `landing-tests.yml` は `paths: landing-automation/**` で絞られている。
`index.html` と `data/landing-apps.generated.json`（実際に公開される成果物）
だけを変更した場合、**テストは 1 件も走らずに本番へ出る**。

不変条件 1「作業項目が失敗したときシステムは失敗できなければならない」の違反。

---

### 3.6 `[BLOCKER]` F-06: circuit breaker に上限がなく、両方のゲートを恒久的に無効化できる

`landing_parity_gate.py:61-69` は `expires_at > now` のみを見る。
**最大期間の検証は存在しない**（`grep` 済み）。同じファイルを
`landing_live_verify.py:164` も読むため、**リポジトリ側ゲートと本番読み戻しの
両方が同時に無効化される**。

**再現（実行済み）**:

```
# breaker なし
[GATE:BLOCK] 111 MissingApp: not in app_catalog.json; not in ...
EXIT=1

# {"expires_at":"2099-12-31T23:59:59+00:00","reason":"temporary"}
[GATE:WARN] circuit breaker active (temporary); downgrading BLOCK
[GATE:WARN_CIRCUIT_BREAKER] public=2 landing_released=1 missing=1
EXIT=0
```

blueprint と README は「time-boxed」と記述しているが、**箱は実装されていない**。
承認者も、開いた記録も、期限超過の警報もない。

---

### 3.7 `[BLOCKER]` F-07: blueprint assurance ゲートは文書しか検証しない

`landing-automation/factory/README.md` は
「factory-maker assurance gate に合格（PASS — 0 blocker(s), 0 warning(s)）、
これが v5-audit invariants を強制する」と述べる。

PASS 自体は再現できた。しかしその PASS が何を証明しているかを検証した。

**再現（実行済み）**: 全ゲートの `external_signal.detail` を
`GET https://example.invalid/never — implemented by scripts/does_not_exist.py`
に書き換え、`max_consecutive_blocks` を緩めた blueprint を投入した結果:

```
[factory-blueprint-gate] PASS — 0 blocker(s), 0 warning(s)
```

**存在しないスクリプトと到達不能なホストを指すゲートでも合格する。**
したがって「invariants を強制する」という主張は成立しない。合格が示すのは
文書がスキーマ通りであることだけである。

これは `gaming-patterns.md` の「Frozen-Bytes Theater」（整合性の証明を
意味的妥当性の証明として提示する）に該当する。

---

### 3.8 `[ISSUE]` F-08: 宣言された escape valve と human gate が実行時に存在しない

blueprint の宣言と実装の乖離。

| blueprint の宣言 | 実行時の実体 |
|---|---|
| `escape_valve: {max_consecutive_blocks: 4, on_exhaust: escalate_human}` | 連続ブロックを数えるコードは存在しない。実体は無制限の `expires_at` ファイル |
| `governance.human_gates: [{at: parity_gate, reason: external_publish}]` | 承認ステップなし。`environment:` 保護もなし。自動 commit → 自動 deploy |
| `autonomy_tiers` L1/L2/L3 と graduation_criteria | 評価するコードなし。常に L3 固定 |

v5 監査が「built the ratchet, never fed it（ラチェットを作って回さない）」として
指摘し、factory-maker が修正したと主張した欠陥が、**一層下で再発している**。

---

### 3.9 `[ISSUE]` F-09: 精度計測が計測になっていない

blueprint の `metrics.history_path` は `state/parity_report.json` を指す。
しかし `write_report()` は**毎回上書き**する単一の辞書である。履歴はない。

`guard_precision_ledger` も同じファイルを指し、中身は
`false_positive_exclusion_ids: []` という **ID のリスト**であって、
`tp/(tp+fp)` の比率ではない。分母（ブロック総数）が記録されていない。

その結果、L3 の卒業条件
「parity gate の偽陽性率が 30 日あたり 1 未満」は**計算不能**である。
Pillar A（精度計測）は宣言のみで成立していない。

---

### 3.10 `[ISSUE]` F-10: 生存確認がない（停止と正常が区別できない）

`parity_report.json` の `updated_at` は `2026-08-26T12:24:29+00:00`。
スケジュールは 6 時間ごとだが、変更がなければファイルは更新されない。

したがって「5 分前に実行して合格した」と「1 週間実行されていない」が
**同一の観測値になる**。ワークフロー無効化・トークン失効・スケジュール停止は
サイレントに進行する。自律ループに必須の dead-man's switch がない。

---

### 3.11 `[ISSUE]` F-11: SSRF のリダイレクト経路が未閉塞

`update_landing_data.py:361-369` の `validate_screenshot_url()` は
**最初の URL のみ**を検証する。`urllib.request.urlopen` は既定で最大 10 回
リダイレクトを追跡し、**追跡先は再検証されない**（カスタム
`HTTPRedirectHandler` は不在、`grep` 済み）。

v5 監査の原文所見は「`fetch_url` SSRF（リダイレクト、scheme/host 許可リストなし）」。
crosswalk はこれを修正済みとして表に載せているが、**許可リストは追加され、
リダイレクト側は未対応**である。所見の半分だけが閉じている。

加えて許可リストは環境変数 `LANDING_ALLOWED_SCREENSHOT_DOMAINS` で上書きできる。
セキュリティ制御が凍結された方針入力になっていない。

実害は Apple ドメインのリダイレクト制御を要するため限定的だが、
**「閉じた」という記載が誤り**である点が問題である。

---

### 3.12 `[ISSUE]` F-12: 除外リストに期限・責任者・再審査がない

`load_exclusions()` は `app_id` と空でない `reason` のみを要求する。
期限も、開いた人も、再審査日もない。一度書けば恒久的にそのアプリは
parity 対象から消える。`config/parity_exclusions.json` は自動化が書き込める
リポジトリ内にある。

---

### 3.13 `[ISSUE]` F-13: 配信停止アプリが恒久的に warn 止まり

`stale_landing_app_ids`（公開停止されたのに LP で `released` のままの
アプリ）は**常に警告のみでブロックしない**。ユーザーは死んだ App Store
リンクを踏み続ける。販促ループの成果物としての正しさが担保されていない。

---

### 3.14 `[ISSUE]` F-14: readiness 検証が呼び出し側の任意

`.github/workflows/reusable-landing-sync.yml` の `dispatch` ジョブは
`validate` ジョブに `needs:` で依存していない。両者は `action` 入力による
排他分岐である。呼び出し側アプリリポジトリは
`action: dispatch-released` を直接指定でき、**readiness 検証を通さずに
リリース済みイベントを発火できる**。

また `dispatch_token` は「repo scope の GitHub PAT」と記述されている。
`repository_dispatch` のみに限定した fine-grained token で足りるところに、
全アプリリポジトリへ広い権限の PAT を配っている。

---

### 3.15 `[ISSUE]` F-15: 外部接地の実体が固定パスのローカルファイル

`landing_sync.py` は artist lookup を
`/tmp/allnew-artist-lookup.json` に書き、parity gate と live verify の
両方が `--lookup-file` でこれを読む。

- ハッシュも署名も鮮度上限もない
- ジョブ内の後続ステップ（`npx --yes vercel@50` を含む第三者コード実行）より
  前に書かれ、後から読まれる
- 本番読み戻しが比較する「App Store の現実」は、**デプロイ前に取得した
  スナップショット**であって、読み戻し時点の現実ではない

Pillar C は「内部状態を接地に使わない」と定めるが、ゲートが読む時点では
内部状態になっている。

---

### 3.16 `[ISSUE]` F-16: debt registry がコードと乖離している

registry は `capa-andon-and-real-targeted-retest` を `open` とし、観測された
失敗として「`cmd_resolve_andon()` は `complete` を計算するが無関係に ANDON を
消す」を挙げる。

しかし現行コード `factory_runtime.py:561-568` は既に修正済みである。

```python
if not complete:
    fac.save_state()
    fac.append_trace("capa_incomplete", capa)
    print("refusing to close ANDON: ...")
    return 1
```

**コードは直っているが registry の行は開いたまま**。closure contract が
重すぎて（かつ F-01 により最終的に到達不能で）誰も閉じられない。
結果として HOLD は現在の実態を表す信号ではなくなっている。

---

### 3.17 `[SUGGESTION]` F-17〜F-20

- **F-17**: `landing_live_verify.html_missing_slugs()` はカードの存在を
  `href="{slug}/` の部分文字列一致で判定する。v5 監査が指摘した
  「スクリーンショット真正性を部分文字列で判定」と同じクラス。
  DOM 構造で判定すべき。
- **F-18**: CI 環境（pytest/jsonschema/pyyaml/ruff のみ）では 39 モジュールが
  収集不能。`cryptography` などの extras 未導入が原因。CI からは
  **存在しないのと同じ**になっている。収集エラーで落とすべき。
- **F-19**: `asc_webhook_relay.py` のリプレイキャッシュはプロセス内メモリ。
  再起動でリプレイ窓が再び開き、複数インスタンス間で共有されない。
- **F-20**: `.vercelignore` が存在せず、リポジトリ全体が Vercel に渡る。
  `landing-automation/`（Python ソース、config、state）が公開配信されて
  いないかを確認すること。本セッションからは egress が遮断されており
  **未検証**である。確認コマンド:
  `curl -I https://apps.allnew.work/landing-automation/state/parity_report.json`

---

### 3.18 健全だった点（対照として記録）

敵対的監査は欠陥だけを報告すると価値を失うため、確認できた強度も残す。

- `landing_live_verify.py` は**本物の外部読み戻し**である。本番の JSON と
  HTML を実際に取得し、リポジトリ成果物と App Store 一覧の三者で照合する。
  設計として正しい。
- `asc_webhook_relay.py` は HMAC-SHA256 を `hmac.compare_digest` で検証し、
  hex/base64 の双方を受け、リプレイ ID と TTL を持つ。
- `store_discovery.py` の slug 解決は `SAFE_SLUG_PATTERN` で検証し、
  不正な slug はフォールバックへ落とす。パストラバーサル対策として妥当。
- `cmd_resolve_andon()` は失敗ゲートの実再走を要求し、不足なら
  ANDON を閉じない（F-16 のとおり registry より進んでいる）。
- `factory_blueprint_gate.py` がスキーマを契約とする設計は正しく、
  ID パターン検証により RCE / パストラバーサル系を設計時に潰している。
- landing-automation のテスト 73 件は全て合格（0.52s）。CI 選択分の
  factory-maker テスト 205 件も全て合格（145s）。

---

## 4. 是正計画

原則は 1 つ。**宣言と実装の距離をゼロにする。**
宣言だけのガードは削除するか、実装するかの二択とし、中間状態を許さない。

### フェーズ P0 — 成功状態を作り、ゲートを本物にする（1〜2 週）

| ID | 対象 | 内容 | 完了判定 |
|---|---|---|---|
| R-01 | F-01 | 外部承認スキームを最低 1 つ実装する（例: 指定 Ed25519 鍵による detached 署名、または GitHub Release attestation）。`SUPPORTED_EXTERNAL_CLEARANCE_SCHEMES` に登録する | 全 family closed + 正当な署名 → `release_ready: True`。**かつ**署名を 1 バイト改竄 → `hold`（負の対照） |
| R-02 | F-02 | LES ガバナンスゲートを CI 必須ジョブにする。対象は PR 本文と変更された文書。`--require-allowed` を既定にし、fail-open は `--allow-blocked` の明示指定でのみ許す | ゲートに落ちる PR がマージ不能になることを、意図的に落ちる PR で実証 |
| R-03 | F-03 | 公開文書を主張境界に適合させる。または要求される `evaluation_artifact_manifest` と `evidence_ledger` を添付する | R-02 適用後、README/CHANGELOG/HANDOFF/LOOP_ENGINEERING_SYSTEM が `blocked: False` |
| R-04 | F-05(a) | `deploy.yml` から無条件本番デプロイを外す。デプロイ前に `landing_sync.py`（parity gate 込み）を実行し、失敗時は中止する。あわせて parity gate を `main` の required status check にする | ゲートを落とす commit を `main` に push → デプロイが実行されない |
| R-05 | F-05(b) | bootstrap モードのスキップを廃止。全経路で parity gate と live verify を必ず通す。`landing-tests.yml` の paths フィルタを外すか、`index.html` / `data/**` 変更時のゲートジョブを追加する | `bootstrap=true` の `workflow_dispatch` でゲートと読み戻しが実行される |
| R-06 | F-06 | circuit breaker に上限を実装する。最大 72 時間、`opened_by` と `andon_issue` を必須、超過は自動失効し `[GATE:BLOCK]` に戻す。30 日累計の使用時間に上限を設け、超過でブロック。**live readback は breaker で降格させない**（本番の現実は迂回不可） | 74 年 breaker が `exit 1` になる負の対照テストが CI にある |

### フェーズ P1 — 散文のガードを決定論に置き換える（2〜4 週）

| ID | 対象 | 内容 | 完了判定 |
|---|---|---|---|
| R-07 | F-04 | 主張検出を構造化する。PR は `claim.json`（`claim_class` と証拠参照）の添付を必須とし、正規表現は補助ヒューリスティックへ降格。部分文字列一致による否定判定を廃し、語境界と否定スコープで判定する | `threshold` / `holdout` / `false positives` / 言い換えの 4 ケースが負の対照テストとして CI にある |
| R-08 | F-07 | blueprint ゲートに**配線検証**を追加する。各 gate の `external_signal` が解決可能なコマンド／パスを指すことを検証し、さらに種を仕込んだ失敗入力で当該ゲートが非ゼロ終了することを確認する（ゲートごとの負の対照） | 存在しないスクリプトを指す blueprint が `FAIL` になる |
| R-09 | F-09 | 追記専用の計測台帳（JSONL）を導入する。run id、verdict、開始・終了時刻、ブロック数、偽陽性数を記録し、`tp/(tp+fp)` と 30 日偽陽性率を算出する | L3 卒業条件が実データから計算でき、値が報告に出る |
| R-10 | F-10 | dead-man's switch を実装する。`parity_report.updated_at` が 2 サイクル（12 時間）より古い場合に ANDON を上げる。別スケジュールのウォッチャーから監視する | スケジュールを止めた状態で ANDON issue が開く |
| R-11 | F-08 | 宣言と実装を一致させる。連続ブロック計数と `escalate_human` を実装するか、blueprint から削除する。human gate は GitHub `environment` の必須レビューアで実装するか、削除する。autonomy tier は評価コードを持つか、削除する | blueprint の全宣言に対応する実装パスが R-08 の配線検証で解決する |
| R-12 | F-16 | registry をコードと突き合わせて棚卸しする。既に実装済みの行は closure contract に従って閉じる。以後、registry 行と負の対照テストを 1 対 1 で結び、テストが通れば行が閉じられる状態にする | `capa-andon-and-real-targeted-retest` が証拠付きで閉じるか、開いている理由が現行コードで再現できる |

### フェーズ P2 — セキュリティと運用の堅牢化（4〜8 週）

| ID | 対象 | 内容 | 完了判定 |
|---|---|---|---|
| R-13 | F-11 | リダイレクト先を再検証する `HTTPRedirectHandler` を実装し、全 `urlopen` 呼び出しを共通オープナー経由にする。許可リストの環境変数上書きを廃止し、凍結された方針入力にする | 許可外ホストへリダイレクトするテストサーバでダウンロードが拒否される |
| R-14 | F-12 | 除外エントリに `expires_at`、`owner`、`review_by` を必須化する。期限切れ除外はゲート失敗にする | 期限切れ除外を含む設定で `exit 1` |
| R-15 | F-13 | 配信停止アプリを猶予期間（例 7 日）後にブロック対象へ昇格させる | stale アプリが猶予後に `[GATE:BLOCK]` になる |
| R-16 | F-14 | `dispatch` を `needs: validate` にする。共有 PAT を `repository_dispatch` 限定の fine-grained token に置換する | validate を落とすアプリで dispatch が発火しない |
| R-17 | F-15 | lookup キャッシュに `fetched_at` と SHA-256 を付与し、読み手が鮮度上限（例 15 分）とハッシュを検証する。live verify は**読み戻し時点で再取得**する | 改竄／古いキャッシュでゲートが失敗する |
| R-18 | F-20 | `.vercelignore` を追加し `landing-automation/`、`.planning/`、`tests/` を除外する。事前に公開状況を実測する | 実測で 404 が返る |
| R-19 | F-18 | CI で extras を導入し全テストを実行する。収集エラーをジョブ失敗として扱う | 収集エラー 0、実行テスト数が 4,878 に一致 |
| R-20 | F-17, F-19 | live verify のカード判定を DOM 構造ベースにする。リプレイキャッシュを永続ストアへ移す | 隠しリンクだけの HTML が読み戻しに失敗する |

---

## 5. 完了の定義（自己申告を排した形）

本システムの `rubric-and-100-definition.md` に従い、以下を全て満たしたときにのみ
「App Factory v5 のリリース経路は健全である」と主張できる。

1. **成功が到達可能**: 正当な承認で `release_ready: True` に到達し、
   改竄された承認では到達しない（両方向の実証）。
2. **失敗が到達可能**: 意図的に壊した作業項目が、昇格に使うのと同一の
   評価経路で失敗する（負の対照）。
3. **迂回路がない**: 本番へ到達する全経路が同一の fail-closed ゲートを通る。
4. **方針入力が凍結**: 評価方針・許可リスト・閾値が能力変更と同一 PR で
   変更されない。
5. **計測が実在**: guard precision が分母付きで算出され、30 日偽陽性率が
   報告に出る。
6. **生存が可視**: ループの停止が 12 時間以内に ANDON を上げる。
7. **宣言＝実装**: blueprint の全宣言に、配線検証を通る実装が存在する。

このうち 1 と 3 が P0 の対象であり、**それ以外の作業に先行する**。

---

## 6. 証拠の再現

本書の `[BLOCKER]` 所見は次で再現できる。

```bash
python3.12 -m venv .venv && .venv/bin/pip install jsonschema pytest pyyaml
.venv/bin/python .planning/app-factory-v5-audit-20260902/verify_findings.py \
  --factory-maker /path/to/factory-maker
```

各所見は独立した関数として実装されており、期待結果と実測結果を並べて出力する。
本書の主張はこのスクリプトの出力に束縛される。散文の断定は証拠ではない。
