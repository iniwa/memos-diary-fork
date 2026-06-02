package v1

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"testing"

	"github.com/stretchr/testify/require"
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
