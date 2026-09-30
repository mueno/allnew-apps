# Candidate rendering and intake contract (local preparation; not deployment approval)

The single complete renderer is `render_landing_page.render_page(template, apps,
runtime=None)`. It selects released unique listings, updates JSON-LD, all grids,
footer lists, total/category statistics and the runtime content-hash URL, then
validates the output. Partial grid-only rendering is not a publishable artifact.

Intake is read-only and must use a reviewed site checkout, with the expected full
site source SHA supplied independently of the candidate:

```
python3 landing-automation/scripts/render_landing_page.py \
  --verify-candidate /path/to/candidate \
  --expected-source APPROVED_FULL_SITE_COMMIT_SHA
```

It checks `source`, status/candidate-only flag, exact `render_contract` version
`allnew.landing-render.v2`, SHA256 of the reviewed renderer/runtime and all three
artifacts, then independently renders from the trusted checkout's HTML template.
The candidate HTML must match those bytes. Old reports with no render contract,
stale hashes, a statistic of 13, or alterations outside generated sections fail.
A successful check explicitly returns `publication_authorized: false`: public
Store parity, change review, exact-head checks and human publish approval remain
required. It never executes candidate Python/JS, fetches a URL or publishes.

Existing release paths also converge on the same renderer: `landing_sync.py`
invokes renderer main, and `verify_supervised_recovery.verify_public` compares the
complete rendered page. The old one-time L2 authority/base/allowlist/expiry is NOT
renewed by this change. A newly approved scope must be reviewed before publishing.

## Existing Azure trial

Do not deploy these local preparations yet. The running image uses old pinned
assets; its grid-only output and report without `render_contract` will be rejected
as-is. This is intentional, and must not be worked around by editing its receipt.
The raw Apple lookup/data remains review input. A reviewed site checkout may make
a separate, locally regenerated artifact with new evidence, preserving the old
candidate/receipt for provenance. Re-run Store parity and obtain publish approval;
never copy the old HTML straight into production or claim old evidence is v2.
This option has no Azure changes or incremental cloud bill.

To make Azure emit v2 candidates later (separate approval):

1. After the site fix is reviewed/merged, export `index.html`, the complete renderer
   and `landing-runtime.js` from that exact commit into the pinned asset bundle.
   Record the actual source SHA and all asset hashes; do not label uncommitted files
   as that commit. Add a required v2 manifest contract, failing before public GETs
   when required assets/version/hashes are absent or stale.
2. Replace the worker's partial render sequence with
   `render.render_page(template, data['apps'], runtime=runtime_bytes)`.
   Include `render_contract: render.render_contract(runtime_bytes)` in candidate.json.
3. Extend worker tests for an old manifest, old renderer/runtime hashes, a legacy13
   template repaired by the new renderer, and expired/duplicate/timeout behavior.
   Export only reviewed blobs, run full local CI, then one bounded ACR build and an
   image-only update to the existing worker; read back fingerprints and limits.

Expected Azure repo paths: `services/azure-worker/worker/landing_trial.py`,
`worker/landing_assets/{index.html,render_landing_page.py,landing-runtime.js,manifest.json}`,
`tests/test_landing_trial.py`, and `LANDING-TRIAL.md` (7 files including new runtime).
No new resource, role, secret, SKU or schedule is needed. The existing 30-day dates,
300-second timeout, retry0, candidate-only policy and Files namespace remain.
One additional 2-vCPU/300s build is estimated <=US$0.06 plus small revision/transfer
usage; it is not free and is not authorized by this local-preparation request.
Reconfirm aggregate spend remains inside the original US$3 condition before any
future deployment. No zero-cost or credit-balance guarantee is made.
