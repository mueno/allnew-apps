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
12. Compute `Health Apps` metric from `released` entries with `is_health_app=true` only.
13. Featured section is treated as `New Release`: select the latest `released` app by `release_date` (fallback to `updated_at`) and show the release date in `YYYY/MM/DD`.
14. App card tags are generated from normalized `input_methods` metadata instead of hardcoded `category_label` strings.
15. `Apps` nav button performs smooth-scroll to the apps section (`#section-camera`) instead of a no-op filter button.

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
