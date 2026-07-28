# Memos Diary Mode Fork

Personal diary fork of [usememos/memos](https://github.com/usememos/memos).
The upstream `README.md` is kept untouched to ease upstream merges; this file
describes the fork.

## Current state

- Base: Memos v0.30.0 (see `.upstream-version`)
- Runtime: Raspberry Pi Docker, `linux/arm64`
- Deployment: GHCR (`ghcr.io/iniwa/memos-diary-fork`) + Portainer Stack, manual redeploy
- Operation: separate Diary Mode app at `http://192.168.1.205:5231` (MVP complete, in daily use)

## Key additions over upstream

- Dedicated tag UI (boundary tag line parsing / serialization)
- Twitter/X-style inline image grid
- Image-post filter based on image attachments (`attachment.hasImage:true`)
- Image optimization at upload (`preview` sizing + `.thumbnail_cache` thumbnails), env-gated
- RAW image upload conversion to JPEG (ImageMagick), env-gated
- Stabilized bulk image uploads (sequential upload, local-file preview handling)
- Calendar date prefill for new memos
- (Temporarily removed) Month-level calendar filtering — dropped in the v0.30.0
  merge because upstream changed `created_ts` to a CEL timestamp. Being rebuilt
  on the new time accessors; see `docs/decisions/0003-upstream-v0.30.0-integration.md`.
- `thumbnail-backfill` / `remove-photo-tag` maintenance CLI commands

## Documents

- `docs/memos-diary-mode-design.md` — main design document
- `docs/diary-mode-operations.md` — deploy, smoke checks, backup/restore, maintenance CLI
- `docs/upstream-update-process.md` — how upstream releases are detected and merged
- `docs/decisions/` — durable design decisions
- `docs/plans/` — pre-implementation specifications
- `docs/handoffs/` — active handoffs (completed ones under `docs/handoffs/archive/`)
- `docs/improvements.md` — improvement checklist from code surveys
- `iniwa-issues.md` — remaining issues / feature ideas
- `AGENTS.md` / `CLAUDE.md` — local-only agent rules (excluded from version control)

## Development workflow

1. Codex (design side) turns a request into a handoff under `docs/handoffs/`
   with explicit goal, files, constraints, non-goals, and verification.
2. Codex delegates it with
   `claude -p --model sonnet --effort medium --permission-mode auto "<handoff/task prompt>"`;
   Claude Code (implementation side, Sonnet) executes the handoff and
   reports changed files, verification results, and design questions.
3. Completed handoffs move to `docs/handoffs/archive/`.
4. Improvement candidates live in `docs/improvements.md`; feature ideas and
   open issues in `iniwa-issues.md`.

### Verification

- Frontend: `cd web && pnpm lint && pnpm test` (vitest), build with `pnpm release`
- Backend: Go toolchain available locally — `go build ./...`, `go vet ./...`,
  `go test ./...`, and `golangci-lint run` (CI pins v2.11.3). Note that on
  Windows some tests fail only in `t.TempDir()` cleanup because SQLite keeps the
  file open; Linux CI is the authority. Image verification still needs
  `docker build --platform linux/arm64 -f scripts/Dockerfile .` or CI.
- All work stays on the `diary-mode` branch; no automatic commits.
