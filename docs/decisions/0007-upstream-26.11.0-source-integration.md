# 0007 — Upstream 26.11.0 source integration

Date: 2026-11-16
Status: Accepted for source integration by explicit owner approval in NIWA-143.

## Decision

The owner approved source integration after receiving the complete
[26.11.0 inventory](../plans/2026-11-16-upstream-26.11.0-inventory.md)
and the migration, API, authentication, configuration, limits, and export effects.
The owner's approval comment is `01a1e2bb-f386-7b89-a2cc-d9afcf3ce599`
on NIWA-143 (`01a1e29d-a16e-7568-93d0-7d3a41a0b6ac`):
“ソース統合を承認します。”

This approval covers the inventory's 137 migration paths, 100 proto paths,
and 19 generated TypeScript API binding paths for canonical upstream commit
`b40d8a7b573774c52b022c8d6537d6baf2129dc0` (tag `26.11.0`), including
the creator indexes, historical migration removal, minimum schema baseline,
old API route removal, protobuf wire changes, and matching server/client
source adaptation. It is a release-specific exception to preserving the old
API routes. Preserve Diary Mode behavior, existing local changes and upstream
provenance; do not add, edit, or reorder fork-local migrations.

## Conditions and excluded operations

- Finish preparation-tool validation, source integration, affected frontend,
  backend and arm64 verification, stable self-review and required independent
  review before claiming source readiness.
- This does not authorize commits, pushes, publication, deployment, actual
  configuration changes, or production data writes. Determine replacement
  limits, configuration and external-client effects before proposing runtime
  changes.
- Consistent database, attachment and thumbnail-cache backup, old-image
  retention and matching-data restoration remain required before any approved
  production migration. An image-only downgrade is insufficient.
- The owner asked how to prepare an authorized execution environment. This
  question does not authorize changing sandbox, PowerShell policy, runtime or
  agent configuration. Git metadata and script-execution restrictions remain
  until an authorized environment actually supplies the required access.

Decision 0006 remains limited to v0.31.0. This decision approves source work;
it neither establishes successful integration nor verifies runtime readiness.
