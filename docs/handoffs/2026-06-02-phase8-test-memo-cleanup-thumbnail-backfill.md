# 2026-06-02 Phase 8 Handoff: Test Memo Cleanup and Thumbnail Backfill

## Context

Diary Mode is deployed at `http://192.168.1.205:5231`.

Current runtime image optimizer config should remain:

```sh
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_KEEP_ORIGINAL=false
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
```

Phase 7 retest passed on image `sha-48fbbfff` / `diary-9`:
- uploaded JPEG was stored as resized preview: `4000x3000 -> 2560x1920`
- upload-time `.thumbnail_cache/{uid}.v2.jpeg` was generated as `720x540`
- Docker logs showed no WARN/ERROR/panic

This phase has two independent tasks:
1. Delete the Phase 6/7 verification memos from the deployed diary instance.
2. Add a safe, opt-in way to regenerate `.v2.jpeg` thumbnails for existing image attachments.

Live Photo / Motion Photo support is no longer required. Do not spend time preserving or extending motion-photo behavior in this phase beyond avoiding regressions.

## Task A: Delete Phase 6/7 Test Memos

Delete only the verification memos created for image optimizer testing.

Known attachment UIDs from prior verification:

| Phase | Attachment UID | Notes |
| --- | --- | --- |
| Phase 6 smoke test | `aWTP3fP8VSntHSbvETeJ9L` | KEEP_ORIGINAL=true verification |
| Phase 7 initial test | `SaLHXXoECVXo4Jy2txN99f` | stale-binary run; asset was not resized correctly |
| Phase 7 retest | `Ecxap2PSVMDaEWonoRmKT6` | successful KEEP_ORIGINAL=false retest |

The Phase 7 retest memo text was:

```text
Phase 7 retest: KEEP_ORIGINAL=false 新バイナリ検証 (diary-9, 4000x3000 JPEG)
```

The exact memo UIDs are not recorded in the handoffs. Find each memo by UI search, API, or DB lookup from the attachment UID to `memo_id`.

Safety rules:
- Confirm the memo content is a test/verification memo before deletion.
- Do not delete normal diary entries.
- Prefer deleting the memo through the app/API so attachment cleanup runs normally.
- After deletion, verify the matching attachments and `.thumbnail_cache/{uid}.v2.jpeg` files are gone.

Useful runtime checks on Raspberry Pi:

```sh
docker exec memos-diary sh -lc 'ls -lh /var/opt/memos/.thumbnail_cache | grep -E "aWTP3fP8VSntHSbvETeJ9L|SaLHXXoECVXo4Jy2txN99f|Ecxap2PSVMDaEWonoRmKT6" || true'
docker logs --tail 80 memos-diary
```

Expected result:
- test memos no longer appear in timeline/search
- related image attachments no longer appear
- related `.v2.jpeg` cache files are removed
- no new WARN/ERROR/panic in logs

## Task B: Existing Image Thumbnail Backfill

Goal: regenerate missing or stale `.thumbnail_cache/{uid}.v2.jpeg` files for existing static image attachments without modifying stored asset blobs.

### Required Behavior

Add an explicit maintenance path, not automatic startup work.

Recommended command shape:

```sh
memos thumbnail-backfill --dry-run
memos thumbnail-backfill --execute
memos thumbnail-backfill --execute --missing-only
memos thumbnail-backfill --execute --limit 20
```

The exact command name can differ, but it must be:
- opt-in
- dry-run by default
- safe to run while the service is stopped
- clear in logs about scanned/generated/skipped/failed counts

Do not rewrite original/stored attachments in this phase. The task is thumbnail cache generation only.

### Important Implementation Detail

Do not use the existing `/file/attachments/:uid/:filename?thumbnail=true` path as the backfill mechanism.

Reason: `server/router/fileserver/fileserver.go` still has old on-demand thumbnail constants:

```go
thumbnailMaxSize = 600
imaging.JPEGQuality(90)
```

Phase 6 upload-time thumbnails use:

```go
defaultThumbnailMaxEdge = 720
defaultThumbnailJPEGQuality = 78
writeUploadThumbnailCache(...)
```

Backfill should use the Phase 6 optimizer thumbnail settings so newly generated existing-image thumbnails match upload-time thumbnails.

Preferred implementation:
- Reuse or expose the existing image optimizer thumbnail helper.
- Generate `.thumbnail_cache/{attachment.UID}.v2.jpeg`.
- Use env-backed config:
  - `MEMOS_IMAGE_THUMBNAIL_MAX_EDGE`, default `720`
  - `MEMOS_IMAGE_THUMBNAIL_JPEG_QUALITY`, default `78`
- Keep `MEMOS_IMAGE_KEEP_ORIGINAL` irrelevant for this command.

### Attachment Scope

Include static optimizable image types:

```text
image/jpeg
image/jpg
image/png
image/webp
```

Skip:
- `image/gif`
- `image/svg+xml`
- `image/heic`
- `image/heif`
- `video/*`
- `audio/*`
- Android motion containers if still detected by existing payload helpers
- attachments with empty/missing blobs or missing local/S3 data

If an existing image is local-file backed rather than DB-blob backed, the backfill must read the attachment bytes through the same storage abstraction used by the file server, not assume `attachment.Blob` is populated.

### CLI / Code Notes

The main binary uses Cobra in `cmd/memos/main.go`.

Consider refactoring shared startup code into a small helper so both the server command and the maintenance command can create:
- `profile.Profile`
- DB driver
- `store.Store`

Do not run schema migrations from the backfill command unless the existing app startup path already requires it and there is a clear reason. A read/write cache operation should not unexpectedly alter DB schema.

Known repo footgun:
- `.gitignore` contains a `memos` pattern that can cause `cmd/memos/` additions to be ignored.
- If adding new files under `cmd/memos/`, use `git add -f cmd/memos/...`.
- Existing tracked files in `cmd/memos/` can be edited normally.

### Dry Run Output

Dry run should report at least:
- total image attachments scanned
- thumbnails already present
- thumbnails missing
- thumbnails that would be regenerated if `--force` is supported
- skipped unsupported types
- skipped missing/unreadable blobs

Example:

```text
thumbnail-backfill dry-run
scanned=143 existing=32 missing=111 skipped=5 failed=0
```

### Execute Output

Execute should report:
- generated count
- skipped count
- failed count
- failed attachment UIDs and reason

Failures should not abort the entire run unless initialization fails. Continue item-by-item and summarize failures at the end.

### Optional Flags

Useful but not all required:
- `--missing-only` default true
- `--force` regenerate even if `.v2.jpeg` exists
- `--limit N`
- `--uid UID` for a single attachment
- `--concurrency N` default 1 or use `MEMOS_IMAGE_OPTIMIZER_CONCURRENCY`

Keep the first implementation conservative. A single-threaded command is acceptable for the current data size.

## Verification

Local verification:

```sh
gofmt -w <changed go files>
go test ./server/router/api/v1/... -run ImageOptimizer
go test ./server/router/fileserver/...
go test ./cmd/memos/...
```

If adding a reusable backfill function, add focused tests for:
- dry-run does not write files
- missing thumbnail writes `{uid}.v2.jpeg`
- existing thumbnail is skipped by default
- unsupported MIME types are skipped
- unreadable/invalid images are counted as failed or skipped without stopping the run

Deployed verification after build and Portainer redeploy:

1. Confirm current env:

```sh
docker inspect memos-diary --format '{{range .Config.Env}}{{println .}}{{end}}' | grep MEMOS_IMAGE
```

2. Run dry-run first:

```sh
docker exec memos-diary memos thumbnail-backfill --data /var/opt/memos --dry-run
```

3. Run a limited execute:

```sh
docker exec memos-diary memos thumbnail-backfill --data /var/opt/memos --execute --limit 5
```

4. Confirm generated files:

```sh
docker exec memos-diary sh -lc 'find /var/opt/memos/.thumbnail_cache -name "*.v2.jpeg" -mmin -20 -ls | tail -20'
```

5. Confirm a generated thumbnail max edge is `<= 720`.

6. Run full execute only after the limited run is clean.

7. Check logs:

```sh
docker logs --tail 120 memos-diary
```

Expected result:
- dry-run writes no files
- limited execute generates at most requested count
- full execute generates missing `.v2.jpeg` thumbnails
- existing memo display and image filter still work
- stored asset files are not rewritten
- no WARN/ERROR/panic except item-level backfill warnings for genuinely invalid/unreadable images

## Report Back Format

Please report:

- changed files
- test memo deletion result
- dry-run counts
- execute counts
- generated thumbnail sample path/size/dimensions
- confirmation that stored assets were not rewritten
- tests run
- blocked checks
- issues found

## Suggested Follow-up After This Phase

If backfill reveals many existing on-demand `600px` thumbnails, decide whether to:
- leave them as-is and only generate missing thumbnails, or
- add a one-time `--force` run to normalize all `.v2.jpeg` files to the new `720/78` policy.

Keep that as an explicit user decision after dry-run counts are known.
