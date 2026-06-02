# 2026-06-02 fix inline image grid width handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Fix the Diary Mode inline image grid layout so multi-image grids consistently fill the memo card width.

Currently, some memo image grids leave a large blank area on the right side depending on the image set. The expected behavior is:

* 2-image grid: fills the available memo card width.
* 3-image grid: fills the available memo card width.
* 4-image grid: fills the available memo card width.
* 5+ image grid: fills the available memo card width and keeps the `+N` overlay behavior.
* Single-image layout should preserve the existing natural-width behavior unless a minimal wrapper change is required.

## Background

The observed issue appears in the Diary Mode image grid UI.

A memo with multiple images can render as a left-aligned grid with unused blank space on the right. Other image sets appear to fill the card correctly, which suggests the layout is being affected by intrinsic media size and missing width constraints.

Likely cause:

* `MemoBody` uses a vertical flex container with `items-start`, so children are not automatically stretched to full width.
* `InlineImageGrid` multi-image collage containers use grid classes but do not explicitly include `w-full`.
* As a result, the grid may shrink to its content width instead of filling the memo body width.

Relevant design intent:

* Image resources should be embedded below memo text as a Twitter/X-style grid.
* Non-image attachments should remain in the normal attachment list.
* Multi-image grid should use:

  * 2 images: two columns
  * 3 images: left large, right two stacked
  * 4 images: 2x2
  * 5+ images: 2x2 with `+N` overlay on the fourth cell

This task is a layout bug fix only.

## Files To Inspect

* `web/src/components/MemoView/components/MemoBody.tsx`
* `web/src/components/MemoView/components/InlineImageGrid.tsx`
* `web/src/components/MemoMetadata/Attachment/attachmentVisualClasses.ts`
* `web/src/utils/media-item.ts`

Also inspect related tests or stories if they exist.

Search terms if needed:

* `InlineImageGrid`
* `resolveImageGridLayout`
* `GRID_HEIGHT`
* `VISUAL_TILE_BUTTON_CLASS`
* `COVER_MEDIA_CLASS`
* `NATURAL_MEDIA_CLASS`
* `splitVisualAttachments`

## Files To Edit

Primary target:

* `web/src/components/MemoView/components/InlineImageGrid.tsx`

Optional, only if needed after inspection:

* `web/src/components/MemoMetadata/Attachment/attachmentVisualClasses.ts`

Do not edit backend code for this task.
Do not edit image optimizer, attachment API, upload logic, tag logic, or Docker/CI files.

## Required Fix

Make multi-image collage grids occupy the available memo body width.

Minimum expected change:

* Add `w-full` to all collage grid container class names in `resolveImageGridLayout`.

Expected locations:

```tsx
containerClassName: cn("grid grid-cols-2 gap-1.5", GRID_HEIGHT)
```

should become conceptually:

```tsx
containerClassName: cn("grid w-full grid-cols-2 gap-1.5", GRID_HEIGHT)
```

and:

```tsx
containerClassName: cn("grid grid-cols-2 grid-rows-2 gap-1.5", GRID_HEIGHT)
```

should become conceptually:

```tsx
containerClassName: cn("grid w-full grid-cols-2 grid-rows-2 gap-1.5", GRID_HEIGHT)
```

Also consider wrapping the collage return path with a `w-full` container if needed for stability:

```tsx
return (
  <div className="w-full">
    <div className={layout.containerClassName}>
      ...
    </div>
  </div>
);
```

However, avoid unnecessary nesting if adding `w-full` to `containerClassName` is sufficient.

## Optional Hardening

If the grid still does not fill correctly after adding `w-full`, consider adding width/min-width hardening to collage tiles only:

* `w-full`
* `min-w-0`

For example, the collage tile button path may need to ensure each tile fills the grid cell:

```tsx
<Tile className={cn("block h-full w-full min-w-0", className)} ...>
```

Do not apply this to the single-image layout unless required. Single-image layout currently appears intentionally natural-width.

## Constraints

* Keep the change small and localized.
* Preserve existing single-image behavior as much as possible.
* Preserve existing 5+ image `+N` overlay behavior.
* Preserve motion photo behavior.
* Preserve image preview behavior via `openPreview`.
* Preserve `loading="lazy"` and `decoding="async"`.
* Do not change image source selection.
* Do not change `splitVisualAttachments`.
* Do not change attachment filtering logic.
* Do not change tag display logic.
* Do not add dependencies.
* Do not change Docker, CI, or deployment configuration.
* Do not commit automatically unless explicitly requested.

## Non Goals

Do not implement the following:

* New image grid design.
* Masonry layout.
* Manual image ordering.
* Image crop setting UI.
* Image optimizer changes.
* Thumbnail / preview generation changes.
* `画像付き投稿` filter changes.
* Calendar image display.
* Tag UI changes.
* Backend API changes.

## Verification

Run the safest available checks.

Suggested commands:

```bash
git status --short
```

Frontend checks, if the local environment supports them:

```bash
cd web
pnpm lint
pnpm test
pnpm build
```

If full build is too heavy or unavailable, at minimum run TypeScript/lint if possible and report blocked checks.

Manual verification:

1. Open a memo with 2 image attachments.

   * The grid should fill the memo card width.
   * No large blank right-side area should remain.

2. Open a memo with 3 image attachments.

   * The left-large/right-stacked layout should fill the memo card width.

3. Open a memo with 4 image attachments.

   * The 2x2 layout should fill the memo card width.

4. Open a memo with 5+ image attachments.

   * The 2x2 layout should fill the memo card width.
   * The fourth tile should show the `+N` overlay.

5. Open a memo with 1 image attachment.

   * Existing natural display should not be unintentionally stretched or cropped more than before.

6. Click images in each layout.

   * Existing preview behavior should still work.
   * The clicked image should open at the expected index.

7. Check mobile/narrow width.

   * No horizontal scroll should appear.
   * Grid should remain inside the memo card.

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

## Manual Check Notes
- ...

## Design Questions
- ...
```

If any unexpected layout behavior remains, include:

* affected image count
* browser width
* screenshot if available
* suspected CSS cause
