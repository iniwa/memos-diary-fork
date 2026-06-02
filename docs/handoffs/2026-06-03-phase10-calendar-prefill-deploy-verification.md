# 2026-06-03 Phase 10 calendar prefill deploy verification handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff before starting.

This handoff is for runtime verification of Phase 10. The implementation is already present in the fork via upstream commit:

```txt
ef550134 feat(memo): create memos on the selected calendar date (#5925)
```

No new implementation should be needed unless runtime verification finds a regression.

## Current Local Status

Branch:

```txt
diary-mode
```

Phase 10 implementation files already exist:

```txt
web/src/components/MemoEditor/utils/deriveDefaultCreateTime.ts
web/tests/derive-default-create-time.test.ts
web/tests/calendar-cell-empty-clickable.test.tsx
web/src/components/ActivityCalendar/CalendarCell.tsx
web/src/components/MemoEditor/hooks/useMemoInit.ts
web/src/components/MemoEditor/index.tsx
web/src/components/MemoEditor/types/components.ts
web/src/components/PagedMemoList/PagedMemoList.tsx
```

Local checks already reported by ClaudeCode:

```txt
pnpm test derive-default-create-time      passed, 6/6
pnpm test calendar-cell-empty-clickable   passed, 4/4
pnpm lint                                passed, 379 files
pnpm test                                passed, 23 files / 103 tests
pnpm build                               passed, existing chunk warnings only
```

Known untracked local artifacts:

```txt
.playwright-mcp/
actions-page.png
build-diary-image.png
step2-home.png
```

Do not commit these. Remove only if the user confirms they are disposable verification artifacts.

## Goal

Deploy the current `diary-mode` image and verify the calendar-date memo creation workflow on the real Diary Mode instance:

```txt
http://192.168.1.205:5231
```

## Deployment Context

Flow:

```txt
Gitea push -> GitHub mirror -> GitHub Actions -> GHCR -> manual Portainer redeploy
```

Runtime:

```txt
Container: memos-diary
Image:     ghcr.io/iniwa/memos-diary-fork:latest
Data dir:  /var/opt/memos
```

Portainer webhook is not used.

## Required CI / Deploy Checks

1. Confirm GitHub Actions build succeeds for the latest `diary-mode` commit.
2. Confirm GHCR `latest` image is updated.
3. Ask the user to redeploy `memos-diary` in Portainer if not already redeployed.
4. After redeploy, verify:

```bash
curl -I http://192.168.1.205:5231
docker logs --tail 80 memos-diary
```

Expected:

- App responds.
- Logs are INFO/OK only.
- No WARN / ERROR / panic.
- Deployed version corresponds to the new image.

## Runtime Verification

Use:

```txt
http://192.168.1.205:5231
```

### 1. Existing-date click

1. Open Home.
2. Click a calendar date that already has memos.
3. Verify URL/filter changes to the selected `displayTime:YYYY-MM-DD`.
4. Verify the Home create editor shows the timestamp popover.
5. Verify the prefilled timestamp date matches the selected calendar date.
6. Create a small test memo.
7. Verify the saved memo appears under the selected date.
8. Delete the test memo after verification if it is only test data.

### 2. Empty-date click

1. Find an in-month date with zero memos.
2. Click it.
3. Verify it is clickable and applies `displayTime:YYYY-MM-DD`.
4. Verify the Home create editor shows the timestamp popover.
5. Create a small test memo.
6. Verify the date now has the new memo.
7. Delete the test memo after verification if it is only test data.

### 3. Filter clear behavior

1. Clear the date filter.
2. Verify create-mode timestamp popover disappears.
3. Create mode should return to normal server-stamped "now" behavior.

Avoid creating unnecessary real memos for this check if UI state alone is enough.

### 4. Edit mode unchanged

1. Open an existing memo for edit.
2. Verify edit-mode timestamp popover behavior is unchanged.
3. Do not save unless a deliberate no-op save is safe.

### 5. Comment editor unchanged

1. Open a memo detail/comment area if available.
2. Verify comment editor does not show the create-mode timestamp popover.
3. Do not create a comment unless needed.

## Important Assertions

Confirm:

- Empty in-month dates are clickable.
- Out-of-month dates remain non-interactive.
- `createTime` and `updateTime` are both prefilled for Home create mode when a date filter is active.
- The derived timestamp uses selected local date + current local hh:mm:ss.
- Clearing the filter removes the default timestamp behavior.
- Edit mode ignores `defaultCreateTime`.
- Comment editor is unchanged.

## Stop Conditions

Stop and report if any of these occur:

- CI build fails.
- App fails after redeploy.
- Logs show WARN / ERROR / panic.
- Empty in-month dates are still not clickable.
- Out-of-month dates become clickable.
- Create editor does not show timestamp popover with a date filter.
- Saved memo lands on the wrong date.
- Filter clear leaves stale timestamp behavior.
- Edit mode or comment editor behavior changes.
- Test memo deletion fails.

## Expected Report

Report in Japanese:

```md
## Deployed Version
- ...

## Runtime Logs
- ...

## UI Verification
- existing-date click: ...
- empty-date click: ...
- filter clear: ...
- edit mode unchanged: ...
- comment editor unchanged: ...

## Test Data Cleanup
- created memos: ...
- deleted memos: ...
- remaining test data: ...

## Issues Found
- ...

## Not Verified
- ...

## Notes For Codex
- empty dates clickable: yes/no
- createTime/updateTime both prefilled: yes/no
- selected date save works: yes/no
- filter clear restores normal create behavior: yes/no
- edit/comment behavior unchanged: yes/no
- untracked Playwright/screenshots: removed/left untouched
```
