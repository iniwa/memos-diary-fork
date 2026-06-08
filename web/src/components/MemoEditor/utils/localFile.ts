import type { LocalFile } from "../types/attachment";

export async function snapshotFile(file: File): Promise<File> {
  const content = await file.arrayBuffer();
  return new File([content], file.name, {
    type: file.type,
    lastModified: file.lastModified,
  });
}

export async function createLocalFile(file: File, createPreviewUrl: (blob: Blob | File) => string): Promise<LocalFile> {
  const snapshot = await snapshotFile(file);
  return {
    file: snapshot,
    previewUrl: createPreviewUrl(snapshot),
    origin: "upload",
  };
}

export async function createLocalFiles(files: Iterable<File>, createPreviewUrl: (blob: Blob | File) => string): Promise<LocalFile[]> {
  const localFiles: LocalFile[] = [];
  for (const file of files) {
    localFiles.push(await createLocalFile(file, createPreviewUrl));
  }
  return localFiles;
}
