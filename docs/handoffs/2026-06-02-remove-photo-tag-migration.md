# 2026-06-02 remove #photo tag migration handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add a safe, explicit migration path to remove legacy `#photo` tags from existing memo content.

The project has moved away from manual `#photo` tagging.
Image posts should be detected from attached image resources, not from memo text tags.

This task should provide a safe way to remove `#photo` from existing stored memo content without changing any other tags or memo text.

## Background

Diary Mode originally inherited existing Memos data where image posts may contain tags like:

```md
#restaurant/cleis #photo
```

The new Diary Mode design defines:

```txt
画像付き投稿 = image/* Resource を1件以上持つ投稿
```

Therefore, `#photo` is no longer needed as a manual tag.

Current relevant implementation:

* `web/src/lib/tagLine.ts` contains tag-line parsing and serialization helpers.
* `extractTrailingTagLine` extracts a trailing tag-only line.
* `extractBoundaryTagLines` extracts leading and trailing tag-only lines.
* `serializeTagContent` serializes body + tags back into Memos-compatible content.
* `MemoBody.tsx` uses boundary tag extraction to display body and tags separately.
* Existing slash-style grouped tags such as `restaurant/cleis`, `restaurant/ブロンコビリー`, `game/FF14`, and `PC/mic` must remain intact.

This handoff is about **data cleanup**, not UI hiding.

## Required Behavior

Remove only the legacy `photo` tag from memo boundary tag lines.

Target examples:

### Example 1: trailing mixed tags

Before:

```md
5月30日(土)

スカイボール
オールドファッション

#restaurant/cleis #photo
```

After:

```md
5月30日(土)

スカイボール
オールドファッション

#restaurant/cleis
```

### Example 2: trailing `#photo` only

Before:

```md
5月12日(火)

ミカちゃん学校オフ

#photo
```

After:

```md
5月12日(火)

ミカちゃん学校オフ
```

There must be no extra blank tag line left behind.

### Example 3: leading tags

Before:

```md
#photo #real/オフ会

ミカちゃん学校オフ
```

After:

```md
#real/オフ会

ミカちゃん学校オフ
```

### Example 4: leading and trailing tags

Before:

```md
#photo #real/オフ会

本文

#restaurant/cleis #photo
```

After:

```md
#real/オフ会

本文

#restaurant/cleis
```

### Example 5: inline prose must not be changed

Before:

```md
今日は #photo という単語について話した。
```

After:

```md
今日は #photo という単語について話した。
```

Only tag-only boundary lines should be modified.
Inline prose tags must not be touched.

## Important Safety Rule

Do not remove `#photo` blindly from all memo content.

Only remove `photo` when it appears as a token in a boundary tag-only line.

Boundary tag-only lines are:

* the first non-empty line, if it consists only of tags
* the last non-empty line, if it consists only of tags

Do not modify `#photo` in normal prose.

## Implementation Options

Choose one of the following approaches after inspecting the codebase.

### Preferred Option A: CLI migration command

Add an explicit CLI command, for example:

```bash
memos remove-photo-tag
```

or:

```bash
memos diary-clean-photo-tag
```

The command should:

* default to dry-run
* support `--execute` to apply changes
* support `--limit`
* support `--uid`
* print changed memo UIDs/names
* print summary counts
* not run automatically during server startup
* not run as part of DB migration

Suggested flags:

```txt
--execute
  Actually update memo content. Without this, dry-run only.

--limit
  Stop after processing this many changed memos.

--uid
  Process only one memo UID.

--verbose
  Print before/after preview or detailed change info.
```

### Acceptable Option B: Admin-only script / command

If adding a first-class Cobra command is too invasive, add a small internal command or documented Go script.

However, prefer the CLI command if the project already has similar command patterns such as thumbnail backfill.

## Files To Inspect

* `cmd/memos/main.go`
* `cmd/memos/thumbnail_backfill.go`
* `store/`
* `store/memo*.go`
* `server/router/api/v1/`
* `web/src/lib/tagLine.ts`
* `web/src/components/MemoView/components/MemoBody.tsx`
* Existing tests around memo storage or tag helpers

Search terms:

* `thumbnail-backfill`
* `ListMemos`
* `UpdateMemo`
* `PatchMemo`
* `FindMemo`
* `Memo`
* `Content`
* `extractBoundaryTagLines`
* `serializeTagContent`

## Files To Edit

Likely targets:

* `cmd/memos/main.go`
* new file such as `cmd/memos/remove_photo_tag.go`
* Go tests for the cleanup helper, if test pattern exists
* possibly a new shared helper file under `cmd/memos/` for content cleanup logic
* docs, if useful:

  * `docs/decisions/`
  * `docs/memos-diary-mode-design.md`

Do not edit image grid files.
Do not edit image optimizer code unless required for command registration style.
Do not edit frontend UI unless needed only to share documented constants; prefer not to.

## Suggested Helper Behavior

Implement a pure helper that takes memo content and returns:

```go
type RemovePhotoTagResult struct {
    Content string
    Changed bool
}
```

Conceptual behavior:

1. Split content by lines.
2. Find first non-empty line.
3. Find last non-empty line.
4. If first line is a tag-only line, remove `#photo` / `photo` token from that line.
5. If last line is a tag-only line and it is not the same line, remove `#photo` / `photo` token from that line.
6. If a tag-only boundary line becomes empty, remove that line.
7. Trim only the blank lines directly created by the removed boundary tag line.
8. Preserve all other content as much as possible.

The helper must preserve:

* slash-style tags
* Japanese tags
* tag order except for removed `photo`
* existing body text
* inline tags
* existing line endings as much as reasonably possible

## Matching Rule

Treat these as removable legacy photo tags:

```txt
#photo
photo
```

But in stored Markdown boundary tag lines, the actual token will normally be:

```txt
#photo
```

Do not remove:

```txt
#photography
#photo/album
#photo日記
#Photo
#PHOTO
```

Unless Codex explicitly approves case-insensitive behavior later.

For this task, use exact `photo` only.

## Database / Store Behavior

The command must not use API calls. It should operate through the store layer in the same style as other CLI maintenance commands.

Dry-run mode:

* list candidate memos
* compute changed content
* print summary
* do not write anything

Execute mode:

* update only memos whose content changes
* do not change memos without `#photo` in boundary tag lines
* preserve all other memo fields
* do not alter attachments/resources
* do not alter create time / display time intentionally
* accept that update time may change if the existing store update path necessarily changes it; report this behavior

If updating memo content would require touching fields outside content, stop and ask.

## Constraints

* Default must be dry-run.
* `--execute` must be required for writes.
* Do not run automatically.
* Do not create a DB migration that runs on startup.
* Do not delete attachments/resources.
* Do not use `#photo` for image-post detection.
* Do not change image-post filter behavior.
* Do not change image grid behavior.
* Do not change tag UI behavior unless necessary.
* Do not add external dependencies.
* Do not touch secrets, `.env`, local settings, Docker deployment, CI, or Portainer files.
* Do not commit automatically unless explicitly requested.

## Non Goals

Do not implement:

* full tag database separation
* general tag migration framework
* image resource filter changes
* image grid layout fixes
* thumbnail generation
* image optimization changes
* calendar changes
* UI-only hiding of `#photo`
* deletion of other tags
* deletion of inline `#photo` text

## Verification

Run safe checks.

Suggested:

```bash
git status --short
```

Backend checks if available:

```bash
go test ./cmd/memos/...
go test ./...
```

If full `go test ./...` is too heavy or blocked, run the smallest relevant test package and report blocked checks.

Manual / local command checks:

### Dry-run

Run against a copied local test database only:

```bash
memos remove-photo-tag
```

Expected:

* reports dry-run mode
* prints candidate changes
* writes nothing

### Execute with limit

```bash
memos remove-photo-tag --execute --limit 1
```

Expected:

* changes at most one memo
* removes only boundary `#photo`
* leaves other tags intact

### UID-specific

```bash
memos remove-photo-tag --uid <memo-uid>
```

Expected:

* dry-runs only that memo

```bash
memos remove-photo-tag --uid <memo-uid> --execute
```

Expected:

* updates only that memo if needed

## Test Cases

Add tests for the pure cleanup helper if reasonable.

Required cases:

1. trailing mixed tags:

```md
body

#restaurant/cleis #photo
```

becomes:

```md
body

#restaurant/cleis
```

2. trailing only `#photo`:

```md
body

#photo
```

becomes:

```md
body
```

3. leading mixed tags:

```md
#photo #real/オフ会

body
```

becomes:

```md
#real/オフ会

body
```

4. leading and trailing `#photo`:

```md
#photo #real/オフ会

body

#restaurant/cleis #photo
```

becomes:

```md
#real/オフ会

body

#restaurant/cleis
```

5. inline prose unchanged:

```md
今日は #photo という単語を書いた。
```

unchanged.

6. similar tag unchanged:

```md
body

#photography #photo/album #photo日記
```

unchanged.

7. slash/Japanese tags preserved:

```md
body

#restaurant/ブロンコビリー #game/FF14 #photo
```

becomes:

```md
body

#restaurant/ブロンコビリー #game/FF14
```

## Expected Report

Report back in Japanese.

Include:

```md
## Changed Files
- ...

## Summary
- ...

## Verification
- ...

## Blocked Checks
- ...

## Manual Check Notes
- ...

## Data Safety Notes
- ...

## Design Questions
- ...
```

In `Data Safety Notes`, explicitly state:

* whether the command is dry-run by default
* whether it updates only content
* whether update time changes
* whether inline `#photo` remains untouched
* whether slash/Japanese tags are preserved
