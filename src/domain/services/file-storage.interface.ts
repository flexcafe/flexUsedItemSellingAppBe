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
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');
