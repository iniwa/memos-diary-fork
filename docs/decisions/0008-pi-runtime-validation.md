# 0008 — Owner-authorized physical-device validation

Date: 2026-11-16. Status: Accepted operational scope amendment by the owner.

## Authority

In NIWA-143 comment `01a1e336-27ed-7103-b373-f8622fa06f06`, the owner stated:

> DockerDesktopを使わず、今実機Piで稼働している実際のmemos-diaryを操作して構いません。
> この「実機を使って調整して良い」というのは他のプロジェクトも同様です。

Use the actual Pi and existing Diary instance for task-related verification and
adjustments; do not retain Docker Desktop startup as a prerequisite. This
amends Decision 0007's operational-scope exclusion to the extent expressly
authorized by that comment. It does not waive backup/restore, verification,
provenance, publication, data-protection, or independent-review conditions.

The same owner preference applies to physical-device work in other projects,
within each task's target and authority. It does not resume explicitly held work
such as NIWA-20, authorize unrelated services or exposure changes, or change
agent/runtime credentials, permissions or configuration. This decision records
the instruction for this project; no global workspace setting is changed here.

Git metadata operations remain with the owner under the established division.
No commit, push, GHCR publication, automatic merge, or unrelated production
operation is authorized by inference from the device-use permission.

## Observed target and preservation

Current Git authority amendment: owner comment
`01a1e363-d5a0-74da-9e4c-adeba845c597` permits task-related agent Git operations
across projects and supersedes the historical owner-only division above.
NIWA-155 remains source/local-validation only; commit, push, publication and
Pi runtime operations are excluded from that writer assignment.

Ordinary existing SSH authenticated to `iniwa@192.168.1.205`; the host reports
`aarch64` and Docker 29.9.3. The actual `memos-diary` binary already reports
26.11.0. Its retained image identity is
`sha256:2629aea4ba7e530902de4b927471ffb8f58755af311cc3f644ca86e9b4b51d34`,
created 2026-11-05; its last start was 2026-11-10. This is a current observation,
superseding documentation's older deployment-version assumption. It does not
prove that this existing image contains the newly reviewed source candidate.

The actual data bind remains `/opt/memos-diary/data:/var/opt/memos`, published
port 5231, existing `iniwa-memos-diary_default` network, 512 MiB container memory
limit and `unless-stopped` restart policy. Data occupies about 334 MiB. Do not
change the other Memos instance or overwrite the existing image identity.

Before any replacement that can affect production data, retain the old image
and runtime contract, take and verify a fresh consistent database/assets/
thumbnail backup, and prepare restoration of the matching data. Keep secrets
in private files on the Pi and out of source archives, comments and logs.
An image-only rollback is not a substitute for matching-data restoration.

## Validation arrangement

The reviewed candidate was transferred to a separate Pi work directory:
`/home/iniwa/.cache/memos-diary-niwa143-20261116-round1`.
The archive excludes Git metadata, runtime settings, credentials, AGENTS runtime
text, node_modules, and production data. All 1708 transferred files matched
their SHA256 manifest. The archive hash is
`b366d27eee9c73c203243772173a4e915c29305cc2abd788a3637511685ace56`.

Run Linux checks on the real arm64 Docker engine with synthetic temporary data,
read-only source, no production data mount and no published service ports. The
initial Go test container is capped at 2 CPUs and 2304 MiB so the live service
retains resources. SQLite is the explicit test driver; results must identify
that scope rather than imply MySQL/Postgres container coverage.

An actual existing-instance smoke check can complement candidate verification;
its success alone cannot validate code that has not been installed. Record
candidate image/build evidence and any actual replacement separately. Public
image publication, source commit/push and production readiness remain distinct.
