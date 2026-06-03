# 2026-06-02 Diary Mode Deployed Verification Handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff before starting.

## Goal

Verify the deployed Diary Mode instance end to end with the copied production Memos data.

This is primarily a verification task. Do not make code changes unless a clear regression is found and the fix is small, localized, and safe. If you find a broader issue, report it first with reproduction steps and proposed fix scope.

## Target

Deployed Diary Mode URL:

```txt
http://192.168.1.205:5231
```

Existing production Memos remains separate on port `5230`. Do not change or disrupt it.

## Current State

Completed and pushed:

- Phase 1 tag section: `6aa1ab6f`
- Phase 2 inline image grid: `a9c80a82`
- Phase 2 Live Photo grouping fix: `60fecafe`
- Phase 3 image attachment filter: `5d9f5335`
- Phase 4 display trailing tags separately: `2e05a71d`
- Diary image CI/Portainer support: `dcef7793`

Deployment:

- Image: `ghcr.io/iniwa/memos-diary-fork:latest`
- Container: `memos-diary`
- Port: `5231`
- Data path: `/opt/memos-diary/data`
- DB/assets were copied from the existing `memos` instance on 2026-06-02.
- Backup of pre-copy Diary data: `/opt/memos-diary/backups/20260602-012702`

Note:

- Browser sessions created before DB copy may have invalid refresh tokens. If authentication behaves oddly, clear site data for `192.168.1.205:5231` or sign in again.

## Verification Focus

### 1. Basic App Health

Check:

- App loads at `http://192.168.1.205:5231`.
- Sign-in works with the copied Memos user.
- Home timeline loads copied memos.
- Existing production Memos on `5230` is not affected.

### 2. Phase 1 / Phase 4 Tag Behavior

Check memos with trailing tag-only lines:

Stored shape:

```md
Body text
#tagA #tagB
```

Expected:

- Body displays without the final tag-only line.
- Tags appear as separate chips directly under the body.
- Clicking a tag applies the tag filter.
- Inline prose tags remain visible in body text.

Examples to look for:

- Memos that visibly used to end with `#game`, `#memo`, `#photo`, or similar tag-only lines.
- Memos with inline tags inside normal prose.
- Memos with only tags and images.

Watch for:

- Empty blank body blocks that create awkward spacing.
- Duplicate tag chips.
- Tag chips being too prominent or too close to image grids.
- Tag click navigation/filtering regressions.

### 3. Phase 2 Image Grid

Check real copied image memos:

- 1 image: large single tile.
- 2 images: two-column grid.
- 3 images: mosaic or clean fallback without clipping.
- 4 images: 2x2 grid.
- 5+ images: first 4 shown with `+N` overlay.
- Mixed image + document/audio/video memo: images inline, non-image attachments remain in attachment area.
- Clicking/tapping an image opens the preview/lightbox.

Watch for:

- Horizontal scroll on mobile width.
- Cropped or distorted thumbnails beyond expected object-cover behavior.
- Broken image URLs after DB/assets copy.
- Attachment duplicates: same image appearing both in grid and attachment list.

### 4. Live Photo / Motion Photo Regression Check

If there are iPhone Live Photo or Android motion photo uploads:

Expected:

- A Live Photo should render as one motion visual item in the inline grid.
- It should not show a still image inline and a paired video separately in attachments.
- Video-only attachments should still use the existing video attachment UI.

If no known Live Photo exists, report that this was not verifiable with current data.

### 5. Phase 3 Image Filter

Check the sidebar filter:

- Toggle `画像あり` / `Has image`.
- URL updates with `filter=attachment.hasImage:true`.
- Timeline shows only memos that have image attachments.
- Turning the filter off restores normal list.
- Active filter chip can remove the filter.
- Combine with a tag filter and verify AND behavior.

Watch for:

- Pagination/infinite scroll missing image memos.
- Non-image memos appearing under the image filter.
- Image-only memos failing to appear.
- Filter chip label/icon missing.

### 6. Editing / Creating A Memo

Use a low-risk test memo, then delete it if appropriate.

Check:

- Create a memo with body + tags via dedicated tag section.
- Save result.
- Display hides the trailing stored tag line and shows chips.
- Reopen edit: body and tags populate correctly.
- Add an image to a memo and verify inline grid after save.
- Confirm `#photo` is not automatically added.

Do not edit important copied production memos unless explicitly needed for a focused test.

### 7. Mobile Layout

Use browser responsive mode or a phone if available:

- Home timeline is usable at narrow width.
- Image grids do not overflow.
- Tag chips wrap cleanly.
- The image filter control remains reachable.

## Optional Host Checks

If shell access is available:

```bash
docker ps --filter name=memos
docker logs --tail 80 memos-diary
```

Expected:

- `memos-diary` is running.
- No repeated panics or DB errors.
- Auth refresh token errors immediately after DB copy are acceptable if caused by stale browser sessions.

## Constraints

- Do not modify production `memos` on port `5230`.
- Do not wipe, recopy, or migrate data.
- Do not change Docker/Portainer config unless the user explicitly asks.
- Do not run destructive commands.
- Do not commit automatically unless explicitly requested.
- Keep any code fix very small and report it clearly.

## Report Back Format

Please report in this structure:

```md
## Summary

## Verified

## Issues Found

## Not Verified

## Suggested Next Work
```

For each issue, include:

- URL/page
- Reproduction steps
- Expected behavior
- Actual behavior
- Screenshot if useful
- Suspected file/component if known
