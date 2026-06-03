# 2026-06-03 Portainer volume path verification handoff

This handoff is for ClaudeCode to verify the actual host-side data path used by the `memos-diary` Portainer stack and update the operations documentation.

## Goal

Resolve the remaining uncertainty in:

```txt
docs/diary-mode-operations.md
```

Current operations docs intentionally say:

```txt
Portainer host path: supplied by Portainer stack; confirm in Portainer before host-side backup/restore
```

The goal is to confirm the real host-side volume source and update the docs if it can be verified.

## Current Context

Runtime:

```txt
URL:       http://192.168.1.205:5231
Container: memos-diary
Data dir:  /var/opt/memos
```

Repository compose default:

```txt
./memos-diary-data:/var/opt/memos
```

But the actual Portainer stack may use a different host path or Docker volume. Do not assume it matches the repository compose file.

## Required Work

1. Confirm the running container mount source.
2. Determine whether the source is:
   - a bind mount path
   - a named Docker volume
   - another Portainer-managed path
3. Update `docs/diary-mode-operations.md` with the verified value and backup guidance.

## Suggested Commands

Run on the Raspberry Pi host:

```bash
docker inspect memos-diary --format '{{range .Mounts}}{{println .Type .Source "->" .Destination}}{{end}}'
```

If the mount is a named volume, inspect it:

```bash
docker volume inspect <volume-name>
```

Also confirm the container still sees data at:

```bash
docker exec memos-diary sh -lc 'ls -la /var/opt/memos | head'
```

Do not run destructive commands.

## Documentation Update

If the host path is verified, update the runtime table in:

```txt
docs/diary-mode-operations.md
```

Use precise wording, for example:

```txt
| Portainer host path | `/actual/path` |
```

If it is a named volume, document the volume name and the Docker-reported mountpoint.

Then update the backup section so it clearly says whether to copy:

- the verified bind mount path, or
- the Docker volume mountpoint, or
- use `docker cp` as the fallback

## Constraints

- Documentation-first task.
- Do not change application code.
- Do not change compose, GitHub Actions, image build logic, or Portainer settings.
- Do not stop or restart the production container unless the user explicitly approves.
- Do not run `remove-photo-tag --execute`, `thumbnail-backfill --execute`, or any data-changing command.
- Do not commit screenshots or local verification artifacts.

## Verification

Run locally after docs edits:

```bash
git diff -- docs/diary-mode-operations.md
git status --short
```

No build or test is required for docs-only changes.

## Expected Report

Report in Japanese:

```md
## Changed Files
- ...

## Verified Runtime Mount
- ...

## Summary
- ...

## Verification
- git diff reviewed
- build/test skipped because docs-only

## Notes For Codex
- mount type: bind/volume/other
- documented exact source: yes/no
- production container restarted: no
- no data-changing commands run: yes/no
```

