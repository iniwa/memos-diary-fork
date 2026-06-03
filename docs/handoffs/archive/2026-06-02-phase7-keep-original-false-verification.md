# 2026-06-02 Phase 7 Keep Original False Verification Handoff

## Context

Phase 6 image optimizer is deployed and verified with:

- `MEMOS_IMAGE_OPTIMIZER_ENABLED=true`
- `MEMOS_IMAGE_KEEP_ORIGINAL=true`
- `MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1`
- default preview/thumbnail settings: `2560/90/720/78`

Deployed verification confirmed:

- New JPEG upload succeeds.
- Memo image grid and preview lightbox work.
- `attachment.hasImage:true` filter includes the new memo.
- `.thumbnail_cache/{uid}.v2.jpeg` is generated at upload time.
- Docker logs show no optimizer/thumbnail errors.
- With `KEEP_ORIGINAL=true`, the stored attachment remains approximately original-sized after existing EXIF stripping.

The owner now wants to switch to `MEMOS_IMAGE_KEEP_ORIGINAL=false`.

## Goal

Verify that Diary Mode can safely store optimized preview-sized images instead of originals for new supported static image uploads.

This phase is verification and runtime configuration only. Do not change source code unless a clear defect is found and reported first.

## Target Deployment

- App URL: `http://192.168.1.205:5231`
- Container: `memos-diary`
- Image: `ghcr.io/iniwa/memos-diary-fork:latest`
- Expected implementation commit: `cc005908 feat(diary-mode): add opt-in image optimizer`

## Required Runtime Flags

Set these in Portainer before testing:

```env
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_KEEP_ORIGINAL=false
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
```

Leave these unset unless the owner explicitly wants to tune them:

```env
MEMOS_IMAGE_PREVIEW_MAX_EDGE
MEMOS_IMAGE_PREVIEW_JPEG_QUALITY
MEMOS_IMAGE_THUMBNAIL_MAX_EDGE
MEMOS_IMAGE_THUMBNAIL_JPEG_QUALITY
```

Unset values should use defaults:

- preview max edge: `2560`
- preview JPEG quality: `90`
- thumbnail max edge: `720`
- thumbnail JPEG quality: `78`

## Safety Notes

- This setting affects newly uploaded supported static images only.
- It should not rewrite existing attachment files.
- It should not batch-process copied production data.
- Take a Portainer/container volume backup before enabling `KEEP_ORIGINAL=false` if possible.
- Do not delete existing originals or old thumbnail cache files in this phase.
- Live Photo / Motion photo support is out of scope and not required.

## Verification Checklist

### 1. Confirm Runtime Configuration

On the Raspberry Pi host, confirm the effective environment:

```sh
docker inspect memos-diary --format '{{range .Config.Env}}{{println .}}{{end}}' | grep MEMOS_IMAGE
```

Expected:

- `MEMOS_IMAGE_OPTIMIZER_ENABLED=true`
- `MEMOS_IMAGE_KEEP_ORIGINAL=false`
- `MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1`

### 2. Upload a Large JPEG

Use a JPEG that is clearly larger than the preview max edge, for example:

- width or height greater than `2560`
- preferably several MB if available

Create a new memo with this image attached.

Expected:

- Upload succeeds.
- Memo saves normally.
- The image appears in the inline grid.
- Clicking the image opens the preview lightbox.
- No visible UI regression in the memo card.

### 3. Confirm Stored File Was Optimized

Find the new attachment UID from the UI, logs, DB, or asset directory. Then inspect the stored file under the Memos data volume.

Useful commands:

```sh
docker exec memos-diary sh -lc 'find /var/opt/memos/assets -type f -mmin -20 -ls | tail -20'
docker exec memos-diary sh -lc 'find /var/opt/memos/.thumbnail_cache -type f -mmin -20 -ls | tail -20'
```

Expected:

- The stored asset for the new upload is smaller than the original local test file.
- The optimized stored image has max dimension less than or equal to `2560`.
- A new `.thumbnail_cache/{uid}.v2.jpeg` exists.
- The `.v2.jpeg` thumbnail is smaller than the stored preview image.

If available, use `file`, `identify`, or another image dimension tool on the host/container. If not available, report file sizes and use browser behavior as the minimum verification.

### 4. Confirm Existing Features Still Work

Light smoke test:

- Existing image grid still renders.
- New uploaded optimized image appears under `?filter=attachment.hasImage:true`.
- Tag chips still render.
- Phase 5 leading/trailing tag behavior is unchanged.

### 5. Check Logs

```sh
docker logs --tail 120 memos-diary
```

Expected:

- No panic.
- No upload failure.
- No repeated optimizer or thumbnail warnings.
- `CreateAttachment` / `CreateMemo` INFO lines are acceptable.

## Report Format

Return:

- `Changed Runtime Config`
- `Verified`
- `Issues Found`
- `Not Verified`
- `Suggested Next Work`

Include concrete values:

- uploaded test image dimensions and size before upload
- stored asset size after upload
- stored asset dimensions, if measurable
- generated `.v2.jpeg` filename and size
- any relevant docker log lines

## Decision Points

If verification passes:

- Keep `MEMOS_IMAGE_KEEP_ORIGINAL=false` for Diary Mode.
- No source code change is required.
- Record the deployed verification result in a new handoff/verification doc.

If verification fails:

- Revert only the runtime flag to `MEMOS_IMAGE_KEEP_ORIGINAL=true`.
- Keep `MEMOS_IMAGE_OPTIMIZER_ENABLED=true`.
- Report the exact failure before making code changes.

## Future Phase Candidate

After this phase, consider a separate existing-image thumbnail regeneration phase.

Do not combine it with this verification. A regeneration task should be opt-in, dry-run capable, and should not rewrite originals unless explicitly approved.
