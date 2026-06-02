package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/usememos/memos/internal/profile"
	"github.com/usememos/memos/internal/version"
	storepb "github.com/usememos/memos/proto/gen/store"
	"github.com/usememos/memos/server/router/api/v1"
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

type backfillOptions struct {
	dryRun    bool
	force     bool
	limit     int
	filterUID string
	maxEdge   int
	quality   int
}

type backfillStats struct {
	scanned  int
	existing int
	missing  int
	skipped  int
	failed   int
	written  int
}

func runThumbnailBackfill(cmd *cobra.Command, _ []string) error {
	execute, _ := cmd.Flags().GetBool("execute")
	force, _ := cmd.Flags().GetBool("force")
	limit, _ := cmd.Flags().GetInt("limit")
	filterUID, _ := cmd.Flags().GetString("uid")

	if !execute {
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
		return errors.Wrap(err, "invalid profile")
	}

	ctx := context.Background()
	dbDriver, err := db.NewDBDriver(instanceProfile)
	if err != nil {
		return errors.Wrap(err, "failed to create db driver")
	}
	storeInstance := store.New(dbDriver, instanceProfile)
	// Intentionally not calling storeInstance.Migrate — backfill is read/write-cache only.

	opts := backfillOptions{
		dryRun:    !execute,
		force:     force,
		limit:     limit,
		filterUID: strings.TrimSpace(filterUID),
		maxEdge:   thumbnailBackfillParseIntEnv(v1.ThumbnailMaxEdgeEnv, v1.DefaultThumbnailMaxEdge),
		quality:   thumbnailBackfillParseIntEnv(v1.ThumbnailJPEGQualityEnv, v1.DefaultThumbnailJPEGQuality),
	}
	fmt.Fprintf(os.Stderr, "thumbnail settings: max_edge=%d quality=%d\n", opts.maxEdge, opts.quality)

	stats, failedUIDs, err := backfillAttachments(ctx, storeInstance, instanceProfile, opts)
	if err != nil {
		return err
	}

	if opts.dryRun {
		fmt.Printf("thumbnail-backfill dry-run\nscanned=%d existing=%d missing=%d skipped=%d failed=%d\n",
			stats.scanned, stats.existing, stats.missing, stats.skipped, stats.failed)
	} else {
		fmt.Printf("thumbnail-backfill execute\nscanned=%d generated=%d existing=%d skipped=%d failed=%d\n",
			stats.scanned, stats.written, stats.existing, stats.skipped, stats.failed)
		if len(failedUIDs) > 0 {
			fmt.Println("failed UIDs:")
			for _, s := range failedUIDs {
				fmt.Println("  ", s)
			}
		}
	}
	return nil
}

// backfillAttachments iterates all attachments and generates missing .v2.jpeg thumbnails.
// It is the testable core of the thumbnail-backfill command.
func backfillAttachments(ctx context.Context, st *store.Store, prof *profile.Profile, opts backfillOptions) (backfillStats, []string, error) {
	var stats backfillStats
	var failedUIDs []string
	generated := 0

	pageSize := 200
	offset := 0

	for {
		ps := pageSize
		find := &store.FindAttachment{
			Limit:  &ps,
			Offset: &offset,
		}
		if opts.filterUID != "" {
			find.UID = &opts.filterUID
		}
		attachments, err := st.ListAttachments(ctx, find)
		if err != nil {
			return stats, failedUIDs, errors.Wrap(err, "failed to list attachments")
		}
		if len(attachments) == 0 {
			break
		}
		offset += len(attachments)

		for _, att := range attachments {
			stats.scanned++

			if !v1.IsOptimizableStaticImage(att.Type) {
				stats.skipped++
				continue
			}
			if att.Payload != nil && v1.IsAndroidMotionContainer(att.Payload.GetMotionMedia()) {
				stats.skipped++
				continue
			}

			thumbPath := filepath.Join(prof.Data, ".thumbnail_cache", att.UID+".v2.jpeg")
			_, statErr := os.Stat(thumbPath)
			thumbExists := statErr == nil

			if thumbExists && !opts.force {
				stats.existing++
				continue
			}
			stats.missing++

			if opts.dryRun {
				fmt.Printf("  [dry-run] would generate: %s.v2.jpeg\n", att.UID)
				continue
			}

			blob, readErr := thumbnailBackfillReadBlob(ctx, st, prof, att)
			if readErr != nil {
				slog.Warn("failed to read attachment blob",
					slog.String("uid", att.UID),
					slog.Any("err", readErr))
				stats.failed++
				failedUIDs = append(failedUIDs, att.UID+": "+readErr.Error())
				continue
			}
			if len(blob) == 0 {
				slog.Warn("attachment blob is empty, skipping", slog.String("uid", att.UID))
				stats.skipped++
				continue
			}

			if err := v1.WriteUploadThumbnailCache(ctx, prof, att.UID, blob, opts.maxEdge, opts.quality); err != nil {
				slog.Warn("failed to write thumbnail cache",
					slog.String("uid", att.UID),
					slog.Any("err", err))
				stats.failed++
				failedUIDs = append(failedUIDs, att.UID+": "+err.Error())
				continue
			}
			stats.written++
			generated++
			fmt.Printf("  generated: %s.v2.jpeg\n", att.UID)

			if opts.limit > 0 && generated >= opts.limit {
				fmt.Fprintf(os.Stderr, "reached --limit %d, stopping\n", opts.limit)
				return stats, failedUIDs, nil
			}
		}

		if opts.filterUID != "" || len(attachments) < pageSize {
			break
		}
	}

	return stats, failedUIDs, nil
}

// thumbnailBackfillReadBlob reads the raw image bytes for an attachment.
// LOCAL: reads from the file at profile.Data/reference.
// S3: not supported; returns an explicit error so the caller counts it as failed.
// DATABASE (unspecified): fetches the full attachment row with GetBlob=true.
func thumbnailBackfillReadBlob(ctx context.Context, st *store.Store, p *profile.Profile, att *store.Attachment) ([]byte, error) {
	switch att.StorageType {
	case storepb.AttachmentStorageType_LOCAL:
		ref := filepath.FromSlash(att.Reference)
		if !filepath.IsAbs(ref) {
			ref = filepath.Join(p.Data, ref)
		}
		return os.ReadFile(ref)

	case storepb.AttachmentStorageType_S3:
		return nil, errors.New("S3-backed attachments are not supported by thumbnail-backfill")

	default:
		// AttachmentStorageType_ATTACHMENT_STORAGE_TYPE_UNSPECIFIED — blob is stored in DB.
		uid := att.UID
		full, err := st.GetAttachment(ctx, &store.FindAttachment{UID: &uid, GetBlob: true})
		if err != nil {
			return nil, errors.Wrap(err, "failed to fetch attachment blob from DB")
		}
		if full == nil {
			return nil, errors.New("attachment not found in DB")
		}
		return full.Blob, nil
	}
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
