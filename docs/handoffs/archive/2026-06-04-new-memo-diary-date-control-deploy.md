# 2026-06-04 New memo diary date control deploy verification

This handoff is for ClaudeCode to verify the deployed new-memo diary date control.

## Context

The implementation is already present locally:

- Normal new memo creation shows a compact diary date control.
- Clicking the control initializes `createTime` and `updateTime` to `new Date()`.
- After initialization, the existing `TimestampPopover` is shown.
- `memoService.save()` already sends custom `createTime` / `updateTime` for create mode.
- Comment editors do not show the new control.
- Existing edit mode and `displayTime:YYYY-MM-DD` calendar prefill should remain unchanged.
- `displayMonth:YYYY-MM` should not auto-prefill a timestamp.

## Pre-Deploy Checks

Confirm the GitHub Actions build for the implementation commit completed successfully and pushed:

```txt
ghcr.io/iniwa/memos-diary-fork:latest
```

If the latest image is not available yet, wait for CI before asking the user to redeploy.

## User Action Required

Ask the user to redeploy `memos-diary` in Portainer using:

```txt
ghcr.io/iniwa/memos-diary-fork:latest
```

After redeploy, ask for:

```bash
docker logs --tail 80 memos-diary
```

Expected:

- version banner reflects the new build
- app starts on port `5231`
- no `WARN`, `ERROR`, or `panic`

## Browser Smoke Test

Use:

```txt
http://192.168.1.205:5231
```

or:

```txt
https://memos-diary.iniwach.com
```

### 1. Normal Create Control

1. Open the home timeline.
2. Confirm the normal new memo editor shows:

```txt
日記日付を変更
```

or English:

```txt
Set diary date
```

3. Click it.
4. Confirm the timestamp display appears immediately.

### 2. Create With Past Diary Date

1. Open the timestamp popover.
2. Change both created-at and updated-at to a past date/time.
3. Save a short test memo.
4. Confirm the created memo appears at the selected date/time.
5. Delete the test memo.

### 3. No Stale Manual Date

After deleting the test memo:

1. Return to normal home create editor.
2. Confirm the editor shows the date control button again.
3. Confirm it does not keep the previous manually selected date unless the user clicks the control again.

### 4. `displayTime` Regression

1. Click a calendar day.
2. Confirm URL contains:

```txt
filter=displayTime:YYYY-MM-DD
```

3. Confirm timestamp display appears immediately with the selected date.

### 5. `displayMonth` Behavior

1. Click a calendar month header or manually apply:

```txt
filter=displayMonth:YYYY-MM
```

2. Confirm the timestamp display is not auto-prefilled.
3. Confirm the manual diary date control is available.

### 6. Comment Editor

1. Open a memo detail page.
2. Open the comment editor.
3. Confirm the diary date control is absent.

## Test Data Cleanup

Delete any test memo created during verification.

## Not In Scope

- Do not run destructive maintenance commands.
- Do not change image grid, optimizer, tags, calendar filters, or operations docs.
- Do not leave test memos behind.

## Expected Report

Report in Japanese:

```md
## Deployed Version
- ...

## Runtime Logs
- ...

## UI Verification
- normal create date control: ...
- past date save: ...
- no stale manual date: ...
- displayTime regression: ...
- displayMonth behavior: ...
- comment editor unchanged: ...

## Test Data Cleanup
- created: ...
- deleted: ...

## Issues Found
- ...

## Notes For Codex
- normal create date control deployed: yes/no
- selected createTime/updateTime saved: yes/no
- manual date cleared after save: yes/no
- displayTime prefill unchanged: yes/no
- displayMonth no auto-prefill: yes/no
- comment editor control absent: yes/no
```
