package v1

import (
	"bytes"
	"context"
	"image"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/pkg/errors"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/usememos/memos/store"
)

const (
	rawConversionEnabledEnv = "MEMOS_RAW_IMAGE_CONVERSION_ENABLED"
	rawConversionTimeoutEnv = "MEMOS_RAW_IMAGE_CONVERSION_TIMEOUT_SECONDS"

	defaultRawConversionTimeout = 30
)

// rawConverterBinary is the ImageMagick 7 binary installed by the imagemagick Alpine package.
var rawConverterBinary = "magick"
var rawConverterCommand = exec.CommandContext

// rawExtensions is the set of lowercase filename extensions recognized as camera RAW formats.
var rawExtensions = map[string]bool{
	".3fr": true, ".arw": true, ".cr2": true, ".cr3": true, ".dcr": true,
	".dng": true, ".erf": true, ".fff": true, ".iiq": true, ".k25": true,
	".kdc": true, ".mef": true, ".mos": true, ".mrw": true, ".nef": true,
	".nrw": true, ".orf": true, ".pef": true, ".raf": true, ".raw": true,
	".rw2": true, ".rwl": true, ".sr2": true, ".srf": true, ".x3f": true,
}

// rawMimeTypeExtensions maps MIME type aliases to representative camera RAW extensions.
// Browsers often send "" or "application/octet-stream" for RAW files, so
// extension detection in isRawImageUpload is checked first.
var rawMimeTypeExtensions = map[string]string{
	"image/x-adobe-dng":     ".dng",
	"image/x-canon-cr2":     ".cr2",
	"image/x-canon-cr3":     ".cr3",
	"image/x-fuji-raf":      ".raf",
	"image/x-nikon-nef":     ".nef",
	"image/x-olympus-orf":   ".orf",
	"image/x-panasonic-rw2": ".rw2",
	"image/x-pentax-pef":    ".pef",
	"image/x-sony-arw":      ".arw",
	"image/x-sigma-x3f":     ".x3f",
	"image/x-dcraw":         ".raw",
	"image/x-raw":           ".raw",
}

type rawImageConversionConfig struct {
	Enabled        bool
	TimeoutSeconds int
}

func rawImageConversionConfigFromEnv() rawImageConversionConfig {
	return rawImageConversionConfig{
		Enabled:        parseBoolEnv(rawConversionEnabledEnv, false),
		TimeoutSeconds: parseIntEnv(rawConversionTimeoutEnv, defaultRawConversionTimeout, 1, 300),
	}
}

// isRawImageUpload returns true when the upload is a camera RAW file.
// Extension is checked first because browsers typically send "" or
// "application/octet-stream" as the MIME type for RAW formats.
func isRawImageUpload(filename, mimeType string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	if ext != "" && rawExtensions[ext] {
		return true
	}
	_, ok := rawMimeTypeExtensions[strings.ToLower(mimeType)]
	return ok
}

// jpegFilenameForRaw replaces the extension of a RAW filename with ".jpg".
func jpegFilenameForRaw(filename string) string {
	ext := filepath.Ext(filename)
	if ext == "" {
		return filename + ".jpg"
	}
	return strings.TrimSuffix(filename, ext) + ".jpg"
}

func rawInputExtensionForUpload(filename, mimeType string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	if ext != "" && rawExtensions[ext] {
		return ext
	}
	if ext, ok := rawMimeTypeExtensions[strings.ToLower(mimeType)]; ok {
		return ext
	}
	return ".raw"
}

// convertRawImageToJPEG converts a RAW image blob to a JPEG blob using ImageMagick.
// The output is resized to at most previewConfig.PreviewMaxEdge on its longest edge
// and encoded at previewConfig.PreviewQuality.
// A context deadline is enforced by config.TimeoutSeconds.
func convertRawImageToJPEG(ctx context.Context, blob []byte, filename, mimeType string, config rawImageConversionConfig, previewConfig imageOptimizerConfig) ([]byte, error) {
	tmpDir, err := os.MkdirTemp("", "memos-raw-*")
	if err != nil {
		return nil, errors.Wrap(err, "failed to create temp directory")
	}
	defer os.RemoveAll(tmpDir)

	// Use generated filenames, never the user-supplied filename, to avoid any
	// path injection into the converter argument list. Preserve only the RAW
	// extension so ImageMagick can select the right decoder.
	inputPath := filepath.Join(tmpDir, "input"+rawInputExtensionForUpload(filename, mimeType))
	if err := os.WriteFile(inputPath, blob, 0600); err != nil {
		return nil, errors.Wrap(err, "failed to write raw input file")
	}
	outputPath := filepath.Join(tmpDir, "output.jpg")

	// ">": only downscale, never enlarge.
	resizeGeom := strconv.Itoa(previewConfig.PreviewMaxEdge) + "x" + strconv.Itoa(previewConfig.PreviewMaxEdge) + ">"
	quality := strconv.Itoa(previewConfig.PreviewQuality)

	timeoutCtx, cancel := context.WithTimeout(ctx, time.Duration(config.TimeoutSeconds)*time.Second)
	defer cancel()

	// exec.CommandContext with a fixed binary name: no shell, no variable expansion.
	cmd := rawConverterCommand(timeoutCtx, rawConverterBinary,
		inputPath,
		"-auto-orient",
		"-resize", resizeGeom,
		"-quality", quality,
		outputPath,
	)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if timeoutCtx.Err() != nil {
			return nil, errors.New("RAW image conversion timed out")
		}
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			return nil, errors.Wrap(err, "RAW image converter failed")
		}
		return nil, errors.Errorf("RAW image converter failed: %s", msg)
	}

	jpegBytes, err := os.ReadFile(outputPath)
	if err != nil {
		return nil, errors.Wrap(err, "failed to read converted JPEG")
	}
	if len(jpegBytes) == 0 {
		return nil, errors.New("converter produced empty output")
	}

	// Reject malformed or non-image output before storing.
	if _, _, err := image.DecodeConfig(bytes.NewReader(jpegBytes)); err != nil {
		return nil, errors.Wrap(err, "converter produced invalid image output")
	}

	return jpegBytes, nil
}

// maybeConvertRawImageAttachment converts attachment.Blob from RAW to JPEG when RAW
// conversion is enabled and the attachment is detected as a camera RAW file.
// Unlike image optimization failures, a failed RAW conversion returns an error so
// the user learns their file was not accepted rather than storing an unusable RAW blob.
func (s *APIV1Service) maybeConvertRawImageAttachment(ctx context.Context, attachment *store.Attachment) error {
	rawConfig := rawImageConversionConfigFromEnv()
	if !rawConfig.Enabled || attachment == nil || len(attachment.Blob) == 0 {
		return nil
	}
	if !isRawImageUpload(attachment.Filename, attachment.Type) {
		return nil
	}

	release, err := s.acquireImageProcessingSlot(ctx)
	if err != nil {
		return status.Errorf(codes.ResourceExhausted, "too many image processing requests")
	}
	defer release()

	previewConfig := imageOptimizerConfigFromEnv()
	jpegBytes, err := convertRawImageToJPEG(ctx, attachment.Blob, attachment.Filename, attachment.Type, rawConfig, previewConfig)
	if err != nil {
		return status.Errorf(codes.InvalidArgument, "failed to convert RAW image: %v", err)
	}

	attachment.Blob = jpegBytes
	attachment.Size = int64(len(jpegBytes))
	attachment.Type = "image/jpeg"
	attachment.Filename = jpegFilenameForRaw(attachment.Filename)

	return nil
}
