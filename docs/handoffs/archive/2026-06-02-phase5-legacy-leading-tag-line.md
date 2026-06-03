# 2026-06-02 Phase 5 Legacy Leading Tag Line Handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff before editing.

## Goal

Support legacy copied memos whose tag-only line appears at the top of the memo instead of the bottom.

Do this as a non-destructive compatibility improvement first. Do not batch-migrate or rewrite existing database rows in this phase.

## Background

Deployed verification on `http://192.168.1.205:5231` found:

- Phase 1/2/3/4 behavior is working.
- No major issues.
- 112 copied memos were scanned.
- Phase 4 hides trailing tag-only lines and shows tag chips correctly.
- Existing copied data includes about 95 memos where tags are in an older leading-line format.

Current Phase 4 behavior:

```md
Body text
#tagA #tagB
```

renders as:

```txt
Body text
[#tagA] [#tagB]
```

Legacy copied memos may look like:

```md
#tagA #tagB
Body text
```

Currently those tags remain in the body because `extractTrailingTagLine()` intentionally only handles the final non-empty line.

## Current Relevant Files

- `web/src/lib/tagLine.ts`
- `web/src/components/MemoView/components/MemoBody.tsx`
- `web/src/components/MemoEditor/services/memoService.ts`
- `web/src/components/MemoEditor/hooks/useMemoInit.ts`
- `web/src/components/MemoEditor/components/TagSection.tsx`
- `web/src/components/MemoContent/Tag.tsx`

Search:

```bash
rg "extractTrailingTagLine|serializeTagContent|buildTagLine|MemoContent|data-tag" web/src
```

## Required Behavior

### Display

When a memo starts with a tag-only line, display should hide that line from the body and show the tags as chips.

Example stored content:

```md
#game #memo
Today I practiced.
```

Expected displayed body:

```md
Today I practiced.
```

Expected tags:

```txt
[#game] [#memo]
```

### Existing trailing behavior

Do not regress current trailing tag behavior.

Example:

```md
Today I practiced.
#game #memo
```

should still show body + tag chips.

### Both leading and trailing tags

If both leading and trailing tag-only lines exist, extract both and merge tags.

Example:

```md
#old
Body
#new #old
```

Expected:

- Body: `Body`
- Tags: `old`, `new`
- Prefer preserving first-seen order and de-duplicating tags.

### Inline tags

Do not extract inline prose tags.

Example:

```md
Today I played #mariokart with friends.
```

Expected:

- Body remains unchanged.
- No separate tag chips are added from that inline tag.

### Markdown headings

Do not treat headings as tag lines.

Example:

```md
## Heading
Body
```

Expected:

- Body remains unchanged.
- No tag chips from `## Heading`.

Use the same tag-only token rules as Phase 1/4 unless a bug is found.

## Suggested Implementation

Prefer adding a new helper in `web/src/lib/tagLine.ts`, for example:

```ts
extractBoundaryTagLines(content)
```

or similar, returning:

```ts
{
  body: string;
  tags: string[];
}
```

The helper should:

1. Ignore trailing blank lines when checking the final tag line.
2. Ignore leading blank lines when checking the first tag line.
3. Extract at most one leading tag-only line and at most one trailing tag-only line.
4. Preserve normal body content and internal blank lines.
5. De-duplicate tags while preserving order.

Then update:

- `MemoBody.tsx` to use the new boundary helper instead of only `extractTrailingTagLine`.

Consider whether editor initialization should also use the new helper:

- If an old leading-tag memo is opened for edit, it would be better for the tag section to populate from the leading tag line and the body editor to exclude it.
- On save, `serializeTagContent()` will write the modern trailing tag line, naturally migrating that one memo.
- This is acceptable because it only changes content when the user explicitly edits and saves.

Likely edit target:

- `web/src/components/MemoEditor/services/memoService.ts` or `web/src/components/MemoEditor/hooks/useMemoInit.ts`, wherever `extractTrailingTagLine()` is used for edit initialization.

Do not auto-save or mutate memos just from viewing.

## Constraints

- No DB migration.
- No batch rewrite.
- No backend changes.
- No proto/API changes.
- No change to `serializeTagContent()` output format: keep modern trailing tag line.
- Keep code small and localized.
- Do not commit automatically unless explicitly requested.

## Verification

Run from `web/`:

```bash
pnpm lint
pnpm build
```

Manual verification on deployed/local app if possible:

- Legacy leading tag memo hides the first tag line and shows chips.
- Modern trailing tag memo still works.
- Memo with both leading and trailing tags de-duplicates chips.
- Inline prose tag is unchanged.
- Heading `## something` is unchanged.
- Editing a legacy leading-tag memo loads body/tags into the right editor fields.
- Saving that memo converts it to the modern trailing tag storage format.

## Report Back

Report:

- Changed files
- Display behavior summary
- Whether editor initialization was updated
- Verification commands and results
- Any manual checks
- Any edge cases intentionally deferred
