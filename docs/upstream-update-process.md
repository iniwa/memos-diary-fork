# Upstream Update Process

This document describes how to detect, prepare, review, verify, commit, push,
and roll back an upstream Memos stable release update.

## Detection

A GitHub Actions workflow (`.github/workflows/upstream-release-check.yml`) runs
weekly (Monday 09:00 UTC) and can be triggered manually. It compares the version
in `.upstream-version` against the latest stable upstream tag and writes a step
summary. When the fork is up to date the job succeeds. When a newer stable
release is available the job intentionally fails and emits an error annotation —
this makes the detection visible in the Actions UI without requiring issue
creation or notification setup.

To trigger manually: **Actions → Upstream Release Check → Run workflow**.

## Preparation (local, Windows dev machine)

```powershell
.\scripts\prepare-upstream-update.ps1 -Tag vX.Y.Z
```

The script:
1. Requires a clean `diary-mode` working tree and correct branch.
2. Validates the tag format (`vX.Y.Z` stable only).
3. Fetches both the target tag and the current baseline tag directly from the
   canonical upstream URL (`https://github.com/usememos/memos.git`).
   No persistent remote is added.
4. Verifies that the current baseline tag is an ancestor of the target tag.
   Aborts if not, rejecting downgrades and divergent history.
5. Reports files changed by upstream (`$current..$Tag`), files changed by the
   fork since the current baseline (`$current..HEAD`), and their intersection
   (overlapping files that need close review).
6. Saves `AGENTS.md` and `CLAUDE.md` as raw bytes and restores them on all
   exit paths — including real merge conflicts and unexpected errors — so they
   are never lost or left in an upstream-modified state.
7. Performs a `git merge --no-commit` and resolves metadata-only conflicts
   (AGENTS.md, CLAUDE.md) automatically.
8. For real conflicts, restores local-only files, lists the conflicts, and
   exits non-zero for manual resolution. The merge is left paused — use
   `git merge --abort` to cancel it.
9. Updates `.upstream-version` to the new tag.

The script never commits, pushes, or deploys.

## Review

After the script exits:

```powershell
git diff --cached              # full staged diff
git diff --cached --stat       # changed files summary
git diff --name-only --diff-filter=U  # any remaining unresolved conflicts
```

Checklist:
- All overlapping files (reported by the script) preserve fork-specific changes.
- `imageOptimizerConcurrencyFromEnv()` still present in
  `server/router/api/v1/v1.go`.
- Fork-added hooks exports still in `web/src/hooks/index.ts`.
- No intentionally removed upstream workflows reintroduced under
  `.github/workflows/`.
- No database migration files added (check `store/migration/`).
- No API schema changes (check `proto/` diff).
- Preserve Decision 0003's prohibition on fork-local migration additions,
  modifications, or reordering; accepting the upstream migration does not lift it.
- `AGENTS.md` and `CLAUDE.md` are not staged (`git status --short`).
- `.upstream-version` is staged with the new tag.

## Verification

### Frontend

```powershell
Set-Location web
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm release
```

`pnpm release` writes assets to `server/router/frontend/dist/`.

### Backend

A Go toolchain is available locally, so most backend verification can run
before pushing:

```powershell
go build ./...
go vet ./...
go test ./...
golangci-lint run --timeout=3m   # CI pins v2.11.3
```

On Windows, `server/router/frontend` and `store/test` report failures that come
only from `t.TempDir()` cleanup — SQLite still holds `memos_prod.db` open, so
`RemoveAll` fails after the test body has already passed. Linux CI is the
authority for those packages.

Image verification still requires Docker:

```powershell
docker build --platform linux/arm64 -f scripts/Dockerfile .
```

## Commit

Only after review and verification pass:

```powershell
git commit -m "chore: merge upstream vX.Y.Z"
```

Use a merge commit (not squash) to preserve upstream history.

## Push

```powershell
git push
```

Pushing `diary-mode` triggers:
- Backend tests (Go)
- Frontend tests
- Docker image build and push to GHCR

Monitor CI at GitHub Actions. Do not proceed to deploy if any job fails.

## Deploy

After CI passes:

1. Open Portainer → Stacks → memos-diary.
2. Pull the new image.
3. Redeploy the stack.
4. Verify the running instance at `http://192.168.1.205:5231`.

Follow `docs/diary-mode-operations.md` for smoke-test steps.

## Rollback

If the deployed image has regressions:

### Revert in Portainer

In Portainer, select the previous image tag (`sha-<previous-sha>`) and redeploy.

### Revert in Git (if not yet pushed)

If the no-commit merge is still active (not yet committed), abort it:

```powershell
git merge --abort
```

This returns the branch to the pre-merge HEAD with a clean working tree.

### Revert a pushed commit

```powershell
git revert -m 1 <merge-commit-sha>
git push
```

This creates a new revert commit, re-triggers CI, and re-pushes to GHCR.
Then redeploy from Portainer using the new image.
