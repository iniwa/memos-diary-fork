# 2026-06-03 Month-level calendar filter deploy verification

This handoff is for ClaudeCode to verify the deployed month-level calendar filter after the latest diary-mode image is available in GHCR and redeployed through Portainer.

## Context

The implementation is already present locally:

- `displayMonth:YYYY-MM` was added as a memo filter factor.
- `useMemoFilters()` converts `displayMonth` into a local month range:
  - `created_ts >= local month start`
  - `created_ts < local next month start`
- The year calendar month header is clickable when `onMonthClick` is provided.
- `MonthNavigator` closes the year picker dialog after month-header selection.
- `deriveDefaultCreateTimeFromFilters()` ignores `displayMonth`, so month filtering must not trigger selected-date timestamp prefill.
- Existing `displayTime:YYYY-MM-DD` behavior should remain unchanged.

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

### 1. Month Header Click

1. Open the calendar year picker.
2. Click a month header such as May 2026.
3. Confirm the dialog closes.
4. Confirm the URL contains:

```txt
filter=displayMonth:2026-05
```

5. Confirm the timeline shows only memos from that month.

### 2. Active Filter Chip

Confirm the active filter chip appears with:

```txt
2026-05
```

Remove the chip and confirm the normal timeline returns.

### 3. Day Filter Regression

Click an individual day cell.

Expected:

```txt
filter=displayTime:YYYY-MM-DD
```

Confirm selected-date create-time prefill still appears for day filtering.

### 4. Month Filter Create Behavior

With `displayMonth:YYYY-MM` active, inspect the new memo editor.

Expected:

- no selected-date timestamp popover
- new memo creation uses normal current timestamp behavior

Do not leave test memos behind. If a memo is created, delete it before reporting completion.

### 5. Invalid/Edge Behavior

Optional quick URL checks:

```txt
?filter=displayMonth:2026-13
?filter=displayMonth:2026-5
```

Expected:

- app does not crash
- invalid month filters should not constrain results

## Not In Scope

- Do not change the implementation unless a concrete bug is found.
- Do not run destructive maintenance commands.
- Do not modify image optimizer, thumbnail backfill, `#photo` cleanup, or PWA settings.

## Expected Report

Report in Japanese:

```md
## Deployed Version
- ...

## Runtime Logs
- ...

## UI Verification
- month header click: ...
- displayMonth chip: ...
- day filter regression: ...
- month filter create behavior: ...

## Test Data Cleanup
- created: ...
- deleted: ...

## Issues Found
- ...

## Notes For Codex
- displayMonth deployed: yes/no
- month header closes dialog: yes/no
- month filter limits timeline correctly: yes/no
- displayTime regression: yes/no
- displayMonth does not prefill create time: yes/no
```
