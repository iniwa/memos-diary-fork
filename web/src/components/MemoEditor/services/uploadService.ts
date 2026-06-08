import { create } from "@bufbuild/protobuf";
import { attachmentServiceClient } from "@/connect";
import type { Attachment } from "@/types/proto/api/v1/attachment_service_pb";
import { AttachmentSchema, MotionMediaSchema } from "@/types/proto/api/v1/attachment_service_pb";
import type { LocalFile } from "../types/attachment";

export const uploadService = {
  async uploadFiles(localFiles: LocalFile[]): Promise<Attachment[]> {
    if (localFiles.length === 0) return [];

    const attachments: Attachment[] = [];

    for (const [index, localFile] of localFiles.entries()) {
      const { file, motionMedia } = localFile;
      try {
        const buffer = localFile.content ?? new Uint8Array(await file.arrayBuffer());
        const attachment = await attachmentServiceClient.createAttachment({
          attachment: create(AttachmentSchema, {
            filename: file.name,
            size: BigInt(file.size),
            type: file.type,
            content: buffer,
            motionMedia: motionMedia ? create(MotionMediaSchema, motionMedia) : undefined,
          }),
        });
        attachments.push(attachment);
      } catch (error) {
        throw new Error(`Failed to upload attachment ${index + 1}/${localFiles.length} (${file.name})`, { cause: error });
      }
    }

    return attachments;
  },
};
