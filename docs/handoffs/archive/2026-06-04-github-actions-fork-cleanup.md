# 2026-06-04 GitHub Actions fork cleanup handoff

This handoff is for ClaudeCode to clean up GitHub Actions in the Diary Mode fork.

## Goal

Routine pushes to `diary-mode` should not fail because of upstream release, deploy, Docker Hub, or stale-issue automation that this fork does not use.

## Current Workflows

Located in `.github/workflows/`:

- `backend-tests.yml`
- `frontend-tests.yml`
- `proto-linter.yml`
- `build-diary-image.yml`
- `build-canary-image.yml`
- `release.yml`
- `release-please.yml`
- `demo-deploy.yml`
- `stale.yml`

## Recommended Target State

Keep:

- `backend-tests.yml`
- `frontend-tests.yml`
- `proto-linter.yml`
- `build-diary-image.yml`

Remove:

- `build-canary-image.yml`
- `release.yml`
- `release-please.yml`
- `demo-deploy.yml`
- `stale.yml`

## Rationale

Likely fork-inappropriate workflows:

- `build-canary-image.yml`
  - Runs on `main`.
  - Pushes upstream-style images such as `neosmemo/memos` and `ghcr.io/usememos/memos`.
  - Requires `DOCKER_HUB_USERNAME` and `DOCKER_HUB_TOKEN`.
- `release.yml`
  - Triggered by `v*.*.*` tags and manual dispatch.
  - Publishes GitHub releases and upstream-style Docker images.
  - Requires Docker Hub secrets.
- `release-please.yml`
  - Runs on `main`.
  - Requires `RELEASE_PLEASE_TOKEN`.
  - Generates upstream-style release PRs/tags.
- `demo-deploy.yml`
  - Manual dispatch only.
  - Requires `RENDER_DEPLOY_HOOK`.
- `stale.yml`
  - Scheduled every 8 hours.
  - Writes to issues and PRs.

Useful workflows:

- `backend-tests.yml`
  - Keep Go quality checks.
- `frontend-tests.yml`
  - Keep `pnpm lint`, `pnpm test`, and `pnpm build`.
- `proto-linter.yml`
  - Keep if proto lint remains useful, but restrict triggers.
- `build-diary-image.yml`
  - Keep. This is the fork-specific GHCR image build for Portainer deployment.

## Requested Changes

1. Delete the upstream-only workflows listed under "Remove".
2. Prefer `diary-mode` as the branch trigger unless existing project branch policy clearly requires `main`.
3. Add or tighten path filters:
   - `proto-linter.yml`: add `paths: ["proto/**"]` under `push`.
   - `frontend-tests.yml`: add `paths: ["web/**"]` under `push`.
   - `backend-tests.yml`: add backend-related paths under `push`, for example:
     - `go.mod`
     - `go.sum`
     - `cmd/**`
     - `internal/**`
     - `server/**`
     - `store/**`
     - `proto/**`
     - `scripts/**`
     - `**.go`
4. Keep `build-diary-image.yml` focused on GHCR for this fork:
   - `ghcr.io/iniwa/memos-diary-fork`
   - no Docker Hub push
   - no `usememos` or `neosmemo` image targets
5. If workflow comments or messages contain mojibake, fix them to ASCII or normal Japanese/English.

## Suggested ClaudeCode Prompt

```text
このリポジトリは Memos の Diary Mode fork です。GitHub Actions が upstream 由来の release/deploy/Docker Hub automation により routine push で失敗しがちなので、fork に必要な最小構成へ整理してください。

作業対象:
- `.github/workflows/`

方針:
- 残す: `backend-tests.yml`, `frontend-tests.yml`, `proto-linter.yml`, `build-diary-image.yml`
- 削除: `build-canary-image.yml`, `release.yml`, `release-please.yml`, `demo-deploy.yml`, `stale.yml`
- `diary-mode` ブランチを主対象にする。`main` を workflow trigger に残す必要があるかは既存の branch 運用を確認して判断する。判断に迷う場合は `diary-mode` のみにする。
- `proto-linter.yml` は `push` にも `paths: ["proto/**"]` を追加する。
- `frontend-tests.yml` は `push` にも `paths: ["web/**"]` を追加する。
- `backend-tests.yml` は `push` にも Go/backend 関連の paths を追加する。例: `go.mod`, `go.sum`, `cmd/**`, `internal/**`, `server/**`, `store/**`, `proto/**`, `scripts/**`, `**.go`。
- `build-diary-image.yml` は GHCR 用として維持する。ただし Docker Hub や `usememos` / `neosmemo` への push は絶対に追加しない。
- workflow 内に文字化けしたコメントやメッセージがあれば、ASCII または通常の日本語/英語へ修正する。

検証:
- `git diff -- .github/workflows`
- YAML として明らかな構文エラーがないことを確認する。
- secrets なしの routine push で走る workflow が `backend-tests`, `frontend-tests`, `proto-linter`, `build-diary-image` のみに整理されることを説明する。
- GHCR image build は `diary-mode` push または手動実行でのみ走ることを確認する。

注意:
- ユーザーの未コミット変更があれば勝手に戻さない。
- upstream 向け Docker Hub / release automation は復活させない。
```

## Verification

Run or inspect:

```bash
git diff -- .github/workflows
```

If a YAML parser is available, validate changed workflow YAML files.

## Expected Report

Report in Japanese:

```md
## Changed Files
- ...

## Summary
- ...

## Verification
- ...

## Notes For Codex
- upstream release workflows removed: yes/no
- diary image workflow kept: yes/no
- Docker Hub pushes absent: yes/no
- routine push workflows no longer require release/deploy secrets: yes/no
```
