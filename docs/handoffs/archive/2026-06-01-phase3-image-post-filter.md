# 2026-06-01 Phase 3 Image Post Filter Handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff before editing.
If implementation would require a database migration or a broad API redesign, stop and report the tradeoff first.

## Goal

Add a filter that shows only memos with image attachments.

This must not depend on `#photo`. The filter should use attachment/resource data so older and newer image memos work without tag cleanup.

## Prerequisite

Run this after Phase 2 image grid work and the Phase 2 Live Photo regression fix have been completed or explicitly deferred.

Work from `diary-mode` or a `feature/image-post-filter` branch created from `diary-mode`.

Current known local state before this handoff:

- Phase 1 completed in commit `6aa1ab6f`.
- Phase 2 completed in commit `a9c80a82`.
- `diary-mode` may be ahead of `origin/diary-mode` by those commits if they have not been pushed yet.
- There is a focused handoff for the Phase 2 Live Photo split regression: `docs/handoffs/2026-06-01-phase2-live-photo-regression-fix.md`.

## Background

Memos already has a URL-synced memo filter system:

- `web/src/contexts/MemoFilterContext.tsx`
- `web/src/hooks/useMemoFilters.ts`
- `web/src/components/MemoFilters.tsx`
- `web/src/components/MemoExplorer/`

The frontend builds CEL-like filter strings and sends them to `ListMemos`.

Existing examples:

- `content.contains("...")`
- `tag in ["..."]`
- `pinned`
- `has_link`
- `has_task_list`
- `has_code`
- `created_ts >= ...`

The backend memo filter schema currently exposes memo fields and JSON payload properties in `internal/filter/schema.go`.
Attachment filtering exists separately for the attachment list via `NewAttachmentSchema`, but memo filtering does not currently appear to expose a "memo has image attachment" predicate.

For this feature, avoid client-side post-filtering of loaded memos because it breaks pagination and infinite lists.

## Files To Inspect

Start here:

- `web/src/contexts/MemoFilterContext.tsx`
- `web/src/hooks/useMemoFilters.ts`
- `web/src/components/MemoFilters.tsx`
- `web/src/components/MemoExplorer/MemoExplorer.tsx`
- `web/src/components/MemoExplorer/MemoExplorerDrawer.tsx`
- `web/src/components/MemoExplorer/TagsSection.tsx`
- `web/src/components/Sidebar/` if a sidebar/home navigation control is more appropriate
- `web/src/pages/Home.tsx`
- `web/src/pages/Explore.tsx`
- `web/src/pages/Archived.tsx`
- `web/src/pages/UserProfile.tsx`
- `web/src/utils/attachment.ts`
- `web/src/components/MemoMetadata/Attachment/attachmentHelpers.ts`
- `web/src/locales/ja.json`
- `web/src/locales/en.json`
- `internal/filter/schema.go`
- `internal/filter/render.go`
- `internal/filter/engine.go`
- `store/memo.go`
- `store/db/sqlite/memo.go`
- `store/db/mysql/memo.go`
- `store/db/postgres/memo.go`
- `store/test/memo_filter_test.go`
- `store/test/attachment_filter_test.go`

Search if useful:

```bash
rg "FilterFactor|useMemoFilters|MemoFilters|has_link|has_task_list|has_code|NewSchema|FindMemo|ListMemos|attachment" web/src internal store server
```

## Files To Edit

Likely targets:

- `web/src/contexts/MemoFilterContext.tsx`
- `web/src/hooks/useMemoFilters.ts`
- `web/src/components/MemoFilters.tsx`
- A small filter UI component under `web/src/components/MemoExplorer/` if that fits existing layout
- `web/src/locales/ja.json`
- `web/src/locales/en.json`
- `internal/filter/schema.go`
- `internal/filter/render.go` only if the schema cannot express the predicate cleanly
- Store/backend filter tests if Go is available or tests are already easy to adapt

Do not edit proto files unless there is no viable existing filter-string path.
Do not add database migrations for this phase.
Do not add `#photo` generation, cleanup, or migration.

## Required Behavior

### User behavior

Add an obvious, compact UI control to filter memo lists to image memos.

Expected behavior:

- User can turn "image memos only" on.
- User can turn it off from the control or from the existing active-filter chip row.
- The filter is reflected in the URL `filter=` parameter like other memo filters.
- Refreshing or sharing the URL preserves the filter.
- It works on Home.
- It should work anywhere the existing `MemoFilterContext` is used unless a page has a clear reason to hide it.

Preferred labels:

- Japanese: `画像あり`, `画像付きメモ`
- English: `Has image`, `Image memos`

Use the existing i18n mechanism.

### Filter semantics

The filter should match memos that have at least one image attachment.

Treat these MIME types as image attachments for this phase:

```txt
image/jpeg
image/jpg
image/png
image/webp
image/gif
image/avif
image/svg+xml
```

Notes:

- Apple Live Photo should match because the still member is an image attachment.
- Android motion photo containers should match if their MIME type is an image type.
- Video-only memos should not match unless they also have an image attachment.
- Audio/document-only memos should not match.
- Do not infer image status from filename if MIME type is available.

### Backend filtering

Prefer a server-side memo predicate such as:

```txt
has_image_attachment
```

Then have the frontend emit that predicate from `useMemoFilters`.

The SQL behavior should be equivalent to:

```sql
EXISTS (
  SELECT 1
  FROM attachment
  WHERE attachment.memo_id = memo.id
    AND attachment.type IN (...)
)
```

Implement this through the existing filter engine if possible.

Important:

- Keep the change compatible with SQLite, MySQL, and PostgreSQL.
- Avoid client-side filtering after `ListMemos` returns.
- Avoid joining in a way that duplicates memos or breaks existing ordering/pagination.
- If the existing filter renderer cannot express this as a field cleanly, make the smallest renderer/schema extension needed and document it.

### Frontend filter factor

Add a filter factor with a clear name, for example:

```ts
"attachment.hasImage"
```

Expected frontend mapping:

- URL factor: `attachment.hasImage`
- Server filter string: `has_image_attachment`
- Active filter chip: localized "Has image" / "画像あり"
- Icon: use an existing lucide icon such as `ImageIcon`

Use value `"true"` or an empty value consistently with the existing filter system. If you choose an empty value, verify parsing/stringifying does not lose the filter.

## Constraints

- No DB schema changes.
- No proto/API contract changes unless the existing filter string is impossible to extend safely.
- No image optimization.
- No preview/thumbnail generation.
- No upload behavior changes.
- No `#photo` behavior.
- No broad refactor of the memo filter system.
- Keep changes localized and upstream-merge-friendly.
- Do not commit automatically unless explicitly requested by the user.

## Non Goals

- Filtering by videos, audio, or documents.
- Filtering by image count.
- Filtering by Live Photo only.
- Gallery/library page changes.
- Attachment library changes.
- Image compression pipeline.
- Migration from `#photo`.
- Removing existing `#photo` tags.

## Verification

Run:

```bash
git status --short --branch
cd web
pnpm lint
pnpm build
```

If Go is installed or Docker-based Go checks are acceptable in the session, run focused backend tests:

```bash
go test ./internal/filter/... ./store/test/... -run "Filter|Memo"
```

If Go is not installed locally, report backend Go checks as blocked and explain that this phase includes backend filter code.

Manual verification checklist:

- Memo with no attachments does not appear when the image filter is active.
- Memo with one JPEG/PNG/WebP/GIF/AVIF/SVG attachment appears.
- Memo with a PDF/doc attachment only does not appear.
- Memo with audio only does not appear.
- Memo with video only does not appear.
- Memo with Apple Live Photo still + video appears once.
- Memo with image + document appears and still renders image grid plus document attachment.
- URL refresh preserves the active filter.
- Removing the active filter chip restores the normal memo list.
- Existing tag/search/date/pinned filters still combine with the image filter using AND behavior.
- Home list pagination or infinite loading does not show empty pages caused by client-side post-filtering.

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
