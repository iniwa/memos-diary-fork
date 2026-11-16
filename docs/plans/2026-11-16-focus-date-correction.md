# Focus-mode diary date correction

Date: 2026-11-16. NIWA-155, P2 return from NIWA-148. Writer: Task-Worker-Sol.
Stable local candidate awaiting Leader acceptance and the same independent
reviewer. Decision 0004's correction contract was reset by Leader; earlier
acceptance and validation records remain historical evidence.

## Correction and regression

An undated new top-level memo in inline focus mode or the global hosted
composer hid DiaryDateControl. The header's TimestampPopover rendered only
noninteractive Now text; leaving hosted focus closes the composer.

Change only the header's component choice in `EditSession.tsx`: new top-level
memos use existing DiaryDateControl, which seeds createTime/updateTime together
and becomes TimestampPopover after setting a date. Existing memos and comments
retain TimestampPopover. The existing lower non-focus control and its exclusion
conditions remain unchanged, so each state has one date operation.

New `web/tests/memo-editor-focus-date.test.tsx` uses real MemoEditor,
EditSession, controls, store, save hook, mutations, and GlobalMemoEditorProvider.
Only account/network/layout boundaries are mocked. Five focused cases cover:

- Hosted global and inline focus: undated draft → one setting action → equal
  initial create/update seeds → independent edits → actual create API payload
  retaining draft content/tags and PRIVATE visibility. Inline exit/reentry
  retains one control; successful hosted save closes the dialog.
- Calendar-seeded focus/non-focus: one editable control with both initial times.
- Existing memo: one control retaining distinct original create/update times.
- New comment: no independent diary date setting in either focus state.

The final test version was run with the old header selection: two failures
(hosted/inline missing date action), three passes, exit 1. Restoring the single
component selection passes all five cases. The initial test harness needed its
reset fetch mock, edited-label matching and real mutation query-key exports;
these were corrected before that final red/green pair. No production behavior
was changed to accommodate the harness.

## Verification and boundaries

Commands run from `web` through `corepack.cmd pnpm`; logs are private under
`.niwa155-integration/`. Final checks exit 0:

| Check | Result / log |
| --- | --- |
| `pnpm test tests/memo-editor-focus-date.test.tsx` | Five passed; `focus-green.txt`; final pre-fix reproduction: `focus-red-final.txt` |
| Focused timestamp/global/source-mode/init/date-filter/diary/task/Space tests | Nine files / 84 tests; `focus-related.txt` |
| `pnpm lint` | TypeScript/Biome, 692 files; `focus-lint.txt` |
| `pnpm test` | 201 files / 1677 tests; `focus-all-tests.txt` |
| `pnpm release` | Fresh assets; `focus-release.txt` |
| `go build ./...` | New-assets native embedding; `focus-native-build.txt` |
| `GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o .niwa155-integration/memos-focus-linux-arm64 ./cmd/memos` | New-assets cross-build; `focus-arm64-build.txt` |

Passed: stable self-review, focused and full frontend checks, builds, whitespace,
Markdown references, unchanged index, protected-source comparison and fresh
manifest rehash. Backend/cache/API/image/locale/preparation-tool code, published
VERSION/provenance, proto/migrations, November 5 evidence and AGENTS policy/runtime
are unchanged from the handed-back 1717-entry snapshot. That exact manifest,
SHA256 `8e7c229918aa59c59eb0ff065eef7d9b0f44dbfc0a99408633100b2af890b267`,
was verified with zero differences and preserved privately before editing.

No local blocker or unmet worker criterion remains. Pending external acceptance:
same-reviewer review, actual browser/touch behavior and Leader's assessment of
new-assets Pi image/smoke. The earlier published-candidate Pi SQLite/backend
evidence still covers the unchanged backend; its image/startup pass does not
cover these regenerated frontend assets. No repeated backend suite/lint was
needed for this frontend-only change. No Pi operation, stage, commit/push,
publication, configuration or production-data operation was performed.

The refreshed `2026-11-16-published-source-manifest.json` uses the existing
all-source/all-assets rules, policy-only AGENTS hash and self/private exclusions.
Its fresh hash and zero-difference verification are delivered in the NIWA-155
thread. Source is frozen at delivery; all commands have ended, no listener or
background work remains, and sole writer ownership returns to Leader.
