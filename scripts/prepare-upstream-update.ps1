<#
.SYNOPSIS
    Prepares an upstream Memos update for review on diary-mode.

.DESCRIPTION
    Fetches the specified upstream tag directly from usememos/memos, reports
    files changed by both upstream and the fork, preserves local-only agent
    files on all exit paths, and performs a --no-commit merge.
    Does NOT commit, push, or deploy.

.PARAMETER Tag
    The upstream version tag to merge, e.g. "v0.29.2".

.EXAMPLE
    .\scripts\prepare-upstream-update.ps1 -Tag v0.29.2
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^v\d+\.\d+\.\d+$')]
    [string]$Tag
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step { param([string]$Msg) Write-Host "`n==> $Msg" -ForegroundColor Cyan }
function Write-Info  { param([string]$Msg) Write-Host "    $Msg" }
function Write-Warn  { param([string]$Msg) Write-Host "    WARNING: $Msg" -ForegroundColor Yellow }
function Write-Ok    { param([string]$Msg) Write-Host "    OK: $Msg" -ForegroundColor Green }
function Abort       { param([string]$Msg) Write-Host "`nABORTED: $Msg" -ForegroundColor Red; exit 1 }

# Canonical upstream URL; tags are fetched directly — no persistent remote added.
$UpstreamURL = 'https://github.com/usememos/memos.git'

# --- 1. Guard: must be on diary-mode with a clean tree ---

Write-Step "Checking working tree"

$branch = git rev-parse --abbrev-ref HEAD 2>&1
if ($branch -ne 'diary-mode') {
    Abort "Must be on diary-mode branch (current: $branch)"
}

$dirtyStatus = git status --porcelain 2>&1
if ($dirtyStatus) {
    Write-Warn "Uncommitted changes:"
    $dirtyStatus | ForEach-Object { Write-Info $_ }
    Abort "Working tree is not clean. Commit or stash changes before proceeding."
}

Write-Ok "On diary-mode with clean working tree"

# --- 2. Read current upstream version ---

Write-Step "Reading upstream version marker"
$repoRoot = (git rev-parse --show-toplevel 2>&1).Trim()
$upstreamVersionFile = Join-Path $repoRoot '.upstream-version'
if (-not (Test-Path $upstreamVersionFile)) {
    Abort ".upstream-version not found in repo root"
}
$current = ([System.IO.File]::ReadAllText($upstreamVersionFile)).Trim()
Write-Info "Current integrated upstream version: $current"
Write-Info "Requested merge target:              $Tag"

if ($current -eq $Tag) {
    Abort "$Tag is already the integrated upstream version."
}

# --- 3. Fetch target tag from canonical upstream URL ---

Write-Step "Fetching upstream tag $Tag from $UpstreamURL"
git fetch $UpstreamURL "refs/tags/${Tag}:refs/tags/${Tag}" 2>&1 | ForEach-Object { Write-Info $_ }
if ($LASTEXITCODE -ne 0) { Abort "Failed to fetch tag $Tag from $UpstreamURL" }

$tagCommit = (git rev-list -n1 $Tag 2>&1).Trim()
if ($LASTEXITCODE -ne 0 -or -not $tagCommit) {
    Abort "Tag $Tag not found after fetch"
}
Write-Ok "Tag $Tag at $tagCommit"

# --- 4. Ensure current baseline tag is available for the diff ---

Write-Step "Ensuring baseline tag $current is available"
$currentCommit = git rev-list -n1 $current 2>&1
if ($LASTEXITCODE -ne 0 -or -not ($currentCommit -as [string]).Trim()) {
    Write-Info "Baseline tag $current not found locally; fetching from $UpstreamURL..."
    git fetch $UpstreamURL "refs/tags/${current}:refs/tags/${current}" 2>&1 | ForEach-Object { Write-Info $_ }
    if ($LASTEXITCODE -ne 0) { Abort "Failed to fetch baseline tag $current from $UpstreamURL" }
    Write-Ok "Fetched baseline tag $current"
} else {
    Write-Ok "Baseline tag $current already present"
}

# --- 5. Verify $current is an ancestor of $Tag (reject downgrades/divergent history) ---

Write-Step "Verifying ancestry: $current is ancestor of $Tag"
git merge-base --is-ancestor $current $Tag 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Abort "$current is not an ancestor of $Tag. Only forward upstream updates are allowed. Check that the tag and .upstream-version are correct."
}
Write-Ok "$current is an ancestor of $Tag"

# --- 6. Report files changed by upstream ($current..$Tag) ---

Write-Step "Files changed by upstream ($current..$Tag)"
$upstreamChanged = @(git diff --name-only "${current}..${Tag}" 2>&1 | Where-Object { $_ })
if ($upstreamChanged.Count -gt 0) {
    $upstreamChanged | ForEach-Object { Write-Info $_ }
} else {
    Write-Info "(none)"
}

# --- 7. Report fork-specific changed files since current baseline ($current..HEAD) ---

Write-Step "Files changed by the fork since $current ($current..HEAD)"
$forkChanged = @(git diff --name-only "${current}..HEAD" 2>&1 | Where-Object { $_ })
if ($forkChanged.Count -gt 0) {
    $forkChanged | ForEach-Object { Write-Info $_ }
} else {
    Write-Info "(none)"
}

# --- 8. Report overlapping files ---

Write-Step "Overlapping files (changed by both upstream and fork)"
$upstreamSet = [System.Collections.Generic.HashSet[string]]$upstreamChanged
$overlap = $forkChanged | Where-Object { $upstreamSet.Contains($_) }
if ($overlap) {
    Write-Warn "These files were changed by BOTH upstream and the fork — review carefully after merge:"
    $overlap | ForEach-Object { Write-Info "  $_" }
} else {
    Write-Ok "No overlapping files"
}

# --- 9. Save local-only files as raw bytes before merge ---
#
# Read as bytes to preserve exact encoding and line endings.
# Restored in the finally block on all exit paths, including real conflicts.

Write-Step "Saving local-only files"
$localOnlyFiles = @('AGENTS.md', 'CLAUDE.md')
$savedBytes = @{}
foreach ($f in $localOnlyFiles) {
    $fullPath = Join-Path $repoRoot $f
    if (Test-Path $fullPath) {
        $savedBytes[$f] = [System.IO.File]::ReadAllBytes($fullPath)
        Write-Info "Saved: $f"
    }
}

# Track real conflicts; evaluated after the finally block.
$realConflicts = @()

try {
    # --- 10. Perform --no-commit merge ---

    Write-Step "Merging $Tag into diary-mode (--no-commit)"
    git merge --no-commit $Tag 2>&1 | Write-Host

    if ($LASTEXITCODE -ne 0) {
        $conflicts = @(git diff --name-only --diff-filter=U 2>&1 | Where-Object { $_ })
        $metaConflicts = @($conflicts | Where-Object { $_ -eq 'AGENTS.md' -or $_ -eq 'CLAUDE.md' })
        $realConflicts  = @($conflicts | Where-Object { $_ -ne 'AGENTS.md' -and $_ -ne 'CLAUDE.md' })

        foreach ($f in $metaConflicts) {
            Write-Info "Resolving metadata conflict (keep deleted from index): $f"
            git rm --cached $f 2>&1 | Out-Null
        }
    }
} finally {
    # Restore local-only files on every exit path, including real merge conflicts
    # and unexpected errors. Never call exit inside this try block so that finally
    # always runs before the process exits.
    if ($savedBytes.Count -gt 0) {
        Write-Step "Restoring local-only files"
        foreach ($f in $savedBytes.Keys) {
            $fullPath = Join-Path $repoRoot $f
            [System.IO.File]::WriteAllBytes($fullPath, $savedBytes[$f])
            git rm --cached $f 2>&1 | Out-Null
            Write-Ok "Restored: $f"
        }
    }
}

# --- Real conflict exit (after finally has run) ---

if ($realConflicts.Count -gt 0) {
    Write-Warn "Unresolved merge conflicts require manual resolution:"
    $realConflicts | ForEach-Object { Write-Host "    CONFLICT: $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "  Local-only AGENTS.md and CLAUDE.md have been restored." -ForegroundColor Green
    Write-Host ""
    Write-Host "  The merge is paused. To continue:" -ForegroundColor Yellow
    Write-Host "    1. Resolve each conflict file manually"
    Write-Host "    2. git add <resolved files>"
    Write-Host "    3. Manually update .upstream-version to $Tag"
    Write-Host "    4. Run frontend verification in docs/upstream-update-process.md"
    Write-Host "    5. Commit and push only after human review"
    Write-Host ""
    Write-Host "  To abort: git merge --abort" -ForegroundColor Yellow
    exit 1
}

# --- 11. Update .upstream-version (UTF-8 without BOM, PS 5.1 compatible) ---

Write-Step "Updating .upstream-version to $Tag"
$versionPath = Join-Path $repoRoot '.upstream-version'
[System.IO.File]::WriteAllText($versionPath, "$Tag`n", [System.Text.UTF8Encoding]::new($false))
git add .upstream-version 2>&1 | Out-Null
Write-Ok ".upstream-version = $Tag"

# --- 12. Summary ---

Write-Step "Merge complete — next steps"
Write-Host ""
Write-Host "  The merge is staged but NOT committed." -ForegroundColor Green
Write-Host ""
Write-Host "  Before committing:" -ForegroundColor Cyan
Write-Host "    1. Review staged changes:  git diff --cached"
Write-Host "    2. Verify overlapping files listed above preserve fork behavior"
Write-Host "    3. Run frontend verification:"
Write-Host "       cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm release"
Write-Host "    4. Backend verification requires Docker or CI (no local Go)"
Write-Host ""
Write-Host "  When satisfied:" -ForegroundColor Cyan
Write-Host "    git commit -m `"chore: merge upstream $Tag`""
Write-Host "    git push  # triggers CI and GHCR build"
Write-Host ""
Write-Host "  See docs/upstream-update-process.md for the full procedure." -ForegroundColor Cyan
