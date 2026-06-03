# 2026-06-03 Month-level calendar filter handoff

This handoff is for ClaudeCode to implement the remaining `iniwa-issues.md` item.

## Goal

Allow users to filter the memo timeline by month from the calendar UI.

Example:

```txt
Click May 2026 / 2026-05 in the calendar year picker
-> timeline filters to memos from 2026-05-01 through 2026-05-31
```

Day-level filtering already exists:

```txt
displayTime:YYYY-MM-DD
```

Keep that behavior unchanged.

## Current State

Relevant issue:

```txt
iniwa-issues.md
```

Current calendar/date behavior:

- `MonthCalendar` day cells call `onClick(date)`.
- `CalendarCell` allows empty in-month days to be clicked.
- `useDateFilterNavigation()` navigates to `?filter=displayTime:YYYY-MM-DD`.
- `useMemoFilters()` converts `displayTime` into a 1-day `created_ts` range.
- `PagedMemoList` uses the active `displayTime` filter to seed create-mode `defaultCreateTime`.
- Phase 10 verified selected-date memo creation works.

## Suggested Design

Add a separate filter factor:

```txt
displayMonth:YYYY-MM
```

Do not overload `displayTime`.

Expected URL:

```txt
?filter=displayMonth:2026-05
```

Expected backend filter expression:

```txt
created_ts >= <start-of-local-month-utc-seconds> && created_ts < <start-of-next-local-month-utc-seconds>
```

Use local timezone boundaries in the same spirit as current `displayTime` handling.

## Required UX

### Year calendar month header

In the year picker, each month card already has a header:

```tsx
<header>{getMonthLabel(month)}</header>
```

Make that month label clickable when an `onMonthClick` handler is provided.

Clicking the label should:

1. apply `displayMonth:YYYY-MM`
2. navigate to the memo list route, same as date filtering
3. close the dialog if the click happens inside `MonthNavigator`

### Day cells

Keep day-cell behavior unchanged:

- clicking a day still applies `displayTime:YYYY-MM-DD`
- empty in-month dates remain clickable
- out-of-month dates remain non-interactive
- selected-date create-time prefill keeps using only `displayTime`

### Active filter chip

`MemoFilters` should show a calendar chip for `displayMonth`.

Suggested label:

```txt
2026-05
```

or, if easy and locale-safe:

```txt
May 2026
```

Keep it simple; `YYYY-MM` is acceptable.

### Filter interactions

When navigating to a month filter from the calendar, replace existing date/month calendar filters so the URL does not contain both:

```txt
displayTime:2026-05-12
displayMonth:2026-05
```

Other filters may be dropped if you follow the existing `useDateFilterNavigation()` behavior. Preserving non-calendar filters is optional, not required for this phase.

## Files To Inspect

Start with:

```txt
web/src/hooks/useDateFilterNavigation.ts
web/src/hooks/useMemoFilters.ts
web/src/contexts/MemoFilterContext.tsx
web/src/components/MemoFilters.tsx
web/src/components/ActivityCalendar/YearCalendar.tsx
web/src/components/ActivityCalendar/MonthCalendar.tsx
web/src/components/ActivityCalendar/CalendarCell.tsx
web/src/components/ActivityCalendar/types.ts
web/src/components/StatisticsView/MonthNavigator.tsx
web/src/components/StatisticsView/StatisticsView.tsx
web/src/components/MemoEditor/utils/deriveDefaultCreateTime.ts
```

Tests to inspect:

```txt
web/tests/derive-default-create-time.test.ts
web/tests/calendar-cell-empty-clickable.test.tsx
```

## Suggested Implementation Shape

### 1. Filter model

Add `"displayMonth"` to `FilterFactor`.

Update `MemoFilters` config to show it with `CalendarIcon`.

### 2. Filter rendering

In `useMemoFilters()`, add handling:

```ts
filter.factor === "displayMonth"
```

Validate `YYYY-MM` shape before converting.

Compute:

- local month start
- local next month start
- UTC seconds for both boundaries

Then push:

```ts
created_ts >= start && created_ts < end
```

Avoid parsing loose values such as `2026-5`.

### 3. Navigation hook

Either extend `useDateFilterNavigation()` or add a new hook, for example:

```ts
useCalendarFilterNavigation()
```

It should expose:

```ts
navigateToDateFilter(date: string)
navigateToMonthFilter(month: string)
```

For minimal change, keeping `useDateFilterNavigation()` and adding a sibling `useMonthFilterNavigation()` is also acceptable.

### 4. YearCalendar / MonthCard

Add optional `onMonthClick?: (month: string) => void`.

Pass it from `YearCalendar` to each `MonthCard`.

Make the month header a button only when `onMonthClick` exists. Otherwise keep non-interactive header semantics.

### 5. StatisticsView / MonthNavigator wiring

There are two calendar contexts:

1. `StatisticsView` main month calendar: day cells navigate to date filters.
2. `MonthNavigator` year picker dialog: currently selecting a day changes the visible month.

For month filtering, wire the year-picker month header to the new month filter navigation when used from the home/statistics context.

Be careful not to break the existing behavior where clicking a day inside the `MonthNavigator` changes visible month and closes the dialog.

If the clean wiring requires a small prop addition to `MonthNavigator`, do that.

## Tests

Add focused tests. Suggested:

### Month filter query conversion

Test `useMemoFilters` or extract a small helper to test month range conversion.

Cases:

- `displayMonth:2026-05` -> start `2026-05-01 local`, end `2026-06-01 local`
- invalid values ignored:
  - empty
  - `2026-5`
  - `2026-13`
  - `not-a-month`

### Existing date prefill unchanged

Confirm `deriveDefaultCreateTimeFromFilters()` ignores `displayMonth`; it should only respond to `displayTime`.

This prevents month filtering from unexpectedly pre-filling a new memo date.

### UI click test if practical

If easy, add a component test verifying month header click calls `onMonthClick("YYYY-MM")`.

Do not overbuild Playwright tests for this phase unless already straightforward.

## Verification

Run:

```bash
pnpm lint
pnpm test --run
pnpm build
```

If Go code is untouched, no Go tests are required.

## Manual Smoke Test After Deploy

On `http://192.168.1.205:5231` or `https://memos-diary.iniwach.com`:

1. Open the calendar year picker.
2. Click a month header, e.g. May 2026.
3. Confirm URL has:

```txt
filter=displayMonth:2026-05
```

4. Confirm listed memos are from that month only.
5. Remove the filter chip and confirm normal timeline returns.
6. Click an individual day and confirm day filtering still works.
7. With `displayMonth` active, confirm the create editor does not show a selected-date timestamp popover.

## Constraints

- Do not change image grid, image optimizer, `#photo`, or operations docs.
- Do not change backend Go unless absolutely necessary; current timestamp filter string generation should be enough.
- Do not alter existing `displayTime` URL semantics.
- Do not make out-of-month day cells interactive.
- Do not introduce new dependencies for this.

## Expected Report

Report in Japanese:

```md
## Changed Files
- ...

## Summary
- ...

## Verification
- pnpm lint: ...
- pnpm test --run: ...
- pnpm build: ...

## Manual Check Notes
- ...

## Notes For Codex
- displayMonth filter factor added: yes/no
- displayTime behavior unchanged: yes/no
- create-time prefill ignores displayMonth: yes/no
- month header click replaces calendar filter: yes/no
```

