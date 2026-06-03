# 2026-06-03 Link operations docs from README handoff

This is a small documentation follow-up for ClaudeCode.

## Goal

Make the new Diary Mode operations guide discoverable from `README.diary.md`.

The operations guide already exists:

```txt
docs/diary-mode-operations.md
```

## Current State

Branch:

```txt
diary-mode
```

Latest relevant commit:

```txt
c231b87e docs: add diary mode operations guide
```

Current `README.diary.md` lists:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/memos-diary-mode-design.md`
- initial Phase 0 / Phase 1 handoff
- `_base/`

It does not yet link to the operations guide.

## Required Work

Update `README.diary.md` only.

Add a concise entry for:

```txt
docs/diary-mode-operations.md
```

The entry should explain that this is the day-to-day operations guide for:

- manual Portainer redeploy
- runtime env
- post-deploy smoke checks
- backup / restore notes
- maintenance commands

Also consider whether the "Current project direction" section should mention that the MVP is now deployed and operational. Keep the wording short.

## Constraints

- Documentation-only change.
- Do not edit app code, Docker build logic, GitHub Actions, compose settings, or runtime config.
- Do not modify `docs/diary-mode-operations.md` unless you find a broken link or typo while inspecting it.
- Do not add screenshots or local verification artifacts.
- Keep `README.diary.md` concise; it should point to detailed docs, not duplicate them.

## Verification

Run:

```bash
git diff -- README.diary.md
git status --short
```

No build or test is required for this docs-only change.

## Expected Report

Report in Japanese:

```md
## Changed Files
- README.diary.md

## Summary
- ...

## Verification
- git diff reviewed
- build/test skipped because docs-only

## Notes For Codex
- operations guide linked: yes/no
- no code/config changes: yes/no
```

