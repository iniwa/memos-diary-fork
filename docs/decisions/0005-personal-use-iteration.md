# 0005 — Personal-Use Iteration

**Date**: 2026-08-31
**Status**: Active, approved by explicit user direction

## Decision

Use the smallest implementation for normal personal use, apply plausible
behavior through the existing delivery path, smoke-test the affected normal
use, and correct observed errors. Do not require speculative edge cases,
extra abstractions, hardening, new test infrastructure, or a full suite merely
to try a routine change. Working requested behavior completes routine work.

An implementation/fix request includes reversible deployment and needed
restart of the established separate Diary Mode service using its known
Portainer procedure and an available image. It does not authorize Git/GHCR
publication, upstream/schema/data changes, feature-flag default changes,
credentials, exposure, new targets, or changes to the other Memos instance.
Existing CI/image, backup, design, and protected-operation gates remain.

This refines decision 0004's verification and review ordering: a required
pre-application review receives a stable source/diff and applicable checks
first; runtime application/smoke remain unrun until it clears. Unrun checks
are never passed. Ordinary low-risk work does not need independent review.

The existing restore-verification issue remains open. Required deferred work
uses `iniwa-issues.md`, without filing hypothetical edge cases. The approved
upstream migration does not lift decision 0003's fork-local migration ban.

## Scope

This change updates documentation only. No runtime/data operation, deployment,
restore, Git publication, configuration installation, or application test was
performed. Existing user edits and historical records remain intact.
