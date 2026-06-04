# 2026-06-04 New memo diary date control

This handoff is for ClaudeCode to implement a create-mode diary date control in the MemoEditor.

## Goal

When creating a new normal memo, the user should be able to change the diary date/time before saving.

Current behavior:

- If the user starts from a `displayTime:YYYY-MM-DD` calendar day filter, `defaultCreateTime` seeds `state.timestamps.createTime/updateTime`.
- In that case `TimestampPopover` appears and can edit timestamps before save.
- In normal create mode, `state.timestamps.createTime` is undefined, so no timestamp UI appears and the backend stores "now".

Desired behavior:

- Normal new memo creation should expose a compact "diary date" control.
- The user can opt in to a custom timestamp, edit it, and then save.
- The created memo should use the selected `createTime` and `updateTime`.

## Scope

In scope:

- Frontend only.
- Normal create mode (`!memo && !parentMemoName`).
- Reuse the existing `TimestampPopover` and `state.timestamps` save path where practical.

Out of scope:

- Backend changes.
- Batch migration.
- Calendar filter behavior changes.
- Comment editor timestamp override.
- Changing existing memo edit behavior except where shared component cleanup is required.

## UX Specification

### Normal New Memo

For normal new memo creation:

```ts
!memo && !parentMemoName
```

Show a small date control in the editor chrome, near the existing timestamp area above the editor body.

Recommended behavior:

1. If `state.timestamps.createTime` is undefined:
   - show a subdued button such as:

```txt
日記日付を変更
```

   - English locale:

```txt
Set diary date
```

2. On click:
   - initialize both `createTime` and `updateTime` to `new Date()`
   - show the existing `TimestampPopover`

3. The user edits the timestamp in `TimestampPopover`.
4. Save uses `memoService.save()` as-is, because create mode already sends:

```ts
createTime: state.timestamps.createTime ? timestampFromDate(state.timestamps.createTime) : undefined
updateTime: state.timestamps.updateTime ? timestampFromDate(state.timestamps.updateTime) : undefined
```

### Calendar Day Prefill

Keep existing behavior unchanged:

- `displayTime:YYYY-MM-DD` still seeds `defaultCreateTime`.
- `TimestampPopover` is visible immediately.
- Saving multiple memos under the same day filter should continue to re-seed the selected date after save.

### Month Filter

Keep existing behavior unchanged:

- `displayMonth:YYYY-MM` must not prefill create time.
- The new manual date control may still be available in normal create mode while `displayMonth` is active, because it is explicitly user-triggered.

### Comments

Do not show the new diary date control for comment creation:

```ts
parentMemoName
```

Comment timestamp behavior should remain backend/default.

### Edit Mode

Existing memo edit mode already shows `TimestampPopover` through:

```tsx
memoName || (!memo && state.timestamps.createTime)
```

Keep edit behavior unchanged.

## Implementation Notes

Relevant files:

```txt
web/src/components/MemoEditor/index.tsx
web/src/components/MemoEditor/components/TimestampPopover.tsx
web/src/components/MemoEditor/components/index.ts
web/src/components/MemoEditor/services/memoService.ts
web/src/components/MemoEditor/hooks/useMemoInit.ts
web/src/components/MemoEditor/state/actions.ts
web/src/components/MemoEditor/state/types.ts
web/src/locales/en.json
web/src/locales/ja.json
```

### Suggested Shape

Minimal option:

- Add a small helper/control in `MemoEditor/index.tsx`:
  - compute `isNormalCreateMode = !memo && !parentMemoName`
  - compute `shouldShowTimestampPopover = memoName || (!memo && state.timestamps.createTime)`
  - render:
    - `TimestampPopover` when `shouldShowTimestampPopover`
    - otherwise, in normal create mode, a button that dispatches:

```ts
const now = new Date();
dispatch(actions.setTimestamps({ createTime: now, updateTime: now }));
```

Better option:

- Extract a small component, for example:

```txt
web/src/components/MemoEditor/components/DiaryDateControl.tsx
```

Responsibilities:

- read editor state from `useEditorContext()`
- show `TimestampPopover` when `createTime` exists
- otherwise show the "Set diary date" button
- initialize timestamps on click

This keeps `MemoEditor/index.tsx` less crowded.

### Reset After Save

Current save flow does:

```ts
dispatch(actions.reset());
if (!memoName && defaultCreateTime) {
  dispatch(actions.setTimestamps({ createTime: defaultCreateTime, updateTime: defaultCreateTime }));
}
```

Required behavior after saving a normal manually dated memo:

- If there is no `defaultCreateTime`, reset should clear the manual timestamp.
- The next new memo should return to the default "now" backend behavior unless the user clicks the date control again.

Do not accidentally preserve a manual date across unrelated new memos.

## Tests

Add focused tests if existing test setup makes it practical.

Suggested component-level tests:

1. Normal create editor shows the new date control (`Set diary date` / `日記日付を変更`).
2. Clicking the control reveals the timestamp popover/display.
3. Comment editor does not show the date control.
4. `defaultCreateTime` path still shows timestamp display immediately.

If component testing MemoEditor is too heavy, at minimum add a small unit test around any extracted helper and rely on `pnpm lint` / build plus manual smoke.

## Verification

Run:

```bash
pnpm lint
pnpm test --run
pnpm build
```

No Go tests are required unless backend code is touched.

## Manual Smoke Test After Deploy

On:

```txt
http://192.168.1.205:5231
```

or:

```txt
https://memos-diary.iniwach.com
```

Verify:

1. Normal home editor shows the new diary date control.
2. Click it, change date/time to a past date, save a test memo.
3. Confirm the memo appears at the selected date/time.
4. Delete the test memo.
5. Start another normal memo and confirm no stale manual date remains unless the user clicks the control again.
6. Click a calendar day (`displayTime:YYYY-MM-DD`) and confirm the timestamp popover still appears immediately.
7. Open a `displayMonth:YYYY-MM` filter and confirm it does not auto-prefill timestamp.
8. Open a comment editor and confirm the new diary date control is absent.

## Constraints

- Keep UI compact. This is an editor control, not a new settings panel.
- Do not add a large calendar picker unless it is already available and easy to reuse.
- Use existing design tokens/classes and existing popover/input behavior.
- Do not change `memoService.save()` unless a bug is found; it already supports custom timestamps.
- Do not touch image grid, optimizer, tag cleanup, or operations docs unless required for the report.

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
- normal create date control: yes/no
- comment editor unchanged: yes/no
- displayTime prefill unchanged: yes/no
- displayMonth no auto-prefill: yes/no
- manual date does not persist after save: yes/no
```
