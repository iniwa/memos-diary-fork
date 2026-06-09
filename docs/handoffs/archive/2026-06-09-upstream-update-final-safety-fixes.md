Read AGENTS.md, CLAUDE.md, the original upstream-update handoff, both review
handoffs, and this handoff before editing.

The repository is currently in an active, uncommitted merge. Do not abort,
commit, push, or deploy it.

## Goal

Fix two final safety issues found in the future-update preparation logic, then
leave the corrected v0.29.1 merge staged for final Codex review.

## Confirmed Good

The previous review fixes are correct:

- Local-only files are restored through `finally`.
- File bytes and PowerShell 5.1 compatibility are preserved.
- Baseline and target tags are fetched directly from canonical upstream.
- New release detection intentionally fails visibly.
- `git reset --hard` was removed.
- `server/router/frontend/dist/index.html` is clean.
- Upstream `docs/superpowers/` files should remain included.

Do not undo those changes.

## Findings To Fix

### 1. Reject downgrade or divergent targets

The script currently rejects only `$current -eq $Tag`.

If an operator passes an older tag such as `v0.29.0` while the marker is
`v0.29.1`, `git merge --no-commit v0.29.0` can report "Already up to date",
after which the script incorrectly rewrites `.upstream-version` to `v0.29.0`.

After both tags are fetched, require the current baseline tag to be an ancestor
of the target tag:

```powershell
git merge-base --is-ancestor $current $Tag
```

Abort before saving files or starting the merge when the ancestry check fails.
This rejects downgrades and divergent history. Report a clear error explaining
that only forward upstream updates are allowed.

### 2. Calculate fork-only changes from the current baseline

The script currently reports fork changes using `original..HEAD`.

After v0.29.1 is integrated, that range includes upstream v0.29.1 changes as if
they were fork-specific. Future overlap reports will accumulate false
positives.

Use the reviewed current baseline from `.upstream-version`:

```text
$current..HEAD
```

The overlap should mean:

- upstream changes: `$current..$Tag`
- fork changes since current baseline: `$current..HEAD`

Update output labels, comments, procedure documentation, and the decision note
where needed so they describe this behavior accurately.

## Files To Edit

- `scripts/prepare-upstream-update.ps1`
- `docs/upstream-update-process.md`
- `docs/decisions/0002-upstream-update-policy.md`

Do not edit or stage `AGENTS.md` or `CLAUDE.md`.

## Constraints

- Preserve the active merge.
- Do not commit, push, deploy, or abort.
- Do not alter v0.29.1 application changes.
- Keep previous safety fixes intact.
- Keep LF line endings.

## Verification

- Parse the script with Windows PowerShell 5.1.
- Confirm the script rejects a target for which the current tag is not an
  ancestor.
- Confirm fork-change reporting uses `$current..HEAD`, not `original..HEAD`.
- Confirm the ancestry guard occurs before local-only file backup and merge.
- Run:

```powershell
git diff --check
git diff --cached --check
git diff --name-only --diff-filter=U
git status --short
git ls-files AGENTS.md CLAUDE.md
```

## Expected Report

- Changed files
- Fix summary for both findings
- Verification results
- Final `git status --short`
- Remaining blocked checks
