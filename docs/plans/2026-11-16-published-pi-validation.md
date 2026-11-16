# Published-baseline Pi validation

Date: 2026-11-16. NIWA-143. Task-Leader accepted NIWA-155's source/local
outcome after reading source differences, selection reasons and retained logs.
The writer returned ownership and no other family run was active. The changed
candidate still requires affected independent review through the same Astra
and NIWA-148. This record does not authorize publication or live replacement.

## Candidate and transfer

Windows target: `D:\Git\memos-diary-published-26.11.0`, diary-mode, HEAD
`bebaadbe1380b852126510578d264aa78d493afc`; official b40d8a7 is an ancestor.
Leader freshly verified all 1716 entries of the worker manifest, SHA256
`6c80cc9ec071c401703018ea8c4d41fa41173191a7842cc5f86b97347da369fb`,
with zero differences before and after Pi verification. No application source
or assets changed during acceptance. The next review manifest adds only this
record and the current handoff amendment to that verified source snapshot.

Pi staging: `/home/iniwa/.cache/memos-diary-niwa143-20261116-published`.
Archive SHA256:
`5aa03f7f709833a877674f2aaded0a1043ededb22805ab0adb9d4931330f5286`.
All 1715 transferred file hashes matched on Pi. AGENTS contains only its policy
prefix. Git/runtime/dependency metadata, environment files and actual data were
excluded. The original fork, old candidate and its unresolved index were not
modified. Prior Pi staging, image and caches remain available.

## Fresh verification

Leader ran the related frontend tests (diary presentation, MemoEditor view,
task actions and memo initialization): 4 files, 32 tests passed. Go filter,
server/api, server/api/test and store/cache passed, as did 20 repetitions of
TestCacheEviction. Whitespace/index/protected-path checks passed. Worker logs
for frontend lint, 200 files/1672 tests, release and backend checks were read;
these are retained worker evidence, distinct from Leader's fresh executions.

On Pi, `go test -p 1 -parallel 2 ./...` exited 0 with 48 tested packages.
The native arm64 test container used golang:1.27.2-bookworm, DRIVER=sqlite,
read-only source, named Go caches, 2 CPUs, 2304 MiB, GOMAXPROCS=2 and
GOMEMLIMIT=1536MiB. It had no production-data or Docker-socket mount and no
published ports. Cached results are identified in the retained Go output.
This does not establish MySQL/Postgres service integration or race coverage.

The same transferred source built through scripts/Dockerfile on Pi with
VERSION=26.11.0, COMMIT=niwa143-6c80cc9ec071 and platform linux/arm64; exit 0.
Local-only tag: `memos-diary-niwa143:26.11.0-published`.
Docker image inspect returned
`sha256:5a03d601e03231145ebe5abf7fc3729ea110fbd57e8f43c0084435c2313adbde`,
arm64/linux. The provenance suffix refers to the worker source manifest;
it is not a committed source revision.

HTTP HTML/startup, binary version 26.11.0 and ImageMagick 7.1.1-41 passed.
Smoke used network=none, no published ports, 512 MiB, 1 CPU and a 128 MiB
synthetic-data tmpfs. One initial connection refusal preceded bounded readiness
success. Test/smoke containers were removed; no niwa143 containers remained.

## Preservation and remaining conditions

Before and after testing the live instance retained image
`sha256:2629aea4ba7e530902de4b927471ffb8f58755af311cc3f644ca86e9b4b51d34`
and start time `2026-11-10T18:30:36.082904557Z`; running=true and HTTP 200.
No live-data mount, replacement, restart, migration, source commit/push, PR,
publication or runtime/configuration change occurred. NIWA-20 remains held.

Local private evidence is under `.niwa143-validation/`: verification/package
script, archive, Pi runner/smoke scripts, linux-tests, arm64-build, smoke and
image logs. Pi retains exit files and the corresponding logs under its staging
directory. All run-owned processes have completed.

Remaining: affected independent source review, actual browser/touch acceptance,
CI, and any separately authorized publication/replacement steps. Production
replacement still requires a fresh verified consistent database/assets/thumbnail
backup, old-image/runtime retention and matching-data restoration procedure.
The existing live instance reporting 26.11.0 does not prove it contains this
newly reconciled candidate. Source readiness and deployed acceptance differ.
