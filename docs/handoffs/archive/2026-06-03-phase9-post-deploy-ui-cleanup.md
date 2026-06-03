# 2026-06-03 Phase 9 post-deploy UI and cleanup handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff before starting.

This handoff continues after the user manually redeployed `memos-diary` in Portainer.

## Current Runtime State

The user reported that the site opens after redeploy.

Runtime:

```txt
App URL:   http://192.168.1.205:5231
Container: memos-diary
Version:   diary-30
Data dir:  /var/opt/memos
Driver:    sqlite
Port:      5231
```

Recent user-provided logs:

```txt
Memos diary-30 started successfully!
Data directory: /var/opt/memos
Database driver: sqlite
Server running on port 5231
Access your memos at: http://localhost:5231
...
time=2026-06-03T00:22:45.991+09:00 level=INFO msg="background runners started"
time=2026-06-03T00:22:46.433+09:00 level=INFO msg=OK method=/memos.api.v1.AuthService/RefreshToken
time=2026-06-03T00:22:46.513+09:00 level=INFO msg=OK method=/memos.api.v1.MemoService/ListMemos
```

Known status:

- App is reachable.
- Startup succeeded.
- Recent logs are INFO/OK only.
- No WARN / ERROR / panic reported.
- `diary-30` should include Phase 9 code.

## Relevant Commits

Phase 9 code is already committed:

```txt
96eb83d2 feat(diary-mode): expand overflowing inline image grids
c8b190e5 feat(diary-mode): add photo tag cleanup command
14d77edc feat(diary-mode): hide legacy photo tag in UI
```

Recent handoff commits:

```txt
abe0ec80 docs(handoffs): add photo tag cleanup verification handoff
946225dc docs(handoffs): add phase9 runtime cleanup execution
```

## Goal

Proceed with runtime verification and safe data cleanup:

1. Confirm deployed JS includes Phase 9 behavior.
2. Run UI smoke tests.
3. Confirm backup/restorability.
4. Run `remove-photo-tag` dry-run.
5. If clean, run limited execute.
6. If clean, run full execute.
7. Confirm final dry-run reaches `changed=0`.
8. Report exact counts and any issues.

## Do Not Do

- Do not implement new features.
- Do not edit Docker, CI, Portainer, or env files.
- Do not delete attachments/resources.
- Do not run `remove-photo-tag --execute` before backup/restorability is confirmed.
- Do not repeatedly execute cleanup if final dry-run still reports changes; stop and report.
- Do not treat `#photo` as image-post detection.

## Step 1: Confirm Phase 9 Is Actually Served

Use browser/devtools or fetched JS assets to confirm the deployed frontend contains Phase 9 code.

Look for any of these strings in served JS:

```txt
isHiddenLegacyTag
auto-rows-[8rem]
remove-photo-tag
```

Expected:

- `isHiddenLegacyTag` exists in served JS.
- `auto-rows-[8rem]` or equivalent expanded-grid class exists in served JS.

If the old JS is still served, ask the user to hard refresh or clear browser cache. If the server still serves old assets, stop and report that redeploy did not update frontend assets.

## Step 2: UI Smoke Test

Use:

```txt
http://192.168.1.205:5231
```

### Image Grid Expansion

Find or create a memo with 5+ images.

Verify:

- Initial view shows exactly 4 visible tiles.
- 4th tile shows `+N`.
- Clicking `+N` expands inline.
- Clicking `+N` does not open image preview/lightbox.
- Expanded view shows all images in compact 2-column grid.
- Collapse button returns to compact view.
- Clicking a normal image after expansion opens preview at correct image.

Also check existing smaller grids:

- 2 images: grid stretches to memo card width.
- 3 images: grid stretches to memo card width.
- 4 images: grid stretches to memo card width.
- 1 image: remains natural-width.

### `#photo` UI Hiding

Find a memo with boundary `#photo` if possible.

Verify before cleanup:

- `#photo` is not visible as a tag chip.
- Other tags on the same memo remain visible.
- A memo with only `#photo` does not render an empty tag row.

If no boundary `#photo` memo exists, report that this was not directly verified before cleanup.

### Editor Guardrails

Open a memo with boundary `#photo` if possible.

Verify:

- Dedicated tag section does not show `photo`.
- Other tags remain visible.
- Saving without editing tags does not delete stored `#photo` before explicit cleanup.
- Typing `photo` or `#photo` in the dedicated tag input does not add a visible tag.
- Tag suggestions do not include `photo`.
- Markdown `#` autocomplete suggestions do not include `photo`.

## Step 3: Backup / Restorability Confirmation

Before executing cleanup, confirm there is a backup or restorable copy of:

```txt
/var/opt/memos
```

Stop if this cannot be confirmed.

## Step 4: Cleanup Dry-run

Run:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos
```

Expected output shape:

```txt
remove-photo-tag dry-run
scanned=<N> changed=<N> unchanged=<N> failed=0
```

Record exact counts.

Stop if:

- `failed > 0`
- command is missing
- command output is malformed
- the command appears to modify data in dry-run

Optional spot check:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --verbose --limit 3
```

Verify before/after previews:

- only boundary `#photo` / `photo` is removed
- inline prose `#photo` remains untouched
- slash tags remain
- non-ASCII tags remain
- body text remains unchanged
- no attachments/resources are touched

## Step 5: Limited Execute

Only after backup and clean dry-run:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --execute --limit 5
```

Expected:

```txt
failed=0
written<=5
```

Then check:

```bash
docker logs --tail 80 memos-diary
```

Expected:

- No WARN / ERROR / panic.
- UI still loads.
- Changed memos display correctly.

Stop if anything looks wrong.

## Step 6: Full Execute

Only after limited execute is clean:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --execute
```

Expected:

```txt
failed=0
```

Record exact counts.

## Step 7: Final Dry-run

Run:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos
```

Expected:

```txt
changed=0
failed=0
```

If `changed` is not `0`, stop and report the exact output.

## Stop Conditions

Stop and report if any of these happen:

- Served JS still lacks Phase 9 code.
- App fails to load after tests or cleanup.
- Logs show WARN / ERROR / panic.
- `+N` opens preview instead of expanding inline.
- 2/3/4 image grid width regresses.
- `#photo` appears as a visible tag chip.
- Editor save drops `#photo` before explicit cleanup.
- Dry-run preview changes inline prose `#photo`.
- Dry-run preview removes similar tags such as `#photography`, `#photo/album`, `#Photo`, `#PHOTO`.
- Cleanup reports `failed > 0`.
- Backup/restorability is not confirmed before `--execute`.

## Expected Report

Report in Japanese with this structure:

```md
## Deployed Version
- diary-30 / image details / served JS confirmation

## Runtime Logs
- startup: ...
- post-test logs: ...

## UI Verification
- image grid expansion: ...
- smaller grid widths: ...
- #photo UI hiding: ...
- editor guardrails: ...

## Cleanup Results
- backup confirmed: yes/no
- dry-run: scanned=..., changed=..., unchanged=..., failed=...
- verbose spot check: ...
- limited execute: scanned=..., changed=..., written=..., unchanged=..., failed=...
- full execute: scanned=..., changed=..., written=..., unchanged=..., failed=...
- final dry-run: scanned=..., changed=..., unchanged=..., failed=...

## Issues Found
- ...

## Not Verified
- ...

## Notes For Codex
- final dry-run changed=0: yes/no
- inline #photo preserved: yes/no
- slash/non-ASCII tags preserved: yes/no
- image grid expansion passed: yes/no
- logs clean: yes/no
```
