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

## Files

- `landing-automation/config/app_catalog.json`: base metadata and fallbacks
- `landing-automation/scripts/update_landing_data.py`: merge/bootstrap/event processing
- `landing-automation/runtime/landing-runtime.js`: front-end binding layer
- `data/landing-apps.generated.json`: publish source for LP cards
- `.github/workflows/landing-auto-update.yml`: automation workflow
