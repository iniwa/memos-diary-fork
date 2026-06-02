# 2026-06-02 Phase 8 Review Follow-up: Fix DB Blob Thumbnail Backfill

## Summary

Phase 8 implementation commit `fec91b9c` added `memos thumbnail-backfill` and successfully deleted the Phase 6/7 verification memos.

Code review found one issue that should be fixed before deployed backfill execution.

## Completed

### Test Memo Cleanup

The three optimizer verification memos were deleted:

| Phase | Attachment UID | Memo UID | Result |
| --- | --- | --- | --- |
| Phase 6 verification | `aWTP3fP8VSntHSbvETeJ9L` | `fYzm8ZXZoCYX7DVRPTDh4i` | deleted |
| Phase 7 initial verification | `SaLHXXoECVXo4Jy2txN99f` | `hKcaTubHxtYqDwiyvbEVGB` | deleted |
| Phase 7 retest | `Ecxap2PSVMDaEWonoRmKT6` | `iivJ6LijXtxxWN3LvZwgLQ` | deleted |

Reported result:
- related assets removed
- related `.thumbnail_cache/*.v2.jpeg` files removed
- related memos removed
- Docker logs contained no WARN/ERROR

## Review Finding

### DB-backed attachments are skipped because blobs are not loaded

File: `cmd/memos/thumbnail_backfill.go`

Current flow:

```go
attachments, err := storeInstance.ListAttachments(ctx, find)
...
blob, readErr := thumbnailBackfillReadBlob(instanceProfile, att)
```

`find.GetBlob` is not set when listing attachments.

For SQLite, `store/db/sqlite/attachment.go` only selects `attachment.blob` when `FindAttachment.GetBlob == true`.
Therefore DB-backed attachments have `att.Blob == nil` in the list result.

Current `thumbnailBackfillReadBlob` then returns `att.Blob` for non-local storage:

```go
// For database-backed blobs, Blob is populated when GetBlob=true was used.
// ListAttachments without GetBlob leaves Blob nil; treat as empty/skipped.
return att.Blob, nil
```

Impact:
- local-file-backed attachments can be backfilled
- DB-backed image attachments are counted as missing, then skipped as empty in execute mode
- dry-run counts may look correct, but execute will not generate thumbnails for DB-backed images

This is likely relevant because Memos supports database-backed attachment blobs and existing imported data may use either storage mode.

## Required Fix

Before reading a blob for generation, fetch the full attachment with blob by UID or ID.

Recommended shape:

```go
func thumbnailBackfillReadBlob(ctx context.Context, st *store.Store, p *profile.Profile, att *store.Attachment) ([]byte, error) {
    switch att.StorageType {
    case storepb.AttachmentStorageType_LOCAL:
        // existing local-file path is OK
    case storepb.AttachmentStorageType_S3:
        // either skip explicitly for now, or read via storage helper if available
    default:
        uid := att.UID
        full, err := st.GetAttachment(ctx, &store.FindAttachment{UID: &uid, GetBlob: true})
        if err != nil {
            return nil, err
        }
        if full == nil {
            return nil, errors.New("attachment not found")
        }
        return full.Blob, nil
    }
}
```

Notes:
- Preserve the paged list without blobs for scanning, so memory stays bounded.
- Load the blob only for the current item that will actually be generated.
- Do not set `GetBlob=true` on the main paged `ListAttachments` call with page size 200.
- If S3 is not implemented in this command, report it as `skipped` or `failed` explicitly rather than silently returning nil.

## Required Test

Add a focused test for database-backed blobs:

- create a DB-backed JPEG attachment with `Blob` set
- ensure `.thumbnail_cache/{uid}.v2.jpeg` does not exist
- run the backfill execute path or extracted reusable function
- assert the `.v2.jpeg` file is created

Also add or confirm:
- dry-run writes no files
- existing thumbnail is skipped by default
- unsupported MIME types are skipped

## Verification Already Run By Codex

After `fec91b9c`, these tests passed locally:

```sh
go test ./server/router/api/v1/... -run ImageOptimizer
go test ./cmd/memos/...
go test ./server/router/fileserver/...
```

These tests did not catch the DB blob issue because no backfill test covers it yet.

## Deployment Guidance

Do not run full deployed `thumbnail-backfill --execute` until this issue is fixed and the new test passes.

After the fix:

1. Build via CI.
2. Redeploy in Portainer.
3. Run dry-run:

```sh
docker exec memos-diary memos thumbnail-backfill --data /var/opt/memos
```

4. Run limited execute:

```sh
docker exec memos-diary memos thumbnail-backfill --data /var/opt/memos --execute --limit 5
```

5. Confirm generated `.v2.jpeg` files have max edge `<= 720`.
6. Then run full execute.

## Report Back

Please report:
- changed files
- how DB-backed blob loading was fixed
- whether S3/local/database storage modes are supported or skipped
- tests added
- test results
- dry-run counts if deployed
- limited execute counts if deployed
