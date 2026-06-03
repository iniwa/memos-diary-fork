# 2026-06-03 Phase 9 runtime cleanup execution handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff before starting.

This handoff is for ClaudeCode to continue from the current local state. The implementation is already committed. The remaining work is runtime verification, Portainer deployment confirmation, and safe execution of the `remove-photo-tag` cleanup command.

## Current State

Working tree should be clean.

Recent required commits are already on `diary-mode`:

```txt
38103b44 fix(diary-mode): satisfy thumbnail backfill static checks
e5b45967 fix(diary-mode): stretch inline image grids
96eb83d2 feat(diary-mode): expand overflowing inline image grids
c8b190e5 feat(diary-mode): add photo tag cleanup command
14d77edc feat(diary-mode): hide legacy photo tag in UI
abe0ec80 docs(handoffs): add photo tag cleanup verification handoff
```

Local verification already completed:

```bash
go test ./cmd/memos/...
cd web && pnpm lint
cd web && pnpm test
cd web && pnpm build
```

Reported local results:

```txt
go test ./cmd/memos/...  pass
pnpm lint               pass, 379 files
pnpm test               pass, 23 files / 103 tests
pnpm build              pass, existing Vite chunk warnings only
```

## Deployment Context

Flow:

```txt
Gitea push -> GitHub mirror -> GitHub Actions -> GHCR -> manual Portainer redeploy
```

Runtime:

```txt
App URL:   http://192.168.1.205:5231
Container: memos-diary
Image:     ghcr.io/iniwa/memos-diary-fork:latest
Data dir:  /var/opt/memos
```

Portainer webhook is not available and should not be used.

## Goal

1. Confirm the latest image includes the phase9 code.
2. Confirm the deployed app works.
3. Smoke test image-grid and `#photo` UI behavior.
4. Run `remove-photo-tag` safely:
   - dry-run
   - optional verbose spot check
   - limited execute
   - full execute
   - final dry-run
5. Report exact results in Japanese.

## Do Not Do

- Do not add new features.
- Do not edit Docker, CI, Portainer, or environment files.
- Do not run `remove-photo-tag --execute` before confirming backup/restorability.
- Do not delete attachments/resources.
- Do not run broad destructive commands.
- Do not change image optimizer settings.
- Do not use `#photo` as image-post detection.
- Do not auto-run cleanup during server startup.

## Step 1: Confirm CI And Image

Check GitHub Actions for the mirrored `diary-mode` build.

The deployed image must include at least:

```txt
14d77edc feat(diary-mode): hide legacy photo tag in UI
c8b190e5 feat(diary-mode): add photo tag cleanup command
96eb83d2 feat(diary-mode): expand overflowing inline image grids
```

If possible, also confirm the latest docs commit:

```txt
abe0ec80 docs(handoffs): add photo tag cleanup verification handoff
```

If CI failed, stop and report the failure.

## Step 2: Portainer Redeploy

Ask the user to redeploy `memos-diary` in Portainer if it has not already been redeployed after the latest image build.

After redeploy, confirm:

```bash
curl -I http://192.168.1.205:5231
```

If shell access is available:

```bash
docker inspect memos-diary
docker logs --tail 80 memos-diary
```

Expected:

- HTTP response is healthy.
- Recent logs have no WARN/ERROR/panic related to startup or new features.
- Version/build/image information corresponds to the latest image that includes phase9 code.

## Step 3: UI Smoke Test

Use:

```txt
http://192.168.1.205:5231
```

### Image Grid Expansion

Find or create a memo with 5+ images.

Verify:

- Initial view shows 4 tiles.
- 4th tile has `+N`.
- Clicking `+N` expands inline.
- Clicking `+N` does not open preview/lightbox.
- Expanded view shows all images in a compact 2-column grid.
- Collapse button returns to the compact 4-tile view.
- Clicking any normal image after expansion opens preview at the correct index.

Also check:

- 2 image grid stretches to card width.
- 3 image grid stretches to card width.
- 4 image grid stretches to card width.
- Single image remains natural-width.

### `#photo` UI Hiding

Find an existing memo with boundary `#photo` if possible. Before data cleanup, this may still exist in stored content.

Verify:

- `#photo` is not visible as a memo-card tag chip.
- Other tags on the same memo remain visible.
- If a memo only has `#photo`, no empty tag row is rendered.

### Editor Guardrails

Open a memo with boundary `#photo` if available.

Verify:

- Dedicated tag UI does not show `photo`.
- Other tags remain visible.
- Saving without editing tags does not unexpectedly delete stored `#photo` before explicit cleanup.
- Typing `photo` or `#photo` in the dedicated tag field does not add a visible tag.
- Dedicated tag suggestions do not include `photo`.
- Markdown `#` autocomplete suggestions do not include `photo`.

If existing `#photo` memos cannot be found before cleanup, report that this part was not directly verified.

## Step 4: Backup Confirmation

Before any `--execute`, confirm there is a backup or restorable copy of:

```txt
/var/opt/memos
```

Stop if backup/restorability is not confirmed.

## Step 5: Cleanup Dry-run

Run:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos
```

Expected output shape:

```txt
remove-photo-tag dry-run
scanned=<N> changed=<N> unchanged=<N> failed=0
```

If `failed > 0`, stop.

Record exact counts.

Optional spot check:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --verbose --limit 3
```

Verify before/after previews:

- only boundary `#photo` or `photo` is removed
- inline prose `#photo` remains
- slash tags remain
- Japanese/non-ASCII tags remain
- no unrelated body text changes

## Step 6: Limited Execute

Only after backup and clean dry-run:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --execute --limit 5
```

Expected:

```txt
failed=0
written<=5
```

After limited execute:

```bash
docker logs --tail 80 memos-diary
```

Check UI for the changed memos if possible.

Stop if logs show unexpected WARN/ERROR/panic or if content changes look wrong.

## Step 7: Full Execute

Only after limited execute is clean:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --execute
```

Expected:

```txt
failed=0
```

Record exact counts.

## Step 8: Final Dry-run

Run:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos
```

Expected:

```txt
changed=0
failed=0
```

If `changed` is not zero, report the count and do not keep executing blindly.

## Stop Conditions

Stop and report if any of these happen:

- CI image does not include phase9 commits.
- App fails to start after redeploy.
- Logs show WARN/ERROR/panic related to the new code.
- `+N` opens preview instead of expanding inline.
- Image-grid width regresses for 2/3/4 images.
- `#photo` remains visible as a tag chip where it should be hidden.
- Editor save drops `#photo` before explicit cleanup.
- Dry-run preview changes inline prose `#photo`.
- Dry-run preview removes `#photography`, `#photo/album`, `#Photo`, or `#PHOTO`.
- Any cleanup command reports `failed > 0`.
- Backup/restorability is not confirmed before `--execute`.

## Expected Report

Report in Japanese.

Use this structure:

```md
## Deployed Version
- ...

## Runtime Config
- ...

## Verified
- CI/image: ...
- App startup/logs: ...
- Image grid expansion: ...
- #photo UI hiding: ...
- Editor guardrails: ...

## Cleanup Results
- backup confirmed: yes/no
- initial dry-run: scanned=..., changed=..., unchanged=..., failed=...
- verbose spot check: ...
- limited execute: scanned=..., changed=..., written=..., unchanged=..., failed=...
- full execute: scanned=..., changed=..., written=..., unchanged=..., failed=...
- final dry-run: scanned=..., changed=..., unchanged=..., failed=...

## Issues Found
- ...

## Not Verified
- ...

## Notes For Codex
- ...
```

In `Notes For Codex`, explicitly state:

- whether final dry-run reached `changed=0`
- whether cleanup changed only boundary tag lines
- whether inline `#photo` was preserved
- whether slash/non-ASCII tags were preserved
- whether image-grid expansion passed
- whether logs were clean
