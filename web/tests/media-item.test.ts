import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";
import { buildAttachmentVisualItems, countLogicalAttachmentItems, splitVisualAttachments } from "@/utils/media-item";
import {
  AttachmentSchema,
  type Attachment,
  MotionMediaFamily,
  MotionMediaRole,
  MotionMediaSchema,
} from "@/types/proto/api/v1/attachment_service_pb";

const attachment = (overrides: Partial<Attachment>) =>
  create(AttachmentSchema, {
    name: "attachments/default",
    filename: "default.bin",
    type: "application/octet-stream",
    ...overrides,
  });

const appleMotion = (role: MotionMediaRole) =>
  create(MotionMediaSchema, {
    family: MotionMediaFamily.APPLE_LIVE_PHOTO,
    role,
    groupId: "live-1",
    presentationTimestampUs: 0n,
    hasEmbeddedVideo: false,
  });

describe("media attachment visual items", () => {
  it("pairs Apple Live Photo still and video attachments", () => {
    const still = attachment({
      name: "attachments/still",
      filename: "IMG_0001.HEIC",
      type: "image/heic",
      motionMedia: appleMotion(MotionMediaRole.STILL),
    });
    const video = attachment({
      name: "attachments/video",
      filename: "IMG_0001.MOV",
      type: "video/quicktime",
      motionMedia: appleMotion(MotionMediaRole.VIDEO),
    });

    const [item] = buildAttachmentVisualItems([still, video]);

    expect(item.kind).toBe("motion");
    expect(item.id).toBe("live-1");
    expect(item.attachmentNames).toEqual(["attachments/still", "attachments/video"]);
    expect(item.posterUrl).toContain("/file/attachments/still/IMG_0001.HEIC?thumbnail=true");
    expect(item.sourceUrl).toContain("/file/attachments/video/IMG_0001.MOV");
  });

  it("keeps a standalone image inline and leaves non-visual attachments remaining", () => {
    const image = attachment({ name: "attachments/image", filename: "photo.jpg", type: "image/jpeg" });
    const pdf = attachment({ name: "attachments/pdf", filename: "doc.pdf", type: "application/pdf" });

    const result = splitVisualAttachments([image, pdf]);

    expect(result.inlineVisualItems).toHaveLength(1);
    expect(result.inlineVisualItems[0]?.kind).toBe("image");
    expect(result.remainingAttachments.map((item) => item.name)).toEqual(["attachments/pdf"]);
  });

  it("counts a Live Photo pair as one logical item", () => {
    const still = attachment({
      name: "attachments/still",
      filename: "IMG_0001.HEIC",
      type: "image/heic",
      motionMedia: appleMotion(MotionMediaRole.STILL),
    });
    const video = attachment({
      name: "attachments/video",
      filename: "IMG_0001.MOV",
      type: "video/quicktime",
      motionMedia: appleMotion(MotionMediaRole.VIDEO),
    });
    const archive = attachment({ name: "attachments/archive", filename: "archive.zip", type: "application/zip" });

    expect(countLogicalAttachmentItems([still, video, archive])).toBe(2);
  });
});