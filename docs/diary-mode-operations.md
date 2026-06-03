# Diary Mode Operations

## 1. System Overview

Diary Mode is a fork of [usememos/memos](https://github.com/usememos/memos) v0.29.0 with the following additions:

- Dedicated tag UI with boundary tag parsing and serialization
- Twitter/X-style inline image grid (1+ images, expandable `+N` overlay)
- `attachment.hasImage:true` image filter
- JPEG / PNG / WebP upload optimization and thumbnail cache
- Calendar date prefill: clicking an in-month date presets new memo `createTime` / `updateTime`
- Boundary `#photo` hidden from UI; `remove-photo-tag` CLI cleaned it from stored content

Diary Mode runs separately from the production Memos instance on port `5230`. Diary Mode uses port `5231` and its own data directory.

### Deployment flow

```txt
push to Gitea (diary-mode branch)
  -> GitHub mirror (automatic)
    -> GitHub Actions (build-diary-image.yml)
      -> GHCR (ghcr.io/iniwa/memos-diary-fork:latest)
        -> manual redeploy in Portainer
```

Portainer webhook is not used because it is a paid feature. Manual redeploy is the intended procedure.

## 2. Runtime Configuration

| Setting | Value |
|---|---|
| Host URL | `http://192.168.1.205:5231` |
| Container name | `memos-diary` |
| GHCR image | `ghcr.io/iniwa/memos-diary-fork:latest` |
| Container data dir | `/var/opt/memos` |
| Repository compose default | `./memos-diary-data:/var/opt/memos` |
| Portainer host path | `/opt/memos-diary/data` (verified 2026-06-03 via `docker inspect`) |

### Image optimizer

Current production values are set in Portainer:

```txt
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_KEEP_ORIGINAL=false
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
MEMOS_IMAGE_PREVIEW_MAX_EDGE=2560
MEMOS_IMAGE_PREVIEW_JPEG_QUALITY=90
MEMOS_IMAGE_THUMBNAIL_MAX_EDGE=720
MEMOS_IMAGE_THUMBNAIL_JPEG_QUALITY=78
```

These values are supplied via Portainer's stack environment. The compose file `docker-compose.diary.yml` has image optimizer settings commented out as opt-in defaults. The `.env.example` has `MEMOS_IMAGE_OPTIMIZER_ENABLED=false` and `MEMOS_IMAGE_KEEP_ORIGINAL=true` as safe local-first defaults.

### GHCR image tags

Each GitHub Actions build pushes three tags:

| Tag | Meaning |
|---|---|
| `:latest` | most recent `diary-mode` build |
| `:diary-mode` | same as `:latest` |
| `:sha-<SHA>` | pinned to the commit SHA; useful for rollback |

## 3. Manual Redeploy Procedure

1. Push code to Gitea on the `diary-mode` branch.
2. GitHub mirror syncs automatically, usually within seconds.
3. GitHub Actions `Build Diary Image` triggers on push to `diary-mode`. Monitor `https://github.com/iniwa/memos-diary-fork/actions`.
4. Wait for the build to succeed. It usually takes about 5 minutes. Verify the green checkmark.
5. Open Portainer -> Stacks -> `memos-diary` -> Pull and redeploy, or recreate the service.
6. Confirm the app is reachable:

```bash
curl -I http://192.168.1.205:5231
```

Expected: `HTTP/1.1 200 OK`.

7. Check startup logs:

```bash
docker logs --tail 80 memos-diary
```

Expected: `INFO` and `OK` lines only. No `WARN`, `ERROR`, or `panic`.

## 4. Post-Deploy Smoke Checklist

Run after every redeploy:

- [ ] App opens at `http://192.168.1.205:5231`
- [ ] `docker logs --tail 80 memos-diary` shows no `WARN` / `ERROR` / `panic`
- [ ] Memo timeline loads
- [ ] Tag chips render on memos with tags
- [ ] Image grid renders on memos with attachments
- [ ] Image filter `hasImage:true` returns only image-bearing memos
- [ ] Calendar date click sets `displayTime` filter and shows timestamp popover in create editor
- [ ] No test memo remains from verification

## 5. Backup and Restore

Always create a backup before running any `--execute` data-modification command.

### Known backup from Phase 9 cleanup

Phase 9 used this backup on 2026-06-03:

```txt
/opt/memos-diary/data-backup-20260603-005631
```

This backup was created before `remove-photo-tag --execute` ran. It contains:

- SQLite database, such as `memos_prod.db` or equivalent
- attachment/asset files
- `.thumbnail_cache/` directory

### What must be restorable

| Path | Contents |
|---|---|
| `memos_prod.db` or `memos.db` | memos, users, tags, settings |
| `assets/` | uploaded files or optimizer output |
| `.thumbnail_cache/` | pre-generated `.v2.jpeg` thumbnails |

### Backup approach

Stop the container before copying to avoid SQLite corruption.

The Portainer host bind mount is `/opt/memos-diary/data`. Copy it directly:

```bash
docker stop memos-diary
sudo cp -a /opt/memos-diary/data "/opt/memos-diary/data-backup-$(date +%Y%m%d-%H%M%S)"
docker start memos-diary
```

If the host path ever becomes uncertain, use `docker cp` as a fallback:

```bash
docker stop memos-diary
docker cp memos-diary:/var/opt/memos "/opt/memos-diary/data-backup-$(date +%Y%m%d-%H%M%S)"
docker start memos-diary
```

If `sqlite3` is available on the host, use `.backup` to create a consistent copy without stopping the container.

### Restore

A tested restore procedure for this specific Portainer deployment layout has not been formally verified. In an emergency:

1. Stop the container.
2. Replace the data directory contents with the backup copy.
3. Restart the container.
4. Verify with `curl -I` and `docker logs`.

## 6. Maintenance Commands

All commands default to dry-run. Pass `--execute` to write changes.

### thumbnail-backfill

Generates missing `.thumbnail_cache/{uid}.v2.jpeg` files for existing image attachments.

It does not modify memo content. It writes only to the thumbnail cache.

```bash
# Dry-run: report what would be generated
docker exec memos-diary memos thumbnail-backfill --data /var/opt/memos

# Limited execute: generate up to 5 thumbnails
docker exec memos-diary memos thumbnail-backfill --data /var/opt/memos --execute --limit 5

# Full execute
docker exec memos-diary memos thumbnail-backfill --data /var/opt/memos --execute
```

Phase 8 backfill result, already done:

```txt
dry-run:         scanned=153 existing=99 missing=36 skipped=18 failed=0
limited execute: generated=5 failed=0
full execute:    generated=31 existing=104 skipped=18 failed=0
```

### remove-photo-tag

Removes legacy `#photo` from boundary tag lines in memo content.

This modifies memo content and requires a backup before running `--execute`. Inline prose `#photo` is preserved. Slash tags and non-ASCII tags are preserved.

```bash
# Dry-run: report how many memos would change
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos

# Dry-run with preview of changed content, up to 3 memos
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --verbose --limit 3

# Limited execute: change up to 5 memos
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --execute --limit 5

# Full execute
docker exec memos-diary memos remove-photo-tag --data /var/opt/memos --execute
```

Phase 9 cleanup result, already done:

```txt
dry-run:         scanned=176 changed=31 unchanged=145 failed=0
limited execute: scanned=9 changed=5 written=5 unchanged=4 failed=0
full execute:    scanned=176 changed=26 written=26 unchanged=150 failed=0
final dry-run:   scanned=176 changed=0 unchanged=176 failed=0
```

After both `--execute` runs, always confirm the final dry-run reports `changed=0 failed=0`. If it does not, stop and investigate before running again.

## 7. Rollback Guidance

### Frontend / backend regression

1. Identify the last known-good commit SHA from GitHub Actions.
2. In Portainer, update the image tag to `:sha-<SHA>` for that build.
3. Redeploy and verify with the smoke checklist.

### Data-change regression after `remove-photo-tag --execute`

1. Stop the container.
2. Restore the data directory from the backup created before the execute run.
3. Restart and verify.

Do not repeatedly run `--execute` if the final dry-run still reports `changed > 0` or `failed > 0`. Diagnose first.
