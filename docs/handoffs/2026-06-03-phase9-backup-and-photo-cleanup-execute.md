# 2026-06-03 Phase 9 backup and photo cleanup execute handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff before starting.

This handoff continues from the Phase 9 post-deploy verification. The implementation is already deployed as `diary-30`. The current blocker is backup confirmation before running `remove-photo-tag --execute`.

## Current Status

Runtime:

```txt
App URL:   http://192.168.1.205:5231
Container: memos-diary
Version:   diary-30
Data dir:  /var/opt/memos
Driver:    sqlite
```

Known:

- App opens after redeploy.
- User-provided logs show startup success and INFO/OK only.
- `WARN` / `ERROR` / `panic` were not present in the provided logs.
- `--execute` is intentionally paused until backup/restorability is confirmed.

## Goal

1. Create or verify a restorable backup of `/var/opt/memos`.
2. Confirm the backup exists and has the expected files.
3. Run `remove-photo-tag --execute --limit 5`.
4. Check logs and spot-check app behavior.
5. If clean, run full `remove-photo-tag --execute`.
6. Run final dry-run and confirm `changed=0`.
7. Report exact commands and counts.

## Important Safety Rules

- Do not run any `--execute` command before backup is confirmed.
- Prefer a backup method that avoids corrupting SQLite.
- Do not delete or overwrite the source `/var/opt/memos`.
- Do not delete attachments/resources.
- Do not run broad cleanup commands.
- Stop immediately if any command reports `failed > 0`.
- Stop if final dry-run still reports `changed > 0`.

## Backup Strategy

Use one of these methods. Prefer Method A if `sqlite3` is available on the host.

### Method A: SQLite Online Backup + Data Directory Copy

This avoids stopping the container while producing a consistent DB copy.

1. Identify DB file:

```bash
sudo find /var/opt/memos -maxdepth 2 -type f \( -name '*.db' -o -name '*.sqlite' -o -name 'memos_prod.db' \) -ls
```

2. Create backup directory:

```bash
BACKUP_DIR="/var/opt/memos-backup-$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p "$BACKUP_DIR"
```

3. Copy non-DB files while preserving metadata:

```bash
sudo rsync -a --exclude '*.db' --exclude '*.db-*' --exclude '*.sqlite' --exclude '*.sqlite-*' /var/opt/memos/ "$BACKUP_DIR"/
```

4. Use SQLite `.backup` for the DB. Adjust the DB filename if needed:

```bash
sudo sqlite3 /var/opt/memos/memos_prod.db ".backup '$BACKUP_DIR/memos_prod.db'"
```

5. Confirm:

```bash
sudo ls -lah "$BACKUP_DIR"
sudo test -s "$BACKUP_DIR/memos_prod.db"
```

If `sqlite3` is missing, do not install packages unless the user approves. Use Method B instead.

### Method B: Stop Container, Copy Whole Data Directory, Restart

Use this if Method A is not available or if you want the simplest restorable full-directory backup.

```bash
docker stop memos-diary
BACKUP_DIR="/var/opt/memos-backup-$(date +%Y%m%d-%H%M%S)"
sudo cp -a /var/opt/memos "$BACKUP_DIR"
docker start memos-diary
```

Confirm startup:

```bash
docker logs --tail 40 memos-diary
curl -I http://192.168.1.205:5231
sudo du -sh "$BACKUP_DIR"
sudo find "$BACKUP_DIR" -maxdepth 2 -type f | head -30
```

Expected:

- Container restarts successfully.
- App responds.
- Backup directory exists and is non-empty.
- Backup includes the SQLite DB and attachment/assets directories.

## Before Execute: Re-run Dry-run

After backup is confirmed, run dry-run again:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos
```

Expected:

```txt
remove-photo-tag dry-run
scanned=<N> changed=<N> unchanged=<N> failed=0
```

Record exact counts. Stop if `failed > 0`.

Optional but recommended:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --verbose --limit 3
```

Verify:

- only boundary `#photo` / `photo` is removed
- inline prose `#photo` is unchanged
- slash tags are preserved
- non-ASCII tags are preserved
- body text is otherwise unchanged

## Limited Execute

Only after backup and clean dry-run:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --execute --limit 5
```

Expected:

```txt
failed=0
written<=5
```

Then check logs:

```bash
docker logs --tail 80 memos-diary
```

Expected:

- no WARN / ERROR / panic
- app still responds

If possible, check a changed memo in the UI.

## Full Execute

Only after limited execute is clean:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --execute
```

Expected:

```txt
failed=0
```

Record exact counts.

## Final Dry-run

Run:

```bash
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos
```

Expected:

```txt
changed=0
failed=0
```

If `changed` is not zero, stop and report. Do not repeatedly execute without understanding why.

## Final Runtime Check

After cleanup:

```bash
curl -I http://192.168.1.205:5231
docker logs --tail 80 memos-diary
```

Expected:

- app responds
- no WARN / ERROR / panic

UI spot checks:

- normal memo list loads
- image memo still shows image grid
- tag chips still show non-photo tags
- `#photo` is not visible as a chip

## Stop Conditions

Stop and report if any occur:

- backup cannot be created or verified
- app fails to restart after backup
- dry-run reports `failed > 0`
- dry-run verbose preview changes inline prose `#photo`
- dry-run verbose preview removes similar tags such as `#photography`, `#photo/album`, `#Photo`, `#PHOTO`
- limited execute reports `failed > 0`
- full execute reports `failed > 0`
- final dry-run reports `changed > 0`
- logs show WARN / ERROR / panic
- UI fails to load after cleanup

## Expected Report

Report in Japanese with this structure:

```md
## Backup
- method: A/B/other
- backup path: ...
- DB backup verified: yes/no
- data/assets backup verified: yes/no

## Dry-run
- scanned=...
- changed=...
- unchanged=...
- failed=...
- verbose spot check: ...

## Limited Execute
- scanned=...
- changed=...
- written=...
- unchanged=...
- failed=...

## Full Execute
- scanned=...
- changed=...
- written=...
- unchanged=...
- failed=...

## Final Dry-run
- scanned=...
- changed=...
- unchanged=...
- failed=...

## Runtime Check
- HTTP: ...
- logs: ...
- UI spot check: ...

## Issues Found
- ...

## Notes For Codex
- final changed=0: yes/no
- inline #photo preserved: yes/no
- slash/non-ASCII tags preserved: yes/no
- backup location: ...
```
