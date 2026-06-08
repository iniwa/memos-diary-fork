import { describe, expect, it, vi } from "vitest";
import { createLocalFiles, snapshotFile } from "@/components/MemoEditor/utils/localFile";

describe("memo editor local file snapshots", () => {
  it("copies file contents into a new File with the original metadata", async () => {
    const original = new File(["image-bytes"], "photo.jpg", {
      type: "image/jpeg",
      lastModified: 1700000000000,
    });

    const snapshot = await snapshotFile(original);

    expect(snapshot).not.toBe(original);
    expect(snapshot.name).toBe("photo.jpg");
    expect(snapshot.type).toBe("image/jpeg");
    expect(snapshot.lastModified).toBe(1700000000000);
    expect(await snapshot.text()).toBe("image-bytes");
  });

  it("creates previews from the snapshotted File objects", async () => {
    const original = new File(["image-bytes"], "photo.jpg", { type: "image/jpeg" });
    const createPreviewUrl = vi.fn((blob: Blob | File) => `blob:${(blob as File).name}`);

    const [localFile] = await createLocalFiles([original], createPreviewUrl);

    expect(localFile.file).not.toBe(original);
    expect(localFile.file.name).toBe("photo.jpg");
    expect(localFile.previewUrl).toBe("blob:photo.jpg");
    expect(localFile.origin).toBe("upload");
    expect(createPreviewUrl).toHaveBeenCalledWith(localFile.file);
  });
});
