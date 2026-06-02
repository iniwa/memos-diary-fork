# 2026-06-02 fix backend static checks for thumbnail-backfill handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Investigate and fix the GitHub Actions failure in `Backend Tests`, specifically the failing `Static Checks` job.

The current test jobs pass, but static checks fail due to style/lint violations in the recently added `thumbnail-backfill` command.

This task should make `Backend Tests / Static Checks` pass without changing runtime behavior.

## Background

GitHub Actions shows:

```txt
Workflow:
  Backend Tests

Failed job:
  Static Checks

Passing jobs:
  Tests (store)
  Tests (server)
  Tests (internal)
  Tests (other)
```

Observed annotations:

```txt
cmd/memos/thumbnail_backfill.go#L19
redundant-import-alias: Import alias "v1" is redundant

cmd/memos/thumbnail_backfill.go#L81
use of fmt.Errorf forbidden because "Please use errors.Wrap... instead"

cmd/memos/thumbnail_backfill.go#L87
use of fmt.Errorf forbidden because "Please use errors.Wrap... instead"

cmd/memos/thumbnail_backfill.go#L144
use of fmt.Errorf forbidden because "Please use errors.Wrap... instead"
```

The relevant file is:

```txt
cmd/memos/thumbnail_backfill.go
```

This command was added for Diary Mode thumbnail cache backfill. It is a CLI maintenance command that scans existing attachments and generates missing `.thumbnail_cache/{uid}.v2.jpeg` files.

## Files To Inspect

Primary:

```txt
cmd/memos/thumbnail_backfill.go
```

Also inspect, only if needed:

```txt
cmd/memos/root.go
server/router/api/v1/image_optimizer.go
.github/workflows/backend-tests.yml
```

Search terms:

```txt
thumbnail-backfill
fmt.Errorf
errors.Wrap
redundant-import-alias
server/router/api/v1
```

## Files To Edit

Expected:

```txt
cmd/memos/thumbnail_backfill.go
```

Do not edit unrelated code.

Do not edit:

```txt
web/
server/router/api/v1/image_optimizer.go
docker-compose.diary.yml
.github/workflows/
docs/
```

unless inspection proves it is required.

## Required Fixes

### 1. Remove redundant import alias

Current code likely contains:

```go
v1 "github.com/usememos/memos/server/router/api/v1"
```

Because the imported package name is already `v1`, the explicit alias is redundant.

Change to:

```go
"github.com/usememos/memos/server/router/api/v1"
```

Keep call sites such as:

```go
v1.ThumbnailMaxEdgeEnv
v1.DefaultThumbnailMaxEdge
v1.IsOptimizableStaticImage(...)
v1.IsAndroidMotionContainer(...)
v1.WriteUploadThumbnailCache(...)
```

These should continue to work because the package name is `v1`.

### 2. Replace forbidden `fmt.Errorf`

The static check forbids `fmt.Errorf` and asks to use `errors.Wrap...` instead.

The file already imports:

```go
"github.com/pkg/errors"
```

Replace cases such as:

```go
return fmt.Errorf("invalid profile: %w", err)
```

with:

```go
return errors.Wrap(err, "invalid profile")
```

Replace:

```go
return fmt.Errorf("failed to create db driver: %w", err)
```

with:

```go
return errors.Wrap(err, "failed to create db driver")
```

Replace:

```go
return stats, failedUIDs, fmt.Errorf("failed to list attachments: %w", err)
```

with:

```go
return stats, failedUIDs, errors.Wrap(err, "failed to list attachments")
```

Only replace `fmt.Errorf`.
Do not remove `fmt` entirely if it is still used for `fmt.Println`, `fmt.Fprintf`, or `fmt.Printf`.

## Constraints

* Keep the change minimal.
* Do not change `thumbnail-backfill` behavior.
* Do not change command flags.
* Do not change dry-run / execute semantics.
* Do not change attachment scanning behavior.
* Do not change image optimizer behavior.
* Do not change S3 unsupported behavior.
* Do not change DB access behavior.
* Do not change frontend code.
* Do not change workflow files unless absolutely necessary.
* Do not add dependencies.
* Do not commit automatically unless explicitly requested.

## Non Goals

Do not implement:

* new thumbnail backfill features
* image optimizer changes
* `#photo` migration
* image grid layout fixes
* frontend filter changes
* Docker/Portainer changes
* GitHub Actions workflow restructuring

This is only a static-check fix.

## Verification

Run the smallest relevant checks first.

```bash
git status --short
```

Then run formatting:

```bash
gofmt -w cmd/memos/thumbnail_backfill.go
```

Run static checks if the repository provides a script for it.

Inspect available commands:

```bash
make help
```

or inspect:

```bash
cat Makefile
```

Run the relevant backend static check command if identifiable.

Also run targeted tests:

```bash
go test ./cmd/memos/...
```

If feasible, run broader backend tests:

```bash
go test ./...
```

If full checks are too heavy or blocked, report exactly which checks were not run and why.

## Expected Result

After the fix:

```txt
Backend Tests / Static Checks:
  pass

Tests (store):
  still pass

Tests (server):
  still pass

Tests (internal):
  still pass

Tests (other):
  still pass
```

## Manual Review Checklist

Check the final diff and confirm:

* explicit `v1` import alias is removed
* all `fmt.Errorf` instances in `cmd/memos/thumbnail_backfill.go` are removed
* `fmt` remains imported only if still used
* `errors.Wrap` is used for wrapping existing errors
* no command behavior was changed
* no unrelated files were modified

## Expected Report

Report back in Japanese.

Use this format:

```md
## Changed Files
- ...

## Summary
- ...

## Verification
- ...

## Blocked Checks
- ...

## Static Check Notes
- ...

## Design Questions
- ...
```

In `Static Check Notes`, explicitly mention:

* whether `redundant-import-alias` was fixed
* whether all `fmt.Errorf` violations were fixed
* whether `gofmt` was run
* whether Backend Tests should now pass
