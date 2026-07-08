# 2026-06-08 Bulk image upload File snapshot handoff

## Context

Users reported that saving a memo after adding many images at once could fail with:

```txt
Failed to save memo: The requested file could not be read, typically due to permission problems that have occurred after a reference to a file was acquired.
```

The likely root cause was the memo editor keeping browser-managed `File` references in `state.localFiles` and delaying `file.arrayBuffer()` until `memoService.save()` calls `uploadService.uploadFiles()`. With many selected images, the browser can later fail to read one of those original file references.

## Current fix

The editor now snapshots each selected/dropped/pasted `File` immediately:

1. Read the original `File` with `arrayBuffer()` at input time.
2. Create a new in-memory `File` with the same name, MIME type, and `lastModified`.
3. Store that snapshot in `LocalFile.file`.
4. Create preview object URLs from the snapshotted `File`, not the original browser-managed `File`.

This keeps memo save/upload reading from the app-owned snapshot instead of a stale browser file reference.

## Changed files

- `web/src/components/MemoEditor/utils/localFile.ts`
  - Adds `snapshotFile`, `createLocalFile`, and sequential `createLocalFiles`.
- `web/src/components/MemoEditor/hooks/useFileUpload.ts`
  - Snapshots file-picker files before adding them to editor state.
  - Uses state-backed `selectingFlag` so the insert button can show loading while snapshots are being created.
- `web/src/components/MemoEditor/components/EditorContent.tsx`
  - Snapshots drag-and-drop and pasted files before adding them to editor state.
- `web/tests/memo-editor-local-file.test.ts`
  - Verifies file metadata/content is copied and preview URLs are created from the snapshotted file.

## Verified

Run from `web/`:

```sh
pnpm test -- memo-editor-paste.test.tsx memo-editor-local-file.test.ts
pnpm lint
pnpm build
```

Results on 2026-06-08:

- Targeted tests passed: 2 files, 6 tests.
- `pnpm lint` passed.
- `pnpm build` passed.
- Build emitted the existing large chunk warning; it is not related to this change.

## Suggested ClaudeCode follow-up

Ask ClaudeCode to verify this behavior end-to-end in a browser:

1. Start the local app with the normal project dev setup.
2. Select many images at once through the memo editor media upload button.
3. Confirm previews appear.
4. Wait briefly before saving, to exercise the previous delayed-read failure mode.
5. Save the memo and confirm all attachments are uploaded and rendered.
6. Repeat with drag-and-drop and paste if convenient.

If the issue still reproduces, inspect whether any upload path bypasses `createLocalFiles()` or whether memory pressure from very large batches is causing a different failure. In that case, the next design should consider uploading attachments immediately when added, rather than holding all image bytes in editor state until memo save.
