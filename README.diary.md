# Memos Diary Mode Fork

Personal diary fork of [usememos/memos](https://github.com/usememos/memos).
The upstream `README.md` is kept untouched to ease upstream merges; this file
describes the fork.

## Current state

- Base: Memos v0.29.1 (see `.upstream-version`)
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
- Month-level calendar filtering with `displayMonth:YYYY-MM`
- `thumbnail-backfill` / `remove-photo-tag` maintenance CLI commands

## Documents

- `docs/memos-diary-mode-design.md` — main design document
- `docs/diary-mode-operations.md` — deploy, smoke checks, backup/restore, maintenance CLI
- `docs/upstream-update-process.md` — how upstream releases are detected and merged
- `docs/decisions/` — durable design decisions
- `docs/handoffs/` — active handoffs (completed ones under `docs/handoffs/archive/`)
- `docs/improvements.md` — improvement checklist from code surveys
- `iniwa-issues.md` — remaining issues / feature ideas
- `AGENTS.md` / `CLAUDE.md` — local-only agent rules (excluded from version control)

## Development workflow

1. Codex (design side) turns a request into a handoff under `docs/handoffs/`
   with explicit goal, files, constraints, non-goals, and verification.
2. Codex delegates it with
   `claude -p --model sonnet --permission-mode auto "<handoff path + task>"`;
   Claude Code (implementation side, Sonnet 5) executes the handoff and
   reports changed files, verification results, and design questions.
3. Completed handoffs move to `docs/handoffs/archive/`.
4. Improvement candidates live in `docs/improvements.md`; feature ideas and
   open issues in `iniwa-issues.md`.

### Verification

- Frontend: `cd web && pnpm lint && pnpm test` (vitest), build with `pnpm release`
- Backend: no local Go — verified via `docker build --platform linux/arm64 -f scripts/Dockerfile .` or CI
- All work stays on the `diary-mode` branch; no automatic commits.
