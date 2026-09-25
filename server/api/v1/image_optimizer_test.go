package v1

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/jpeg"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/usememos/memos/internal/profile"
	v1pb "github.com/usememos/memos/proto/gen/api/v1"
	"github.com/usememos/memos/store"
)

func TestOptimizeImageBlobResizesJPEG(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 400, 200))
	for y := 0; y < 200; y++ {
		for x := 0; x < 400; x++ {
			src.Set(x, y, color.RGBA{R: 200, G: 100, B: 50, A: 255})
		}
	}

	var input bytes.Buffer
	require.NoError(t, jpeg.Encode(&input, src, &jpeg.Options{Quality: 95}))

	optimized, err := optimizeImageBlob(input.Bytes(), "image/jpeg", 100, 85)
	require.NoError(t, err)

	config, format, err := image.DecodeConfig(bytes.NewReader(optimized))
	require.NoError(t, err)
	require.Equal(t, "jpeg", format)
	require.Equal(t, 100, config.Width)
	require.Equal(t, 50, config.Height)
}

func TestImageOptimizerConfigFromEnv(t *testing.T) {
	t.Setenv(imageOptimizerEnabledEnv, "true")
	t.Setenv(imageOptimizerKeepOriginalEnv, "false")
	t.Setenv(imageOptimizerPreviewMaxEdgeEnv, "1280")
	t.Setenv(imageOptimizerPreviewQualityEnv, "88")
	t.Setenv(ThumbnailMaxEdgeEnv, "360")
	t.Setenv(ThumbnailJPEGQualityEnv, "72")

	config := imageOptimizerConfigFromEnv()
	require.True(t, config.Enabled)
	require.False(t, config.KeepOriginal)
	require.Equal(t, 1280, config.PreviewMaxEdge)
	require.Equal(t, 88, config.PreviewQuality)
	require.Equal(t, 360, config.ThumbnailMaxEdge)
	require.Equal(t, 72, config.ThumbnailQuality)
}
func TestImageOptimizerConcurrencyDefaultFromEnv(t *testing.T) {
	t.Setenv(imageOptimizerConcurrencyEnv, "")
	require.Equal(t, int64(1), imageOptimizerConcurrencyFromEnv())
}

func TestMaybeOptimizeImageAttachmentFallsBackOnInvalidBlob(t *testing.T) {
	t.Setenv(imageOptimizerEnabledEnv, "true")
	service := &APIV1Service{Profile: &profile.Profile{Data: t.TempDir()}}
	attachment := &store.Attachment{
		UID:      "invalid-image",
		Filename: "broken.jpg",
		Type:     "image/jpeg",
		Size:     10,
		Blob:     []byte("not an image"),
	}

	require.NoError(t, service.maybeOptimizeImageAttachment(context.Background(), attachment))

	require.Equal(t, []byte("not an image"), attachment.Blob)
	require.Equal(t, int64(10), attachment.Size)
	require.Equal(t, "image/jpeg", attachment.Type)
	require.Equal(t, "broken.jpg", attachment.Filename)
	_, err := os.Stat(filepath.Join(service.Profile.Data, ThumbnailCacheFolder, "invalid-image.v2.jpeg"))
	require.True(t, os.IsNotExist(err))
}

func TestMaybeOptimizeImageAttachmentRewritesBlobMetadataAndThumbnail(t *testing.T) {
	t.Setenv(imageOptimizerEnabledEnv, "true")
	t.Setenv(imageOptimizerKeepOriginalEnv, "false")
	t.Setenv(imageOptimizerPreviewMaxEdgeEnv, "100")
	t.Setenv(imageOptimizerPreviewQualityEnv, "85")
	t.Setenv(ThumbnailMaxEdgeEnv, "50")
	t.Setenv(ThumbnailJPEGQualityEnv, "75")

	input := testJPEGBlob(t, 400, 200)
	service := &APIV1Service{Profile: &profile.Profile{Data: t.TempDir()}}
	attachment := &store.Attachment{
		UID:      "optimized-image",
		Filename: "photo.webp",
		Type:     "image/webp",
		Size:     int64(len(input)),
		Blob:     input,
	}

	require.NoError(t, service.maybeOptimizeImageAttachment(context.Background(), attachment))

	require.NotEqual(t, input, attachment.Blob)
	require.Equal(t, int64(len(attachment.Blob)), attachment.Size)
	require.Equal(t, "image/jpeg", attachment.Type)
	require.Equal(t, "photo.jpg", attachment.Filename)
	previewConfig, previewFormat, err := image.DecodeConfig(bytes.NewReader(attachment.Blob))
	require.NoError(t, err)
	require.Equal(t, "jpeg", previewFormat)
	require.Equal(t, 100, previewConfig.Width)
	require.Equal(t, 50, previewConfig.Height)

	thumbnailPath := filepath.Join(service.Profile.Data, ThumbnailCacheFolder, "optimized-image.v2.jpeg")
	thumbnail, err := os.ReadFile(thumbnailPath)
	require.NoError(t, err)
	thumbnailConfig, thumbnailFormat, err := image.DecodeConfig(bytes.NewReader(thumbnail))
	require.NoError(t, err)
	require.Equal(t, "jpeg", thumbnailFormat)
	require.Equal(t, 50, thumbnailConfig.Width)
	require.Equal(t, 25, thumbnailConfig.Height)
}

func TestMaybeOptimizeImageAttachmentReturnsCanceledContext(t *testing.T) {
	t.Setenv(imageOptimizerEnabledEnv, "true")
	service := &APIV1Service{Profile: &profile.Profile{Data: t.TempDir()}}
	attachment := &store.Attachment{
		UID:      "canceled-image",
		Filename: "photo.jpg",
		Type:     "image/jpeg",
		Blob:     testJPEGBlob(t, 10, 10),
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err := service.maybeOptimizeImageAttachment(ctx, attachment)
	require.ErrorIs(t, err, context.Canceled)
	_, statErr := os.Stat(filepath.Join(service.Profile.Data, ThumbnailCacheFolder, "canceled-image.v2.jpeg"))
	require.True(t, os.IsNotExist(statErr))
}

func testJPEGBlob(t *testing.T, width, height int) []byte {
	t.Helper()
	src := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			src.Set(x, y, color.RGBA{R: 200, G: 100, B: 50, A: 255})
		}
	}

	var input bytes.Buffer
	require.NoError(t, jpeg.Encode(&input, src, &jpeg.Options{Quality: 95}))
	return input.Bytes()
}

func TestUploadPipelineOptimizesUnaryAndChunks(t *testing.T) {
	t.Setenv(imageOptimizerEnabledEnv, "true")
	t.Setenv(imageOptimizerKeepOriginalEnv, "false")
	t.Setenv(imageOptimizerPreviewMaxEdgeEnv, "100")
	for _, chunked := range []bool{false, true} {
		t.Run(map[bool]string{false: "unary", true: "chunked"}[chunked], func(t *testing.T) {
			svc, ctx := newUploadTestService(t)
			input := testJPEGBlob(t, 400, 200)
			width, height := int32(400), int32(200)
			metadata := &v1pb.MediaMetadata{Width: &width, Height: &height}
			var attachment *v1pb.Attachment
			if chunked {
				spec := uploadSpec("photo.jpg", int64(len(input)))
				spec.Spec.Attachment.MediaMetadata = metadata
				response, err := svc.UploadAttachment(ctx, &v1pb.UploadAttachmentRequest{Upload: spec, Data: input, FinishWrite: true})
				require.NoError(t, err)
				attachment = response.Attachment
			} else {
				var err error
				attachment, err = svc.CreateAttachment(ctx, &v1pb.CreateAttachmentRequest{Attachment: &v1pb.Attachment{Filename: "photo.jpg", Type: "image/jpeg", Content: input, MediaMetadata: metadata}})
				require.NoError(t, err)
			}
			uid, err := ExtractAttachmentUIDFromName(attachment.Name)
			require.NoError(t, err)
			stored, err := svc.Store.GetAttachment(ctx, &store.FindAttachment{UID: &uid})
			require.NoError(t, err)
			blob, err := svc.GetAttachmentBlob(ctx, stored)
			require.NoError(t, err)
			cfg, _, err := image.DecodeConfig(bytes.NewReader(blob))
			require.NoError(t, err)
			require.Equal(t, 100, cfg.Width)
			require.Equal(t, 50, cfg.Height)
			require.EqualValues(t, len(blob), stored.Size)
			require.EqualValues(t, 100, stored.Payload.GetMediaMetadata().GetWidth())
			require.EqualValues(t, 50, stored.Payload.GetMediaMetadata().GetHeight())
		})
	}
}

func TestCreateAttachmentCanceledContextDoesNotPersist(t *testing.T) {
	svc, ctx := newUploadTestService(t)
	canceled, cancel := context.WithCancel(ctx)
	cancel()
	_, err := svc.CreateAttachment(canceled, &v1pb.CreateAttachmentRequest{Attachment: &v1pb.Attachment{Filename: "canceled.txt", Type: "text/plain", Content: []byte("canceled")}})
	require.Equal(t, codes.Canceled, status.Code(err))
	attachments, err := svc.Store.ListAttachments(ctx, &store.FindAttachment{})
	require.NoError(t, err)
	require.Empty(t, attachments)
}
