package v1

import (
	"bytes"
	"context"
	"image"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/disintegration/imaging"
	"github.com/pkg/errors"

	"github.com/usememos/memos/internal/profile"
	"github.com/usememos/memos/store"
)

const (
	imageOptimizerEnabledEnv        = "MEMOS_IMAGE_OPTIMIZER_ENABLED"
	imageOptimizerConcurrencyEnv    = "MEMOS_IMAGE_OPTIMIZER_CONCURRENCY"
	imageOptimizerPreviewMaxEdgeEnv = "MEMOS_IMAGE_PREVIEW_MAX_EDGE"
	imageOptimizerPreviewQualityEnv = "MEMOS_IMAGE_PREVIEW_JPEG_QUALITY"
	imageOptimizerKeepOriginalEnv   = "MEMOS_IMAGE_KEEP_ORIGINAL"

	// ThumbnailMaxEdgeEnv and ThumbnailJPEGQualityEnv are exported for the thumbnail-backfill command.
	ThumbnailMaxEdgeEnv     = "MEMOS_IMAGE_THUMBNAIL_MAX_EDGE"
	ThumbnailJPEGQualityEnv = "MEMOS_IMAGE_THUMBNAIL_JPEG_QUALITY"

	defaultPreviewMaxEdge     = 2560
	defaultPreviewJPEGQuality = 90
	// DefaultThumbnailMaxEdge and DefaultThumbnailJPEGQuality are exported for the thumbnail-backfill command.
	DefaultThumbnailMaxEdge     = 720
	DefaultThumbnailJPEGQuality = 78
)

type imageOptimizerConfig struct {
	Enabled          bool
	KeepOriginal     bool
	PreviewMaxEdge   int
	PreviewQuality   int
	ThumbnailMaxEdge int
	ThumbnailQuality int
}

func imageOptimizerConfigFromEnv() imageOptimizerConfig {
	return imageOptimizerConfig{
		Enabled:          parseBoolEnv(imageOptimizerEnabledEnv, false),
		KeepOriginal:     parseBoolEnv(imageOptimizerKeepOriginalEnv, true),
		PreviewMaxEdge:   parseIntEnv(imageOptimizerPreviewMaxEdgeEnv, defaultPreviewMaxEdge, 1, maxImagePixels),
		PreviewQuality:   parseIntEnv(imageOptimizerPreviewQualityEnv, defaultPreviewJPEGQuality, 1, 100),
		ThumbnailMaxEdge: parseIntEnv(ThumbnailMaxEdgeEnv, DefaultThumbnailMaxEdge, 1, maxImagePixels),
		ThumbnailQuality: parseIntEnv(ThumbnailJPEGQualityEnv, DefaultThumbnailJPEGQuality, 1, 100),
	}
}

func parseBoolEnv(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func parseIntEnv(key string, fallback, minValue, maxValue int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < minValue || parsed > maxValue {
		return fallback
	}
	return parsed
}

func imageOptimizerConcurrencyFromEnv() int64 {
	return int64(parseIntEnv(imageOptimizerConcurrencyEnv, 1, 1, 8))
}

// maybeOptimizeImageAttachment preserves the non-fatal optimization fallback, but
// returns a canceled request context so callers do not persist an abandoned upload.
func (s *APIV1Service) maybeOptimizeImageAttachment(ctx context.Context, attachment *store.Attachment) error {
	config := imageOptimizerConfigFromEnv()
	if !config.Enabled || attachment == nil || len(attachment.Blob) == 0 || !IsOptimizableStaticImage(attachment.Type) {
		return nil
	}
	if IsAndroidMotionContainer(attachment.Payload.GetMotionMedia()) {
		return nil
	}
	if err := ctx.Err(); err != nil {
		return err
	}

	release, err := s.acquireImageProcessingSlot(ctx)
	if err != nil {
		if contextErr := ctx.Err(); contextErr != nil {
			return contextErr
		}
		slog.Warn("skipping image optimization because processing slot could not be acquired",
			slog.String("filename", attachment.Filename),
			slog.String("error", err.Error()))
		return nil
	}
	defer release()
	if err := ctx.Err(); err != nil {
		return err
	}

	img, err := decodeOptimizableImage(attachment.Blob)
	if err != nil {
		if contextErr := ctx.Err(); contextErr != nil {
			return contextErr
		}
		slog.Warn("failed to optimize image attachment",
			slog.String("filename", attachment.Filename),
			slog.String("type", attachment.Type),
			slog.String("error", err.Error()))
		if err := WriteUploadThumbnailCache(ctx, s.Profile, attachment.UID, attachment.Blob, config.ThumbnailMaxEdge, config.ThumbnailQuality); err != nil {
			if contextErr := ctx.Err(); contextErr != nil {
				return contextErr
			}
			slog.Warn("failed to generate image thumbnail cache",
				slog.String("filename", attachment.Filename),
				slog.String("type", attachment.Type),
				slog.String("error", err.Error()))
		}
		return nil
	}

	optimized, err := optimizeDecodedImage(img, attachment.Type, config.PreviewMaxEdge, config.PreviewQuality)
	if err != nil {
		if contextErr := ctx.Err(); contextErr != nil {
			return contextErr
		}
		slog.Warn("failed to optimize image attachment",
			slog.String("filename", attachment.Filename),
			slog.String("type", attachment.Type),
			slog.String("error", err.Error()))
	} else if !config.KeepOriginal {
		if contextErr := ctx.Err(); contextErr != nil {
			return contextErr
		}
		attachment.Blob = optimized
		attachment.Size = int64(len(optimized))
		attachment.Type = optimizedImageMimeType(attachment.Type)
		attachment.Filename = optimizedImageFilename(attachment.Filename, attachment.Type)
	}

	if err := writeUploadThumbnailCacheFromImage(ctx, s.Profile, attachment.UID, img, config.ThumbnailMaxEdge, config.ThumbnailQuality); err != nil {
		if contextErr := ctx.Err(); contextErr != nil {
			return contextErr
		}
		slog.Warn("failed to generate image thumbnail cache",
			slog.String("filename", attachment.Filename),
			slog.String("type", attachment.Type),
			slog.String("error", err.Error()))
	}
	return nil
}

// IsOptimizableStaticImage reports whether mimeType can be processed by the image optimizer.
func IsOptimizableStaticImage(mimeType string) bool {
	switch mimeType {
	case "image/jpeg", "image/jpg", "image/png", "image/webp":
		return true
	default:
		return false
	}
}

func optimizedImageMimeType(mimeType string) string {
	if mimeType == "image/png" {
		return "image/png"
	}
	return "image/jpeg"
}

func optimizedImageFilename(filename, mimeType string) string {
	if optimizedImageMimeType(mimeType) == "image/png" {
		return filename
	}
	ext := filepath.Ext(filename)
	if ext == "" {
		return filename + ".jpg"
	}
	return strings.TrimSuffix(filename, ext) + ".jpg"
}

func decodeOptimizableImage(blob []byte) (image.Image, error) {
	if err := validateImagePixelCount(blob); err != nil {
		return nil, err
	}

	img, err := imaging.Decode(bytes.NewReader(blob), imaging.AutoOrientation(true))
	if err != nil {
		return nil, errors.Wrap(err, "failed to decode image")
	}
	return img, nil
}

func optimizeImageBlob(blob []byte, mimeType string, maxEdge, quality int) ([]byte, error) {
	img, err := decodeOptimizableImage(blob)
	if err != nil {
		return nil, err
	}
	return optimizeDecodedImage(img, mimeType, maxEdge, quality)
}

func optimizeDecodedImage(img image.Image, mimeType string, maxEdge, quality int) ([]byte, error) {
	img = resizeImageToMaxEdge(img, maxEdge)
	return encodeOptimizedImage(img, mimeType, quality)
}

func resizeImageToMaxEdge(img image.Image, maxEdge int) image.Image {
	if maxEdge <= 0 {
		return img
	}

	width, height := img.Bounds().Dx(), img.Bounds().Dy()
	if width <= 0 || height <= 0 || max(width, height) <= maxEdge {
		return img
	}
	if width >= height {
		return imaging.Resize(img, maxEdge, 0, imaging.Lanczos)
	}
	return imaging.Resize(img, 0, maxEdge, imaging.Lanczos)
}

func encodeOptimizedImage(img image.Image, mimeType string, quality int) ([]byte, error) {
	var output bytes.Buffer
	if mimeType == "image/png" {
		if err := imaging.Encode(&output, img, imaging.PNG); err != nil {
			return nil, errors.Wrap(err, "failed to encode png image")
		}
		return output.Bytes(), nil
	}

	if err := imaging.Encode(&output, img, imaging.JPEG, imaging.JPEGQuality(quality)); err != nil {
		return nil, errors.Wrap(err, "failed to encode jpeg image")
	}
	return output.Bytes(), nil
}

// WriteUploadThumbnailCache generates a .v2.jpeg thumbnail for the given image blob and writes it to
// the thumbnail cache directory. It is safe to call while the server is running.
func WriteUploadThumbnailCache(ctx context.Context, profile *profile.Profile, uid string, blob []byte, maxEdge, quality int) error {
	if profile == nil || strings.TrimSpace(uid) == "" || len(blob) == 0 {
		return nil
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	img, err := decodeOptimizableImage(blob)
	if err != nil {
		return err
	}
	return writeUploadThumbnailCacheFromImage(ctx, profile, uid, img, maxEdge, quality)
}

func writeUploadThumbnailCacheFromImage(ctx context.Context, profile *profile.Profile, uid string, img image.Image, maxEdge, quality int) error {
	if profile == nil || strings.TrimSpace(uid) == "" || img == nil {
		return nil
	}
	if err := ctx.Err(); err != nil {
		return err
	}

	img = resizeImageToMaxEdge(img, maxEdge)

	cacheFolder := filepath.Join(profile.Data, ThumbnailCacheFolder)
	if err := os.MkdirAll(cacheFolder, os.ModePerm); err != nil {
		return errors.Wrap(err, "failed to create thumbnail cache folder")
	}

	outputPath := filepath.Join(cacheFolder, uid+".v2.jpeg")
	tempPath := outputPath + ".tmp." + strconv.FormatInt(time.Now().UnixNano(), 10)
	output, err := os.Create(tempPath)
	if err != nil {
		return errors.Wrap(err, "failed to create thumbnail cache file")
	}

	encodeErr := imaging.Encode(output, img, imaging.JPEG, imaging.JPEGQuality(quality))
	closeErr := output.Close()
	if encodeErr != nil {
		_ = os.Remove(tempPath)
		return errors.Wrap(encodeErr, "failed to encode thumbnail cache")
	}
	if closeErr != nil {
		_ = os.Remove(tempPath)
		return errors.Wrap(closeErr, "failed to close thumbnail cache")
	}
	if err := os.Rename(tempPath, outputPath); err != nil {
		_ = os.Remove(tempPath)
		return errors.Wrap(err, "failed to move thumbnail cache into place")
	}
	return nil
}
