# 2026-06-03 Diary Mode MVP completion summary

This document summarizes the current Diary Mode state after Phase 10 runtime verification.

Use it as the starting point before creating the next ClaudeCode handoff.

## Current Status

Diary Mode MVP is complete enough for continued daily use on the forked instance.

Runtime:

```txt
URL:       http://192.168.1.205:5231
Container: memos-diary
Image:     ghcr.io/iniwa/memos-diary-fork:latest
Deploy:    Gitea -> GitHub mirror -> GitHub Actions -> GHCR -> manual Portainer redeploy
```

Portainer webhook is not used because it is a paid feature. Manual redeploy is acceptable for this project.

## Completed Work

### Foundation

- Repository branch and deployment docs were set up for `diary-mode`.
- Gitea is the push target.
- GitHub mirror and GitHub Actions build the GHCR image.
- Docker runtime uses a separate Diary Mode port and data directory.

### Tag UI

- Memo editor has a dedicated tag section.
- Tag-only boundary lines are parsed into the tag UI.
- New saves serialize tags to the memo content boundary format.
- Leading legacy tag lines and trailing modern tag lines are both supported.
- Inline prose tags remain in the body.
- Markdown headings are not treated as tag lines.
- Boundary `#photo` is hidden from the UI and prevented from being re-added.
- `remove-photo-tag` safely removed stored boundary `#photo` from production data.

### Image Grid

- Image attachments render inline in memo cards.
- Non-image attachments remain in the existing attachment UI.
- Layouts are implemented for 1, 2, 3, 4, and 5+ images.
- Multi-image grids stretch to card width.
- 5+ image grids show `+N`; clicking it expands inline instead of opening the lightbox.
- Expanded grids can be collapsed.
- Normal image clicks still open the existing preview dialog.

### Image Filter

- `attachment.hasImage:true` is available in the frontend filter model.
- The backend filter uses an attachment-table `EXISTS` predicate, not memo JSON payload.
- Image filtering composes with tag filtering.

### Image Optimization

- New JPEG / JPG / PNG / WebP uploads can be optimized when runtime env enables the optimizer.
- Current production runtime uses:

```txt
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_KEEP_ORIGINAL=false
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
```

- Default preview settings are `2560` max edge and JPEG quality `90`.
- Default thumbnail settings are `720` max edge and JPEG quality `78`.
- Upload-time `.thumbnail_cache/{uid}.v2.jpeg` generation is verified.
- Existing images were backfilled with `.v2.jpeg` thumbnails.
- Stored asset replacement with `KEEP_ORIGINAL=false` is verified.

### Calendar Date Prefill

- Clicking an in-month calendar day applies a `displayTime:YYYY-MM-DD` filter.
- Empty in-month dates are clickable.
- Home create-mode editor uses selected date plus current local time for `createTime` and `updateTime`.
- Saving from a selected date places the memo on that date.
- Clearing the filter restores normal create behavior.
- Edit mode and comment editor behavior are unchanged.

## Production Data Changes Already Done

### Thumbnail Backfill

Phase 8 deployed verification completed:

```txt
dry-run:          scanned=153 existing=99 missing=36 skipped=18 failed=0
limited execute: generated=5 failed=0
full execute:    generated=31 existing=104 skipped=18 failed=0
```

Total generated thumbnails: `36`.

### Boundary `#photo` Cleanup

Backup was created before execution:

```txt
/opt/memos-diary/data-backup-20260603-005631
```

Cleanup completed:

```txt
dry-run:         scanned=176 changed=31 unchanged=145 failed=0
limited execute: scanned=9 changed=5 written=5 unchanged=4 failed=0
full execute:   scanned=176 changed=26 written=26 unchanged=150 failed=0
final dry-run:  scanned=176 changed=0 unchanged=176 failed=0
```

Inline `#photo` text was preserved. Slash tags and Japanese/non-ASCII tags were preserved.

## Verification Summary

Local checks reported across phases:

```txt
pnpm lint
pnpm test --run
pnpm build
go test ./cmd/memos/...
go test ./server/router/api/v1/...
```

Runtime checks verified:

- app startup and login
- memo timeline display
- tag chip display and click behavior
- image grids, image filter, image previews
- image optimizer upload behavior
- thumbnail cache generation and backfill
- `#photo` cleanup
- calendar-date memo creation
- mobile layout smoke checks for earlier phases

Current known runtime logs in reports were clean: INFO/OK only, no WARN / ERROR / panic.

## Known Not Verified / Low Priority

- Live Photo / Motion Photo runtime verification is intentionally not required. Static images are enough for Diary Mode.
- 3-image grid width was not verified in Phase 9 production smoke because no matching memo was available.
- Out-of-month calendar date non-interaction was not manually smoke-tested in Phase 10, but code and tests cover the guard.
- Direct Docker log check was skipped in the Phase 10 browser-only report because the verifier did not have SSH access.

## Current Local Working Tree Note

Untracked Playwright / screenshot artifacts may exist locally:

```txt
.playwright-mcp/
actions-page.png
build-diary-image.png
ci-actions.png
diary-home.png
phase10-*.png
step2-home.png
```

Do not commit these. Delete them only when the user explicitly asks to clean verification artifacts.

## Recommended Next Work

### 1. Operational Documentation

Create or update a concise runtime operations document covering:

- Portainer redeploy steps
- current compose/env settings
- backup location and backup procedure
- common verification commands
- rollback path
- commands for `thumbnail-backfill` and `remove-photo-tag`

This is the best next step because the MVP is now operational and the deployment process is intentionally manual.

### 2. Small Runtime Smoke Checklist

Create a short repeatable post-deploy checklist:

- app opens
- `docker logs --tail 80 memos-diary` is clean
- image upload works
- image filter works
- calendar date create works
- no test memo remains

### 3. Optional UI Polish

Only after operations docs are in place:

- find or create a safe 3-image test memo and verify grid width
- mobile editor spacing review
- image-heavy timeline scroll behavior

## Suggested ClaudeCode Handoff

The next ClaudeCode task should be documentation-first, not feature-first:

```txt
Create Diary Mode operations documentation and a post-deploy smoke checklist.
Do not change application behavior.
Do not touch Docker image build logic unless the docs reveal a mismatch.
Do not commit local screenshot artifacts.
```

Expected output:

- changed docs
- summary of current runtime env
- exact Portainer redeploy and rollback steps
- smoke checklist
- no code changes unless a documentation mismatch requires a small correction

