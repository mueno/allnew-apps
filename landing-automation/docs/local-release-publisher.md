# Local release verification authority and operation

The repository owner authorized this non-Actions producer on 2026-09-20 for
the existing `landing-release-gate` required context. It executes the release
contract locally and labels both the status and linked evidence **LOCAL**.
It never claims to be a GitHub Actions run. Branch protection remains unchanged.
The existing authenticated repository identity supplies status/evidence-write
authority; no new credential, permission, App identity or paid service is added.

`scripts/local_release_publisher.py` runs the actual pytest suite, the canonical
`landing_sync.py --no-record`, and tracked/untracked release-artifact checks.
It additionally requires a completely clean worktree and an exact reviewed
source commit equal to PR HEAD, with current main already an ancestor. The
workflow bytes are pinned: a change requires review of the actual command
contract and the pin, never arbitrary commands supplied on the CLI. A report
or exit code supplied by a caller cannot publish success.

Child commands remove inherited Python/pytest/Git override variables, disable
third-party pytest plugin auto-loading and Git replacement objects, and use a
fresh bytecode path. Pytest must report executed passing tests; collect-only
output is rejected even if its process exits zero.

Before using the producer, independently review its exact source commit,
including failure/stale-head/dirty-worktree/rejected-command tests. The owner
explicitly authorized initial bootstrapping from that reviewed candidate;
record its full commit in `--reviewed-source-commit`. This value identifies
reviewed code, not a cryptographic claim that a human approved it. Review
evidence stays with the controlling pipeline. Future revisions require the
same review. Execute from a clean detached validation worktree of that commit.

```sh
python3 landing-automation/scripts/local_release_publisher.py \
  --repo-root /path/to/clean-validation-worktree --pr 110 \
  --reviewed-source-commit FULL_REVIEWED_PR_HEAD \
  --output-dir /path/outside/worktree/fresh-local-verification --publish
```

The producer binds head, current base, publisher source, pinned workflow,
commands, timestamps, exits and log hashes. After real successful execution it
publishes report/log bytes to a unique `local-verification/pr-*` evidence-only
orphan branch. An immutable commit URL is the status target. It reads those
remote bytes and the resulting status back. Evidence publication does not
modify PR head or main. Output must be a new directory. Failed runs cannot be
imported or resumed into success; rerun the producer after correcting the cause.
Publishing runs first register `pending`; any later failure registers `error`,
including failures while saving a successful POST receipt. A status POST is
never retried: a lost response is reconciled by matching its unique attempt URL
and payload to live status. Failed invalidation/read-back is a blocking result
requiring live reconciliation, never permission to merge on an older success.

All repository Actions workflows must remain remotely disabled, including
before evidence publication and status registration. Dynamic Dependabot and
Pages entries are not repository workflows; Pages must remain workflow-driven
with its repository producer disabled. The producer refuses incomplete inventory
or a required context pinned to another GitHub App. Do not enable Actions,
dispatch workflows, change context/App identity, relax protection or use bypass.

The status API cannot atomically compare both head and base. The producer checks
them before and after registration and invalidates success on read-back drift.
Before merging, the operator must freshly confirm the status target, head/base,
strict branch protection and disabled workflows, then use normal merge with
`--match-head-commit`. A changed head/base requires a new complete run. The
publisher never merges or deploys. Production deployment uses merged main and
the existing Vercel route, followed by canonical landing live verification and
app-specific bilingual content verification.
