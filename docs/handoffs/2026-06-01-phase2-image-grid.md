# 2026-06-01 Phase 2 Image Grid Handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff before editing.
If implementation would violate constraints or require files outside this handoff, stop and ask.

## Goal

Display image attachments inline in memo cards using a Twitter/X-style image grid.

Image resources should feel like part of the diary entry rather than generic attached files.

## Prerequisite

Run this after Phase 1 tag section work has been completed and reviewed.

Work from `diary-mode` or a `feature/image-grid` branch created from `diary-mode`.

## Background

Diary Mode should show image resources directly under memo text.

For this phase:

- Classify resources by MIME type.
- Render image resources in a compact grid.
- Keep non-image resources in the existing attachment/file display.
- Reuse existing Memos image preview/lightbox behavior if feasible.
- Do not generate thumbnails or compressed previews yet.

Image filtering and image optimization are later phases.

Do not use `#photo` to detect image posts.

## Files To Inspect

Start here:

- `web/src/components/MemoView/`
- `web/src/components/MemoView/MemoView.tsx`
- `web/src/components/MemoView/components/MemoBody.tsx`
- `web/src/components/MemoView/hooks/useImagePreview.ts`
- `web/src/components/MemoContent/`
- `web/src/components/MemoMetadata/Attachment/`
- `web/src/components/MemoMetadata/Attachment/AttachmentListView.tsx`
- `web/src/components/MemoMetadata/Attachment/AttachmentCard.tsx`
- `web/src/components/MemoMetadata/Attachment/attachmentHelpers.ts`
- `web/src/components/MemoMetadata/Attachment/visualGalleryLayout.ts`
- `web/src/helpers/resource-names.ts`
- `web/src/types/proto/api/v1/memo_service_pb.ts`
- `web/src/types/proto/api/v1/attachment_service_pb.ts`
- `web/src/locales/ja.json`
- `web/src/locales/en.json`

Search if needed:

```bash
rg "attachments|resource|image|preview|AttachmentList|MemoBody|useImagePreview" web/src/components web/src/helpers web/src/hooks
```

## Files To Edit

Likely targets:

- `web/src/components/MemoView/`
- `web/src/components/MemoMetadata/Attachment/`
- A new small image grid component under `web/src/components/MemoView/components/` or `web/src/components/MemoMetadata/Attachment/`
- A pure helper for resource classification/layout, if the existing helpers are not sufficient
- Focused tests for helper logic if an obvious test pattern exists

Do not edit backend, proto, database migrations, Docker, CI, deployment, or image processing code.

## Required Behavior

### Image classification

Treat attachments/resources as images when their MIME type is one of:

```txt
image/jpeg
image/png
image/webp
image/gif
image/avif
image/svg+xml
```

Non-image attachments must continue to appear in the existing attachment/file UI.

If the available frontend type does not expose MIME type directly, inspect the existing attachment/resource fields and helpers before deciding. Do not infer image status from filename alone unless no better source exists, and report the limitation.

### Placement

Render image grid directly after memo body content and before generic non-image attachments.

Preferred visual order:

```txt
1. memo body
2. image grid
3. non-image attachments
4. metadata/actions
```

If Phase 1 tag display changed memo layout, keep image placement compatible with that change.

### Layout

Implement a responsive grid similar to Twitter/X:

- 1 image: large single image.
- 2 images: two equal columns.
- 3 images: one larger image plus two stacked images, if feasible; otherwise a clean 2-column fallback is acceptable.
- 4 images: 2x2 grid.
- 5 or more: show first 4 and add a `+N` overlay on the fourth image.

Requirements:

- No horizontal scroll on mobile.
- Use stable aspect ratios.
- Avoid layout shift.
- Respect existing card widths.
- Images should use object-fit cover in the grid.

### Preview behavior

Clicking/tapping an image should open the existing image preview/lightbox if available.

If existing preview logic cannot be reused cleanly, implement only a simple open-in-existing-preview behavior and report the limitation. Do not introduce a new large preview system in this phase.

### Accessibility and fallback

- Use useful `alt` text from existing attachment/resource metadata when available.
- If image loading fails, do not break the memo card.
- Keep keyboard/click behavior consistent with existing attachment preview conventions where possible.

## Constraints

- No backend changes.
- No proto changes.
- No DB changes.
- No image compression.
- No preview/thumbnail generation.
- No resource metadata changes.
- No new `#photo` logic.
- Do not hide or delete non-image attachments.
- Do not introduce heavy new dependencies.
- Keep changes localized and upstream-merge-friendly.

## Non Goals

- Image-post filtering.
- `#photo` migration.
- Image optimization pipeline.
- Background jobs.
- S3/resource storage changes.
- Upload behavior changes.
- Mobile swipe gallery.
- Editing image order.
- Captions.

## Verification

Run:

```bash
git status --short --branch
cd web
pnpm lint
pnpm build
```

Manual verification checklist:

- Memo with no attachments renders unchanged.
- Memo with one image shows a single large inline image.
- Memo with two images shows a two-image grid.
- Memo with three images renders without clipping or horizontal scroll.
- Memo with four images shows a 2x2 grid.
- Memo with five or more images shows a `+N` overlay.
- Memo with mixed image and non-image attachments shows images inline and files in the existing attachment UI.
- Clicking an image opens the existing preview/lightbox or the documented fallback.
- Mobile width does not produce overlap, clipping, or horizontal scroll.
- Existing memo actions and metadata still work.

If Go checks are not run because this is frontend-only, say so.

## Expected Report

Report back in Japanese.

Include:

```md
## Changed Files
- ...

## Summary
- ...

## Verification
- ...

## Blocked Checks
- ...

## Files Inspected But Not Changed
- ...

## Design Questions
- ...

## Notes For Codex
- ...
```
