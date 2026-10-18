# Published App Store recovery (2026-09-30)

## Current state

GitHub Actions must remain disabled. The public website's catalog was generated
on 2026-09-14. The current artist lookup lists 16 public apps in both JP and US.
The manually reviewed recovery updates public metadata only: it does not use ASC
submission/review versions, change IAP prices, or grant publication authority.

Reconciliation fixes in this change:
- Catalog names, descriptions, category, icon and input methods reach generated
  data instead of being overwritten by stale output.
- Static support-page titles cannot override machine-owned published names.
- JSON-LD uses the confirmed download price/currency. Missing/invalid price
  omits the offer; zero is never assumed. IAPs are separate from download price.

Curated descriptions still require human review. Store screenshots, individual
legal/support pages and the corporate site's selected-app labels are separate
content surfaces; this change does not claim to synchronize them automatically.

## One-time supervised publication (L2 proposal, not enabled)

The existing local publisher is not currently usable unchanged. Its canonical
sync requires 10 production Actions runs spanning 72 hours in the last 30 days.
A current run blocks with 8 runs / 42 hours. Its documentation also assumes a
required `landing-release-gate` context; current main protection returns no
required status checks and no branch rules. Do not fabricate success, modify
protection, or re-enable Actions to repair these mismatches.

Approval must name the exact recovery diff/base and allow a one-time supervised
release contract. That contract preserves tests, store reconciliation, parity,
clean/exact HEAD, remote main freshness, disabled Actions, and live read-back;
it explicitly uses human review instead of claiming L3 historical autonomy.
Implement/review that contract before use; it must not be an unrestricted
`--skip-governance` switch. No existing gate has been relaxed by this change.

Proposed procedure after approval:
1. Refresh main and rebase only this patch; preserve unrelated worktrees. Fetch
   public JP/US lookup immediately before candidate review. Block identity,
   catalog membership, unexpected file or changed-head drift.
2. Run `python3 -m pytest landing-automation/tests -q`, renderer validation,
   idempotency, public-app parity, price/name/version checks and diff checks.
   Record source/base SHA, exact allowed paths, input/output SHA-256, timestamps,
   test results and reviewer decision in immutable release evidence.
3. Commit only reviewed files on a branch, confirm repo Actions disabled remotely,
   push/PR and normal merge matched to the reviewed HEAD. No protection bypass.
4. Deploy merged clean main to the existing apps.allnew.work Vercel project,
   with its existing authorized credential route. No new secret is implied.
5. Read back live HTML/JSON, all 16 apps, names/versions/prices, bilingual cards
   and links. Stop on mismatch; inspect remote deployment before any retry.

## Azure follow-on (design only)

Existing read-back: Azure subscription 1 is Enabled; Container App
`hontonotoko-worker` in `rg-hontonotoko-ai`, environment `allnew-cae`, East US 2,
revision `hontonotoko-worker--0000004`, 0.5 vCPU/1Gi, min=max=1. Its existing
synthetic workloads, daily schedule, Files audit state and Managed Identity are
owned by another project. This change does not edit or deploy that worker.

First assess adding an isolated **candidate-only** command to the existing
worker. It must have its own lock, namespace, run ledger and timeout, and must
not delay its existing synthetic jobs or inherit unnecessary DB/AI rights.
If this cannot be isolated safely, propose a separate Consumption Container Apps
Job in the existing environment with a fixed reviewed image. That is a new
resource requiring cost/schedule approval. No AI inference is necessary here.

Portable execution contract for either host:
- Public Apple lookup and fixed source commit -> deterministic candidate + diff
  + evidence. No GitHub write or Vercel credential in this phase.
- Start with a reviewed 1/day limit, 5-minute timeout, one replica and no automatic
  retry after uncertain results. These are proposed bounds, not an installed job.
- Durable lease plus period/input-hash idempotency ledger prevents overlapping
  executions; parallelism=1 alone does not prevent different executions colliding.
- HTTP retries are bounded. Zero/incomplete lookup, unexpected app/ID/bundle,
  removal, asset/host changes, stale data or unapproved field/path changes stop.
- Suggested initial change cap: at most 5 apps per ordinary run, no app removal,
  no workflow/code/legal changes. The reviewed 16-app recovery is a separate
  one-time exception. Code changes always use their own reviewed release.
- Log lookup hashes, source/image SHA, semantic diff, checks and elapsed/resource
  use; errors exit nonzero. Persist failure evidence; never call stale success
  current. Store publication evidence separately from candidate checks.
- Keep L3 autonomous publication disabled until a provider-neutral governance
  implementation can verify real Azure production/read-back records, preserving
  the existing minimum-count/time-window/false-positive intent. Candidate success
  must never count as production success.
- A human-approved publication phase needs separately scoped GitHub/Vercel
  authority and exact-artifact verification. Azure Managed Identity does not
  automatically confer GitHub/Vercel rights. Any new persistent access needs approval.

The saved 9/30 MFS evidence reports $5,000 credit with expiry 2027-04-03; it does
not establish remaining balance or post-credit behavior. Current ARM subscription
read-back reports quotaId Sponsored_2016-01-01 and spendingLimit Off. No zero-cost guarantee is made. Budgets
notify but do not stop spending. Confirm actual offer, eligible subscription,
remaining credit, expiry, post-credit PAYG behavior and marginal compute/storage/
logging charges before deploying. Add code-enforced run limits plus an explicit
stop date; a budget alarm alone is insufficient.

References: https://learn.microsoft.com/en-us/azure/container-apps/jobs
and https://learn.microsoft.com/en-us/startups/benefits/azure-credits/azure-usage-and-billing

## Approved supervised recovery execution

The owner directly approved on 2026-09-30: 「サイト公開と、提示条件のAzure試行を承認」, in response to the exact site publication and bounded Azure trial proposal. The site authorization covers the eight-file recovery plus this L2 verifier and its tests. Azure authority is separate and does not grant automatic site publication.

`verify_supervised_recovery.py` is a one-time, read-only release verifier pinned to base `f1c51996028258d9d20924bb316c2e52d9101cf5`, ten explicit paths, sixteen published JP/US apps, and an expiry of 2026-10-02 UTC. It does not call or disable L3 governance, register an Actions success, merge, deploy, change protection, or add credentials. Human review is the explicit L2 authorization; the ordinary L3 pipeline remains unchanged.

It requires a clean exact reviewed commit, disabled repository Actions and workflows, unchanged live main/policy before and after, live Apple public metadata and bundle identity, renderer parity, and an executed passing test suite. Evidence records source/artifact/input/test hashes and the remote snapshot, with failure records on exceptions. Re-check head/base and disabled Actions before each authorized publication operation. The report is not a reusable automatic publication capability.

Rollback: record pre-release main and production deployment first. On material read-back failure, stop publication retries, revert only this recovery using a normal PR/merge, and redeploy clean merged main. A previous deployment may be restored for immediate recovery, followed by Git/main reconciliation. Never reset shared history or revert unrelated work.
