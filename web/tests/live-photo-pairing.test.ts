import { describe, expect, it } from "vitest";
import { pairAppleLivePhotoFiles } from "@/components/MemoEditor/hooks/useFileUpload";
import type { LocalFile } from "@/components/MemoEditor/types/attachment";
import { MotionMediaFamily, MotionMediaRole } from "@/types/proto/api/v1/attachment_service_pb";

const localFile = (name: string, type: string, previewUrl: string): LocalFile => ({
  file: new File(["content"], name, { type }),
  content: new Uint8Array([1]),
  previewUrl,
  origin: "upload",
});

describe("Apple Live Photo local file pairing", () => {
  it("pairs image and video files with the same filename stem", () => {
    const [still, video] = pairAppleLivePhotoFiles([
      localFile("IMG_0001.HEIC", "image/heic", "blob:still"),
      localFile("IMG_0001.MOV", "video/quicktime", "blob:video"),
    ]);

    expect(still.motionMedia).toMatchObject({
      family: MotionMediaFamily.APPLE_LIVE_PHOTO,
      role: MotionMediaRole.STILL,
      groupId: expect.stringMatching(/^img_0001-/),
    });
    expect(video.motionMedia).toMatchObject({
      family: MotionMediaFamily.APPLE_LIVE_PHOTO,
      role: MotionMediaRole.VIDEO,
      groupId: still.motionMedia?.groupId,
    });
  });

  it("does not pair unsupported MIME combinations", () => {
    const [first, second] = pairAppleLivePhotoFiles([
      localFile("IMG_0001.HEIC", "image/heic", "blob:still"),
      localFile("IMG_0001.TXT", "text/plain", "blob:text"),
    ]);

    expect(first.motionMedia).toBeUndefined();
    expect(second.motionMedia).toBeUndefined();
  });
});
