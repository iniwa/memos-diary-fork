# 0009 — Upstream 26.11.2 integration

Date: 2026-11-25. Status: approved subject to verification and restore checks.

The owner approved the [29 listed migration, proto and generated web binding
paths][inventory] and deployment after verification and restore confirmation
in [NIWA-247][approval]. The scope is the cumulative change from canonical
`b40d8a7b573774c52b022c8d6537d6baf2129dc0` (26.11.0) to
`00fcd170281a75fc0e95ec4f2f54f43d32fe81bd` (26.11.2), which includes 26.11.1.

- The official 26.11.1 schema migration indexes attachments by memo. The
  production SQLite upgrade adds `idx_attachment_memo_id_type (memo_id, type)`.
  Preserve the canonical migrations and verify the index and schema marker
  on an isolated restoration before migrating the live database.
- Comments continue to use existing `memo_relation` rows. Clients use
  `ListMemos` with a `parent` filter and `CreateMemo` with `memo.parent`.
  Diary lists and statistics exclude comments by default. The device preference
  can opt into including them. The retired comment routes, tools and
  `MEMO_RELATED` configuration are covered by this release-specific approval.
- Preserve Diary Mode date, tag, image-grid, RAW, thumbnail and motion-photo
  behavior. Confirm that markup PNGs retain editable bytes and that replacing
  an attachment invalidates its thumbnail without caching a temporary UID.
- Require stable self-review, independent review, affected checks, CI and a
  matching arm64 image, plus a consistent database, attachments and thumbnail
  backup with verification on a separate restoration. Keep the previous image
  available for matching-data recovery.

[inventory]: https://multica.ai/iniwa-multica/issues/NIWA-247#comment-01a20ffe-71fd-7f09-9206-fccd532dced4
[approval]: https://multica.ai/iniwa-multica/issues/NIWA-247#comment-01a21002-649f-7880-91f7-d09a0b44d839
