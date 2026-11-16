# Focus-date correction: Pi validation

Date: 2026-11-16. NIWA-143. Leader accepted NIWA-155's P2 source/local
correction after reading the source, regression and red/green/full-check logs.
Leader independently ran focus-date/timestamps/global tests: 3 files, 47 tests
passed. Worker evidence is recorded in the [correction record](2026-11-16-focus-date-correction.md).
Independent re-review through the same Astra/NIWA-148 remains pending.

Leader verified the worker source manifest SHA256
`f974d0803d41a02471490aaf01254f2056bb7fff30e1a0d66c6c9b4b643bf9e1`,
1719 entries, twice with zero differences. Comparison with the pre-P2 snapshot
confirmed changes only to EditSession, the new regression test, documentation
and generated assets. Branch/HEAD/official ancestor, empty index and whitespace
checks passed. Backend/API/cache/image code and protected provenance/schema paths
were unchanged, so the prior Pi Linux/SQLite 48-package result remains evidence
for that unchanged backend. Its old image pass was not reused for new assets.

Fresh transfer directory:
`/home/iniwa/.cache/memos-diary-niwa143-20261116-focus`.
Archive SHA256:
`1167589147908f1e31089cbe820971716719fc94dade85fac469f95f765025aa`.
All 1718 transferred file hashes matched. Metadata/environment files, actual
data and AGENTS runtime text were excluded as in the earlier validation.

Native Pi `docker build --platform linux/arm64` through scripts/Dockerfile
exited 0, VERSION=26.11.0, COMMIT=niwa143-f974d0803d41. The local-only image is
`memos-diary-niwa143:26.11.0-focus`; Docker inspect returned
`sha256:1c4f0b88ae168d560e5063b1cad080dd013f47d71446ace0f9f7b3a54ce181d8`,
arm64/linux. The provenance suffix identifies the worker source manifest,
not a Git commit. HTTP HTML/startup, binary 26.11.0 and ImageMagick 7.1.1-41
checks exited 0. One initial connection refusal preceded bounded readiness
success. Smoke used network=none, no published ports, 512 MiB, one CPU and
128 MiB synthetic tmpfs data. Its container was removed; none named niwa143
remained. Local private logs/scripts/archive are in `.niwa143-focus-validation/`;
Pi retains build/smoke exit files and corresponding logs in its directory.

The live image remained
`sha256:2629aea4ba7e530902de4b927471ffb8f58755af311cc3f644ca86e9b4b51d34`
with start time `2026-11-10T18:30:36.082904557Z`, running=true, HTTP 200.
No live data mount, restart, replacement, migration, commit/push, PR,
publication or runtime/configuration change occurred. NIWA-20 remains held.
All run-owned tests/builds/SSH finished.

The review manifest refresh after this check changes only this record and the
handoff amendment; application source/assets remain identical to the verified
worker snapshot. Pending: affected independent review, actual browser/touch
acceptance, CI, MySQL/Postgres integration and race coverage. Publication and
production replacement retain their separate gates, including verified fresh
consistent backup and matching-data restoration before any real replacement.
