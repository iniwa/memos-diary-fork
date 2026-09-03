# Remaining Issues

## Open

- **[バックアップからの復元検証](docs/diary-mode-operations.md#restore)** — 未検証。

  - 現在の不明点: Portainer の復元手順と、データベース・添付ファイル・
    サムネイルを含む一貫したバックアップの完全性を、まだエンドツーエンドで
    確認できていない。
  - 受け入れ条件: 明示的に承認された一貫性のあるバックアップを使い、
    可逆な隔離環境で復元を試験する。イメージとスキーマの互換性、DB の整合性、
    添付ファイルとサムネイルの整合性、起動・スモークチェック、ロールバック手順を
    記録して確認する。
  - 保護条件: 本番 Memos との分離境界を維持し、ストレージ、ポート、ネットワーク、
    ランタイム値は変更しない。
  - 再開の前提: 承認済みバックアップ、隔離された試験先と実施時間帯、互換性のある
    イメージ／スキーマ、ロールバック手段、整合性チェックを準備する。
  - この項目が許可するのは文書化と計画のみ。ランタイムまたは永続データを変更する
    実テストには、別途明示的な承認が必要である。

## Resolved

- **`displayMonth`(月単位カレンダーフィルタ)の再構築** — 2026-07-31 完了。
  upstream `v0.30.0` 統合で一旦 upstream 仕様へ戻していた月フィルタを再実装した
  (`docs/plans/2026-07-28-upstream-v0.30.0-integration.md` Slice 6)。
  CEL の時刻アクセサ (`created_ts.getFullYear()` / `getMonth()`) は SQLite では
  UTC 抽出でタイムゾーン引数を取れず、JST では月境界が 9 時間ずれるため、
  `displayTime`(日フィルタ)と同じローカル境界を保つ
  `created_ts >= timestamp(start) && created_ts < timestamp(end)` を採用した。
  詳細は `docs/decisions/0003-upstream-v0.30.0-integration.md` の Follow-up を参照。
