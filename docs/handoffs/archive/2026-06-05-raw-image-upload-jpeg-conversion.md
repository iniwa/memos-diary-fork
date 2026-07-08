# 2026-06-05 RAW image upload JPEG conversion handoff

This handoff is for adding upload-time conversion of camera RAW images into compressed JPEG attachments.

## Goal

When a user uploads a RAW still image, Memos Diary Mode should store a browser-displayable, compressed JPEG instead of the RAW file.

Expected user-visible behavior:

- RAW files from common cameras can be selected/uploaded like normal attachments.
- The uploaded item renders in memo image grids and attachment previews as a JPEG.
- The stored attachment MIME type is `image/jpeg`.
- The stored filename uses a JPEG extension, for example `DSC01234.ARW` becomes `DSC01234.jpg`.
- The output JPEG is resized/compressed using the existing image optimizer preview settings.

## Current State

Relevant files:

- `server/router/api/v1/attachment_service.go`
  - `CreateAttachment` normalizes MIME type, validates size, strips EXIF for supported image types, calls `maybeOptimizeImageAttachment`, then stores the blob.
  - `mime.TypeByExtension` and browser-provided `file.type` will not reliably identify RAW formats; many RAW uploads may arrive as `application/octet-stream` or an empty type.
- `server/router/api/v1/image_optimizer.go`
  - Existing upload-time optimizer supports only `image/jpeg`, `image/jpg`, `image/png`, and `image/webp`.
  - Existing env settings already provide the desired output constraints:
    - `MEMOS_IMAGE_PREVIEW_MAX_EDGE`
    - `MEMOS_IMAGE_PREVIEW_JPEG_QUALITY`
    - `MEMOS_IMAGE_OPTIMIZER_CONCURRENCY`
- `server/router/fileserver/fileserver.go`
  - Thumbnail generation expects displayable image formats. RAW should not reach this path as RAW after the new feature.
- `web/src/components/MemoEditor/services/uploadService.ts`
  - Frontend sends `filename`, `size`, `type`, and raw bytes. Keep RAW conversion server-side so drag/drop, pasted files, API clients, and browser MIME differences share one behavior.
- `scripts/Dockerfile`
  - Runtime image is Alpine and currently installs only `tzdata`, `ca-certificates`, and `su-exec`. RAW decoding will require an added runtime dependency if using an external decoder.

## Recommended Design

Implement RAW conversion on the backend before EXIF stripping and before `maybeOptimizeImageAttachment`.

Recommended pipeline inside `CreateAttachment`:

1. Build `store.Attachment` as today.
2. Detect RAW by normalized MIME type and filename extension.
3. If RAW conversion is enabled and the file is RAW:
   - acquire the existing image-processing semaphore;
   - convert RAW bytes to a JPEG preview blob;
   - set `create.Blob` to the JPEG bytes;
   - set `create.Size` to the JPEG byte length;
   - set `create.Type` to `image/jpeg`;
   - rewrite `create.Filename` to use `.jpg`;
   - release the semaphore.
4. Continue through the existing EXIF stripping and image optimizer path.

Do not store the RAW original in this feature. The user request is conversion/compression, and keeping originals would make storage behavior surprising compared with the current `MEMOS_IMAGE_KEEP_ORIGINAL=false` Diary Mode direction.

## Runtime Flag

Add a dedicated opt-in flag:

```env
MEMOS_RAW_IMAGE_CONVERSION_ENABLED=false
MEMOS_RAW_IMAGE_CONVERSION_TIMEOUT_SECONDS=30
```

Rationale:

- RAW decoding adds external dependencies and higher CPU/RAM use than JPEG/PNG/WebP optimization.
- A separate flag allows deploying the binary and container dependency first, then enabling conversion after a backup.
- Timeout prevents a malformed or very large RAW file from tying up the Raspberry Pi.

Recommended first production rollout:

```env
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_KEEP_ORIGINAL=false
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
MEMOS_RAW_IMAGE_CONVERSION_ENABLED=true
MEMOS_RAW_IMAGE_CONVERSION_TIMEOUT_SECONDS=30
```

## Decoder Choice

RAW decoding is not available through Go's standard image decoders or the existing `github.com/disintegration/imaging` flow.

Use an external decoder through `exec.CommandContext` with a hard-coded executable name and no shell invocation. Recommended implementation path:

- Add a small helper in a new file such as `server/router/api/v1/raw_image_converter.go`.
- Write input bytes to a private temp directory.
- Invoke a container-provided converter to write a JPEG output file.
- Read the JPEG output bytes back into memory.
- Delete the temp directory with `defer os.RemoveAll`.

Preferred tooling to evaluate:

- ImageMagick with RAW/libraw delegate if available in Alpine.
- `libraw-tools` plus a JPEG-capable conversion path if ImageMagick delegate support is not available.

Before implementation, confirm the actual Alpine package names in the build container. The final `scripts/Dockerfile` change should install only the runtime packages required by the chosen converter.

Security requirements:

- Never pass user filenames to a shell.
- Use generated temp filenames, not the uploaded filename, for decoder input/output.
- Enforce context timeout.
- Re-check upload size limit before conversion using existing logic.
- Validate output with `image.DecodeConfig` and reject empty/invalid JPEG output.
- Keep failures non-fatal only when conversion is disabled or the file is not RAW. If conversion is enabled and a detected RAW fails to convert, return `InvalidArgument` so the user knows the file was not accepted.

## RAW Detection

Add detection by extension first, then MIME type.

Initial supported extensions:

```txt
.3fr
.arw
.cr2
.cr3
.dcr
.dng
.erf
.fff
.iiq
.k25
.kdc
.mef
.mos
.mrw
.nef
.nrw
.orf
.pef
.raf
.raw
.rw2
.rwl
.sr2
.srf
.x3f
```

Initial MIME aliases to recognize:

```txt
image/x-adobe-dng
image/x-canon-cr2
image/x-canon-cr3
image/x-fuji-raf
image/x-nikon-nef
image/x-olympus-orf
image/x-panasonic-rw2
image/x-pentax-pef
image/x-sony-arw
image/x-sigma-x3f
image/x-dcraw
image/x-raw
```

Important: browsers often provide `""` or `application/octet-stream` for RAW files, so extension detection is required.

## Suggested Code Shape

Add focused helpers:

- `isRawImageUpload(filename, mimeType string) bool`
- `jpegFilenameForRaw(filename string) string`
- `rawImageConversionConfigFromEnv() rawImageConversionConfig`
- `convertRawImageToJPEG(ctx context.Context, blob []byte, filename string, config rawImageConversionConfig, previewConfig imageOptimizerConfig) ([]byte, error)`
- `maybeConvertRawImageAttachment(ctx context.Context, attachment *store.Attachment) error`

`maybeConvertRawImageAttachment` should return an error for detected RAW conversion failures when conversion is enabled. This differs from regular optimization, where failure is logged and the original upload continues.

Avoid adding database columns or attachment payload metadata in this phase.

## Files To Change

Expected:

- `server/router/api/v1/attachment_service.go`
  - Call RAW conversion before EXIF stripping and before `maybeOptimizeImageAttachment`.
- `server/router/api/v1/raw_image_converter.go`
  - New RAW detection/conversion helpers.
- `server/router/api/v1/raw_image_converter_test.go`
  - Detection, filename rewrite, env parsing, disabled behavior, timeout/command failure behavior.
- `scripts/Dockerfile`
  - Add runtime decoder dependency after confirming Alpine package support.
- `.env.example`
  - Document RAW conversion flags with safe defaults.
- `docker-compose.diary.yml`
  - Add commented opt-in RAW conversion settings.
- `docs/diary-mode-operations.md`
  - Add deployment/rollback notes for RAW conversion.

Optional:

- `web/src/utils/format.ts`
  - Add nicer labels for common RAW MIME aliases if RAW can still appear in attachment lists when conversion is disabled.

## Tests

Minimum local tests:

```sh
go test ./server/router/api/v1 -run 'Raw|ImageOptimizer|Exif'
go test ./server/router/api/v1/...
```

Unit tests should not require a real RAW decoder unless the executable is present. Recommended split:

- Pure unit tests for detection, filename rewriting, config parsing, and disabled behavior.
- Converter integration test guarded by `exec.LookPath(...)`; skip when decoder is not installed.

Integration fixture:

- Add a tiny sample RAW file only if licensing and repository size are acceptable.
- Otherwise document manual test files and keep the integration test opt-in via env, for example `MEMOS_RAW_CONVERTER_TEST_FILE`.

Manual smoke test:

1. Build the Docker image with the chosen decoder installed.
2. Run with:

```env
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_KEEP_ORIGINAL=false
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
MEMOS_RAW_IMAGE_CONVERSION_ENABLED=true
```

3. Upload one `.ARW`, one `.NEF`, and one `.DNG` if available.
4. Confirm each upload succeeds and memo image grid renders.
5. Inspect the attachment record or API response:
   - `type` is `image/jpeg`;
   - filename ends in `.jpg`;
   - size is much smaller than the RAW input.
6. Confirm `.thumbnail_cache/{uid}.v2.jpeg` is generated.
7. Confirm Docker logs have no decoder timeout or memory errors.

## Rollback

Runtime rollback:

```env
MEMOS_RAW_IMAGE_CONVERSION_ENABLED=false
```

This should stop new RAW conversion without affecting existing JPEG attachments converted from RAW.

If the decoder dependency causes container startup or image-size issues, revert the `scripts/Dockerfile` dependency and leave the flag disabled.

## Notes For ClaudeCode

- Keep conversion server-side. Do not rely on browser RAW decoding.
- Do not add RAW originals to storage in this phase.
- Do not change memo markdown or attachment DB schema.
- Do not run decoder commands through a shell.
- Keep concurrency under the existing image-processing semaphore.
- RAW conversion failures for detected RAW uploads should be visible to the user instead of silently storing an unusable RAW file.
- Verify Alpine decoder availability before committing the Dockerfile package name.
