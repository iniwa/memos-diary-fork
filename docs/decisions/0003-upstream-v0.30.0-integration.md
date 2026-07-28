# 0003 — Upstream v0.30.0 Integration Decisions

**Date**: 2026-07-28
**Status**: Active
**Baseline**: `.upstream-version` = `v0.29.1` → target `v0.30.0`

## Context

Upstream released Memos `v0.30.0`. A read-only survey of `v0.29.1..v0.30.0`
found 115 commits across 624 files (+45,273 / −29,091), against 129
fork-changed files since the same baseline, with 28 overlapping files
(`AGENTS.md` excluded — it is restored by the preparation script).

The survey is recorded in
`docs/plans/2026-07-28-upstream-v0.30.0-integration.md`.

Three items could not be resolved without a design decision and were returned
to the user. This record fixes those three answers.

## Decision 1 — Accept the upstream 0.30 database migration

The upstream release adds `store/migration/{sqlite,mysql,postgres}/0.30/00__user_tag_setting.sql`,
which copies the instance-level `TAGS` setting into a per-user
`user_setting` row, together with `UserSetting.Key.TAGS = 8` and the new
`TagsUserSetting` / `UserTagMetadata` messages in
`proto/store/user_setting.proto`.

**Accepted.** This is an upstream-owned schema change and is taken as shipped.
The fork does not add, modify, or reorder migration files.

Constraints:

- Take a backup following `docs/diary-mode-operations.md` **before** the new
  image reaches the running Diary Mode instance. The migration writes rows.
- Do not add fork-local migration files under `store/migration/0.30/`.
- The new per-user tag metadata (background colour, blur) is a separate layer
  from the fork's `TagSection`. It neither replaces nor conflicts with the
  fork's boundary tag line handling.

## Decision 2 — Reset `displayMonth` to upstream behaviour during the merge

Upstream changed the CEL filter contract: `created_ts` / `updated_ts` moved
from `IntType` to `TimestampType`, and the `now()` function was replaced by a
`now` variable. Upstream also added timestamp accessors
(`getFullYear()`, `getMonth()`, …) rendered to per-dialect SQL.

The fork's month-level calendar filter emits `created_ts >= <epoch int>`, which
no longer type-checks under the new contract.

**Decision: do not port the fork's `displayMonth` implementation through the
v0.30.0 merge.** The filter layer and the calendar UI take the upstream
`v0.30.0` shape as-is. `displayMonth` is rebuilt afterwards, as a separate
slice, on top of the new timestamp accessors — expressed as
`created_ts.getFullYear() == YYYY && created_ts.getMonth() == MM` rather than a
hand-computed epoch range.

Files that revert to upstream in the merge:

- `web/src/hooks/useMemoFilters.ts` (`parseMonthFilterRange` and the
  `displayMonth` branch)
- `web/src/hooks/useMonthFilterNavigation.ts` (fork-only; removed)
- `web/src/hooks/index.ts` (the `useMonthFilterNavigation` export only)
- `web/src/components/MemoFilters.tsx` (the `displayMonth` filter config only)
- `web/src/contexts/MemoFilterContext.tsx` (the `displayMonth` factor only)
- `web/src/components/StatisticsView/MonthNavigator.tsx`
- `web/src/components/StatisticsView/StatisticsView.tsx`
- `web/src/components/ActivityCalendar/YearCalendar.tsx`
- `web/src/components/ActivityCalendar/types.ts`
- `web/src/types/statistics.ts`
- `web/tests/display-month-filter.test.ts` (removed)
- `web/tests/derive-default-create-time.test.ts` — the single
  `displayMonth` case is removed; the rest of the file stays, because
  `deriveDefaultCreateTime` belongs to `DiaryDateControl`, not to this filter.

Explicitly **not** covered by this decision — these fork features are retained
through the merge:

- `attachment.hasImage` / `has_image_attachment`
  (`internal/filter/schema.go`, `internal/filter/render.go`,
  `FieldKindExistsSubquery`) — a separate feature that stays.
- `DiaryDateControl` and `deriveDefaultCreateTime`.
- The `displayTime` day filter, which upstream itself migrated to
  `timestamp(N)`.

**Consequence: month-level calendar filtering is unavailable between the
v0.30.0 merge and the rebuild slice.** This is accepted in exchange for a
clean filter-layer merge.

## Decision 3 — Keep the diary editor UI as external add-ons

Upstream rebuilt the editor on CodeMirror as a decorated-source WYSIWYG.
`Editor/TagSuggestions.tsx`, `Editor/commands.ts`, `Editor/shortcuts.ts`,
`Editor/SlashCommands.tsx`, `Editor/useSuggestions.ts`,
`hooks/useDragAndDrop.ts`, `hooks/useKeyboard.ts`, and
`components/EditorToolbar.tsx` are deleted; `EditorContent.tsx` now hosts
CodeMirror behind an `EditorController` contract and surfaces file input as a
single `onFiles(files: File[])` callback.

**Decision: `TagSection` and `DiaryDateControl` stay external add-ons mounted
around the editor host, not extensions inside CodeMirror.**

This means:

- `TagSection` and `DiaryDateControl` remain plain React components under
  `web/src/components/MemoEditor/components/`, mounted from
  `MemoEditor/index.tsx` around `<EditorContent>`, exactly as today.
- The editor's own content model is untouched; `state.tags` / `SET_TAGS` and
  the `serializeTagContent` / `extractBoundaryTagLines` round trip stay in
  `state/`, `services/memoService.ts`, and `hooks/useMemoInit.ts`.
- No fork code is added to `Editor/extensions.ts`, `Editor/controller.ts`, or
  `Editor/tagAutocomplete.ts`.
- The legacy-tag hiding that the fork added to the deleted
  `Editor/TagSuggestions.tsx` (`isHiddenLegacyTag`) is **not** re-added to
  upstream's `Editor/tagAutocomplete.ts`. Legacy tag hiding stays in
  `TagSection` and in the read-side `MemoBody`, where `getVisibleDiaryTags`
  already applies it. Upstream's in-editor `#tag` autocomplete therefore keeps
  its upstream behaviour.
- The bulk-upload stabilisation (`createLocalFiles`, sequential reads) is
  re-attached to upstream's `onFiles` callback in `EditorContent.tsx` rather
  than to the deleted paste/drop handlers.

Rationale: the add-on boundary keeps fork code out of the CodeMirror
extension surface, which is the part of upstream most likely to churn again.

## Consequences

- The merge can proceed without an unresolved design question.
- One fork feature regresses temporarily (Decision 2) and is tracked as
  follow-up work.
- One data-affecting change enters the deployment path (Decision 1) and gates
  the deploy on a fresh backup.
- The editor slice is bounded: re-mount the add-ons and re-attach `onFiles`,
  rather than reimplement tag handling inside CodeMirror.

## Follow-up

- Rebuild `displayMonth` on the CEL timestamp accessors, after the merge is
  committed and verified. Track in `iniwa-issues.md`.
- Re-evaluate whether upstream's per-user tag metadata (colour, blur) should be
  surfaced in the Diary Mode UI. Not in scope for the merge.
