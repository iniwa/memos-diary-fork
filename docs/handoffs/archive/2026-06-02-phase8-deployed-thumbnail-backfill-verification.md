# 2026-06-02 Phase 8 Deployed Verification: Thumbnail Backfill

## Context

Phase 8 implementation and review fix are complete.

Relevant commits:
- `fec91b9c` - add `thumbnail-backfill` CLI command
- `e124c250` - fix DB-backed blob loading in `thumbnail-backfill`

Codex review after `e124c250`:
- DB-backed attachments now load blobs with `GetAttachment(..., GetBlob: true)`.
- Local file-backed attachments are read from the filesystem.
- S3-backed attachments return an explicit unsupported error.
- Core backfill logic is extracted as `backfillAttachments()`.
- Tests for dry-run, existing-cache skip, unsupported MIME skip, and DB-backed blob generation were added.

Local tests run by Codex:

```sh
go test ./cmd/memos/...
go test ./server/router/api/v1/... -run ImageOptimizer
go test ./server/router/fileserver/...
```

All passed.

## Prerequisite

Wait for CI build for commit `e124c250` to complete, then redeploy `memos-diary` in Portainer with the latest GHCR image.

Runtime config should remain:

```sh
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_KEEP_ORIGINAL=false
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
```

Preview/thumbnail env vars may stay unset, using defaults:
- preview max edge: `2560`
- preview JPEG quality: `90`
- thumbnail max edge: `720`
- thumbnail JPEG quality: `78`

## Verification Steps

### 1. Confirm Deployed Binary

```sh
docker exec memos-diary memos version
docker inspect memos-diary --format '{{.Image}} {{.Created}}'
```

Expected:
- image/binary corresponds to the CI build containing `e124c250`
- container was recreated after the CI build

### 2. Confirm Env

```sh
docker inspect memos-diary --format '{{range .Config.Env}}{{println .}}{{end}}' | grep MEMOS_IMAGE
```

Expected:

```text
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_KEEP_ORIGINAL=false
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
```

### 3. Dry Run

```sh
docker exec memos-diary memos thumbnail-backfill --data /var/opt/memos
```

Expected:
- command runs in dry-run mode by default
- no files are written
- output includes `scanned`, `existing`, `missing`, `skipped`, `failed`
- `failed=0` is ideal; S3-backed attachments may be reported later during execute if any exist

Record the counts.

### 4. Limited Execute

Run a small batch first:

```sh
docker exec memos-diary memos thumbnail-backfill --data /var/opt/memos --execute --limit 5
```

Expected:
- at most 5 thumbnails are generated
- output includes `generated`
- no unexpected failures

Check new cache files:

```sh
docker exec memos-diary sh -lc 'find /var/opt/memos/.thumbnail_cache -name "*.v2.jpeg" -mmin -20 -ls | tail -20'
```

Confirm one generated file has max edge `<= 720`.

### 5. Full Execute

Only after the limited execute is clean:

```sh
docker exec memos-diary memos thumbnail-backfill --data /var/opt/memos --execute
```

Expected:
- missing existing-image thumbnails are generated
- existing `.v2.jpeg` files are skipped by default
- unsupported MIME types are skipped
- stored asset files are not rewritten

### 6. UI Smoke Test

Open:

```text
http://192.168.1.205:5231
```

Check:
- timeline loads
- image grid still displays existing images
- `?filter=attachment.hasImage:true` still works
- a few image thumbnails render normally
- preview/lightbox still opens

### 7. Logs

```sh
docker logs --tail 120 memos-diary
```

Expected:
- no panic
- no repeated WARN/ERROR
- item-level warnings are acceptable only for genuinely invalid/unreadable images

## Pass Criteria

Phase 8 deployed verification passes when:
- test memos remain deleted
- dry-run completes and reports counts
- limited execute generates thumbnails
- full execute completes without unexpected failures
- generated `.v2.jpeg` thumbnails are capped at `<= 720px`
- existing memo display is unchanged
- Docker logs are clean

## Report Back

Please report:
- deployed image/build identifier
- env vars
- dry-run counts
- limited execute counts
- full execute counts
- sample generated thumbnail path, size, and dimensions
- UI smoke-test result
- Docker log result
- issues found
