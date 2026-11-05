import type { LocalFile } from "../types/attachment";

export async function snapshotFile(file: File): Promise<{ file: File; content: Uint8Array }> {
  const content = new Uint8Array(await file.arrayBuffer());
  const snapshot = new File([content], file.name, {
    type: file.type,
    lastModified: file.lastModified,
  });
  return { file: snapshot, content };
}

export async function createLocalFile(file: File, createPreviewUrl: (blob: Blob | File) => string): Promise<LocalFile> {
  const snapshot = await snapshotFile(file);
  return {
    file: snapshot.file,
    content: snapshot.content,
    previewUrl: createPreviewUrl(snapshot.file),
    origin: "upload",
  };
}

export async function createLocalFiles(files: Iterable<File>, createPreviewUrl: (blob: Blob | File) => string): Promise<LocalFile[]> {
  const localFiles: LocalFile[] = [];
  for (const [index, file] of Array.from(files).entries()) {
    try {
      localFiles.push(await createLocalFile(file, createPreviewUrl));
    } catch (error) {
      throw new Error(`Failed to read selected file ${index + 1} (${file.name})`, { cause: error });
    }
  }
  return localFiles;
}
