# 2026-06-02 Phase 7 Retest — KEEP_ORIGINAL=false 検証完了

## 背景

Phase 7 初回検証（同日）で、デプロイ済みバイナリが `cc005908` ソースと異なることが判明した。
原因: Dockerfile の `--mount=type=cache,target=/root/.cache/go-build` が古いコンパイル済みオブジェクトを保持し、
`KEEP_ORIGINAL=false` のリサイズロジックが実行されなかった（保存 asset が 4000×3000 のまま）。
また thumbnail の max_edge が 720 でなく 600 になっていたことも証拠となった。

修正コミット `48fbbfff`（`ci(diary-mode): bust go build cache to fix stale binary in image`）:
- `scripts/Dockerfile`: `BUILD_ID=0` ARG 追加、`--mount=type=cache,target=/root/.cache/go-build` 削除
- `.github/workflows/build-diary-image.yml`: `BUILD_ID=${{ github.run_number }}` を `build-args` に追加

CI ビルド diary-9（`sha-48fbbfff`）完了後、Portainer で再デプロイされた状態で本検証を実施。

## Changed Runtime Config

変更なし。前回検証から引き続き:

```
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_KEEP_ORIGINAL=false
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
```

デプロイ済みイメージ: `ghcr.io/iniwa/memos-diary-fork:sha-48fbbfff8c099155fc23c2cd38a4f4604ec0f60d`
バイナリバージョン: `diary-9`

## Verified

### 1. Runtime Config

```sh
docker inspect memos-diary --format '{{range .Config.Env}}{{println .}}{{end}}' | grep MEMOS_IMAGE
```

```
MEMOS_IMAGE_OPTIMIZER_ENABLED=true
MEMOS_IMAGE_KEEP_ORIGINAL=false
MEMOS_IMAGE_OPTIMIZER_CONCURRENCY=1
```

### 2. アップロード

テスト画像: `phase7-retest-4k.jpg`
- ローカル元ファイル: 4000×3000 JPEG, 188.6K (Pillow で合成)
- メモテキスト: "Phase 7 retest: KEEP_ORIGINAL=false 新バイナリ検証 (diary-9, 4000x3000 JPEG)"
- アップロード成功、メモ保存成功、画像グリッド表示確認

### 3. 保存 Asset の縮小確認

```
/var/opt/memos/assets/1780364303_phase7-retest-4k.jpg  75.6K
```

JPEG SOF0 ヘッダ: `ffc0 0011 08 0780 0a00`
- height = 0x0780 = **1920 px**
- width  = 0x0a00 = **2560 px**

元サイズ (4000×3000, 188.6K) → 保存サイズ (2560×1920, 75.6K) ✅
`KEEP_ORIGINAL=false` によるリサイズが正常動作。

### 4. Thumbnail キャッシュ確認

```
/var/opt/memos/.thumbnail_cache/Ecxap2PSVMDaEWonoRmKT6.v2.jpeg  6.6K
```

JPEG SOF0 ヘッダ: `ffc0 0011 08 021c 02d0`
- height = 0x021c = **540 px**
- width  = 0x02d0 = **720 px**

`defaultThumbnailMaxEdge=720` が正しく反映されている ✅  
（初回検証では 600 だったため、バイナリ刷新の確証が得られた）

### 5. 既存機能

- `?filter=attachment.hasImage:true`: 新しいメモがリスト先頭に表示 ✅
- 画像グリッド: 既存メモの画像も正常表示 ✅
- タグチップ: サイドバーのタグ一覧・既存メモのタグ表示ともに正常 ✅
- プレビューライトボックス: UI 上で画像ボタンが正常にレンダリング ✅

### 6. Docker Logs

```
time=2026-06-02T10:38:23.654+09:00 level=INFO msg=OK method=/memos.api.v1.AttachmentService/CreateAttachment
```

- panic なし
- WARN/ERROR なし
- optimizer/thumbnail エラーなし ✅

## Issues Found

なし。

## Not Verified

- 既存メモ画像のサムネイル再生成（本フェーズのスコープ外）
- Live Photo / Motion Photo（スコープ外）

## Suggested Next Work

- **テストメモの削除**: Phase 6 (`aWTP3fP8VSntHSbvETeJ9L`)、Phase 7 初回 (`SaLHXXoECVXo4Jy2txN99f`)、本検証 (`Ecxap2PSVMDaEWonoRmKT6`) のテストメモを削除してもよい（任意）
- **既存画像のサムネイル再生成**: 新規アップロード以前の画像には `.v2.jpeg` がないものもある。opt-in の再生成フェーズを別途検討
- **KEEP_ORIGINAL=false の継続運用**: 本検証により問題なしと確認。現在の設定を維持する
