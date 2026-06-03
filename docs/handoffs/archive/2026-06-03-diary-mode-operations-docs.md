# 2026-06-03 Diary Mode operations docs handoff

Read `docs/handoffs/2026-06-03-diary-mode-mvp-completion.md` before starting.

This handoff is for ClaudeCode to create operational documentation for the now-deployed Diary Mode MVP.

## Goal

Create concise operations documentation for running Diary Mode in production-like daily use.

The documentation should make manual operation repeatable without needing to reread all Phase 0-10 handoffs.

## Current Runtime

```txt
URL:       http://192.168.1.205:5231
Container: memos-diary
Image:     ghcr.io/iniwa/memos-diary-fork:latest
Data dir:  /var/opt/memos
Deploy:    Gitea -> GitHub mirror -> GitHub Actions -> GHCR -> manual Portainer redeploy
```

Portainer webhook is intentionally not used.

Current expected image optimizer env:

```txt
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_KEEP_ORIGINAL=false
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
```

Default image settings if not overridden:

```txt
MEMOS_IMAGE_PREVIEW_MAX_EDGE=2560
MEMOS_IMAGE_PREVIEW_JPEG_QUALITY=90
MEMOS_IMAGE_THUMBNAIL_MAX_EDGE=720
MEMOS_IMAGE_THUMBNAIL_JPEG_QUALITY=78
```

## Files To Inspect

Start with:

```txt
README.diary.md
docker-compose.diary.yml
.env.example
docs/handoffs/2026-06-03-diary-mode-mvp-completion.md
docs/handoffs/2026-06-03-phase10-calendar-prefill-deploy-verification.md
docs/handoffs/2026-06-03-phase9-backup-and-photo-cleanup-execute.md
docs/handoffs/2026-06-02-phase8-deployed-thumbnail-backfill-verification.md
```

Also inspect if needed:

```txt
cmd/memos/thumbnail_backfill.go
cmd/memos/remove_photo_tag.go
server/router/api/v1/image_optimizer.go
server/router/fileserver/fileserver.go
scripts/Dockerfile
.github/workflows/build-diary-image.yml
```

## Required Output

Create or update docs that cover the following.

Preferred file:

```txt
docs/diary-mode-operations.md
```

If a better existing location is found, use it and explain why.

## Required Content

### 1. System Overview

Document:

- what Diary Mode is
- how it differs from original Memos in this fork
- current deployment flow
- why redeploy is manual
- which host URL and container name are expected

### 2. Runtime Configuration

Document the expected compose/env values:

- port `5231`
- data directory / volume mapping
- GHCR image name
- image optimizer env values
- any existing `DIARY_IMAGE` variable from `.env.example`

Do not invent secrets or credentials. If a value is unknown, write that it is supplied in Portainer.

### 3. Manual Redeploy Procedure

Document the practical sequence:

1. push to Gitea
2. wait for GitHub Actions / GHCR build
3. manually redeploy in Portainer
4. confirm app opens
5. confirm logs

Include commands where useful:

```bash
docker logs --tail 80 memos-diary
```

If the docs mention `curl`, use the runtime URL:

```bash
curl -I http://192.168.1.205:5231
```

### 4. Post-Deploy Smoke Checklist

Create a short checklist that can be reused after every redeploy:

- app opens
- logs show no WARN / ERROR / panic
- timeline loads
- tag chips render
- image grid renders
- image filter works
- calendar date click opens create timestamp behavior
- no test memo remains

Keep this short and operational.

### 5. Backup And Restore Notes

Document:

- backup is required before destructive CLI execution
- known backup used for Phase 9:

```txt
/opt/memos-diary/data-backup-20260603-005631
```

- what must be restorable: SQLite DB, attachment assets, `.thumbnail_cache`
- do not run destructive commands without backup confirmation

Do not provide an untested restore command as authoritative unless you verify it from the actual deployment layout.

### 6. Maintenance Commands

Document these commands and what they do:

```bash
docker exec memos-diary memos thumbnail-backfill --data /var/opt/memos
docker exec memos-diary memos thumbnail-backfill --data /var/opt/memos --execute --limit 5
docker exec memos-diary memos thumbnail-backfill --data /var/opt/memos --execute
```

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --verbose --limit 3
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --execute --limit 5
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --execute
```

Make clear:

- `thumbnail-backfill` writes thumbnail cache only.
- `remove-photo-tag` modifies memo content and requires backup.
- dry-run is default for both commands.
- `--execute` is required for writes.

### 7. Rollback Guidance

Document the safe high-level rollback path:

- redeploy an older known-good GHCR image tag if available
- restore data from backup if a data-changing command caused bad changes
- avoid repeatedly running `--execute` if final dry-run still reports changes or failures

Keep rollback guidance conservative.

## Constraints

- Do not change application behavior.
- Do not change Docker build or GitHub Actions unless you find a documentation-blocking mismatch.
- Do not edit secrets or local Portainer-only values.
- Do not commit local screenshot artifacts or `.playwright-mcp/`.
- Prefer concise docs over a long narrative.

## Verification

Run:

```bash
git diff --stat
git diff -- docs/diary-mode-operations.md README.diary.md .env.example docker-compose.diary.yml
```

If code or config was changed unexpectedly, stop and explain why.

No app build is required for docs-only changes.

## Expected Report

Report in Japanese:

```md
## Changed Files
- ...

## Summary
- ...

## Verification
- docs-only diff checked
- build/test not run because docs-only

## Open Questions
- ...

## Notes For Codex
- operations doc path: ...
- Portainer webhook avoided: yes/no
- destructive commands documented with backup warning: yes/no
- screenshot artifacts left uncommitted: yes/no
```

