export type UploadPublicFileInput = {
  bucket: string;
  path: string;
  body: Buffer;
  contentType: string;
};

export type UploadPublicFileResult = {
  publicUrl: string;
};

export interface IFileStorage {
  uploadPublicFile(
    input: UploadPublicFileInput,
  ): Promise<UploadPublicFileResult>;
  /** Best-effort delete of objects by path within the bucket (no-op if paths empty). */
  removePublicFiles(bucket: string, objectPaths: string[]): Promise<void>;
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');
