# Memos Diary Mode Documents

This archive contains the current design documents for the Memos Diary Mode fork.

## Files

- `AGENTS.md`  
  Project-specific Codex-side rules and design principles.

- `CLAUDE.md`  
  Project-specific Claude Code execution rules.

- `docs/memos-diary-mode-design.md`  
  Main design document.

- `docs/handoffs/2026-06-01-diary-mode-phase0-phase1.md`  
  Initial handoff for Phase 0 / Phase 1.

- `_base/`  
  Uploaded base reference files used to prepare AGENTS / CLAUDE / handoff.

## Current project direction

- Base: Memos v0.29.0
- Runtime: Raspberry Pi Docker, `linux/arm64`
- Deployment style: GHCR + Portainer Stack
- Operation: separate Diary Mode app using copied data
- Key additions:
  - dedicated tag UI
  - Twitter/X-style image grid
  - image-post filter based on image resources
  - image optimization using `preview` and `thumbnail`
