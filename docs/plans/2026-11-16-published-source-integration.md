# Published-baseline source reconciliation

Date: 2026-11-16. NIWA-155, child of NIWA-143. Writer: Task-Worker-Sol.
Status: stable local source candidate, awaiting Leader acceptance and affected
independent review. This record does not establish deployment readiness.

## Identity and authority

The editing target is `D:\Git\memos-diary-published-26.11.0`, `diary-mode`,
HEAD `bebaadbe1380b852126510578d264aa78d493afc`. Canonical upstream 26.11.0
`b40d8a7b573774c52b022c8d6537d6baf2129dc0` is already in this history.
This reconciles accepted local deltas; it does not repeat the stale-base merge.
Initial differences were accepted AGENTS policy, the verification handoff and
daemon metadata. No other family run was active at the ownership check.

The preserved candidate and original worktree were read only. All 1515 entries
of the old `manifest-review-round1.json` were freshly verified with zero
differences (AGENTS policy hashes exclude the runtime suffix and trailing
whitespace). Its SHA256 remains
`ca43c02c6447f94300464837aaa6596e740b5d417677b18620d79cb47e993388`.
Raw snapshots, old unresolved index and Pi cache/image were not changed.

## Selection against published source

The companion [path selection](2026-11-16-published-source-selection.json)
records each old/published difference and the selected behavior. Whole old
application files were not overlaid. Important selections:

- Keep published MemoBody/MemoEditor presentation, grid, tag styling and
  `displayContent` API. Their existing task implementation already passed the
  three imported real-view/API payload regressions before the parser change.
  Share `parseTaskItems` for task-marker extraction while retaining
  `applyDisplayedTaskChanges`, mismatch/no-op guards, stored formatting and
  all published empty/image-only/quoted/code tests. Add the three payload/cache
  regressions without replacing published tests.
- Transfer tags through INIT_MEMO. `memoService.fromMemo` already produces
  tags, but the action type/reducer discarded them. The new regression failed
  with an empty tag array before the selected fix. Existing initial draft,
  Space/visibility and attachment behavior remains intact. Add direct draft
  tag/date restoration coverage and retain the existing mounted-session test.
- Transfer the timestamp selector/display conditions so a dated new memo and
  focus mode use one timestamp control. Keep both create/update prefill values,
  existing default-date restamping and calendar/month-filter semantics.
- Transfer the atomic sequence tie breaker for equal-expiry cache eviction.
  The published `TestCacheEviction` failed in a 20-run reproduction because
  equal timestamps left selection to sync.Map iteration. Preserve pointer
  identity, reservations, expiry and close protections. Cache suite and the
  same 20-run command pass after the fix.
- Keep sequential upload callbacks, managed/external/unresolved image handling,
  motion/attachment ordering, optimizer cancellation and RAW code unchanged:
  the published implementation already contains the accepted behavior.
  Reject old Go loop/style reversions and upload-comment/mock-only churn.
- Apply only the two English `has-image` value corrections. Other locale
  differences are ordering; Nynorsk's four fork messages and both upstream/fork
  filter keys already exist. No locale JSON has duplicate keys.
- Keep the published workflow's `.upstream-version` VERSION and COMMIT inputs.
  Dockerfile restores `VERSION=dev` for normal local builds and retains the
  explicit-value guard, linker provenance, packages, ports and entrypoint.
  Do not restore the obsolete diary-run-number version or unused BUILD_ID arg.
- Exclude runtime/recovery metadata from Git and Docker inputs. Transfer the
  accepted ASCII/non-zero-padded-month preparation-tool validation delta;
  NIWA-145's accepted tool investigation is not reopened. Transfer Decision
  0004's policy clarification and update-procedure approval references while
  preserving published explicit-version build and data-aware rollback gates.
- Preserve published November 5 Decision/schema inventory byte-for-byte.
  Bring forward Decision 0007/0008, NIWA-144 inventory and historical integration
  evidence. Archive the superseded host handoff with an explicit historical
  notice. Keep current Git authority separate from its older owner-only text.
  README/operations now distinguish source 26.11.0, the observed Pi version
  and the unverified correspondence between its image and source.

## Local verification on this candidate

All final commands below exited 0. Logs are retained privately under
`.niwa155-integration/` (installation log: `.niwa155-install.txt`). Normal
Corepack invocation from `web` selected the project's pnpm 11.0.1; dependencies
were installed with `pnpm install --frozen-lockfile` without manifest changes.

| Check | Evidence/result |
| --- | --- |
| `pnpm lint` | TypeScript and Biome; 691 files, no fixes; `frontend-lint.txt` |
| `pnpm test` | 200 files / 1672 tests; `frontend-tests.txt` |
| `pnpm release` | Fresh embedded assets; `frontend-release.txt` |
| `go test ./filter ./server/api ./server/api/test ./store/cache` | Four packages passed; `backend-focused.txt` |
| `go test ./store/cache -run "^TestCacheEviction$" -count=20` | Passed; `cache-repeated.txt`; baseline failure in `cache-red.txt` |
| `go build ./...` | Native embedding build; `go-build.txt` |
| `go vet ./...` | `go-vet.txt` |
| `go mod tidy -diff` | No differences; `go-tidy.txt` |
| `go fix -diff ./...` | No differences; `go-fix.txt` |
| `GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o .niwa155-integration/memos-linux-arm64 ./cmd/memos` | Cross-compilation with new assets; `go-arm64.txt`; not image/runtime verification |
| `go run github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.14.0 run --timeout=3m` | 0 issues; `golangci-lint.txt` |
| Windows PowerShell 5.1 parser | 5.1.26100.9818, zero errors for preparation script; `powershell-parser.txt`; no merge-script execution |
| Stable source/whitespace/protection checks | `git diff --check`, clean index, unchanged protected paths, source-manifest rehash |

Vitest emits existing jsdom scroll warnings; release emits chunk-size/plugin
timing warnings. Neither caused a failure. A preliminary new draft test omitted
the required empty attachments array; lint caught it and the final checks above
include the corrected test. A root-directory Corepack invocation selected a
different pnpm and failed its version check; running from the package directory
resolved selection without bypassing checks or changing configuration.

## Protected requirements and remaining gates

Passed for source/local acceptance: branch/history; old-tree and accepted-policy
preservation; tag/draft/time/Space state; grid and task-storage preservation;
external/unresolved/motion/attachment behavior; sequential uploads;
optimizer/RAW/cancellation and calendar/filter boundaries; locale key retention;
published VERSION/provenance; Git/Docker metadata exclusions; no fork-local
migration; self-review and required local checks. No working-file changes under
`proto/` or `store/migration/`. AGENTS runtime was not edited.

Not established on this changed candidate: Linux full suite, native arm64 Docker
image/startup, MySQL/Postgres integration, race coverage, actual browser/touch
acceptance, CI or affected independent review. The old candidate's Linux/SQLite
48-package and Pi image evidence remains historical in the verification handoff;
it is not a pass for this changed source. Repeating the known unrelated Windows
full-suite POSIX/symlink/SQLite cleanup failures adds no relevant evidence;
changed backend behavior was tested locally through cache/API/filter checks and
static checks. Leader determines the remaining Pi checks after acceptance.

The fresh [source manifest](2026-11-16-published-source-manifest.json) contains
raw-byte SHA256 values for tracked/current nonignored source and all release
assets, plus explicit absence for tracked missing paths. AGENTS hashes only its
policy prefix with trailing whitespace removed. It excludes its own file and
all private runtime/recovery/dependency directories. Its hash is delivered in
the NIWA-155 result comment to avoid a self-reference. The candidate must be
rehash-verified before review; changed files invalidate affected evidence.

Source writer ownership returns to Leader at delivery. No reviewer was called;
no process remains running. No stage, commit, push, tag, remote write, publication,
Pi operation, Docker repair, deployment, configuration or real-data change was
performed. Independent review is Leader's next acceptance step through NIWA-148;
this worker does not mark the parent complete or authorize later operations.
