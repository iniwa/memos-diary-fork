# Decision 0004: Upstream 26.11.0 integration

Status: source candidate independently reviewed; production acceptance requires the remaining gates below. Checked 2026-11-05 UTC.

## Scope and authority

The owner requested the latest stable Memos in the actual diary instance, particularly pinch zoom and swipe. The owner explicitly approved official DB/API changes while preserving diary features and the current audience, with a full DB/images backup and separate restore validation before production data changes. Approval source: conversation message `Sentinel_282596ac90b88191a9cbcb739113066e`, authenticated owner thumbs-up. Reverting an accepted runtime candidate requires separate confirmation.

Target: [26.11.0](https://github.com/usememos/memos/releases/tag/26.11.0), upstream commit `b40d8a7b573774c52b022c8d6537d6baf2129dc0`. Baseline `v0.31.0`; source branch remains `diary-mode`. Original checkout and current local edits are preserved separately.

## Contract changes

The [complete schema inventory](../plans/2026-11-05-upstream-26.11.0-schema-inventory.json) lists all 237 changed migration/proto paths with exact old/new links. No fork-local migration is added, edited, or reordered. SQLite advances from 0.31.8 to 26.10.1 and adds the attachment creator index. REST/Connect namespaces and some field names change; re-login may be required. Preserve the verified PRIVATE access setting, LOCAL storage, 8192-byte content limit, and 30MiB upload limit. This deployment has no legacy secrets/config mount; RAW conversion is disabled but retained in the fork.

## Acceptance gates

Preserve tags, drafts, calendar timestamps/month boundaries, sequential uploads, grid rendering, original managed image references on task toggles, optimizer/RAW support, thumbnails, and arm64 deployment. Check source, frontend release build, relevant Go/frontend tests, required independent reviews, and actual image-viewer behavior. Windows platform failures do not count as Linux passes. The official Biome Windows binary is blocked by application control; local Biome is unverified, with no security-policy change or alternate execution.

Before production migration, create a consistent complete backup and verify a separate restoration. Test the new binary and official limit-setting process on an isolated copy without publishing it or sending notifications. Follow the existing Gitea to GitHub to GHCR deployment chain only after source review and CI checks. Pin the accepted image and verify runtime schema, audience, limits, assets, and UI after deployment.

## Recovery

Do not point the old image at the upgraded database. First try to repair the accepted candidate. If a downgrade is necessary, explain impact and alternatives and obtain owner confirmation, preserve post-upgrade writes, then restore the matching pre-upgrade DB/assets/config and image together. Never silently discard new writes or change access scope.

## Verification status

- Final frontend: 200 suites / 1667 tests passed; TypeScript and release build passed. Viewer unit coverage includes pinch midpoint/limits, pan, swipe direction/cancellation, keyboard and mobile controls.
- Go build, vet, module tidiness, and mechanical Go-fix checks passed. Linux SQLite `go test -p 1 ./...` passed in an isolated resource-capped official Go environment. Container-dependent other-driver/image tests were unavailable there and remain for normal CI. The first Linux run exposed a test-archive executable-mode loss; restoring Git metadata fixed the entrypoint test before the successful full rerun.
- A consistent full DB/assets/cache backup was hash-verified after a separate restore; the old runtime started successfully against that copy with no network or published ports.
- The new arm64 candidate migrated a separate restored live-data copy from 0.31.8 to 26.10.1. Integrity, memo content/timestamps/visibility, attachment counts, and assets remained unchanged. PRIVATE mode and anonymous memo HTTP 401 were verified.
- Official config CLI validate/apply carried forward the existing 8192-byte memo and 30MiB upload limits; release with destroy:false removed configuration ownership while retaining those values, avoiding a UI settings lock.
- Independent frontend/backend reviews found no remaining confirmed source defect after quoted/empty/image-only task corrections and restoration-gate documentation fixes.
- Local Biome remains blocked by Windows application control. No policy change or substitute execution was attempted; the ordinary existing frontend CI gate must pass before deployment.
- Actual browser/touch acceptance is not complete: Windows Computer Use stopped because the current browser URL could not be established confidently. No bypass was attempted. Actual image-build/CI/live smoke acceptance is still required. Source preparation is not deployment completion.

## Runtime path verification

The observed existing service is Compose project `iniwa-memos-diary`, service/container `memos-diary`, rather than a currently Portainer-managed container. Its source was supplied on stdin. A configuration-only preflight reproduced its existing bind mount, port, network, timezone/image options, restart policy, and memory limits without applying changes. Use that verified existing path; do not introduce new management credentials or change the separate normal Memos instance.
