# 2026-06-02 Phase 5 Deployed Verification Handoff

## Context

Diary Mode is deployed at:

- `http://192.168.1.205:5231`

Latest local/Gitea commit at handoff creation:

- `1e345b6d feat(diary-mode): support legacy leading tag lines`

Phase 5 adds display/editor compatibility for legacy memos whose tag-only line is at the beginning of the content, while keeping the modern trailing tag-line storage format.

## Goal

Verify the deployed app after the Phase 5 image has been built and redeployed.

This verification should confirm that old copied memos with leading tag lines now show the tag chips correctly, and that editing one of those memos naturally saves it back in the modern trailing format.

## Scope

Changed files in Phase 5:

- `web/src/lib/tagLine.ts`
  - Added `extractBoundaryTagLines()`.
  - Extracts at most one leading tag-only line and one trailing tag-only line.
  - Merges tags in leading-first, trailing-second order.
  - De-duplicates tags while preserving first-seen order.
  - Leaves inline tags and markdown headings untouched.
- `web/src/components/MemoView/components/MemoBody.tsx`
  - Uses `extractBoundaryTagLines()` for memo display.
- `web/src/components/MemoEditor/services/memoService.ts`
  - Uses `extractBoundaryTagLines()` when opening an existing memo for editing.
- `web/src/components/MemoEditor/hooks/useMemoInit.ts`
  - Uses `extractBoundaryTagLines()` when restoring cached draft content.

## Expected Behavior

| Stored content | Body shown | Chips shown |
| --- | --- | --- |
| `#game #memo\nToday I practiced.` | `Today I practiced.` | `#game`, `#memo` |
| `Today I practiced.\n#game #memo` | `Today I practiced.` | `#game`, `#memo` |
| `#old\nBody\n#new #old` | `Body` | `#old`, `#new` |
| `Today I played #mariokart with friends.` | unchanged | none from boundary extraction |
| `## Heading\nBody` | unchanged | none |

## Verification Checklist

### 1. Deployment Sanity

- Open `http://192.168.1.205:5231`.
- Confirm login/session works.
- Confirm the timeline renders.
- Confirm the app version being served is after commit `1e345b6d`.
  - If commit hash is not visible in the UI, confirm via container image timestamp or GitHub Actions/GHCR deployment time.

### 2. Legacy Leading Tag Display

Find at least several existing copied memos where the first visible line is tag-only, for example:

```text
#tagA #tagB
body text...
```

Expected:

- The leading tag-only line is not rendered as plain markdown text.
- The memo body starts with the actual body text.
- Tag chips appear below the body.
- Clicking a chip applies the existing tag filter behavior.

### 3. Modern Trailing Tag Regression

Find or create a memo in modern format:

```text
body text...
#tagA #tagB
```

Expected:

- The trailing tag-only line remains hidden from the body.
- Tag chips appear below the body.
- Existing Phase 4 behavior is unchanged.

### 4. Both Boundary Lines

Create a temporary memo:

```text
#old
Body for boundary test.
#new #old
```

Expected:

- Body shows `Body for boundary test.`
- Chips are `#old`, `#new`.
- `#old` appears only once.

Delete the temporary memo after the check unless it is useful as a fixture.

### 5. Non-Boundary Regression

Create or inspect these cases:

```text
Today I played #mariokart with friends.
```

```text
## Heading
Body
```

Expected:

- Inline `#mariokart` remains in body text.
- Markdown heading remains a heading/body content.
- Neither case is stripped as a boundary tag line.

### 6. Editor Natural Migration

Open an existing legacy leading-tag memo for editing.

Expected on editor open:

- Editor body field contains only the body text.
- Tag section contains the leading tags.
- The leading tag line is not duplicated in the body editor.

Save the memo without changing tags.

Expected after save:

- Memo still displays body + tag chips correctly.
- If raw content can be inspected, storage is now modern trailing format:

```text
body text...
#tagA #tagB
```

### 7. Cached Draft Path

If practical:

- Start a new draft with leading boundary tags in the editor content.
- Navigate away or reload so draft cache restores.

Expected:

- Restored editor content is split into body + tag section.
- Saving writes modern trailing format.

This path is lower priority than existing memo edit verification.

### 8. Existing Phase Checks

Spot-check that Phase 2/3/4 behavior still works:

- Inline image grid still renders for image memos.
- `Has image` / image filter still applies `attachment.hasImage:true`.
- Modern trailing tag chips still click through to tag filtering.

## Server-Side Checks

On Raspberry Pi / Docker host:

```sh
docker ps --filter name=memos
docker logs --tail 120 memos-diary
```

Expected:

- `memos` and `memos-diary` are both running.
- No panic, migration failure, database error, or repeated frontend asset 404.
- Stale token/auth errors immediately after DB copy are acceptable if they do not continue indefinitely.

## Not In Scope

- Batch rewriting old memo content in the database.
- Changing backend filter logic.
- Changing tag parsing semantics beyond one leading and one trailing boundary tag-only line.
- Live Photo/motion photo verification, unless suitable data happens to be available.

## Notes For Codex

- Local verification already passed before this handoff:
  - `pnpm lint` from `web`
  - `pnpm build` from `web`
  - `git diff --check`
- The first attempted `pnpm lint/build` from repo root failed because `package.json` is under `web`; this is expected for this repository layout.
- Untracked Playwright screenshots from the previous verification were intentionally removed after handoff creation.
