# Remaining Issues

## Open

- **`displayMonth`(月単位カレンダーフィルタ)の再構築**
  upstream `v0.30.0` 統合時に、CEL の `created_ts` が `TimestampType` へ変わった
  ため、fork の `displayMonth` 実装は一旦 upstream 仕様へ戻す
  (`docs/decisions/0003-upstream-v0.30.0-integration.md` 決定 2)。
  マージ確定後に、新しい時刻アクセサ
  (`created_ts.getFullYear() == YYYY && created_ts.getMonth() == MM`) で
  再構築する。それまで月フィルタは利用できない。
  計画: `docs/plans/2026-07-28-upstream-v0.30.0-integration.md` Slice 6。
