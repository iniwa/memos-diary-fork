# 2026-06-01 Phase 0 Repository Cleanup Handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff before editing.
If implementation would require changing behavior outside this handoff, stop and ask.

## Goal

Finish the small repository-foundation items that remain after the initial Diary Mode setup.

This task is intentionally narrow. It should make the repository easier to work in before feature implementation starts.

## Background

The repository name has been finalized as `memos-diary-fork`.

Current intended flow:

```txt
local diary-mode
  -> Gitea: git@gitea:iniwa/memos-diary-fork.git
  -> Gitea mirror
  -> GitHub: memos-diary-fork
  -> GitHub Actions
  -> ghcr.io/iniwa/memos-diary-fork:latest
  -> Portainer
```

`origin` should point to Gitea. `upstream` should remain the original Memos repository.

The branch layout is:

- `original`: pristine Memos v0.29.0 reference branch.
- `diary-mode`: main Diary Mode working branch.
- `feature/*`: future implementation branches created from `diary-mode`.

Two remaining setup issues were identified:

1. `.gitignore` contains a broad `memos` pattern that can cause files under `cmd/memos/` to require `git add -f`.
2. `scripts/*.sh` executable bits may be fragile on Windows checkouts.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `.gitignore`
- `.gitattributes`
- `docs/decisions/0001-phase0-foundation.md`
- `scripts/`
- `cmd/memos/`
- `docker-compose.diary.yml`
- `.env.example`

Also run:

```bash
git remote -v
git branch --show-current
git status --short --branch
```

## Files To Edit

Edit only files needed to resolve or document the foundation issues.

Likely targets:

- `.gitignore`
- `.gitattributes`
- `AGENTS.md`
- `docs/decisions/0001-phase0-foundation.md`

Do not edit application source code in this handoff.

## Required Work

### 1. Verify repository and remote documentation

Confirm that repository documentation consistently says:

- Gitea repo: `git@gitea:iniwa/memos-diary-fork.git`
- GHCR image: `ghcr.io/iniwa/memos-diary-fork:latest`
- Gitea is primary; GitHub is mirror/Actions/GHCR path.

If docs are already correct, do not churn them.

### 2. Fix or document the `cmd/memos/` ignore issue

Inspect `.gitignore`.

If there is a broad root-level `memos` ignore pattern that unintentionally ignores `cmd/memos/`, prefer a minimal `.gitignore` fix that ignores only the intended binary/output path while allowing `cmd/memos/` normally.

Acceptable outcomes:

- Fix `.gitignore` so `cmd/memos/` is no longer accidentally ignored.
- Or, if changing it is risky, record the known issue clearly in `AGENTS.md` and `docs/decisions/0001-phase0-foundation.md`.

Prefer fixing the ignore rule if the intended behavior is clear.

### 3. Stabilize shell script executable bits

Inspect `.gitattributes` and `scripts/*.sh`.

If possible, add a durable `.gitattributes` rule for shell scripts, for example:

```gitattributes
*.sh text eol=lf
```

Then ensure tracked shell scripts have executable bits in git if they are meant to be run directly:

```bash
git ls-files scripts/*.sh
git update-index --chmod=+x scripts/*.sh
```

Do not bulk-change unrelated file modes.

If Windows tooling makes this difficult, document the issue and exact recovery command in `docs/decisions/0001-phase0-foundation.md`.

## Constraints

- Do not change app behavior.
- Do not change Docker, CI, GitHub Actions, Portainer, or Cloudflare behavior.
- Do not add dependencies.
- Do not edit secrets or real `.env` files.
- Do not commit automatically unless explicitly requested by the user.
- Leave unrelated untracked files alone.

## Non Goals

- Tag UI.
- Image grid.
- Image filtering.
- Image optimization.
- Deployment automation.
- GitHub Actions creation or modification.
- Data migration.

## Verification

Run:

```bash
git status --short --branch
git remote -v
git check-ignore -v cmd/memos/main.go
git ls-files -s scripts/*.sh
```

Expected:

- `cmd/memos/main.go` should not be ignored, or the report should clearly explain why it still is.
- Shell scripts intended to be executable should show mode `100755` in `git ls-files -s`.
- Only foundation/documentation files should change.

No frontend/backend build is required for this handoff unless application files are unexpectedly changed.

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
