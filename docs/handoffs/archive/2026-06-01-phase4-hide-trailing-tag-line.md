# 2026-06-01 Phase 4 Hide Trailing Tag Line Handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff before editing.
If the change starts to require database migrations, proto changes, or a broad markdown renderer rewrite, stop and report the tradeoff first.

## Goal

Hide the storage-only trailing tag line from normal memo display, while keeping the dedicated tag UI and existing Memos tag compatibility.

Phase 1 introduced a dedicated tag section in the memo editor, but the saved representation is still the existing Memos-compatible content format:

```md
Body text
#tagA #tagB
```

Memo cards currently render `memo.content` directly, so the final tag-only line still appears in the body. This phase should make the user-facing diary view feel like tags are separate metadata, not part of the written entry.

## Current State

Completed and pushed:

- Phase 0 foundation and repository setup.
- Phase 1 tag section: `6aa1ab6f feat(diary-mode): Phase 1 — dedicated tag section in memo editor`
- Phase 2 inline image grid: `a9c80a82 feat(diary-mode): Phase 2 — inline image grid on memo cards`
- Phase 2 Live Photo grouping fix: `60fecafe fix(diary-mode): preserve motion attachment grouping`
- Phase 3 image attachment filter: `5d9f5335 feat(diary-mode): add image attachment filter`

Known local state after Phase 3:

- Branch: `diary-mode`
- Remote: `origin` points to Gitea `memos-diary-fork`
- `iniwa-memo.md` may exist as an untracked local note. Do not touch it unless the user explicitly asks.
- Go is not installed on the current Windows dev PC, so Go tests may need CI/Docker or another environment.

## Background

Phase 1 added helpers and editor integration for tag-line serialization:

- `web/src/lib/tagLine.ts`
- `web/src/components/MemoEditor/index.tsx`
- `web/src/components/MemoEditor/services/memoService.ts`
- `web/src/components/MemoEditor/hooks/useMemoInit.ts`
- `web/src/components/MemoEditor/components/TagSection.tsx`

The important helper is:

```ts
extractTrailingTagLine(content)
```

It returns:

- `body`: content with a final tag-only line removed
- `tags`: tag values without leading `#`

This helper intentionally only treats the final non-empty line as a tag line when every token is a valid `#tag`.
Inline tags in natural prose must remain in the body.

Phase 2 currently renders memo cards from:

- `web/src/components/MemoView/components/MemoBody.tsx`
- `web/src/components/MemoContent/index.tsx`

`MemoBody` still passes `memo.content` directly to `<MemoContent />`.

## Files To Inspect

Start here:

- `web/src/lib/tagLine.ts`
- `web/src/components/MemoView/components/MemoBody.tsx`
- `web/src/components/MemoContent/index.tsx`
- `web/src/components/MemoContent/Tag.tsx`
- `web/src/components/MemoEditor/services/memoService.ts`
- `web/src/components/MemoEditor/hooks/useMemoInit.ts`
- `web/src/components/PagedMemoList/PagedMemoList.tsx`
- `web/src/components/MemoView/MemoView.tsx`

Search if useful:

```bash
rg "extractTrailingTagLine|serializeTagContent|MemoContent|memo.content|tags" web/src
```

## Files To Edit

Likely targets:

- `web/src/components/MemoView/components/MemoBody.tsx`
- A small display component for extracted tags if an existing tag display is not reusable
- `web/src/lib/tagLine.ts` only if a small exported helper is needed
- Tests only if the project already has nearby frontend tests that are practical to extend

Avoid broad changes to markdown parsing, backend payloads, or tag storage.

## Required Behavior

### Memo body display

When a memo ends with a tag-only line, normal memo display should render only the body portion in `<MemoContent />`.

Example stored content:

```md
Today I practiced Mario Kart.
#game #mariokart
```

Displayed body:

```md
Today I practiced Mario Kart.
```

The trailing tags should not appear as body text below the entry.

### Dedicated tag display

The extracted tags should still be visible in a compact, separate tag row on the memo card.

Requirements:

- Show chips or tag links using the same visual language as existing tag UI where possible.
- Clicking a tag should keep existing tag-filter behavior if using `MemoContent/Tag` is practical.
- If reusing `MemoContent/Tag` is awkward, implement a small local tag chip that uses `MemoFilterContext` and `stringifyFilters` consistently with `web/src/components/MemoContent/Tag.tsx`.
- Do not show an empty tag section when there are no extracted trailing tags.
- Preserve existing admin tag metadata styling if it can be reused without significant complexity.

### Non-tag content

Do not hide inline tags that are part of normal prose.

Example stored content:

```md
Today I played #mariokart with friends.
```

Displayed body should remain unchanged.

### Edge cases

Use the existing `extractTrailingTagLine` behavior unless there is a clear bug:

- Trailing blank lines after the tag line are allowed.
- `##heading` is not a tag token.
- A line containing both text and tags is not a tag-only line.
- Empty body with only tags should render no body text, but should still show the tag row.
- Existing memos should not be mutated just by viewing them.

## Constraints

- No DB schema changes.
- No proto/API changes.
- No migration or batch rewrite of existing memo content.
- No automatic deletion of `#photo` or any other tag.
- No behavior change to editor save format: keep appending a final tag-only line for compatibility.
- No client-side mutation of memo content while rendering.
- Keep changes localized and upstream-merge-friendly.
- Do not commit automatically unless explicitly requested by the user.

## Non Goals

- Full database-backed tag model.
- Tag migration from content to separate tables.
- Changing search semantics.
- Changing backend tag extraction.
- Hiding all tags everywhere.
- Redesigning the memo card.
- Changing the image grid or image filter behavior.

## Verification

Run from `web/`:

```bash
pnpm lint
pnpm build
```

Manual checks if a browser is available:

- Memo with final tag line shows body without the final tag line.
- Same memo shows a separate tag row.
- Clicking a displayed tag applies the tag filter.
- Memo with inline prose tag still shows that inline tag in the body.
- Memo with only images and tags still shows the image grid and tag row.
- Memo with Live Photo still renders motion item from Phase 2 fix.
- Active image filter from Phase 3 still works.

Go tests are not expected for this frontend-only phase unless backend code is touched.

## Report Back

When done, report:

- Changed files
- Summary of display behavior
- Verification commands and results
- Any browser/manual checks performed
- Any remaining design questions
