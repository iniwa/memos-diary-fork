# 2026-06-01 Phase 1 Tag Section Handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff before editing.
If implementation would violate constraints or require files outside this handoff, stop and ask.

## Goal

Implement a dedicated tag section in the memo create/edit UI while preserving existing Memos tag compatibility.

The user should not need to type tags directly in the memo body for normal use, but stored memo content must remain compatible with Memos v0.29.0.

## Prerequisite

This handoff assumes Phase 0 repository cleanup has been completed or is not blocking frontend work.

Work from `diary-mode` or a `feature/tag-section` branch created from `diary-mode`.

## Background

Diary Mode should remain close to upstream Memos. For this phase, do not add a new tag database model.

Internal model for Phase 1:

- Memo body remains the source of truth.
- A trailing tag-only line at the end of the memo body is treated as the dedicated tag section.
- The UI reads from and writes to that trailing tag line.
- Stored content still contains Memos-compatible inline tags.

Do not reimplement calendar, `displayTime`, `createTime`, or `updateTime`.

Do not implement image behavior in this handoff.

## Files To Inspect

Start here:

- `web/src/components/MemoEditor/README.md`
- `web/src/components/MemoEditor/index.tsx`
- `web/src/components/MemoEditor/types/components.ts`
- `web/src/components/MemoEditor/state/`
- `web/src/components/MemoEditor/services/memoService.ts`
- `web/src/components/MemoEditor/Editor/TagSuggestions.tsx`
- `web/src/components/MemoEditor/Editor/useSuggestions.ts`
- `web/src/utils/remark-plugins/remark-tag.ts`
- `web/src/components/MemoContent/Tag.tsx`
- `web/src/hooks/useUserQueries.ts`
- `web/src/lib/tag.ts`
- `web/src/locales/ja.json`
- `web/src/locales/en.json`

Search if needed:

```bash
rg "MemoEditor|TagSuggestions|useTagCounts|content: state.content|memo.content|#tag|tags" web/src
```

## Files To Edit

Likely targets:

- `web/src/components/MemoEditor/`
- A new tag helper under `web/src/components/MemoEditor/services/` or `web/src/lib/`
- A new small tag section/chip component under `web/src/components/MemoEditor/components/`
- `web/src/locales/ja.json`
- `web/src/locales/en.json`
- Focused tests if the project has an obvious test location/pattern for pure helpers

Do not edit backend, proto, database migrations, Docker, CI, or deployment files.

## Required Behavior

### Tag-only line extraction

Add or reuse a pure helper that extracts only a trailing tag-only line from memo content.

A tag-only line is a line that contains only tags and whitespace.

Examples that should be extracted:

```md
#game #memo
#restaurant/example #food/hamburger
```

Examples that must stay in the body:

```md
Today I wrote about #game.
```

Only the final trailing tag-only line should be managed by the dedicated tag UI in this phase.

### Normalization

Allowed normalization:

- Trim surrounding whitespace.
- Remove one leading `#` for UI state.
- Remove empty tags.
- Remove duplicates.
- Preserve `/`.
- Preserve Japanese text.
- Preserve case unless the existing Memos behavior clearly requires otherwise.

Slash-style tags must survive exactly:

```txt
restaurant/繝悶Ο繝ｳ繧ｳ繝薙Μ繝ｼ
food/hamburger
game/FF14
PC/mic
```

### Save behavior

When saving:

1. Take current body text from the editor.
2. Remove any trailing tag-only line controlled by the tag UI.
3. Normalize tags from the tag UI.
4. Append one trailing tag line if tags exist.
5. Save using the existing Memos create/update flow.

If no tags exist, save only the body text without an extra tag line.

### Edit behavior

When editing an existing memo:

- If the content ends with a tag-only line, show those tags as chips in the dedicated tag section.
- Show the remaining content in the body editor.
- Do not extract inline prose tags.
- Do not delete existing `#photo`; treat it as a normal tag if it is part of the trailing tag line.

### UI behavior

Add a compact dedicated tag section to create and edit memo UI.

It should support:

- Showing tags as chips.
- Adding a tag manually.
- Removing a tag.
- Preventing duplicates.
- Preserving slash-style tags.
- Reusing existing tag suggestions if feasible.

Preferred labels:

- Japanese: `タグ`, `タグを追加`
- English: `Tags`, `Add tag`

Use the existing i18n mechanism if new labels are needed.

## Constraints

- Keep changes localized.
- Prefer pure helper functions for parsing/serialization.
- Prefer new small components over broad rewrites of `MemoEditor`.
- Do not add runtime dependencies unless absolutely necessary.
- Do not change API contracts.
- Do not change database schema.
- Do not change resource/attachment handling.
- Do not auto-add `#photo`.
- Do not auto-delete existing `#photo`.
- Do not change calendar or time behavior.
- Do not change Docker, CI, GHCR, Portainer, or Cloudflare behavior.

## Non Goals

- Separate tag tables.
- Bulk migration of existing memos.
- Tag colors or metadata management changes.
- Tag reorder UI.
- Image grid.
- Image resource filtering.
- Image optimization.
- Preview/thumbnail generation.

## Verification

Run:

```bash
git status --short --branch
cd web
pnpm lint
```

If focused tests are added:

```bash
cd web
pnpm test -- <test-name-or-pattern>
```

Manual verification checklist:

- Create a memo with body only. Confirm no tag line is appended.
- Create a memo with tags from the dedicated UI. Confirm stored content ends with one Memos-compatible tag line.
- Edit a memo with a trailing tag-only line. Confirm tags appear in the tag UI and are removed from the body editor.
- Add and remove tags. Confirm stored trailing tag line updates.
- Add `restaurant/繝悶Ο繝ｳ繧ｳ繝薙Μ繝ｼ`. Confirm `/` and Japanese text are preserved.
- Confirm inline prose tag text is not extracted.
- Confirm existing tag search/sidebar behavior still works.
- Attach an image and create a memo. Confirm `#photo` is not auto-added.

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
