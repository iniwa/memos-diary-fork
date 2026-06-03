# 2026-06-02 Phase 9 photo tag cleanup deploy verification handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff before starting.

## Goal

Deploy and verify the latest Diary Mode changes, then safely remove legacy boundary `#photo` tags from stored memo content using the new explicit CLI command.

This handoff is primarily verification and operations. Do not add new features unless a blocker requires a small fix.

## Context

Recent commits on `diary-mode`:

```txt
14d77edc feat(diary-mode): hide legacy photo tag in UI
c8b190e5 feat(diary-mode): add photo tag cleanup command
96eb83d2 feat(diary-mode): expand overflowing inline image grids
e5b45967 fix(diary-mode): stretch inline image grids
38103b44 fix(diary-mode): satisfy thumbnail backfill static checks
```

Deployment flow:

```txt
Gitea push -> GitHub mirror -> GitHub Actions -> GHCR image -> manual Portainer redeploy
```

App URL:

```txt
http://192.168.1.205:5231
```

Container:

```txt
memos-diary
```

Expected image source:

```txt
ghcr.io/iniwa/memos-diary-fork:latest
```

Portainer webhook is not used.

## Implemented Changes To Verify

### 1. Inline image grid expansion

File:

```txt
web/src/components/MemoView/components/InlineImageGrid.tsx
```

Behavior:

- 1 image: unchanged natural-width single image.
- 2/3/4 images: grid stretches to memo card width.
- 5+ images: initial view remains 2x2 with `+N` overlay on the 4th tile.
- Clicking `+N` expands inline to show all visual items in a compact 2-column grid.
- Clicking `+N` must not open the lightbox.
- Clicking any normal image, including after expansion, opens the existing lightbox at the correct index.
- Expanded view shows a localized collapse button (`common.collapse`).

### 2. `remove-photo-tag` CLI

Files:

```txt
cmd/memos/remove_photo_tag.go
cmd/memos/remove_photo_tag_test.go
cmd/memos/main.go
```

Command:

```bash
memos remove-photo-tag
```

Flags:

```txt
--execute
  Actually update memo content. Without this, dry-run only.

--limit
  Stop after changing this many memos.

--uid
  Process only one memo UID.

--verbose
  Print before/after content for changed memos.
```

Safety behavior:

- Dry-run by default.
- Only boundary tag-only lines are modified.
- Only exact `photo` / `#photo` is removed.
- Inline prose `#photo` is untouched.
- Similar tags are untouched:
  - `#Photo`
  - `#PHOTO`
  - `#photography`
  - `#photo/album`
  - `#photo<non-ascii-suffix>`
- Slash and Japanese tags are preserved.
- The command updates only `content` via store `UpdateMemo`.
- It does not intentionally update `updated_ts`.
- It does not touch attachments/resources.
- It does not run automatically at startup.
- It is not a DB migration.

### 3. `#photo` UI hiding and re-add prevention

Files:

```txt
web/src/lib/diaryTags.ts
web/src/components/MemoView/components/MemoBody.tsx
web/src/components/MemoEditor/components/TagSection.tsx
web/src/components/MemoEditor/Editor/TagSuggestions.tsx
web/tests/diary-tags.test.ts
```

Behavior:

- Memo card tag chips hide legacy `photo`.
- Editor dedicated tag chips hide legacy `photo`.
- Existing editor state still preserves `photo` internally, so opening and saving an old memo does not silently delete `#photo`.
- Dedicated tag input ignores manual `photo` / `#photo`.
- Dedicated tag suggestions exclude `photo`.
- Markdown `#` autocomplete suggestions also exclude `photo`.
- Image-post filtering remains based on image attachments, not `#photo`.

## Local Verification Already Done By Codex

```bash
go test ./cmd/memos/...
cd web && pnpm lint
cd web && pnpm test
cd web && pnpm build
```

Results:

- `go test ./cmd/memos/...` passed.
- `pnpm lint` passed.
- `pnpm test` passed: 23 files / 103 tests.
- `pnpm build` passed.
- Vite emitted existing large chunk warnings only.

## Required Deployment Checks

### Step 1: Confirm CI image

Check GitHub Actions for the latest mirrored commit.

Expected latest commit:

```txt
14d77edc
```

If the build failed, inspect logs before redeploying.

### Step 2: Redeploy in Portainer

Manually redeploy `memos-diary` so it pulls the latest GHCR image.

After redeploy, confirm the app responds:

```bash
curl -I http://192.168.1.205:5231
```

If shell access is available:

```bash
docker inspect memos-diary
docker logs --tail 80 memos-diary
```

Expected:

- App returns HTTP 200/3xx.
- No WARN/ERROR/panic in recent logs.
- Image/build label or version should correspond to the latest CI build that includes `14d77edc`.

## Required UI Smoke Tests

Use:

```txt
http://192.168.1.205:5231
```

### Image grid

Find or create a memo with 5+ images.

Verify:

- Initial display shows 4 tiles.
- 4th tile shows `+N`.
- Clicking `+N` expands inline and does not open preview.
- Expanded grid shows all images.
- Collapse button returns to 4-tile view.
- Clicking images in expanded view opens the existing preview at the correct image.
- 2/3/4 image memos stretch to the memo card width.
- Single-image memos remain natural-width.

### `#photo` UI hiding

Before running cleanup, find a memo whose stored boundary tag line contains `#photo` if possible.

Verify:

- Other tags are visible.
- `#photo` is not visible as a memo-card chip.
- If the memo only has `#photo`, no empty tag row is rendered.

### Editor behavior

Open an existing memo with `#photo` in a boundary tag line.

Verify:

- Dedicated tag UI does not show `photo`.
- Other tags remain visible.
- Saving without editing tags does not unexpectedly remove stored `#photo` before the explicit migration.

Then verify new input behavior:

- Typing `photo` or `#photo` in the dedicated tag field does not add a visible tag.
- `photo` is not shown in dedicated tag suggestions.
- `photo` is not shown in Markdown `#` autocomplete suggestions.

## Required Data Cleanup Procedure

Only proceed after deploy and UI smoke tests look healthy.

### Step 1: Backup first

Before executing cleanup, make sure there is a fresh backup or restorable copy of:

```txt
/var/opt/memos
```

Do not run `--execute` without a backup.

### Step 2: Dry-run

Run:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos
```

Expected output shape:

```txt
remove-photo-tag dry-run
scanned=<N> changed=<N> unchanged=<N> failed=0
```

If `failed > 0`, stop and report.

Optional verbose spot check:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --verbose --limit 3
```

Confirm the preview only removes boundary `#photo` and preserves all other content/tags.

### Step 3: Limited execute

Run:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --execute --limit 5
```

Expected:

- `written <= 5`
- `failed=0`
- Only boundary `#photo` disappears from the changed memos.
- Inline prose `#photo` remains untouched.
- Other tags remain.

Check app UI and logs after this limited batch:

```bash
docker logs --tail 80 memos-diary
```

### Step 4: Full execute

If limited execute is clean, run:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --execute
```

Expected:

- `failed=0`
- Remaining changed count is processed.

### Step 5: Final dry-run

Run again:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos
```

Expected:

```txt
changed=0
failed=0
```

## Stop Conditions

Stop and report before continuing if any of these occur:

- Latest image does not include `14d77edc`.
- App does not start after redeploy.
- `docker logs` shows WARN/ERROR/panic related to these changes.
- `remove-photo-tag` dry-run reports unexpected before/after behavior.
- `remove-photo-tag` reports `failed > 0`.
- Cleanup appears to remove inline prose `#photo`.
- Cleanup removes slash/Japanese tags.
- Editing a memo silently drops tags before explicit cleanup.
- Image preview opens when clicking the `+N` expansion tile.

## Expected Report

Report back in Japanese with:

```md
## Changed Runtime Config
- ...

## Deployed Version
- ...

## Verified
- ...

## Cleanup Results
- dry-run: ...
- limited execute: ...
- full execute: ...
- final dry-run: ...

## Issues Found
- ...

## Not Verified
- ...

## Notes For Codex
- ...
```

In `Notes For Codex`, explicitly mention:

- whether `#photo` was hidden in UI before cleanup
- whether cleanup changed only boundary tag lines
- whether final dry-run reached `changed=0`
- whether image grid expansion passed
- whether logs were clean
