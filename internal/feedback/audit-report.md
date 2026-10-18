# Feedback Portal Audit Report

Date: 2026-05-19  
Actor: CODEX  
Scope: `docs/feedback-portal/`, `tests/test_feedback_portal_static.py`, `tests/test_feedback_portal_audit_guardrails.py`

## Standards Used

- Apple App Store Review Guidelines: UGC moderation, privacy, login services, legal compliance
- Sign in with Apple usage guidelines for websites and other platforms
- Apple account deletion support guidance
- Consumer Contract Act risk around total liability exclusions
- Copyright / idea handling guidance
- APPI privacy principles: purpose specification, retention, disclosure/deletion request path
- OWASP-style client-side XSS and secure rendering checks
- WCAG-oriented keyboard/label/visible-state smoke checks for the static MVP

## Audit Loop 1

### Findings

| ID | Severity | Finding | Remediation |
|---|---|---|---|
| A1-01 | HIGH | User-controlled request fields were rendered through `innerHTML`, creating avoidable DOM XSS risk. | Externalized JavaScript and later replaced dynamic rendering with DOM APIs and `textContent`. |
| A1-02 | HIGH | Public naming used `Apple Factory Feedback`, which could imply Apple affiliation. | Renamed public UI to `AllNew App Factory Feedback`; kept Apple references only for Apple ID / App Store / guideline context. |
| A1-03 | HIGH | Privacy policy, account deletion, consent withdrawal, and Apple token revocation were not documented. | Added `privacy-policy-draft.md`; added account deletion and token revocation requirements to spec, legal draft, UI, and tests. |
| A1-04 | HIGH | UGC moderation controls were incomplete for Apple Guideline 1.2-style expectations. | Added moderation requirements: filtering, reporting, blocking, account suspension, contact path, and review queue. |
| A1-05 | MEDIUM | Prohibited categories did not cover the full Sign in with Apple prohibited-use surface. | Added tobacco, weapons/ammunition, illegal drugs, counterfeit/stolen goods, consumer safety risk, fraud, hate/intolerance, and false Apple/third-party affiliation. |
| A1-06 | MEDIUM | CSP/security-header requirements were not specified. | Added CSP meta for static MVP and `deployment-security.md` with production headers and verification checklist. |
| A1-07 | MEDIUM | Legal draft lacked representations/warranties and severability language. | Added submitter representations, moderation clause, account deletion/consent withdrawal clause, and consumer-law-aware severability clause. |

### Result

All A1 findings remediated.

## Audit Loop 2

### Findings

| ID | Severity | Finding | Remediation |
|---|---|---|---|
| A2-01 | LOW | UGC report-button guardrail test did not include the JavaScript source where the button was generated. | Updated test source coverage to include `app.js`. |
| A2-02 | LOW | Legal draft title still used the old public-facing Apple-branded name. | Renamed title to `Legal Draft for AllNew App Factory Feedback`. |
| A2-03 | LOW | The unsafe interpolation test pattern did not match raw template interpolation correctly. | Corrected the test, then replaced dynamic HTML generation with DOM APIs. |

### Result

All A2 findings remediated. Static tests passed.

## Audit Loop 3

### Findings

| ID | Severity | Finding | Remediation |
|---|---|---|---|
| A3-01 | LOW | `frame-ancestors` in meta CSP is ignored by browsers and produced a console warning. | Removed `frame-ancestors` from meta CSP; retained it in production HTTP header requirements. |
| A3-02 | LOW | `localStorage` demo auth and remaining `innerHTML` usage created avoidable audit noise. | Removed localStorage persistence and replaced all dynamic rendering with `replaceChildren`, DOM nodes, and `textContent`. |

### Result

All A3 findings remediated. Browser console is clean on desktop and mobile smoke checks.

## Audit Loop 4: Claude Feedback Follow-Up

### Findings

| ID | Severity | Finding | Remediation |
|---|---|---|---|
| C4-01 | HIGH | Public review queue exposed internal moderation details and could identify or stigmatize submitters. | Replaced public queue with aggregated public review policy; removed sample `AF-Q` rows and sensitive public sample items. |
| C4-02 | HIGH | Rights assignment covered copyright but did not expressly cover patent, utility model, and design filing rights. | Added assignment of `特許を受ける権利`, `実用新案登録を受ける権利`, `意匠登録を受ける権利`, and filing cooperation language. |
| C4-03 | HIGH | APPI and Apple account-deletion paths were too implicit for production launch. | Added visible privacy, disclosure/deletion, account deletion, Apple token revocation, and `server_to_server_notification` requirements. |
| C4-04 | MEDIUM | Trade secret, unpublished invention, health-data, and provider-law moderation operations needed clearer internal treatment. | Added internal-only moderation policy, health-data boundary, deletion/reporting flow, audit-log design, and business-operator display requirements. |

### Result

All C4 findings remediated in UI, legal draft, privacy draft, product spec, deployment requirements, README, and regression tests.

## Audit Loop 5: Static Guardrail Re-Audit

### Checks

| Check | Result |
|---|---|
| Rights/no-compensation/static status tests | PASS |
| Legal/security/privacy/Apple guardrail tests | PASS |
| Public-file scan for `AF-Q`, sensitive internal reasons, old risky sample title | PASS: no matches in public deliverables |
| Public HTML/JS scan for `innerHTML`, `localStorage`, `document.write`, `eval`, inline event handlers | PASS: no matches |
| Positive coverage scan for industrial property rights, Apple notifications, HSTS, SameSite, operator display, health-data boundary | PASS |

### Result

No new findings.

## Audit Loop 6: Runtime Render and Local HTTP Re-Audit

### Checks

| Check | Result |
|---|---|
| Chrome headless desktop render | PASS: `/private/tmp/allnew-feedback-claude-remediation-desktop.png` generated, 1440 x 1200 |
| Chrome headless mobile render | PASS: `/private/tmp/allnew-feedback-claude-remediation-mobile.png` generated, 390 x 1200 |
| Local HTTP fetch for public HTML | PASS: review policy, privacy, disclosure/deletion, account deletion, operator info, industrial property assignment are present |
| Local HTTP fetch for public JS | PASS: public samples no longer include sensitive internal review reasons |
| Test processes cleanup | PASS: local server and headless Chrome processes stopped |

### Note

Playwright was not installed in this workspace, so the final runtime pass used Chrome headless screenshots plus HTTP content checks instead of Playwright automation.

### Result

No new findings.

## Audit Loop 7: Follow-Up Regression Remediation

### Findings

| ID | Severity | Finding | Remediation |
|---|---|---|
| F7-01 | CRITICAL | Public UI card did not explicitly preserve the Copyright Act Article 27 and 28 special mention, even though the legal draft still contained it. | Restored explicit public wording: `著作権（著作権法第27条および第28条に規定する権利を含む）`; added regression tests against the public UI. |
| F7-02 | MEDIUM | Launch-blocking production requirements were described as future work but not collected into a hard launch gate. | Added a launch gate requiring privacy policy, disclosure/deletion requests, account deletion, operator display, Apple notifications, retention policy, report/deletion forms, and security controls before release. |
| F7-03 | MEDIUM | Audit-log retention periods were not specific enough for IP address and User-Agent. | Added retention policy: consent/right-transfer evidence up to 10 years; raw IP address and User-Agent generally 6 months, then deletion, anonymization, or irreversible hashing. |
| F7-04 | MEDIUM | Health-related feedback boundary needed examples users can understand. | Added accepted and rejected examples for health-app feedback versus diagnosis, treatment, dosing, and medical-advice requests. |
| F7-05 | LOW | Public-summary responsibility and AI/manual boundary were not explicit. | Added human operator confirmation as the final decision point; AI may only assist. |
| F7-06 | LOW | WaistVox was listed in the form but the top app strip labeled the tile as New App Ideas. | Relabeled the app tile to WaistVox and added regression coverage. |
| F7-07 | LOW | Users were not clearly warned not to submit ideas they plan to patent. | Added form placeholder, required checkbox, legal representation, and prohibited-category coverage for patent-filing planned ideas. |

### Result

All F7 findings remediated in UI, legal draft, privacy draft, product spec, deployment requirements, README, and regression tests.

## Audit Loop 8: Privacy Policy Follow-Up Remediation

### Findings

| ID | Severity | Finding | Remediation |
|---|---|---|---|
| P8-01 | HIGH | Privacy policy did not explicitly address APPI Article 28 foreign third-party transfer for Sign in with Apple data flows to Apple Inc. in the United States. | Added foreign-transfer consent requirements, country/provider disclosure, foreign privacy-system information, protection-measure disclosure, and production vendor/country publication requirements. |
| P8-02 | MEDIUM | Multi-jurisdiction stance was not fixed, leaving GDPR/CCPA/PIPL applicability ambiguous. | Set the current service scope to Japan-resident users only and made GDPR/UK GDPR, CCPA/CPRA, PIPL, and other overseas-law readiness a launch gate before overseas offering. |
| P8-03 | MEDIUM | Cookie and external-transmission disclosures were not detailed enough for required/session cookies and Telecommunications Business Act external-transmission notices. | Added required/session cookie policy, no advertising/behavioral tracking default, and disclosure requirements for destination, transmitted items, purpose, recipient purpose, opt-out availability, retention, and SameSite/Secure/HttpOnly attributes. |
| P8-04 | MEDIUM | Retention language treated anonymization and irreversible hashing too similarly. | Distinguished anonymization meeting anonymized-information creation standards from irreversible hashing treated as pseudonymization-equivalent handling. |
| P8-05 | MEDIUM | Apple ID alone was treated too implicitly as an age signal even though child Apple Accounts can exist. | Added 18+ and Japan-resident representations at registration/posting; clarified Apple ID is not age proof and `realUserStatus` is only an abuse-risk signal. |
| P8-06 | LOW | Privacy policy and legal drafts lacked explicit mandatory-law override, governing law, and jurisdiction alignment. | Added mandatory-law priority language, Japanese governing law, and Tokyo District/Summary Court first-instance exclusive jurisdiction where legally permitted. |
| P8-07 | LOW | Security-control wording had duplicate items and draft metadata/change-notice language was incomplete. | Consolidated duplicate Section 7 security controls, added `最終更新日: 2026-05-19`, and added important-change notification policy. |

### Result

All P8 findings remediated in UI, legal draft, privacy draft, product spec, deployment requirements, README, handoff notes, and regression tests.

## Audit Loop 9: Adoption Benefit Follow-Up Remediation

### Findings

| ID | Severity | Finding | Remediation |
|---|---|---|---|
| B9-01 | MEDIUM | New-app idea adoption benefits could be misunderstood as consideration for the submitted idea or rights assignment. | Added an optional, non-compensatory adoption-benefit clause stating that App Store Connect-issued official promo codes, offer codes, or other Apple-approved official codes are discretionary and not consideration, compensation, royalties, success fees, damages, or revenue sharing. |
| B9-02 | MEDIUM | New-app ideas create a higher risk that submitters later claim co-developer, author, inventor, rightsholder, reseller, or revenue-share status. | Added express no-status language denying co-developer, author, inventor, rightsholder, reseller, revenue-share, or similar positions. |
| B9-03 | MEDIUM | Benefit scope needed to avoid implying custom credits, cost reimbursement, cash value, transferability, refundability, or guaranteed substitute benefits. | Limited benefits to App Store Connect/App Store redemption scope, removed custom usage-credit and ledger concepts, and kept no cash exchange, refund, transfer, conversion, difference claim, or substitute-benefit claim. |
| B9-04 | LOW | Public and operational documents still implied proprietary benefit issuance, cancellation, expiry, or credit management. | Replaced proprietary controls with an App Store Connect-only rule: no custom usage credits, custom codes, balance management, point ledgers, or proprietary expiry management. |

### Result

All B9 findings remediated in UI, legal draft, privacy draft, product spec, deployment requirements, README, handoff notes, activity log, and regression tests. User-facing documents intentionally avoid cost-structure wording and limit benefits to App Store Connect-managed official codes.

## Final Verification

| Check | Result |
|---|---|
| `uv run pytest tests/test_feedback_portal_static.py tests/test_feedback_portal_audit_guardrails.py -q` | PASS: 23 passed |
| `uv run ruff check tests/test_feedback_portal_static.py tests/test_feedback_portal_audit_guardrails.py` | PASS |
| Static secret/dangerous-pattern scan | PASS: no actionable findings; only test assertions and documented XSS test string remain |
| Earlier Playwright smoke before Claude follow-up | PASS: title, status board, Sign in with Apple consent flow, XSS-string rendering, prohibited-category rejection, console clean |
| Claude feedback public-surface scan | PASS: no public exposure of internal review queue details or sensitive sample reasons |
| Follow-up regression scan | PASS: Article 27/28 public UI wording, retention periods, launch gate, health FAQ examples, human-summary review, patent-warning, WaistVox consistency all present |
| Privacy follow-up scan | PASS: APPI Article 28 foreign transfer, domestic-only scope, Cookie/external-transmission notice, anonymization/pseudonymized-hash distinction, 18+ confirmation, mandatory-law override, jurisdiction, last-updated/change notice all present |
| Adoption-benefit scan | PASS: optional/non-consideration benefit wording, App Store Connect official-code-only scope, no custom usage credits, no custom code ledger, no co-developer/rightsholder/revenue-share status, no cash/refund/transfer/difference claims, and no cost-structure wording in public docs |
| Chrome headless desktop/mobile render | PASS: screenshots generated |
| Local HTTP content fetch | PASS: required legal/privacy/operator/Apple clauses visible |

## Remaining Non-Code Preconditions

These are not unresolved findings in the static MVP, but they are mandatory before production release:

- Lawyer review for final public terms and privacy policy.
- Real Sign in with Apple JS integration and server-side token validation.
- Server-side consent logs, account deletion, Apple token revocation, and data deletion workflow.
- Apple server-to-server notification endpoint with verification, replay protection, idempotency, and audit logging.
- Final provider/country list and user-facing disclosure for foreign third-party transfers, including Apple Inc. in the United States and any hosting, mail, database, logging, or support vendors.
- Counsel approval of APPI Article 28 handling, Cookie/external-transmission notices, anonymization versus pseudonymized-hash handling, and overseas-law scope before any non-Japan offering.
- Counsel approval of adoption-benefit wording, including non-consideration treatment, no revenue-share status, no cash/refund/transfer claims, and App Store Connect official-code-only handling before any benefit is offered.
- Production HTTP security headers and backend controls from `deployment-security.md`.
- Operational staffing for moderation, legal requests, and abuse reports.
- Final business-operator information, contact address, privacy request flow, health-data separation policy for each production app, and counsel approval of retention periods.

## Audit Verdict

For the scoped static MVP and related legal/security documents, audit findings are 0 after nine audit/remediation loops, including the Claude feedback follow-up, follow-up regression remediation, privacy policy follow-up remediation, and adoption benefit follow-up remediation. This is not a legal opinion and does not replace final review by qualified counsel before production launch.
