# 0002 — Upstream Update Policy

**Date**: 2026-06-09
**Status**: Active

## Context

Memos upstream releases stable `vX.Y.Z` tags periodically. The fork needs a
repeatable process for detecting and integrating those releases. The process must
protect Diary Mode behavior, preserve local-only agent files, and never
automate the commit, push, or deployment steps.

## Decision

### Version Marker

`.upstream-version` is the canonical record of the reviewed upstream baseline
integrated into `diary-mode`. It contains one line: the tag, e.g. `v0.29.1`.

It is committed alongside the merge commit. Automation reads it; operators
update it via `scripts/prepare-upstream-update.ps1`.

### Automated Detection

`.github/workflows/upstream-release-check.yml` runs weekly (Monday 09:00 UTC)
and is manually dispatchable. It:
- Reads `.upstream-version`.
- Fetches the latest stable (non-prerelease, non-draft) release from the
  `usememos/memos` GitHub Releases API.
- Writes a step summary with both versions.
- **Exits zero** when the fork is up to date.
- **Exits non-zero** (with an `::error::` annotation) when a newer stable
  release is available, making the detection visible in the Actions UI.

It does not open issues, create branches, or commit anything.

### Preparation Script

`scripts/prepare-upstream-update.ps1` runs locally on the Windows dev machine.
It:
- Enforces a clean `diary-mode` working tree.
- Accepts a stable `vX.Y.Z` tag argument.
- Fetches both the target tag and the current baseline tag directly from the
  canonical upstream URL. Does not add a persistent remote.
- Verifies the current baseline tag is an ancestor of the target tag. Aborts
  on downgrade or divergent history.
- Reports upstream changes (`$current..$Tag`), fork changes since the current
  baseline (`$current..HEAD`), and their intersection.
- Saves `AGENTS.md` and `CLAUDE.md` as raw bytes and restores them on all exit
  paths, including real merge conflict exits and unexpected errors.
- Performs a `git merge --no-commit`.
- Resolves metadata conflicts (AGENTS.md, CLAUDE.md) automatically.
- On real conflicts, restores local-only files, lists conflicts, exits non-zero.
  The merge is left paused for manual resolution; use `git merge --abort` to
  cancel.
- Updates `.upstream-version` using UTF-8 without BOM (PS 5.1 compatible).
- Does not commit, push, or deploy.

### Human Review Boundary

The automated preparation may proceed as far as a staged, no-commit merge.
These steps require human review before execution:
- Committing the merge.
- Pushing `diary-mode` (which triggers CI and GHCR image build).
- Deploying the new image via Portainer.

### Preserved Fork Files

`AGENTS.md`, `CLAUDE.md`, and `.serena/` must remain excluded from Git across
all upstream merges. Their `.gitignore` entries must not be removed.

## Consequences

- New upstream stable releases are surfaced automatically each week.
- An operator runs the preparation script, reviews the diff, verifies frontend
  and (via CI) backend, then commits and pushes.
- The automation boundary is explicit: detection and staging are automated;
  commit, push, and deploy are always manual.
- The procedure is documented in `docs/upstream-update-process.md`.
