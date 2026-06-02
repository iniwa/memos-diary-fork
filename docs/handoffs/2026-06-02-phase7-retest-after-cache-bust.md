# 2026-06-02 Phase 7 Retest After Cache Bust Handoff

## Context

Phase 7 switches Diary Mode image uploads to:

```env
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_KEEP_ORIGINAL=false
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
```

The first deployed verification did not pass because the running image appeared to contain a stale Go binary.

Observed behavior before the CI fix:

- Runtime env was set correctly.
- Upload, memo save, preview lightbox, and image filter worked.
- `.v2.jpeg` thumbnail cache was generated.
- Stored asset stayed `4000x3000` instead of being resized to `2560x1920`.
- Thumbnail generation appeared to use old behavior: max edge `600`, while Phase 6 default should be `720`.

Root cause hypothesis:

- GitHub Actions reused a stale Go build object from the image build cache.
- The Docker image was rebuilt and pushed, but the Go binary inside it did not include the Phase 6 optimizer behavior.

## Cache Bust Fix

Commit:

```text
48fbbfff ci(diary-mode): bust go build cache to fix stale binary in image
```

Changed files:

- `scripts/Dockerfile`
  - Adds `ARG BUILD_ID=0`.
  - Uses the changing build arg to invalidate the Go build layer.
  - Removes `--mount=type=cache,target=/root/.cache/go-build` so stale Go build objects are not reused.
- `.github/workflows/build-diary-image.yml`
  - Passes `BUILD_ID=${{ github.run_number }}` as a build arg.

## Current State

ClaudeCode stopped while CI/redeploy verification was in progress.

Before resuming, confirm:

- GitHub Actions has completed for commit `48fbbfff` or later.
- Portainer has pulled and redeployed `ghcr.io/iniwa/memos-diary-fork:latest`.
- The running container is newly created after the successful CI image push.

## Target Deployment

- App URL: `http://192.168.1.205:5231`
- Container: `memos-diary`
- Image: `ghcr.io/iniwa/memos-diary-fork:latest`
- Branch: `diary-mode`
- Expected commit in image: `48fbbfff` or later

## Runtime Flags To Confirm

```sh
docker inspect memos-diary --format '{{range .Config.Env}}{{println .}}{{end}}' | grep MEMOS_IMAGE
```

Expected:

- `MEMOS_IMAGE_OPTIMIZER_ENABLED=true`
- `MEMOS_IMAGE_KEEP_ORIGINAL=false`
- `MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1`

If preview/thumbnail env vars are unset, defaults must be:

- preview max edge: `2560`
- preview JPEG quality: `90`
- thumbnail max edge: `720`
- thumbnail JPEG quality: `78`

## Verification Steps

### 1. Confirm Fresh Container

Check image/container timing:

```sh
docker inspect memos-diary --format '{{.Created}}'
docker inspect ghcr.io/iniwa/memos-diary-fork:latest --format '{{.Id}} {{.Created}}'
```

Expected:

- Container creation time is after the CI build completed.
- Image creation time is after commit `48fbbfff` was built.

If this is not true, redeploy in Portainer before testing.

### 2. Upload A New Large JPEG

Use a fresh test image, preferably:

- `4000x3000` JPEG, or another image with an edge greater than `2560`
- known local size and dimensions

Create a new memo at:

```text
http://192.168.1.205:5231
```

Expected UI behavior:

- Upload succeeds.
- Memo saves.
- Inline image grid renders.
- Preview lightbox opens.
- `?filter=attachment.hasImage:true` includes the new memo.

### 3. Confirm Stored Asset Dimensions

Find the newest asset:

```sh
docker exec memos-diary sh -lc 'find /var/opt/memos/assets -type f -mmin -20 -ls | tail -20'
```

Confirm dimensions using whichever tool is available.

Preferred:

```sh
docker exec memos-diary sh -lc 'file /var/opt/memos/assets/<path-to-new-asset>'
```

If `file` is unavailable, use the prior JPEG SOF/header check method.

Expected:

- A `4000x3000` test image should be stored as `2560x1920`.
- More generally, the longest edge should be less than or equal to `2560`.
- Stored file size should be smaller than the original local test image.

### 4. Confirm `.v2.jpeg` Thumbnail Dimensions

Find the newest thumbnail:

```sh
docker exec memos-diary sh -lc 'find /var/opt/memos/.thumbnail_cache -name "*.v2.jpeg" -mmin -20 -ls | tail -20'
```

Expected:

- New `{uid}.v2.jpeg` exists.
- A `4000x3000` upload should produce a thumbnail around `720x540`.
- More generally, the longest edge should be less than or equal to `720`.

This specifically verifies that the new binary is running. The stale-binary run appeared to produce `600px` thumbnails.

### 5. Check Logs

```sh
docker logs --tail 120 memos-diary
```

Expected:

- No panic.
- No failed upload.
- No repeated optimizer or thumbnail warnings.
- Normal `CreateAttachment` / `CreateMemo` INFO lines are acceptable.

## Pass Criteria

Phase 7 passes only if all are true:

- `KEEP_ORIGINAL=false` is present in the running container env.
- A new large JPEG upload is stored with max edge `<= 2560`.
- A new `.v2.jpeg` thumbnail is generated with max edge `<= 720`.
- Memo UI, preview, and image filter still work.
- Logs show no optimizer-related failure.

## Fail Criteria

If either of these happens after redeploy:

- Stored asset remains original dimensions, e.g. `4000x3000`.
- `.v2.jpeg` remains capped at `600px` instead of `720px`.

Then treat the image as still stale or the optimizer path as not being invoked.

Recommended response:

1. Revert runtime only to `MEMOS_IMAGE_KEEP_ORIGINAL=true` if production uploads are at risk.
2. Keep `MEMOS_IMAGE_OPTIMIZER_ENABLED=true`.
3. Report the exact container image ID, creation time, upload UID, asset size, dimensions, and logs.
4. Do not make code changes until the stale image vs code defect distinction is clear.

## Report Format

Return:

- `CI / Redeploy Status`
- `Changed Runtime Config`
- `Verified`
- `Issues Found`
- `Not Verified`
- `Suggested Next Work`

Include:

- CI run/build completion time if known
- container creation time
- image ID / image creation time
- uploaded image dimensions and size before upload
- stored asset path, size, and dimensions
- generated `.v2.jpeg` path, size, and dimensions
- relevant docker log lines

## Notes

- Do not combine this with existing-image batch thumbnail regeneration.
- Do not delete originals or old cache files in this phase.
- Live Photo / Motion photo support remains out of scope.
- If verification passes, create a deployed verification doc and keep `MEMOS_IMAGE_KEEP_ORIGINAL=false` as the Diary Mode default runtime choice.
