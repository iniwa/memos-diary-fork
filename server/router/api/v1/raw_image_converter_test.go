package v1

import (
	"bytes"
	"context"
	"image"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/usememos/memos/store"
)

func TestIsRawImageUpload(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		filename string
		mimeType string
		want     bool
	}{
		// Extension detection: common RAW formats.
		{name: "ARW extension", filename: "DSC01234.ARW", mimeType: "", want: true},
		{name: "arw lowercase", filename: "shot.arw", mimeType: "", want: true},
		{name: "NEF extension", filename: "IMG_0001.NEF", mimeType: "application/octet-stream", want: true},
		{name: "CR2 extension", filename: "photo.CR2", mimeType: "", want: true},
		{name: "CR3 extension", filename: "photo.cr3", mimeType: "", want: true},
		{name: "DNG extension", filename: "scan.DNG", mimeType: "", want: true},
		{name: "RAF extension", filename: "DSCF0001.RAF", mimeType: "", want: true},
		{name: "RW2 extension", filename: "P1000001.RW2", mimeType: "", want: true},
		{name: "ORF extension", filename: "P4010001.orf", mimeType: "", want: true},
		{name: "PEF extension", filename: "IMGP1234.PEF", mimeType: "", want: true},
		// MIME-type detection when extension is unrecognised
		{name: "sony ARW mime", filename: "image", mimeType: "image/x-sony-arw", want: true},
		{name: "nikon NEF mime", filename: "image", mimeType: "image/x-nikon-nef", want: true},
		{name: "DNG mime", filename: "image", mimeType: "image/x-adobe-dng", want: true},
		{name: "x-raw mime", filename: "image", mimeType: "image/x-raw", want: true},
		{name: "x-dcraw mime", filename: "image", mimeType: "image/x-dcraw", want: true},
		// Normal images: must not be detected as RAW.
		{name: "JPEG extension", filename: "photo.jpg", mimeType: "image/jpeg", want: false},
		{name: "PNG extension", filename: "image.png", mimeType: "image/png", want: false},
		{name: "WebP extension", filename: "anim.webp", mimeType: "image/webp", want: false},
		{name: "MP4 video", filename: "clip.mp4", mimeType: "video/mp4", want: false},
		{name: "PDF file", filename: "doc.pdf", mimeType: "application/pdf", want: false},
		{name: "empty filename and mime", filename: "", mimeType: "", want: false},
		{name: "octet-stream only", filename: "data.bin", mimeType: "application/octet-stream", want: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := isRawImageUpload(tc.filename, tc.mimeType)
			require.Equal(t, tc.want, got)
		})
	}
}

func TestJpegFilenameForRaw(t *testing.T) {
	t.Parallel()

	tests := []struct {
		input string
		want  string
	}{
		{input: "DSC01234.ARW", want: "DSC01234.jpg"},
		{input: "DSC01234.arw", want: "DSC01234.jpg"},
		{input: "IMG_0001.NEF", want: "IMG_0001.jpg"},
		{input: "photo.CR2", want: "photo.jpg"},
		{input: "scan.DNG", want: "scan.jpg"},
		{input: "noextension", want: "noextension.jpg"},
		{input: "dotted.file.RW2", want: "dotted.file.jpg"},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			t.Parallel()
			require.Equal(t, tc.want, jpegFilenameForRaw(tc.input))
		})
	}
}

func TestRawInputExtensionForUpload(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		filename string
		mimeType string
		want     string
	}{
		{name: "extension wins", filename: "DSC01234.ARW", mimeType: "application/octet-stream", want: ".arw"},
		{name: "mime fallback", filename: "image", mimeType: "image/x-nikon-nef", want: ".nef"},
		{name: "unknown fallback", filename: "image", mimeType: "application/octet-stream", want: ".raw"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			require.Equal(t, tc.want, rawInputExtensionForUpload(tc.filename, tc.mimeType))
		})
	}
}

func TestRawImageConversionConfigFromEnv_Defaults(t *testing.T) {
	t.Setenv(rawConversionEnabledEnv, "")
	t.Setenv(rawConversionTimeoutEnv, "")

	cfg := rawImageConversionConfigFromEnv()
	require.False(t, cfg.Enabled)
	require.Equal(t, defaultRawConversionTimeout, cfg.TimeoutSeconds)
}

func TestRawImageConversionConfigFromEnv_Custom(t *testing.T) {
	t.Setenv(rawConversionEnabledEnv, "true")
	t.Setenv(rawConversionTimeoutEnv, "60")

	cfg := rawImageConversionConfigFromEnv()
	require.True(t, cfg.Enabled)
	require.Equal(t, 60, cfg.TimeoutSeconds)
}

func TestRawImageConversionConfigFromEnv_InvalidTimeout(t *testing.T) {
	t.Setenv(rawConversionEnabledEnv, "true")
	t.Setenv(rawConversionTimeoutEnv, "notanumber")

	cfg := rawImageConversionConfigFromEnv()
	require.Equal(t, defaultRawConversionTimeout, cfg.TimeoutSeconds)
}

func TestMaybeConvertRawImageAttachment_DisabledSkips(t *testing.T) {
	t.Setenv(rawConversionEnabledEnv, "false")

	svc := &APIV1Service{}
	att := &store.Attachment{
		Filename: "DSC01234.ARW",
		Type:     "application/octet-stream",
		Blob:     []byte("fake raw bytes"),
	}
	originalBlob := att.Blob

	err := svc.maybeConvertRawImageAttachment(context.Background(), att)
	require.NoError(t, err)
	require.Equal(t, originalBlob, att.Blob, "blob must not be modified when conversion is disabled")
	require.Equal(t, "DSC01234.ARW", att.Filename, "filename must not be modified when conversion is disabled")
}

func TestMaybeConvertRawImageAttachment_NonRawSkips(t *testing.T) {
	t.Setenv(rawConversionEnabledEnv, "true")

	svc := &APIV1Service{}
	att := &store.Attachment{
		Filename: "photo.jpg",
		Type:     "image/jpeg",
		Blob:     []byte("fake jpeg bytes"),
	}
	originalBlob := att.Blob

	err := svc.maybeConvertRawImageAttachment(context.Background(), att)
	require.NoError(t, err)
	require.Equal(t, originalBlob, att.Blob, "blob must not be modified for non-RAW files")
}

func TestMaybeConvertRawImageAttachment_NilAttachmentSkips(t *testing.T) {
	t.Setenv(rawConversionEnabledEnv, "true")

	svc := &APIV1Service{}
	err := svc.maybeConvertRawImageAttachment(context.Background(), nil)
	require.NoError(t, err)
}

// TestConvertRawImageToJPEG_Integration runs only when a real RAW fixture is available.
// To run: set MEMOS_RAW_CONVERTER_TEST_FILE=/path/to/file.arw, ensure imagemagick
// is installed, then go test ./server/router/api/v1/... -run TestConvertRawImageToJPEG.
func TestConvertRawImageToJPEG_Integration(t *testing.T) {

	fixturePath := os.Getenv("MEMOS_RAW_CONVERTER_TEST_FILE")
	if fixturePath == "" {
		t.Skip("MEMOS_RAW_CONVERTER_TEST_FILE is not set, skipping integration test")
	}
	inputBlob, err := os.ReadFile(fixturePath)
	require.NoError(t, err)

	cfg := rawImageConversionConfig{Enabled: true, TimeoutSeconds: 30}
	previewCfg := imageOptimizerConfig{PreviewMaxEdge: 2560, PreviewQuality: 90}

	got, err := convertRawImageToJPEG(context.Background(), inputBlob, filepath.Base(fixturePath), "", cfg, previewCfg)
	require.NoError(t, err)
	require.NotEmpty(t, got)

	_, format, err := image.DecodeConfig(bytes.NewReader(got))
	require.NoError(t, err)
	require.Equal(t, "jpeg", format)
}
func TestRunRawConverterMissingBinaryReportsFailure(t *testing.T) {
	err := runRawConverter(context.Background(), filepath.Join(t.TempDir(), "missing-magick"), []string{"input.raw", "output.jpg"})

	require.Error(t, err)
	require.Contains(t, err.Error(), "RAW image converter failed")
}

func TestRawConverterArguments(t *testing.T) {
	got := rawConverterArguments("input.arw", "output.jpg", imageOptimizerConfig{PreviewMaxEdge: 1280, PreviewQuality: 88})

	require.Equal(t, []string{
		"input.arw",
		"-auto-orient",
		"-resize", "1280x1280>",
		"-quality", "88",
		"output.jpg",
	}, got)
}

func TestValidateConvertedJPEGRejectsInvalidOutput(t *testing.T) {
	err := validateConvertedJPEG([]byte("not a jpeg"))

	require.Error(t, err)
	require.Contains(t, err.Error(), "converter produced invalid image output")
}
