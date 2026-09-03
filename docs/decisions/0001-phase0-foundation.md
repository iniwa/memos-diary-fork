# Decision 0001 — Phase 0 Foundation

Date: 2026-06-01
Status: Historical; current policy and operating guidance are in `AGENTS.md`,
`README.diary.md`, active decisions/amendments, and the scoped operations and
upstream-update documents.

## Context

Setting up the initial repository structure for the Memos Diary Mode fork.

## Decisions

### Branch structure

- `original` — pristine memos v0.29.0 (shallow fetch, `--depth=1`). Serves as the upstream reference and base for future `v0.29.x` merges.
- `diary-mode` — default working branch. All Diary Mode customizations, docs, and config files live here.
- `upstream-v0.29` — to be created from `original` when the first upstream bugfix is merged.
- `feature/*` — to be created from `diary-mode` per Phase 1+ handoffs.

`main` branch is intentionally not used to avoid confusion with upstream's default branch.

### Remote: Gitea (self-hosted) + GitHub mirror

Primary repository is on a self-hosted Gitea instance. Gitea mirrors pushes to GitHub, which triggers GitHub Actions to build and push the Docker image to GHCR.

- SSH alias: `gitea` (configured in `~/.ssh/config`, points to 192.168.1.205:2222)
- Remote URL: `git@gitea:iniwa/memos-diary-fork.git`
- Deploy flow: push to Gitea → GitHub mirror → GitHub Actions → `ghcr.io/iniwa/memos-diary-fork:latest` → Portainer Stack
- Image URL stays `ghcr.io/iniwa/...` (GHCR, not Gitea Container Registry)

### Upstream shallow fetch

v0.29.0 was fetched with `--depth=1` to minimize download size.

When merging a future `v0.29.x` release into `original`, run:

```bash
git fetch --unshallow upstream
git fetch upstream refs/tags/v0.29.x:refs/tags/v0.29.x
git checkout original
git merge v0.29.x
```

### Local build tooling

`go` is not installed on the development PC. Consequently:

- Backend-only builds require Docker (`scripts/Dockerfile`).
- Frontend work uses `corepack enable && cd web && pnpm install`.
- Build order for a full image: `pnpm release` (in `web/`) → Docker build.
- Dockerfile location: `scripts/Dockerfile` (not repo root).

### docker-compose.diary.yml

Diary Mode runs on port `5231` alongside the existing Memos instance on `5230`.
Data directory: `./memos-diary-data` (separate from `./memos-data`).
Image optimization env vars are present but commented out (Phase 4 scope).

### .gitignore: `memos` pattern fix

The upstream `.gitignore` contained a bare `memos` pattern that matched both the
root-level build binary **and** the `cmd/memos/` directory. Existing files in
`cmd/memos/` were already tracked, so `git check-ignore` returned clean, but any
new file added there would have been silently ignored without `git add -f`.

**Fix (2026-06-01):** Changed `memos` → `/memos` (root-anchored) so only the
build binary at the repository root is ignored. `cmd/memos/` is now treated
normally by git.

### .gitattributes: shell script line endings

Added `*.sh text eol=lf` to `.gitattributes` to ensure shell scripts always
check out with LF endings, independent of the `* text=auto eol=lf` glob.
All `scripts/*.sh` files are tracked with mode `100755` — no chmod needed.
