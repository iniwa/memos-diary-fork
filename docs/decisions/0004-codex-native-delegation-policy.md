# 0004 — Codex-Native Delegation Policy

**Date**: 2026-08-05
**Status**: Active

## Context

The local project instructions previously selected particular GPT models and
required implementation to be delegated to Claude Code Sonnet through a
persisted handoff. That policy duplicated execution-environment choices,
required a durable file for ordinary in-session work, and made one external
delegation route mandatory even when the active Codex surface already exposed
observable native roles.

The current shared base documentation establishes a different common policy:
the user chooses the primary model at runtime, the primary session owns
interpretation and integration, ordinary delegation uses native Codex roles,
and persisted handoffs are reserved for work that actually needs durable
recovery state.

## Decision

- Project documentation does not select or override the primary model. The
  runtime-selected primary session owns requirements, material design,
  approval boundaries, delegation, integration, and user communication.
- Native Codex subagents are the ordinary delegation route. Claude Code is not
  used unless an explicit user instruction changes the applicable policy.
- Small, conversation-dependent, design-heavy, or approval-sensitive work
  remains in the primary session.
- When a settled cohesive outcome requires multiple implementation steps and
  the transfer is worthwhile, one `bounded_implementer` is the default writer.
  Work is not split by file merely to create parallelism.
- `bounded_explorer` is reserved for genuinely independent read-only questions;
  `adaptive_implementer` for a bounded outcome that needs broader adaptive
  reasoning; and `bounded_reviewer` for a concrete material risk. Only the
  primary session delegates, and overlapping work has one writer.
- Before delegation, acceptance mechanics, protected regressions, approval
  gates, verification, stable-diff/reference review, and the required evidence
  are fixed. The writer reports every criterion as `passed`, `blocked`, or
  `unmet` after self-reviewing a stable diff.
- Independent review is proportional to risk. Localized deterministic
  documentation or configuration changes normally complete through the
  writer/primary self-review gate without a separate reviewer.
- Ordinary delegation uses an inline task. A file under `docs/handoffs/` is
  created only for substantial cross-session, interruption-sensitive,
  operationally risky, separately executed, or resume-dependent work.
- `AGENTS.md` is the active project instruction file. `CLAUDE.md` remains only
  as a retired ignored compatibility stub because the upstream-update workflow
  preserves the local metadata path.

## Preserved Project Policy

This decision changes execution and delegation policy only. It does not change
Diary Mode product behavior, branch roles, feature-flag defaults, time or tag
semantics, attachment-based image detection, database/API review gates, the
separate production boundary, upstream merge-history requirements, or the
existing GHCR/Portainer/Docker deployment flow.

Archived handoffs retain their historical Claude Code wording. They are
evidence of completed work, not current execution instructions.

## Consequences

- `AGENTS.md` carries the current project-specific rules, exact commands,
  delegation gate, approval boundaries, and Definition of Done without fixed
  model assignments.
- `README.diary.md`, `docs/improvements.md`, and `docs/handoffs/README.md`
  describe native, mostly inline delegation and conditional persisted handoffs.
- A future explicit user decision may authorize another execution route for a
  particular task or revise this durable policy.

## 2026-08-11 Correction-Churn Follow-up

Normally one independent reviewer evaluates the stable self-reviewed outcome;
a second requires a distinct material risk or an unusable or blocked first
review. At the second correction round, or after two blocked or partial
implementation returns caused by unresolved acceptance, authority, or
environment, the primary pauses further corrective delegation and resets the
contract before selecting a bounded, adaptive, approval, or fresh-task route.
This controls token churn without weakening Diary Mode behavior, upstream
integration requirements, deployment approvals, or verification.
