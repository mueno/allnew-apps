# Landing Automation Design Notes

## Scope

- Auto-update only the landing app data.
- Keep existing LP visual design unchanged.
- Do not edit per-app support/legal pages.

## Key Decisions

1. Event-driven update (ASC status transitions) instead of full rebuild on every deploy.
2. Runtime rendering on LP from `data/landing-apps.generated.json` while preserving existing CSS/layout.
3. First promotional screenshot must come from ASC event payload (`first_screenshot_url`).
4. Fallback to existing local promo image only when ASC screenshot is not yet available.
5. Keep mutable state in `landing-automation/state/landing_state.json` for idempotency and duplicate event handling.
6. Add external webhook relay (`webhook-relay/asc_webhook_relay.py`) to convert ASC payloads into GitHub `repository_dispatch`.
7. `submitted` apps stay visible with `審査中` tag; App Store CTA is hidden until `released`.
8. Adopt Cloudflare Worker as the production relay target and keep Python relay as local fallback.
9. Adopt docs-first operations via dedicated skills for GitHub and Cloudflare before changing CI/CD or webhook infrastructure settings.
10. Serialize `landing-auto-update` workflow runs and add push retry-with-rebase logic to absorb bursty `repository_dispatch` events and reduce transient push failures.
11. Use `card_image_path` (onboarding first image) for app cards, while keeping ASC screenshot in `promo_image_path` for Featured.
12. Use a daily App Store Lookup reconcile to correct public release metadata when webhook events are missing or incomplete.
12. Compute `Health Apps` metric from `released` entries with `is_health_app=true` only.
13. Featured section is treated as `New Release`: select the latest `released` app by `release_date` (fallback to `updated_at`) and show the release date in `YYYY.MM.DD`.
14. App card tags are generated from normalized `input_methods` metadata instead of hardcoded `category_label` strings.
15. `Apps` nav button performs smooth-scroll to the apps section (`#section-camera`) instead of a no-op filter button.
16. Landing page language is controlled by `?lang=ja|en`; static copy and legal links switch in-page, and dynamic app cards re-render via `landing:langchange`.
17. Webhook relays require a configured HMAC secret; unsigned payload bypass is disabled.
18. Relays enforce request body size limits, `event_id` requirement, `event_date` freshness checks, and duplicate-event suppression.
19. Screenshot fetching is restricted to HTTPS + allowlisted domains with MIME/size checks to reduce SSRF and oversized payload risk.
20. GitHub Actions workflow actions are pinned to commit SHA for supply-chain hardening.

## Files

- `landing-automation/config/app_catalog.json`: base metadata and fallbacks
- `landing-automation/scripts/update_landing_data.py`: merge/bootstrap/event processing
- `landing-automation/runtime/landing-runtime.js`: front-end binding layer
- `data/landing-apps.generated.json`: publish source for LP cards
- `.github/workflows/landing-auto-update.yml`: automation workflow

## Changelog

- 2026-02-15: Added `New Release` featured logic (`release_date`) and input-method-driven tag rendering (`input_methods`).
- 2026-02-15: Added onboarding-first card image policy (`card_image_path`) and released-only health app count logic (`is_health_app`).
- 2026-02-15: Added docs-first operations decision and introduced skill-based runbooks (`github-ops-docs`, `cloudflare-workers-ops-docs`).
- 2026-02-15: Hardened workflow reliability with `concurrency` control and `git push` retry/rebase in `.github/workflows/landing-auto-update.yml`.
- 2026-02-15: Switched featured date display to `YYYY.MM.DD` and added landing-level JA/EN switching with `?lang=`.
- 2026-02-15: Hardened webhook and ingestion security (secret-required signature verification, payload limits, replay protection, screenshot URL allowlist, SHA-pinned GitHub Actions).
- 2026-05-06: Added scheduled App Store Lookup reconcile for public metadata drift (URL, bundle id, version, current-version release date).
- 2026-07-02: Factory-maker hardening after the basalsnap/meishibridge miss. Root cause: discovery was gated on the manually-maintained `app_catalog.json`, so unknown released apps were silently skipped by both webhook slug resolution and the reconcile. New design (see `landing-automation/factory/blueprint.json`, validated by the factory-maker assurance gate):
  - Ground truth is the public iTunes Lookup **artist listing** (`id=1875164184`); `scripts/store_discovery.py` auto-onboards unknown released apps into the catalog (adds only, never mutates existing entries; multi-signal slug resolution with provenance).
  - `scripts/landing_sync.py` is the single choke point (discovery → reconcile → render → parity gate) used by every workflow trigger.
  - `scripts/landing_parity_gate.py` fails closed when any non-excluded public app is missing from the landing data; CI turns red and an ANDON GitHub issue (`landing-parity-andon`) opens. Escape valves: reasoned exclusions (`config/parity_exclusions.json`) and a time-boxed circuit breaker (`state/parity_circuit_breaker.json`).
  - Schedule tightened from daily to every 6 hours; webhooks remain the fast path, the reconcile loop guarantees convergence.
  - `landing-automation/tests/` (pytest) covers slug resolution, onboarding and gate verdicts; runs in CI via `.github/workflows/landing-tests.yml`.
- 2026-07-02 (2): Content parity + production readback ("安全に、でも確実に").
  - Ownership model: `auto_onboarded` entries are machine-owned — store-derived fields (names, descriptions, category, store URL, icon artwork) converge with the published listing on every run via `scripts/store_content_sync.py`; human-enriched fields (input_methods, sort_order, card images) survive. Removing the flag hands the entry to humans and automation stops editing it. Curated entries are NEVER auto-edited; store renames / icon changes are surfaced as warnings in `state/content_observations.json`.
  - `scripts/landing_live_verify.py` grounds the pipeline in production: after deploy it fetches the LIVE apps.allnew.work JSON + HTML and fails closed unless (repo == live) ∧ (public apps ⊆ live data) ∧ (a card per released app + matching JSON-LD count). One audited self-heal redeploy from committed main runs before blocking; stale deployments are caught even on `changed=false` scheduled runs.
  - Blueprint gained the `verify_production` phase / `live_readback` gate (factory-maker assurance gate PASS).
