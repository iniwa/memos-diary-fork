package main

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"os"
	"path/filepath"
	"testing"

	"github.com/lithammer/shortuuid/v4"

	"github.com/usememos/memos/internal/profile"
	"github.com/usememos/memos/internal/version"
	storepb "github.com/usememos/memos/proto/gen/store"
	"github.com/usememos/memos/store"
	"github.com/usememos/memos/store/db"
)

// newBackfillTestStore creates a real SQLite store in a temp directory.
func newBackfillTestStore(t *testing.T) (*store.Store, *profile.Profile) {
	t.Helper()
	dir := t.TempDir()
	prof := &profile.Profile{
		Data:    dir,
		Driver:  "sqlite",
		DSN:     fmt.Sprintf("%s/memos_test.db", dir),
		Version: version.GetCurrentVersion(),
	}
	drv, err := db.NewDBDriver(prof)
	if err != nil {
		t.Fatalf("failed to create db driver: %v", err)
	}
	st := store.New(drv, prof)
	if err := st.Migrate(context.Background()); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	t.Cleanup(func() { _ = st.Close() })
	return st, prof
}

// makeTestJPEG returns a minimal valid JPEG blob of size w×h.
func makeTestJPEG(w, h int) []byte {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := range h {
		for x := range w {
			img.Set(x, y, color.RGBA{R: 100, G: 150, B: 200, A: 255})
		}
	}
	var buf bytes.Buffer
	_ = jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85})
	return buf.Bytes()
}

func TestThumbnailBackfillDryRunWritesNoFiles(t *testing.T) {
	ctx := context.Background()
	st, prof := newBackfillTestStore(t)

	att, err := st.CreateAttachment(ctx, &store.Attachment{
		UID:       shortuuid.New(),
		CreatorID: 1,
		Filename:  "test.jpg",
		Blob:      makeTestJPEG(100, 100),
		Type:      "image/jpeg",
		Size:      100,
	})
	if err != nil {
		t.Fatalf("create attachment: %v", err)
	}

	opts := backfillOptions{dryRun: true, maxEdge: 720, quality: 78}
	stats, _, err := backfillAttachments(ctx, st, prof, opts)
	if err != nil {
		t.Fatalf("backfillAttachments: %v", err)
	}

	thumbPath := filepath.Join(prof.Data, ".thumbnail_cache", att.UID+".v2.jpeg")
	if _, statErr := os.Stat(thumbPath); statErr == nil {
		t.Error("dry-run must not write .v2.jpeg file")
	}
	if stats.scanned != 1 {
		t.Errorf("scanned=%d want 1", stats.scanned)
	}
	if stats.missing != 1 {
		t.Errorf("missing=%d want 1", stats.missing)
	}
	if stats.written != 0 {
		t.Errorf("written=%d want 0", stats.written)
	}
}

func TestThumbnailBackfillExistingSkipped(t *testing.T) {
	ctx := context.Background()
	st, prof := newBackfillTestStore(t)

	att, err := st.CreateAttachment(ctx, &store.Attachment{
		UID:       shortuuid.New(),
		CreatorID: 1,
		Filename:  "test.jpg",
		Blob:      makeTestJPEG(100, 100),
		Type:      "image/jpeg",
		Size:      100,
	})
	if err != nil {
		t.Fatalf("create attachment: %v", err)
	}

	// Pre-create the thumbnail so it already exists.
	cacheDir := filepath.Join(prof.Data, ".thumbnail_cache")
	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		t.Fatal(err)
	}
	thumbPath := filepath.Join(cacheDir, att.UID+".v2.jpeg")
	if err := os.WriteFile(thumbPath, makeTestJPEG(50, 50), 0o644); err != nil {
		t.Fatal(err)
	}

	opts := backfillOptions{dryRun: false, force: false, maxEdge: 720, quality: 78}
	stats, _, err := backfillAttachments(ctx, st, prof, opts)
	if err != nil {
		t.Fatalf("backfillAttachments: %v", err)
	}

	if stats.existing != 1 {
		t.Errorf("existing=%d want 1", stats.existing)
	}
	if stats.written != 0 {
		t.Errorf("written=%d want 0", stats.written)
	}
}

func TestThumbnailBackfillUnsupportedMimeSkipped(t *testing.T) {
	ctx := context.Background()
	st, prof := newBackfillTestStore(t)

	_, err := st.CreateAttachment(ctx, &store.Attachment{
		UID:       shortuuid.New(),
		CreatorID: 1,
		Filename:  "anim.gif",
		Blob:      []byte("GIF89a"),
		Type:      "image/gif",
		Size:      6,
	})
	if err != nil {
		t.Fatalf("create attachment: %v", err)
	}

	opts := backfillOptions{dryRun: false, maxEdge: 720, quality: 78}
	stats, _, err := backfillAttachments(ctx, st, prof, opts)
	if err != nil {
		t.Fatalf("backfillAttachments: %v", err)
	}

	if stats.skipped != 1 {
		t.Errorf("skipped=%d want 1", stats.skipped)
	}
	if stats.written != 0 {
		t.Errorf("written=%d want 0", stats.written)
	}
}

func TestThumbnailBackfillDBBlobLoaded(t *testing.T) {
	ctx := context.Background()
	st, prof := newBackfillTestStore(t)

	// DB-backed attachment: StorageType is UNSPECIFIED (blob stored in DB).
	blob := makeTestJPEG(200, 150)
	att, err := st.CreateAttachment(ctx, &store.Attachment{
		UID:         shortuuid.New(),
		CreatorID:   1,
		Filename:    "db-backed.jpg",
		Blob:        blob,
		Type:        "image/jpeg",
		Size:        int64(len(blob)),
		StorageType: storepb.AttachmentStorageType_ATTACHMENT_STORAGE_TYPE_UNSPECIFIED,
	})
	if err != nil {
		t.Fatalf("create attachment: %v", err)
	}

	opts := backfillOptions{dryRun: false, maxEdge: 720, quality: 78}
	stats, failedUIDs, err := backfillAttachments(ctx, st, prof, opts)
	if err != nil {
		t.Fatalf("backfillAttachments: %v", err)
	}
	if len(failedUIDs) > 0 {
		t.Errorf("unexpected failures: %v", failedUIDs)
	}

	thumbPath := filepath.Join(prof.Data, ".thumbnail_cache", att.UID+".v2.jpeg")
	info, statErr := os.Stat(thumbPath)
	if statErr != nil {
		t.Fatalf(".v2.jpeg not created: %v", statErr)
	}
	if info.Size() == 0 {
		t.Error(".v2.jpeg is empty")
	}
	if stats.written != 1 {
		t.Errorf("written=%d want 1", stats.written)
	}
}
