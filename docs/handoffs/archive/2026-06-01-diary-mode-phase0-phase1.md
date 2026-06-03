# 2026-06-01 diary-mode Phase 0 / Phase 1 Handoff

Read `AGENTS.md`, `CLAUDE.md`, and this handoff file before implementation.  
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Create the initial foundation for the Memos Diary Mode fork.

This handoff covers:

1. Phase 0: prepare the forked project for Diary Mode development.
2. Phase 1: implement a tag dedicated UI section while preserving Memos v0.29.0 tag compatibility.

The goal is not to complete the whole Diary Mode project.  
This task should establish a safe, localizable, maintainable starting point for later image grid, image filter, and image optimization work.

---

## Background

The project is a fork of `usememos/memos` based on Memos `v0.29.0`.

The user already runs Memos v0.29.0. The forked version must be treated as a separate application, not an in-place replacement of the current Memos instance.

The project direction is:

- Keep the existing Memos instance unchanged.
- Copy current Memos data into a separate Diary Mode instance later.
- Run the Diary Mode fork with a separate database, separate resource directory, separate port, and separate URL.
- Preserve compatibility with upstream Memos as much as possible.
- Keep changes localized so future `v0.29.x` upstream bugfixes can be merged into the fork.

Memos already provides calendar viewing, `displayTime`, `createTime`, and `updateTime`. Do not reimplement those features in this handoff.

The current implementation target is the tag workflow.

Current desired tag behavior:

- Users should not need to write tags directly in the memo body.
- The editor should expose a dedicated tag section.
- Internally, initial implementation should remain compatible with Memos existing inline tag mechanism.
- Do not introduce a new tag table or `memo_tag` table in this phase.
- Slash-style grouped tags must be preserved, e.g.:
  - `restaurant/ブロンコビリー`
  - `game/FF14`
  - `PC/mic`
- Do not rely on `#photo` as an image marker.
- Do not auto-add `#photo` for image posts.
- Existing `#photo` tags must not be automatically deleted in this phase.

---

## Files To Inspect

Inspect the repository and identify the actual file paths before editing.

Start with these likely areas:

- `web/`
- `web/src/`
- Memo editor / memo composer components
- Memo edit dialog or edit form components
- Tag parsing / tag suggestion logic
- Existing memo content rendering components
- Existing i18n / locale files, if UI text is localized
- Existing tests or typecheck scripts
- Existing Dockerfile / compose / development docs only if needed for Phase 0 confirmation

Also inspect:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/` if present
- Existing `docs/handoffs/` if present
- Existing `docs/decisions/` if present

If the expected files are not found, search by symbols and text such as:

- `tag`
- `tags`
- `Tag`
- `MemoEditor`
- `MemoComposer`
- `MemoContent`
- `CreateMemo`
- `UpdateMemo`
- `Resource`
- `#`

Use Serena MCP tools for code navigation where available.

---

## Files To Edit

Edit only files required for Phase 0 and Phase 1.

Likely edit targets:

- Memo creation editor component
- Memo editing component
- Tag input / tag suggestion component, if it exists
- Memo content preprocessing helper, if one exists
- New helper file for tag extraction / serialization, if needed
- New UI component for tag chips / tag section, if needed
- Locale files only if new UI labels require localization
- `docs/decisions/` or `docs/` only if you need to record a durable implementation decision
- `.claudeignore` only if it is missing and the project convention requires it

Do not edit deployment, CI, Docker image publishing, or Portainer configuration in this handoff unless it is strictly necessary to make the project runnable and you report why.

Do not edit database migrations for this handoff.

---

## Constraints

### General

- Keep changes scoped to Phase 0 and Phase 1.
- Preserve Memos v0.29.0 behavior where possible.
- Prefer additive components/helpers over large rewrites of existing components.
- Do not introduce new runtime dependencies unless absolutely necessary.
- Do not add or modify database schema.
- Do not touch secrets, credentials, `.env`, `.env.*`, local settings, private keys, or tokens.
- Do not commit automatically.
- Do not change external exposure, Cloudflare Tunnel behavior, or Portainer Stack behavior.
- Do not change Docker deployment flow unless explicitly requested later.
- If a needed change falls outside this handoff, stop and ask.

### Upstream compatibility

Design changes so that future Memos `v0.29.x` upstream fixes can be merged with minimal conflict.

Prefer:

- New helper functions.
- New small UI components.
- Narrow integration points.
- Clear comments around Diary Mode-specific behavior.

Avoid:

- Large rewrites of existing editor components.
- Changing API contracts.
- Changing database schema.
- Removing existing Memos tag behavior.
- Changing resource handling in this handoff.

### Tag model

Initial implementation must remain compatible with existing Memos tag behavior.

Use this internal model:

- The memo body remains the source of truth for Memos tags in this phase.
- A trailing tag-only line at the end of the memo body is treated as the dedicated tag section source.
- The dedicated tag UI reads from and writes to that trailing tag line.
- The stored memo content should still contain tags in a Memos-compatible form.

Do not create a separate tag database model yet.

### Slash-style grouped tags

Slash-style tags must be preserved exactly.

Examples:

- `restaurant/ブロンコビリー`
- `food/hamburger`
- `game/Apex`
- `PC/mic`

Do not normalize away `/`.

Allowed normalization:

- Trim surrounding whitespace.
- Remove one leading `#` when storing in the UI tag array.
- Remove empty tags.
- Remove duplicates.
- Preserve `/`.
- Preserve Japanese text.
- Preserve case unless existing Memos convention already normalizes it.

### `#photo`

Do not add new `#photo` behavior.

- Do not auto-add `#photo` when images are attached.
- Do not delete existing `#photo` from existing memos.
- Do not treat `#photo` as the source of truth for image filtering.
- If an existing memo already has `#photo`, it may appear as a normal existing tag in this phase unless hiding it is trivial and does not affect stored content.

Image detection will be implemented later using image resources.

---

## Required Behavior

### Tag extraction

Implement or reuse a helper that can extract a trailing tag-only line from memo content.

Example input:

```md
今日はマリオカートを練習した。
ラウンジでかなり惜しい試合があった。

#game/マリオカート #lounge
```

Editor display:

```txt
Body:
今日はマリオカートを練習した。
ラウンジでかなり惜しい試合があった。

Tags:
game/マリオカート
lounge
```

Stored content after saving:

```md
今日はマリオカートを練習した。
ラウンジでかなり惜しい試合があった。

#game/マリオカート #lounge
```

### Tag-only line rule

For initial implementation, only the trailing tag-only line should be moved into the dedicated tag UI.

A line is a tag-only line when it consists only of tags and whitespace.

Expected tag-only line examples:

```md
#game #memo
#restaurant/ブロンコビリー #food/hamburger
```

Do not extract inline tags from normal prose in this phase.

Example:

```md
今日は #game の話をした。
```

This should remain in the body field as normal text.

### Save behavior

When saving:

1. Take the body text from the editor.
2. Remove any trailing tag-only line managed by the tag UI.
3. Normalize tags from the tag UI.
4. Append a single trailing tag line if there are tags.
5. Save using existing Memos create/update flow.

If no tags exist, save only the body text without an extra trailing tag line.

### UI behavior

Add a dedicated tag section to the create and edit memo UI.

The UI should support:

- Showing existing trailing tags as chips.
- Adding a tag manually.
- Removing a tag.
- Preserving slash-style grouped tags.
- Preventing duplicate tags.
- Keeping the existing Memos tag suggestion behavior if it is reasonably reusable.

Preferred labels:

Japanese UI:

- `タグ`
- `タグを追加`

English UI, if needed:

- `Tags`
- `Add tag`

If the project uses i18n, add labels through the existing i18n mechanism.  
If the project has no obvious i18n path, use the existing local UI convention and report it.

---

## Non Goals

Do not implement the following in this handoff:

- Twitter/X-style image grid.
- Image resource filtering.
- `画像付き投稿` filter.
- Image compression.
- `preview` / `thumbnail` generation.
- Resource metadata changes.
- New tag database tables.
- Tag color management.
- Tag reorder UI.
- Bulk migration of old memos.
- Automatic removal of existing `#photo`.
- Calendar UI changes.
- `displayTime`, `createTime`, or `updateTime` changes.
- Cloudflare Tunnel changes.
- Portainer Stack changes.
- GHCR workflow changes unless the repository currently cannot build and you ask first.

---

## Verification

Run the safest available checks for this repository.

Suggested checks:

```bash
git status --short
```

Then inspect package scripts and run the relevant ones if available:

```bash
npm run lint
npm run typecheck
npm run build
```

or, if the web app uses another package manager, use the existing repository convention.

Also run any existing Go checks if they are quick and relevant:

```bash
go test ./...
```

Do not spend excessive time fixing unrelated pre-existing failures.  
If a check fails for reasons unrelated to this change, report it clearly.

Manual verification checklist:

- Create a memo with body only. Confirm no tag line is appended.
- Create a memo with tags from the dedicated UI. Confirm stored content remains Memos-compatible.
- Edit a memo with trailing tags. Confirm tags appear in the dedicated tag UI.
- Remove a tag in the UI. Confirm the stored trailing tag line updates.
- Add a slash-style tag such as `restaurant/ブロンコビリー`. Confirm `/` is preserved.
- Confirm inline prose tag text is not extracted from body in this phase.
- Confirm existing tag search/sidebar behavior still works.
- Confirm no `#photo` is auto-added when creating a memo.

---

## Expected Report

Report back in Japanese.

Include:

- Changed files
- Summary
- Verification results
- Blocked checks
- Any files inspected but not changed
- Any design questions for Codex
- Any discovered implementation detail that should be recorded in `AGENTS.md` or `docs/*.md`

Use this format:

```md
## Changed Files
- ...

## Summary
- ...

## Verification
- ...

## Blocked Checks
- ...

## Design Questions
- ...

## Notes For Codex
- ...
```
