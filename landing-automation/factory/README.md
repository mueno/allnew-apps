# Landing Sync Factory (factory-maker design)

`blueprint.json` is the factory-maker blueprint for the landing-page
auto-sync pipeline. It passed the factory-maker assurance gate
(`factory_maker.py validate` → `PASS — 0 blocker(s), 0 warning(s)`), which
enforces the v5-audit invariants:

| Pillar | How this pipeline satisfies it |
|---|---|
| C 外部接地 | Ground truth = public iTunes Lookup artist listing (`id=1875164184`), never internal state / self-reported events. All gates have `self_report_allowed=false`. |
| A 精度計測 | `state/parity_report.json` records verdicts; confirmed false blocks are logged as `false_positive: true` exclusions in `config/parity_exclusions.json`. |
| B リスク階層化 | Every gate remains fail-closed. The first consecutive block reaches the declared threshold and must emit a human-visible ANDON escalation; no escape valve authorizes forward progress. |
| D HITL→HOTL | The loop may publish autonomously only after the machine-evaluated L3 criteria pass. There is no mid-run human approval gate; humans are pulled in by an ANDON issue or the enrichment backlog. |
| TPS 後半 | The 2026-07 miss class (catalog-gated discovery skipped basalsnap/meishibridge silently) became structural guards: artist-lookup discovery + fail-closed parity gate + pytest regression coverage. |
| SSOT / DRY | `blueprint.json` is the design SSOT; runtime code reuses `update_landing_data.py` helpers instead of copying them. |

## Runtime mapping

The blueprint's phases run as one choke point, `scripts/landing_sync.py`,
invoked by `.github/workflows/landing-auto-update.yml` on every trigger
(webhook `repository_dispatch`, 6-hourly schedule, manual dispatch):

| Phase | Implementation | Gate |
|---|---|---|
| observe | `scripts/store_discovery.py` | zero-result lookup aborts (exit ≠ 0) |
| reconcile | `scripts/update_landing_data.py --reconcile-app-store` | empty lookup raises |
| render | `scripts/render_landing_page.py` | JSON-LD / card-count self-validation |
| verify | `scripts/landing_parity_gate.py` | public apps ⊆ landing page, exit 1 on gap → governance report → ANDON issue |
| govern | `scripts/landing_governance_gate.py` | live workflow history, catalog lineage, precision ledger, route wiring, and first-block escalation |

## Operating a blocked gate

- Intentional delisting / B2B-only app: add an owned, expiring exclusion to
  `config/parity_exclusions.json` (a confirmed gate false positive also gets
  `"false_positive": true` for the precision ledger).
- Confirmed false positive under repair: create
  `state/parity_circuit_breaker.json` with the required owner, ANDON issue,
  reason, and an expiry of no more than 72 hours. The parity gate may use this
  bounded repair bridge; production live-readback failure is never downgraded.
