# プログラム改善チェックリスト

コードベースを調査して洗い出した改善候補の一覧。
対象は **フォーク独自コードのみ**。upstream 由来コードは本家追従を容易に保つため
リファクタ対象にしない。

**運用方法**: 着手する項目にチェック `[x]` を入れる。小さく会話依存の作業は
Codex の primary session で完結させる。設計済みで複数の実装手順を要する一体的な
変更は、引き継ぎコストに見合う場合に Codex native の `bounded_implementer` 1名へ
委任する。通常は短い inline task を使い、`docs/handoffs/` の persisted handoff は
セッションをまたぐ作業、復帰条件が必要な作業、または運用リスクがある作業に限る。
実装完了した項目は「完了アーカイブ」へ移動する。

- 機能追加・未検証項目はこのファイルの対象外(`iniwa-issues.md` で管理)。
- 優先度: **高** = 稼働中の安定性に直結 / **中** = 保守性・性能 / **低** = 任意。

---

## 1. バックエンド(Go / 画像処理)

(現在なし)

---

## 2. フロントエンド(TypeScript / Diary Mode UI)

(現在なし)

---

## 調査済み・問題なし(2026-07-07)

以下は調査したが健全と確認したため項目化しない。

- ゴルーチンリーク: なし(画像処理はリクエスト内同期実行、`go func` なし)
- 無制限成長: なし(バックフィル/クリーンアップ CLI は 200 件ページング、常駐キャッシュなし)
- 一時ファイル孤児: なし(RAW は `defer os.RemoveAll`、thumbnail cache は tmp+rename で全失敗パス掃除済み)
- タイムゾーン混在: なし(epoch 秒で統一)
- feature flag 規約: 挙動導入系 2 フラグ(`MEMOS_IMAGE_OPTIMIZER_ENABLED` / `MEMOS_RAW_IMAGE_CONVERSION_ENABLED`)は default false で準拠
- upstream ファイルへのフォーク変更(`attachment_service.go` 等 5 ファイル): 全て数行・コメント付きで最小、マージ阻害なし
- optimizer 失敗時の silent fallback(原本保存で続行): 「アップロードを失敗させない」意図的方針と判断

---

## 完了アーカイブ

### 2026-07-08: 2026-07-07 調査分の改善実装

- [x] **【中】画像 optimizer 同時実行数のデフォルトを 1 に変更する**
  - `MEMOS_IMAGE_OPTIMIZER_CONCURRENCY` 未設定時のデフォルトを 1 に変更。
- [x] **【中】アップロード時の画像二重デコードを解消する**
  - アップロード時は 1 回デコードした `image.Image` から preview と thumbnail を生成。
- [x] **【中】RAW コンバータに実効性のある自動テストを追加する**
  - converter コマンドをテスト差し替え可能にし、バイナリ欠落と不正出力拒否をテスト。
- [x] **【中】`maybeOptimizeImageAttachment` の分岐テストを追加する**
  - 不正 blob フォールバックと `KeepOriginal=false` の blob/type/size/filename/thumbnail 更新をテスト。
- [x] **【低】`KeepOriginal=false` 時にファイル名拡張子を実データに合わせる**
  - JPEG 化される新規アップロードの拡張子を `.jpg` に正規化。PNG 維持時は元ファイル名を維持。
- [x] **【低】env パーサ重複の解消を検討する**
  - パッケージ境界と低優先度制約を踏まえ、無理な共通化は行わず現状維持。
- [x] **【中】ファイルピッカー経路の object URL リークを解消する**
  - ファイルピッカーの preview URL 生成を `useBlobUrls` 経由に統一。
- [x] **【中】`tagLine.ts` の往復(parse ⇄ serialize)テストを追加する**
  - 先頭/末尾タグ行、重複除去、`##word` 除外、空行トリムをテスト。
- [x] **【中】`extractTrailingTagLine` デッドコードを削除する**
  - 未使用 export を削除し、共有型 `TagLineResult` は維持。
- [x] **【中】`media-item.ts` / Live Photo ペアリングのテストを追加する**
  - Live Photo ペア、単独画像、非対応 MIME/非 visual attachment の純関数テストを追加。
- [x] **【低】`TagSection` の aria-label をロケールキー化する**
  - `editor.remove-tag` を `en.json` / `ja.json` に追加し、`t()` 経由に変更。
