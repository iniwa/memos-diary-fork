# Remaining Issues

## Open

なし。

## Resolved

- **`displayMonth`(月単位カレンダーフィルタ)の再構築** — 2026-07-31 完了。
  upstream `v0.30.0` 統合で一旦 upstream 仕様へ戻していた月フィルタを再実装した
  (`docs/plans/2026-07-28-upstream-v0.30.0-integration.md` Slice 6)。
  CEL の時刻アクセサ (`created_ts.getFullYear()` / `getMonth()`) は SQLite では
  UTC 抽出でタイムゾーン引数を取れず、JST では月境界が 9 時間ずれるため、
  `displayTime`(日フィルタ)と同じローカル境界を保つ
  `created_ts >= timestamp(start) && created_ts < timestamp(end)` を採用した。
  詳細は `docs/decisions/0003-upstream-v0.30.0-integration.md` の Follow-up を参照。
