# Memos Diary Mode Fork

Personal diary fork of [usememos/memos](https://github.com/usememos/memos).
The upstream `README.md` is kept untouched to ease upstream merges; this file
describes the fork.

## Current state

- Base: Memos v0.30.0 (see `.upstream-version`)
- Runtime: Raspberry Pi Docker, `linux/arm64`
- Deployment: GHCR (`ghcr.io/iniwa/memos-diary-fork`) + Portainer Stack, manual redeploy
- Operation: separate Diary Mode app (MVP complete, in daily use); runtime
  details are kept in `docs/diary-mode-operations.md`

## Key additions over upstream

- Dedicated tag UI (boundary tag line parsing / serialization)
- Twitter/X-style inline image grid
- Image-post filter based on image attachments (`attachment.hasImage:true`)
- Image optimization at upload (`preview` sizing + `.thumbnail_cache` thumbnails), env-gated
- RAW image upload conversion to JPEG (ImageMagick), env-gated
- Stabilized bulk image uploads (sequential upload, local-file preview handling)
- Calendar date prefill for new memos
- Month-level calendar filtering via `displayMonth:YYYY-MM`, rebuilt for the
  v0.30.0 CEL timestamp contract while preserving local month boundaries
- `thumbnail-backfill` / `remove-photo-tag` maintenance CLI commands

## Documents

- `docs/memos-diary-mode-design.md` — original/historical design document
- `docs/diary-mode-operations.md` — deploy, smoke checks, backup/restore, maintenance CLI
- `docs/upstream-update-process.md` — how upstream releases are detected and merged
- `docs/decisions/` — durable design decisions
- `docs/plans/` — pre-implementation specifications
- `docs/handoffs/` — active handoffs (completed ones under `docs/handoffs/archive/`)
- `docs/improvements.md` — improvement checklist from code surveys
- `iniwa-issues.md` — remaining issues / feature ideas
- `AGENTS.md` — active Codex project policy
- `CLAUDE.md` — retired local compatibility stub retained for upstream-update safety

Document authority: `AGENTS.md` is current project policy; `.upstream-version`
and manifests provide machine facts; active decisions and explicit amendments
control design; this README gives current orientation; and operations/upstream
procedure documents govern their scopes. Original design, completed plans, and
archived handoffs are historical evidence, not active instructions. Explicit
superseding decisions prevail; unresolved ambiguity blocks the affected scope.

## Development workflow

For routine personal use, make the smallest change, try the normal path on the
existing Diary Mode instance through the established deployment flow, and fix
observed errors. Working normal use is enough; speculative edge-case matrices
and hardening are not a prerequisite. `AGENTS.md` defines the bounded routine
deployment/restart allowance and the schema, data, publication, and other gates
that remain protected.

1. The primary Codex session owns requirements, material design, approval
   boundaries, integration, and the final report. The runtime-selected primary
   model is not overridden by project documentation.
2. Small or conversation-dependent work stays in the primary session. For a
   settled cohesive change with enough implementation work to justify transfer,
   Codex delegates to one native `bounded_implementer`; other native roles are
   used only when their distinct read-only, adaptive, or review purpose is
   warranted.
3. Ordinary delegation uses a compact inline task. A persisted handoff under
   `docs/handoffs/` is reserved for cross-session, interruption-sensitive,
   operationally risky, separately executed, or resume-dependent work.
4. The writer self-reviews a stable diff and runs the relevant required checks
   before any independent acceptance review. If that review must precede
   deployment, runtime application and smoke remain unrun until it clears.
   Review is added only for a concrete material risk; if implementation changes
   after review begins, its
   evidence is invalid and a fresh stable snapshot is required. The final
   report records every acceptance criterion as `passed`, `blocked`, or `unmet`
   (see `AGENTS.md`).
5. Completed persisted handoffs move to `docs/handoffs/archive/`. Improvement
   candidates live in `docs/improvements.md`; feature ideas and open issues in
   `iniwa-issues.md`.

### Verification

Select the smallest useful normal-path check from the available commands below.
Full suites are not mandatory for every routine edit; explicit acceptance,
affected data/security risks, and the upstream/CI/image workflow keep their
required checks. Documentation-only edits need no runtime exercise. Do not
report readiness or an unavailable smoke check as verified live operation.

- Frontend: `cd web && pnpm lint && pnpm test` (vitest), build with `pnpm release`
- Backend: Go toolchain available locally — `go build ./...`, `go vet ./...`,
  `go test ./...`, and `golangci-lint run` (CI pins v2.11.3). Note that on
  Windows some tests fail only in `t.TempDir()` cleanup because SQLite keeps the
  file open; Linux CI is the authority. Image verification still needs
  `docker build --platform linux/arm64 -f scripts/Dockerfile .` or CI.
- All work stays on the `diary-mode` branch; no automatic commits.
