# 2026-06-02 expand inline image grid overflow handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Improve the Diary Mode inline image grid behavior for memos with 5 or more images.

Current behavior:

* Shows the first 4 images.
* Shows `+N` overlay on the 4th tile.
* Clicking an image opens the existing preview viewer.

Desired behavior:

* Initial view remains compact: first 4 images only.
* The 4th tile shows `+N` when there are more than 4 images.
* Clicking the `+N` tile expands the memo card inline.
* Expanded view shows all images as a compact 2-column grid.
* Clicking any normal image still opens the existing preview viewer.
* Expanded view includes a “collapse” control to return to the initial 4-image view.

This is a UI/UX improvement only.
Do not change backend, attachment storage, image optimizer, or image filtering behavior.

---

## Background

`InlineImageGrid.tsx` currently implements the Twitter/X-style image grid.

Relevant current behavior:

* `MAX_VISIBLE = 4`
* `resolveImageGridLayout(items)` returns:

  * 1 image: single layout
  * 2 images: 2-column grid
  * 3 images: left-large/right-stacked grid
  * 4 or more: 2x2 grid
* For 5+ images, it shows the first 4 items and applies `+N` overlay on the 4th visible tile.
* `previewItems` already includes all items, so image preview can show all images once opened.
* `openPreview(previewItems, index)` should continue to work.

The new behavior should preserve the compact first view, while allowing inline expansion for users who want to see the remaining images without opening the preview viewer.

---

## Files To Inspect

Primary:

```txt
web/src/components/MemoView/components/InlineImageGrid.tsx
```

Also inspect if needed:

```txt
web/src/components/MemoMetadata/Attachment/attachmentVisualClasses.ts
web/src/utils/media-item.ts
web/src/components/MemoView/MemoViewContext.tsx
```

Search terms:

```txt
InlineImageGrid
resolveImageGridLayout
MAX_VISIBLE
OVERFLOW_TILE_OVERLAY_CLASS
openPreview
previewItems
AttachmentVisualItem
```

---

## Files To Edit

Expected:

```txt
web/src/components/MemoView/components/InlineImageGrid.tsx
```

Optional only if necessary:

```txt
web/src/components/MemoMetadata/Attachment/attachmentVisualClasses.ts
```

Do not edit backend files.
Do not edit image optimizer files.
Do not edit filter logic.
Do not edit Docker, CI, or deployment files.

---

## Required UX

### Initial view: 5+ images

For 5 or more images, keep the current compact behavior:

```txt
[ image 1 ][ image 2 ]
[ image 3 ][ +N      ]
```

Where:

```txt
N = total image count - 4
```

Example:

```txt
5 images  -> +1
7 images  -> +3
10 images -> +6
```

### Clicking `+N`

Clicking the tile with `+N` must expand the grid inline.

It must not open the image preview.

Expanded state should show all images in a compact grid:

```txt
[ image 1 ][ image 2 ]
[ image 3 ][ image 4 ]
[ image 5 ][ image 6 ]
[ image 7 ][ image 8 ]
...
```

Use 2 columns for the expanded layout on desktop and mobile unless inspection shows a strong reason to adjust.

### Expanded view

Expanded view requirements:

* Show all image/motion visual items.
* Do not show `+N` overlay.
* Keep images compact.
* Keep existing rounded tile style.
* Keep lazy loading.
* Keep image preview on normal image click.
* Preserve motion photo behavior.
* Provide a collapse control below or above the expanded grid.

Suggested collapse control text:

Japanese UI:

```txt
折りたたむ
```

English UI if localization is needed:

```txt
Collapse
```

If the project uses i18n, add labels through the existing i18n mechanism.
If adding i18n is too large for this task, use the existing UI text convention and report it.

### Clicking normal images

Normal image clicks should continue to open the existing preview viewer at the correct index.

Important:

* Initial compact view:

  * image 1 opens preview index 0
  * image 2 opens preview index 1
  * image 3 opens preview index 2
  * the `+N` tile expands instead of opening preview
* Expanded view:

  * every image opens preview at its correct index

### Collapse behavior

When expanded, show a small control:

```txt
折りたたむ
```

Clicking it returns to the initial compact view.

Recommended placement:

```txt
[ expanded 2-column grid ]

[折りたたむ]
```

The collapse control should be subtle, not visually dominant.

---

## Suggested Implementation Direction

Add local state to `InlineImageGrid`:

```tsx
const [expanded, setExpanded] = useState(false);
```

You may need to import `useState`.

Change layout logic so `resolveImageGridLayout` can account for `expanded`.

Possible approach:

```tsx
const layout = useMemo(() => resolveImageGridLayout(items, expanded), [items, expanded]);
```

Then adjust the layout resolver:

```ts
function resolveImageGridLayout(items: AttachmentVisualItem[], expanded: boolean): GridLayout | null
```

Recommended layout modes:

```ts
type GridLayout =
  | { mode: "single"; item: AttachmentVisualItem }
  | { mode: "collage"; containerClassName: string; cells: GridCell[] }
  | { mode: "expanded"; containerClassName: string; cells: GridCell[] };
```

Alternatively, reuse `mode: "collage"` for expanded view if simpler.

### Initial 5+ behavior

Preserve current behavior:

```ts
const visible = items.slice(0, MAX_VISIBLE);
const overflow = items.length - MAX_VISIBLE;
```

The fourth visible cell should receive:

```ts
overlayLabel: `+${overflow}`
```

and an additional semantic flag, for example:

```ts
isOverflowTrigger: true
```

Extend `GridCell`:

```ts
interface GridCell {
  item: AttachmentVisualItem;
  className?: string;
  overlayLabel?: string;
  isOverflowTrigger?: boolean;
}
```

### Expanded layout

When `expanded === true` and `items.length > MAX_VISIBLE`, render all items with a 2-column compact grid:

```tsx
containerClassName: cn("grid w-full grid-cols-2 gap-1.5", EXPANDED_GRID_HEIGHT_OR_AUTO)
```

Prefer auto height for expanded mode:

```txt
grid w-full grid-cols-2 gap-1.5
```

Each cell should have a fixed compact height so the grid remains tidy.

Suggested cell height:

```txt
h-[8rem] sm:h-[9rem] md:h-[10rem]
```

or equivalent Tailwind classes.

Avoid making expanded cells as tall as the initial collage grid if there are many images.

### Click behavior

In the collage render path, use the cell metadata:

```tsx
onClick={() => {
  if (overlayLabel && isOverflowTrigger) {
    setExpanded(true);
    return;
  }
  handleClick(item.id);
}}
```

Prefer a clearer helper:

```ts
const handleTileClick = (itemId: string, isOverflowTrigger?: boolean) => {
  if (isOverflowTrigger) {
    setExpanded(true);
    return;
  }
  handleClick(itemId);
};
```

### Accessibility

For the overflow tile, set an accessible label that reflects expansion:

```txt
Show all images
```

or Japanese:

```txt
すべての画像を表示
```

For collapse:

```txt
折りたたむ
```

If the existing `Tile` component does not accept aria-label, add a minimal optional `ariaLabel?: string` prop.

---

## Constraints

* Keep changes localized.
* Preserve existing single-image behavior.
* Preserve existing 2/3/4-image layout in the initial view.
* Preserve existing 5+ compact view before expansion.
* Do not break `+N` visual overlay.
* Do not open preview when clicking `+N`.
* Preserve normal image preview behavior.
* Preserve motion photo behavior.
* Preserve lazy image loading and async decoding.
* Do not change image source selection.
* Do not change `splitVisualAttachments`.
* Do not change backend logic.
* Do not change image optimizer logic.
* Do not change image filter logic.
* Do not add dependencies.
* Do not commit automatically unless explicitly requested.

---

## Non Goals

Do not implement:

* Masonry layout.
* Drag-and-drop image ordering.
* Image captions.
* Image count badges outside `+N`.
* Infinite image loading.
* Pagination.
* Backend image metadata changes.
* Attachment upload changes.
* Image optimization changes.
* Calendar image thumbnails.
* `#photo` migration.
* `画像付き投稿` filter changes.

---

## Verification

Run safe checks.

```bash
git status --short
```

Frontend checks if available:

```bash
cd web
pnpm lint
pnpm test
pnpm build
```

If full checks are unavailable or too heavy, report them as blocked with the reason.

Manual verification:

### 1 image

* Displays as before.
* Click opens preview.

### 2 images

* Displays 2-column initial layout.
* Click each image opens correct preview index.

### 3 images

* Displays left-large/right-stacked layout.
* Click each image opens correct preview index.

### 4 images

* Displays 2x2 layout.
* Click each image opens correct preview index.

### 5 images

Initial:

```txt
[1][2]
[3][+1]
```

* Clicking `+1` expands inline.
* Expanded view shows all 5 images.
* Clicking expanded image 5 opens preview index 4.
* Collapse returns to compact view.

### 7 images

Initial:

```txt
[1][2]
[3][+3]
```

* Clicking `+3` expands inline.
* Expanded view shows all 7 images.
* No `+N` overlay remains.
* Collapse works.

### Mobile / narrow width

* No horizontal scroll.
* Expanded grid remains inside memo card.
* Tap targets are usable.
* Collapse control is visible.

### Motion photo

If motion photo test data exists:

* Motion item still displays.
* Motion preview behavior still works.
* Expanded view does not break motion item layout.

---

## Expected Report

Report back in Japanese.

Use this format:

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

In `Manual Check Notes`, explicitly mention:

* 5-image behavior
* 7+ image behavior
* whether `+N` opens expansion instead of preview
* whether preview index remains correct after expansion
* whether collapse works
