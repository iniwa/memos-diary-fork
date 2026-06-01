# 2026-06-01 Phase 2 Live Photo Regression Fix Handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff before editing.
This is a focused follow-up to Phase 2 image grid work.

## Goal

Fix the Phase 2 regression where Apple Live Photo attachments can be split into a still image in the inline image grid and a separate video attachment in the generic attachment list.

Preserve the new inline image grid behavior for ordinary image attachments.

## Background

Phase 2 added:

- `web/src/components/MemoView/components/InlineImageGrid.tsx`
- `web/src/components/MemoView/components/MemoBody.tsx` changes that split `memo.attachments` into image and non-image attachments.

The current split happens before `buildAttachmentVisualItems`.

Problem:

- Existing visual media handling can combine Apple Live Photo still + video pairs when both attachments reach `buildAttachmentVisualItems` together.
- The Phase 2 split sends the still image to `InlineImageGrid` and the video to `AttachmentListView`.
- That breaks the existing Live Photo pairing behavior and renders a Live Photo as a static image plus a separate video attachment.

Relevant existing logic:

- `web/src/utils/media-item.ts`
  - `buildAttachmentVisualItems`
  - `buildAppleMotionItem`
  - `getAttachmentMotionGroupId`
  - `isAppleLivePhotoStill`
  - `isAppleLivePhotoVideo`
- `web/src/utils/attachment.ts`
  - `isMotionAttachment`
  - `isAndroidMotionContainer`

## Files To Inspect

- `web/src/components/MemoView/components/MemoBody.tsx`
- `web/src/components/MemoView/components/InlineImageGrid.tsx`
- `web/src/components/MemoMetadata/Attachment/AttachmentListView.tsx`
- `web/src/components/MemoMetadata/Attachment/attachmentHelpers.ts`
- `web/src/components/MemoMetadata/Attachment/attachmentVisualClasses.ts`
- `web/src/components/MemoMetadata/Attachment/visualGalleryLayout.ts`
- `web/src/utils/media-item.ts`
- `web/src/utils/attachment.ts`

Search if useful:

```bash
rg "buildAttachmentVisualItems|isMotionAttachment|isAppleLivePhoto|motionMedia|AttachmentListView|InlineImageGrid" web/src
```

## Files To Edit

Likely targets:

- `web/src/components/MemoView/components/MemoBody.tsx`
- `web/src/components/MemoView/components/InlineImageGrid.tsx`
- `web/src/utils/media-item.ts` only if a small helper is clearly useful
- `web/src/components/MemoMetadata/Attachment/attachmentHelpers.ts` only if helper responsibility belongs there

Do not edit backend, proto, DB migrations, Docker, CI, or deployment files.

## Required Behavior

### Preserve Live Photo pairing

Apple Live Photo still + video attachments that share a motion group must be passed through visual item construction together so they become one logical motion item.

Expected:

- A Live Photo appears as one logical visual item.
- It should open in the existing preview as a motion item if the existing preview supports that.
- It should not show the still image inline and the paired video separately as a generic attachment.

### Preserve ordinary Phase 2 behavior

Ordinary image attachments should still render in the inline image grid.

Non-image, non-motion attachments should still render in the existing `AttachmentListView`.

Video-only attachments should not be unintentionally hidden. Either:

- Continue showing video-only attachments in `AttachmentListView` as before, or
- If you intentionally include videos in the visual grouping to preserve motion handling, ensure video-only attachments still render in the existing visual/media style and report that behavior.

Do not create a new preview system.

### Avoid duplicate rendering

Attachments consumed by an inline visual item must not also appear as a separate file/video attachment below.

This especially matters for:

- Apple Live Photo still + video pairs.
- Android motion photo containers.
- Mixed memos with ordinary images, Live Photos, videos, audio, and documents.

### Keep image-grid constraints

Keep the Phase 2 grid constraints:

- 1 visual image item: large single tile.
- 2 items: two columns.
- 3 items: 1+2 mosaic if feasible.
- 4+ items: 2x2 with `+N` overlay.
- No horizontal scroll on mobile.
- Existing lightbox/preview integration.

If motion items are shown in the inline grid, reuse existing motion preview primitives if available. Do not regress ordinary image display.

## Suggested Approach

Do not pre-filter only `image/*` and then call `buildAttachmentVisualItems`.

Prefer one of these approaches:

1. Build logical visual items from the full attachment array or from a visual subset that includes images, videos, and motion attachments, then render the intended inline items and remove their consumed attachment names from the remaining attachment list.
2. Or add a focused helper that returns:

```ts
{
  inlineVisualItems: AttachmentVisualItem[];
  remainingAttachments: Attachment[];
}
```

The helper should use `AttachmentVisualItem.attachmentNames` to prevent duplicate rendering.

If `InlineImageGrid` currently only accepts `Attachment[]`, consider changing it to accept already-built `AttachmentVisualItem[]` so Live Photo grouping does not have to be rebuilt from a filtered attachment subset.

## Constraints

- No backend/API/schema changes.
- No image optimization or thumbnail generation.
- No `#photo` behavior.
- No dependency additions.
- Keep the fix localized.
- Do not remove existing generic attachment behavior for audio/docs.
- Do not commit automatically unless explicitly requested by the user.

## Non Goals

- Full Live Photo UX redesign.
- New gallery/lightbox implementation.
- Image-post filtering.
- Captions.
- Reordering media.
- Tag-line display changes.
- Browser automation unless you decide it is necessary and available.

## Verification

Run:

```bash
git status --short --branch
cd web
pnpm lint
pnpm build
```

Manual or code-level verification checklist:

- Ordinary image-only memo still shows inline image grid.
- Mixed image + document memo shows image grid and document attachment.
- Video-only memo still shows the video in an appropriate existing attachment/media UI.
- Apple Live Photo still + video with the same motion group is rendered as one logical visual item, not two separate attachments.
- The Live Photo's paired video attachment is not duplicated below the grid.
- Android motion photo container still renders as one visual item if supported by existing code.
- Clicking visual items still opens the existing preview/lightbox with the correct index.

If you cannot manually create Live Photo data, inspect the code path and report the exact reasoning that proves the pair is kept together.

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
