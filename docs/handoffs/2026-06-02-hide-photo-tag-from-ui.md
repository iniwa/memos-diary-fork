# 2026-06-02 hide #photo tag from UI handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Hide the legacy `#photo` tag from normal Diary Mode UI display without modifying stored memo content.

The project direction is:

* `#photo` should no longer be used as the marker for image posts.
* Image-post detection should be based on attached image resources.
* Existing memos may still contain `#photo` in their stored Markdown content.
* This task must not delete or migrate existing `#photo` data.
* This task should only hide `photo` from the normal tag UI and prevent accidental re-addition through the dedicated tag section.

## Background

Diary Mode previously used or inherited memos containing tags such as:

```md
#restaurant/cleis #photo
```

The new design replaces manual `#photo` tagging with automatic image-resource detection.

However, many existing memos still contain `#photo`. Removing it from stored memo content is a separate migration task and is intentionally out of scope.

Current relevant implementation:

* `web/src/lib/tagLine.ts` extracts boundary tag-only lines and serializes tags back into Memos-compatible trailing tag lines.
* `web/src/components/MemoView/components/MemoBody.tsx` extracts tags and renders them as separate tag chips.
* `web/src/components/MemoEditor/components/TagSection.tsx` manages the dedicated editor tag chips and suggestions.

This handoff should keep the data model unchanged and make only UI-level filtering changes.

## Files To Inspect

* `web/src/lib/tagLine.ts`
* `web/src/components/MemoView/components/MemoBody.tsx`
* `web/src/components/MemoEditor/components/TagSection.tsx`
* `web/src/components/MemoContent/Tag.tsx`
* Any existing image filter implementation files, if relevant
* Any tests for `tagLine.ts`, memo rendering, or tag UI

Search terms if needed:

* `extractBoundaryTagLines`
* `extractTrailingTagLine`
* `serializeTagContent`
* `TagSection`
* `state.tags`
* `useTagCounts`
* `#photo`
* `photo`

## Files To Edit

Primary targets:

* `web/src/components/MemoView/components/MemoBody.tsx`
* `web/src/components/MemoEditor/components/TagSection.tsx`

Optional, if it makes the implementation cleaner:

* `web/src/lib/tagLine.ts`
* New small helper file, for example:

  * `web/src/lib/diaryTags.ts`
  * `web/src/utils/diary-tags.ts`

Optional tests, if test structure exists:

* tag helper tests
* memo display tests
* tag section tests

Do not edit backend code.
Do not edit image optimizer code.
Do not edit Docker, CI, or deployment files.

## Required Behavior

### Display behavior

When a memo contains `#photo` in a boundary tag line, the memo card should not display `#photo` as a visible tag chip.

Example stored content:

```md
5月30日(土)

スカイボール
オールドファッション

#restaurant/cleis #photo
```

Expected memo card display:

```txt
5月30日(土)

スカイボール
オールドファッション

#restaurant/cleis
```

`#photo` should be hidden.

### Stored content behavior

Do not remove `#photo` from stored memo content.

The same memo should remain stored as:

```md
5月30日(土)

スカイボール
オールドファッション

#restaurant/cleis #photo
```

until a future explicit migration task is created.

### Editor behavior

When editing an existing memo that contains `#photo`, the dedicated tag UI should not show `photo` as a normal tag chip.

Recommended behavior:

* Hide `photo` from the visible tag chips.
* Preserve the existing `photo` tag in stored content unless the user saves and the current editor serialization would otherwise drop it.

Important design choice:

For this task, prefer **data preservation** over aggressive cleanup.

If hiding `photo` in the editor would cause `#photo` to be deleted on save, stop and ask before implementing that behavior.

A safe implementation may distinguish between:

```txt
visibleTags:
  tags shown and edited in the tag UI

hiddenLegacyTags:
  legacy tags preserved in stored content but not shown in normal UI
```

For now, `photo` should be the only hidden legacy tag.

### New tag input behavior

The dedicated tag UI should not suggest `photo`.

If the user manually types `photo` or `#photo`, preferred behavior is:

* Do not add it as a tag.
* No disruptive error is required.
* Optionally clear the input or ignore the entry.

This prevents new memos from reintroducing `#photo` through the tag UI.

### Existing image-post filter

Do not change image-post filter behavior in this handoff.

The project rule remains:

```txt
画像付き投稿 = image/* Resource を1つ以上持つ投稿
```

`#photo` must not be used as the source of truth for image filtering.

## Suggested Implementation Direction

Introduce a small helper for Diary Mode tag visibility rules.

Example concept:

```ts
const HIDDEN_LEGACY_TAGS = new Set(["photo"]);

export function isHiddenLegacyTag(tag: string): boolean {
  return HIDDEN_LEGACY_TAGS.has(tag.trim().replace(/^#+/, ""));
}

export function getVisibleDiaryTags(tags: string[]): string[] {
  return tags.filter((tag) => !isHiddenLegacyTag(tag));
}
```

Use this helper in display code:

```tsx
const visibleTags = getVisibleDiaryTags(tags);
```

Then render `visibleTags` instead of `tags`.

Use the same rule in `TagSection` suggestions and `addTag`.

Be careful with editor serialization:

* If the current editor state stores only visible tags, existing hidden `photo` may be lost on save.
* If that is the current architecture, either preserve hidden tags explicitly or limit this handoff to memo display + suggestions and report the editor preservation issue to Codex.

## Constraints

* Keep changes small and localized.
* Do not delete `#photo` from stored content.
* Do not write a migration.
* Do not add DB schema or API changes.
* Do not change tag extraction semantics except for UI-level filtering.
* Preserve slash-style tags such as:

  * `restaurant/cleis`
  * `restaurant/ブロンコビリー`
  * `game/FF14`
  * `PC/mic`
* Preserve Japanese tags.
* Preserve existing tag search behavior unless the change is explicitly only hiding `photo` in Diary Mode UI.
* Do not change image grid layout.
* Do not change image-resource filtering.
* Do not add dependencies.
* Do not commit automatically unless explicitly requested.

## Non Goals

Do not implement the following:

* Bulk removal of `#photo` from existing memos.
* A CLI migration to remove `#photo`.
* API-side image filter changes.
* Calendar image indicators.
* Image optimizer changes.
* Thumbnail/preview generation changes.
* Tag database separation.
* Tag color settings.
* Any Docker / GHCR / Portainer changes.

## Verification

Run the safest available checks.

Suggested commands:

```bash
git status --short
```

Frontend checks, if the environment supports them:

```bash
cd web
pnpm lint
pnpm test
pnpm build
```

If full checks are unavailable or too heavy, report them as blocked and explain why.

Manual verification:

1. Existing memo with `#restaurant/cleis #photo`

   * `#restaurant/cleis` is visible.
   * `#photo` is not visible on the memo card.

2. Existing memo with only `#photo`

   * No visible tag chip is rendered.
   * Memo body and image grid still display normally.

3. Existing memo with slash-style tags:

   * `#restaurant/ブロンコビリー`
   * `#game/FF14`
   * `#PC/mic`
   * These tags remain visible and unchanged.

4. Editor suggestion list:

   * `photo` is not suggested as a normal tag.
   * Other tags are still suggested.

5. Manual tag input:

   * Typing `photo` or `#photo` does not add a visible tag.

6. Data preservation check:

   * Editing a memo with existing `#photo` must not silently delete stored `#photo` unless Codex explicitly approves that behavior.
   * If preservation is not possible without larger state changes, stop and ask before editing.

7. Image-post filter check:

   * Image posts are still determined by image resources, not by `#photo`.

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

## Notes For Codex
- ...
```

Specifically mention whether existing `#photo` is preserved during edit/save. If it is not preserved, that must be reported as a design question before merging.
