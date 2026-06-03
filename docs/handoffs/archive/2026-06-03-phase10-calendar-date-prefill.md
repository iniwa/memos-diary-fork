# 2026-06-03 Phase 10 calendar date prefill handoff

Read `AGENTS.md`, `CLAUDE.md`, this handoff, and the referenced plan/spec before implementation.

## Goal

Implement the frontend-only calendar date prefill behavior:

When the user selects a date in the activity calendar and writes a new memo from the Home editor, the new memo should be created with `createTime` and `updateTime` set to the selected local date plus the current local time.

This makes back-dated diary entry creation a single-step workflow.

## Why This Is Next

Phase 9 is complete:

- `diary-30` deployed.
- image grid expansion verified.
- `#photo` UI hiding verified.
- `remove-photo-tag` cleanup finished.
- final cleanup dry-run reached `changed=0`.
- logs were clean.

The next highest-value Diary Mode workflow improvement is calendar-driven memo creation.

## Source Documents

Use these existing documents as the implementation source of truth:

```txt
docs/superpowers/specs/2026-05-02-calendar-date-prefill-design.md
docs/superpowers/plans/2026-05-02-calendar-date-prefill.md
```

The plan is detailed and task-oriented. Follow it unless the current codebase has drifted. If it has drifted, adapt conservatively and report what changed.

## Scope

Frontend only.

Expected user-visible behavior:

1. Empty in-month calendar dates are clickable.
2. Clicking any in-month date sets the existing `displayTime:YYYY-MM-DD` filter.
3. On Home, the create-mode editor receives a default timestamp derived from the active `displayTime` filter.
4. The create-mode editor shows the existing `TimestampPopover` when a derived timestamp exists.
5. `createTime` and `updateTime` are both set to selected local date + current local hh:mm:ss.
6. Clearing the date filter returns create-mode editor behavior to normal.
7. Edit mode and comment editor behavior remain unchanged.

## Non Goals

Do not implement:

- backend changes
- DB migrations
- proto changes
- calendar heatmap update-time basis
- new date/time UI
- sticky manual timestamp override semantics
- changes to `#photo`, image grid, image optimizer, thumbnail backfill, Docker, CI, or Portainer

The separate update-time heatmap plan exists here, but do not implement it in this phase:

```txt
docs/superpowers/plans/2026-05-02-activity-calendar-time-basis.md
```

## Current Repo Notes

- Branch: `diary-mode`
- Phase 9 cleanup is already done in production, but local code still contains the guardrails.
- There may be local untracked Playwright/screenshots from previous verification:

```txt
.playwright-mcp/
actions-page.png
build-diary-image.png
step2-home.png
```

Do not commit these. If they are no longer needed, remove them as verification artifacts and report that cleanup. If unsure, leave them untracked.

## Primary Files To Inspect

Start with these:

```txt
web/src/components/ActivityCalendar/CalendarCell.tsx
web/src/components/ActivityCalendar/types.ts
web/src/components/PagedMemoList/PagedMemoList.tsx
web/src/components/MemoEditor/index.tsx
web/src/components/MemoEditor/types/components.ts
web/src/components/MemoEditor/hooks/useMemoInit.ts
web/src/components/MemoEditor/components/TimestampPopover.tsx
web/src/contexts/MemoFilterContext.tsx
web/src/hooks/useDateFilterNavigation.ts
```

Also inspect existing tests around calendar/editor:

```txt
web/tests/calendar-cell-empty-clickable.test.tsx
web/tests/derive-default-create-time.test.ts
web/tests/memo-editor-cache.test.ts
```

Some tests may already exist from previous upstream/superpower work. Do not duplicate them blindly.

## Expected Implementation Shape

The referenced plan proposes:

1. Add a pure helper:

```txt
web/src/components/MemoEditor/utils/deriveDefaultCreateTime.ts
```

2. Add/adjust tests:

```txt
web/tests/derive-default-create-time.test.ts
web/tests/calendar-cell-empty-clickable.test.tsx
```

3. Make empty in-month `CalendarCell` clickable.

4. Add `defaultCreateTime?: Date` to `MemoEditor` create-mode props.

5. Pass `defaultCreateTime` from `PagedMemoList` by reading `MemoFilterContext`.

6. Sync create-mode editor timestamps when `defaultCreateTime` changes.

7. Render `TimestampPopover` in create mode only when `defaultCreateTime` / `state.timestamps.createTime` exists.

## Important Behavior Details

### Date derivation

For filter:

```txt
displayTime:2026-06-03
```

and local current time:

```txt
14:32:10
```

derive:

```txt
2026-06-03 14:32:10 local time
```

Set both:

```txt
createTime = derived date
updateTime = derived date
```

Use local `new Date(year, month - 1, day, h, m, s)` semantics.

Reject malformed dates defensively.

### Create mode only

`defaultCreateTime` must be ignored when editing an existing memo.

Comment editor must not change.

### Filter changes

If the active `displayTime` filter changes while a draft exists, re-sync the draft timestamps to the new derived date.

This intentionally overwrites manual timestamp edits made before the next filter change. That is the current accepted tradeoff.

### Filter cleared

When no `displayTime` filter exists, create mode returns to current behavior:

- no create-mode timestamp popover
- no explicit createTime/updateTime sent
- server stamps with now

## Verification

Run targeted tests first, then broad checks.

Suggested:

```bash
cd web
pnpm test derive-default-create-time
pnpm test calendar-cell-empty-clickable
pnpm lint
pnpm test
pnpm build
```

If a full test/build is too slow or blocked, report exactly what was skipped and why.

## Manual Smoke Test

After implementation, ask user/Claude runtime to verify on:

```txt
http://192.168.1.205:5231
```

Manual checks:

1. Click a date with existing memos.
   - URL gets `displayTime:YYYY-MM-DD`.
   - Home editor shows timestamp popover.
   - Create a memo.
   - Saved memo appears under the selected date.

2. Click an empty in-month date.
   - It is clickable.
   - URL gets `displayTime:YYYY-MM-DD`.
   - Editor timestamp is prefilled.
   - Create a memo.
   - Date now has the new memo.

3. Clear the date filter.
   - Create editor no longer shows timestamp popover.
   - New memo uses current date/time behavior.

4. Edit existing memo.
   - Existing edit-mode timestamp behavior is unchanged.

5. Add a comment/reply.
   - Comment editor behavior is unchanged.

## Stop Conditions

Stop and report before committing if:

- backend/proto/schema changes seem required
- comment editor behavior changes
- edit mode timestamp behavior regresses
- empty out-of-month calendar cells become clickable
- malformed `displayTime` throws instead of returning no default
- create mode sends stale timestamp after filter is cleared
- tests reveal unexpected editor cache/timestamp behavior

## Expected Report

Report in Japanese with:

```md
## Changed Files
- ...

## Summary
- ...

## Verification
- ...

## Manual Check Notes
- ...

## Blocked Checks
- ...

## Design Questions
- ...

## Notes For Codex
- ...
```

In `Notes For Codex`, explicitly mention:

- whether empty dates are clickable
- whether createTime/updateTime are both prefilled
- whether clearing the filter restores normal create behavior
- whether edit mode and comments are unchanged
- whether any previous Playwright/screenshots were removed or left untracked
