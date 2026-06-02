# 2026-06-02 Phase 6 Image Optimizer Verification Handoff

## Context

Phase 6 adds opt-in static image optimization for Diary Mode uploads.

Latest implementation target:

- Static images only: JPEG/JPG/PNG/WebP.
- Live Photo / Motion photo support is explicitly out of scope.
- Existing on-demand thumbnail serving via `/file/attachments/:uid/:filename?thumbnail=true` remains the frontend path.

## Changed Files

- `server/router/api/v1/image_optimizer.go`
  - New env-driven image optimizer helpers.
  - Generates `.thumbnail_cache/{attachment_uid}.v2.jpeg` during upload when enabled.
  - Optionally replaces stored original with a resized preview image when `MEMOS_IMAGE_KEEP_ORIGINAL=false`.
- `server/router/api/v1/image_optimizer_test.go`
  - Unit tests for JPEG resizing and env parsing.
- `server/router/api/v1/attachment_service.go`
  - Calls the optimizer after EXIF stripping and before attachment storage.
- `server/router/api/v1/v1.go`
  - Uses `MEMOS_IMAGE_OPTIMIZER_CONCURRENCY` for image-processing semaphore size.
- `store/attachment.go`
  - Deletes `.thumbnail_cache/{uid}.v2.jpeg` when deleting an attachment.
- `.env.example`
  - Documents image optimizer env vars.
- `docker-compose.diary.yml`
  - Updates comments for opt-in image optimization.

## Runtime Flags

Recommended first rollout:

```env
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
MEMOS_IMAGE_PREVIEW_MAX_EDGE=2560
MEMOS_IMAGE_PREVIEW_JPEG_QUALITY=90
MEMOS_IMAGE_THUMBNAIL_MAX_EDGE=720
MEMOS_IMAGE_THUMBNAIL_JPEG_QUALITY=78
MEMOS_IMAGE_KEEP_ORIGINAL=true
```

This keeps uploaded originals but pre-generates thumbnail cache at upload time.

After verifying behavior and backups:

```env
MEMOS_IMAGE_KEEP_ORIGINAL=false
```

This stores a resized preview image instead of the original for supported static image uploads.

## Expected Behavior

With `MEMOS_IMAGE_OPTIMIZER_ENABLED=false`:

- Upload behavior is unchanged.
- Existing on-demand thumbnail generation still works.

With `MEMOS_IMAGE_OPTIMIZER_ENABLED=true` and `MEMOS_IMAGE_KEEP_ORIGINAL=true`:

- JPEG/JPG/PNG/WebP uploads succeed normally.
- Stored attachment remains original-sized, apart from existing EXIF stripping behavior.
- `.thumbnail_cache/{uid}.v2.jpeg` is generated during upload.
- Memo image grid uses the thumbnail URL as before.

With `MEMOS_IMAGE_OPTIMIZER_ENABLED=true` and `MEMOS_IMAGE_KEEP_ORIGINAL=false`:

- JPEG/JPG/PNG/WebP uploads are resized to `MEMOS_IMAGE_PREVIEW_MAX_EDGE`.
- Stored attachment size should be smaller for large photos.
- PNG with alpha is preserved as PNG; other optimized outputs are JPEG.
- Thumbnail cache is also generated.

Unsupported or deferred formats:

- GIF/SVG/AVIF/HEIC are not optimized by upload-time optimizer.
- They should continue with existing behavior.
- Live Photo / Motion photo is not a target for this phase.

## Verification Checklist

### Local / CI

- `go test ./server/router/api/v1 -run ImageOptimizer`
- `go test ./server/router/api/v1/...`
- Existing frontend checks are optional because this phase does not change frontend code.

### Deployed Smoke

1. Deploy the image containing this phase.
2. In Portainer, set:

```env
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
MEMOS_IMAGE_KEEP_ORIGINAL=true
```

3. Upload a large JPEG photo to a new memo.
4. Confirm the memo saves and image grid renders.
5. On the Raspberry Pi host, inspect:

```sh
docker exec memos-diary sh -lc 'ls -lh /var/opt/memos/.thumbnail_cache | tail'
```

Expected:

- A new `{uid}.v2.jpeg` file exists.
- Docker logs do not show optimizer errors.

### Optional Destructive-Style Check

Only after backup:

1. Set `MEMOS_IMAGE_KEEP_ORIGINAL=false`.
2. Upload another large JPEG.
3. Confirm stored attachment is resized by checking dimensions or file size in `/var/opt/memos/assets`.

## Notes For ClaudeCode

- Do not add Live Photo or Motion photo work in this phase.
- Do not introduce DB migrations for preview/thumbnail metadata yet.
- Do not delete existing original files in copied production data.
- Upload-time optimization failure should be non-fatal; logs are acceptable, failed uploads are not.
- If Go tests fail because generated files or toolchain are unavailable locally, report exact failure and rely on GitHub Actions after push.
