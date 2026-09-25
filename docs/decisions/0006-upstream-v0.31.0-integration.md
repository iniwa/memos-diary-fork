# 0006 — Upstream v0.31.0 integration

Date: 2026-09-25
Status: Accepted by explicit user approval in the integration conversation.

## Decision

Accept the upstream v0.31.0 database migrations and API changes enumerated in
[the integration inventory](../plans/2026-09-25-upstream-v0.31.0-integration.md).
After being shown the table rebuilds, storage migration, Shortcut API replacement,
backup requirement and data-restoration rollback requirement, the user directed
us to proceed. This approval covers the established commit/push, CI/image build,
consistent backup and Diary Mode Portainer deployment sequence for this release.

Keep upstream migration/proto files unchanged. This does not authorize fork-local
schema additions, reorderings, unrelated data cleanup or other service changes.
The existing diary month filter remains a local-month `created_ts` range as in
Decision 0003. Preserve tags, image grid, image optimization/RAW conversion,
sequential uploads, date prefill and deployment configuration.

## Deployment conditions

- Pass the applicable source checks and scoped review (recorded in the inventory).
- Verify the published candidate CI and arm64 image before deployment.
- Back up the database, attachments and thumbnail cache consistently before the
  new image writes production data; retain the old image reference.
- After migration, rollback requires the matching pre-upgrade data backup, not
  an image-only downgrade. Do not overwrite subsequent user data automatically.
- Verify startup, normal diary use and preservation of existing records.

The read-only preflight found no orphan reactions or nonempty/duplicate email
addresses, so those cleanup clauses currently have no matching production rows.
This is evidence from the preflight, not permission for extra cleanup operations.
