# Active Handoffs

No active handoff at the moment.

Completed handoffs are archived under:

```txt
docs/handoffs/archive/
```

Ordinary native Codex delegation uses a compact inline task. Create a persisted
handoff here only when work must survive a task boundary or interruption, has
operational risk, uses a separately executed process, or needs durable resume
conditions.

A persisted handoff records:

- metadata: ID, status, owner, repository/branch, stable baseline, and approval
  state;
- one concrete goal and observable completion criteria, including protected
  behavior;
- only task-specific fixed context, constraints, approval gates, and useful
  starting points;
- focused verification and a required report;
- for interrupted work, completed and unmet criteria, partial edits, blockers,
  verification already run, and exact resume conditions.

Do not copy durable `AGENTS.md` rules, protected values, or raw execution logs
into a handoff. Keep active or blocked handoffs here. Move one to `archive/`
only after implementation, verification, review, required runtime work, and
follow-up are complete.
