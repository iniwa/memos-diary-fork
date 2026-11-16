# 26.11.0 source acceptance

Date: 2026-11-16. NIWA-143. Leader accepted NIWA-155's source/local outcome
and NIWA-148's affected independent review. Both delegated issues are Done.
The parent is ready for owner review of source preparation; it is not a claim
that this candidate has been published or installed in the live instance.

## Accepted candidate

Working directory: `D:\Git\memos-diary-published-26.11.0`, diary-mode,
HEAD `bebaadbe1380b852126510578d264aa78d493afc`. This canonical history already
contains official upstream 26.11.0 b40d8a7. Preserve that merge history; the
next source commit would contain reconciled local improvements, not repeat
the old candidate's stale-base merge. Both older trees and the old unresolved
index remain preserved.

Reviewed manifest: 1720 entries, SHA256
`9d127b0db3d5babcd58a347f7367db7c8dc7b1afa25c1ada8d75e7eb8d5601e1`.
Reviewer verified it at start/end; Leader freshly verified every entry with
zero differences after return. The reviewed manifest is retained privately in
`.niwa143-focus-validation/reviewed-manifest.json`. Subsequent manifest refresh
changes only this acceptance record and the handoff status amendment.
Application source and release assets are unchanged after independent review.

The canonical-baseline review found one P2: an undated new memo lost its date
setting action in focus/global hosted mode. Sol corrected the header's existing
component selection and added five real editor/save-payload regressions.
The same Astra independently re-reviewed that correction and returned passed,
with no additional findings. Leader accepted that result together with the
unaffected portions of the prior canonical-baseline review; old-candidate
acceptance was not substituted for this review.

## Verification and limits

The [correction record](2026-11-16-focus-date-correction.md) retains final
red2/green5 evidence, related 84 tests, full frontend 201 files/1677 tests,
lint, release and new-assets native/arm64 embedding builds. Leader's fresh
related execution passed 47 tests. Backend focused/static checks and Pi
Linux/SQLite 48-package coverage remain applicable to the unchanged backend.
The [new-assets Pi record](2026-11-16-focus-pi-validation.md) identifies the
fresh native arm64 image, transfer hashes and successful HTTP/startup/version/
ImageMagick checks. Test containers were removed and live image/start time
remained unchanged with HTTP 200.

Actual browser/touch acceptance, CI, MySQL/Postgres service integration and
race coverage remain unverified. Source checks and source-only review are
accepted; publication/deployment readiness and actual diary operation are
separate outcomes.

## Next authorization boundary

Decision 0007 explicitly excludes commits, pushes and publication from source
integration approval. The later agent-Git permission removes the owner-only
operator division, but does not waive those individual gates. No commit, push,
PR, GHCR publication or production replacement has been performed.

The next proposed scope is to commit the accepted application/tests/documentation
delta on diary-mode and push to the canonical origin through the established
Gitea → GitHub mirror → CI/GHCR chain. A push may publish an image automatically;
approval must cover that effect. Keep AGENTS/runtime/private logs and local
generated distribution outputs out of staging according to the update process.
CI generates release assets itself. Do not recreate the obsolete merge, modify
protected schema/provenance, push directly to a different remote, or replace
the production container as part of that publication step.

Before any later production replacement: pass required CI/image checks,
retain the previous image/runtime contract, verify a fresh consistent complete
DB/assets/thumbnail backup and separate restore, preserve limits/audience,
and follow matching-data rollback rules. Observe actual UI/touch behavior and
normal diary use before declaring deployed acceptance. Existing Pi permission
does not remove these preparation conditions.

Parent status in_review means source preparation is accepted and the issue
remains open. This workspace has no automatic Done handoff; the owner must
perform final closure after accepting the intended outcome. NIWA-20 stays held.
