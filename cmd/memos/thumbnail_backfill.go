package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/usememos/memos/internal/profile"
	"github.com/usememos/memos/internal/version"
	storepb "github.com/usememos/memos/proto/gen/store"
	v1 "github.com/usememos/memos/server/router/api/v1"
	"github.com/usememos/memos/store"
	"github.com/usememos/memos/store/db"
)

var thumbnailBackfillCmd = &cobra.Command{
	Use:   "thumbnail-backfill",
	Short: "Regenerate missing .v2.jpeg thumbnail cache for existing image attachments",
	Long: `Reads all image attachments from the database and generates missing
.thumbnail_cache/{uid}.v2.jpeg files using the Phase 6 optimizer settings
(MEMOS_IMAGE_THUMBNAIL_MAX_EDGE / MEMOS_IMAGE_THUMBNAIL_JPEG_QUALITY).

Default behavior is dry-run. Pass --execute to write files.`,
	RunE: runThumbnailBackfill,
}

func init() {
	thumbnailBackfillCmd.Flags().Bool("execute", false, "write thumbnail files (default: dry-run)")
	thumbnailBackfillCmd.Flags().Bool("force", false, "regenerate even if .v2.jpeg already exists")
	thumbnailBackfillCmd.Flags().Int("limit", 0, "stop after generating this many thumbnails (0 = no limit)")
	thumbnailBackfillCmd.Flags().String("uid", "", "process only the attachment with this UID")
}

func runThumbnailBackfill(cmd *cobra.Command, _ []string) error {
	execute, _ := cmd.Flags().GetBool("execute")
	force, _ := cmd.Flags().GetBool("force")
	limit, _ := cmd.Flags().GetInt("limit")
	filterUID, _ := cmd.Flags().GetString("uid")
	filterUID = strings.TrimSpace(filterUID)
	dryRun := !execute

	if dryRun {
		fmt.Fprintln(os.Stderr, "thumbnail-backfill dry-run (pass --execute to write files)")
	} else {
		fmt.Fprintln(os.Stderr, "thumbnail-backfill execute mode")
	}

	instanceProfile := &profile.Profile{
		Data:   viper.GetString("data"),
		Driver: viper.GetString("driver"),
		DSN:    viper.GetString("dsn"),
	}
	instanceProfile.Version = version.GetCurrentVersion()
	instanceProfile.Commit = version.Commit

	if err := instanceProfile.Validate(); err != nil {
		return fmt.Errorf("invalid profile: %w", err)
	}

	ctx := context.Background()
	dbDriver, err := db.NewDBDriver(instanceProfile)
	if err != nil {
		return fmt.Errorf("failed to create db driver: %w", err)
	}
	storeInstance := store.New(dbDriver, instanceProfile)
	// Intentionally not calling storeInstance.Migrate — backfill is read/write-cache only.

	thumbMaxEdge := thumbnailBackfillParseIntEnv(v1.ThumbnailMaxEdgeEnv, v1.DefaultThumbnailMaxEdge)
	thumbQuality := thumbnailBackfillParseIntEnv(v1.ThumbnailJPEGQualityEnv, v1.DefaultThumbnailJPEGQuality)

	fmt.Fprintf(os.Stderr, "thumbnail settings: max_edge=%d quality=%d\n", thumbMaxEdge, thumbQuality)

	var (
		scanned  int
		existing int
		missing  int
		skipped  int
		failed   int
		written  int
	)
	var failedUIDs []string

	pageSize := 200
	offset := 0
	generated := 0
	limitReached := false

	for !limitReached {
		ps := pageSize
		find := &store.FindAttachment{
			Limit:  &ps,
			Offset: &offset,
		}
		if filterUID != "" {
			find.UID = &filterUID
		}
		attachments, err := storeInstance.ListAttachments(ctx, find)
		if err != nil {
			return fmt.Errorf("failed to list attachments: %w", err)
		}
		if len(attachments) == 0 {
			break
		}
		offset += len(attachments)

		for _, att := range attachments {
			scanned++

			if !v1.IsOptimizableStaticImage(att.Type) {
				skipped++
				continue
			}
			if att.Payload != nil && v1.IsAndroidMotionContainer(att.Payload.GetMotionMedia()) {
				skipped++
				continue
			}

			thumbPath := filepath.Join(instanceProfile.Data, ".thumbnail_cache", att.UID+".v2.jpeg")
			_, statErr := os.Stat(thumbPath)
			thumbExists := statErr == nil

			if thumbExists && !force {
				existing++
				continue
			}
			missing++

			if dryRun {
				fmt.Printf("  [dry-run] would generate: %s.v2.jpeg\n", att.UID)
				continue
			}

			blob, readErr := thumbnailBackfillReadBlob(instanceProfile, att)
			if readErr != nil {
				slog.Warn("failed to read attachment blob",
					slog.String("uid", att.UID),
					slog.Any("err", readErr))
				failed++
				failedUIDs = append(failedUIDs, att.UID+": "+readErr.Error())
				continue
			}
			if len(blob) == 0 {
				slog.Warn("attachment blob is empty, skipping", slog.String("uid", att.UID))
				skipped++
				continue
			}

			if err := v1.WriteUploadThumbnailCache(ctx, instanceProfile, att.UID, blob, thumbMaxEdge, thumbQuality); err != nil {
				slog.Warn("failed to write thumbnail cache",
					slog.String("uid", att.UID),
					slog.Any("err", err))
				failed++
				failedUIDs = append(failedUIDs, att.UID+": "+err.Error())
				continue
			}
			written++
			generated++
			fmt.Printf("  generated: %s.v2.jpeg\n", att.UID)

			if limit > 0 && generated >= limit {
				fmt.Fprintf(os.Stderr, "reached --limit %d, stopping\n", limit)
				limitReached = true
				break
			}
		}

		if filterUID != "" || len(attachments) < pageSize {
			break
		}
	}

	if dryRun {
		fmt.Printf("thumbnail-backfill dry-run\nscanned=%d existing=%d missing=%d skipped=%d failed=%d\n",
			scanned, existing, missing, skipped, failed)
	} else {
		fmt.Printf("thumbnail-backfill execute\nscanned=%d generated=%d existing=%d skipped=%d failed=%d\n",
			scanned, written, existing, skipped, failed)
		if len(failedUIDs) > 0 {
			fmt.Println("failed UIDs:")
			for _, s := range failedUIDs {
				fmt.Println("  ", s)
			}
		}
	}
	return nil
}

func thumbnailBackfillReadBlob(p *profile.Profile, att *store.Attachment) ([]byte, error) {
	if att.StorageType == storepb.AttachmentStorageType_LOCAL {
		ref := filepath.FromSlash(att.Reference)
		if !filepath.IsAbs(ref) {
			ref = filepath.Join(p.Data, ref)
		}
		return os.ReadFile(ref)
	}
	// For database-backed blobs, Blob is populated when GetBlob=true was used.
	// ListAttachments without GetBlob leaves Blob nil; treat as empty/skipped.
	return att.Blob, nil
}

func thumbnailBackfillParseIntEnv(key string, fallback int) int {
	s := strings.TrimSpace(os.Getenv(key))
	if s == "" {
		return fallback
	}
	v, err := strconv.Atoi(s)
	if err != nil || v < 1 {
		return fallback
	}
	return v
}
