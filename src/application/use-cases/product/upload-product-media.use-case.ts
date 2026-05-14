import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  FILE_STORAGE,
  type IFileStorage,
} from '../../../domain/services/file-storage.interface.js';

/** Supabase Storage public URL: .../object/public/{bucket}/{objectPath} */
export function parseSupabasePublicObjectUrl(
  url: string,
): { bucket: string; objectPath: string } | null {
  const clean = url.split('?')[0] ?? url;
  const marker = '/object/public/';
  const i = clean.indexOf(marker);
  if (i === -1) {
    return null;
  }
  const after = clean.slice(i + marker.length);
  const slash = after.indexOf('/');
  if (slash === -1 || slash === 0) {
    return null;
  }
  const bucket = after.slice(0, slash);
  const encodedPath = after.slice(slash + 1);
  if (!bucket || !encodedPath) {
    return null;
  }
  const segments = encodedPath.split('/').map((s) => decodeURIComponent(s));
  const objectPath = segments.join('/');
  return { bucket, objectPath };
}

@Injectable()
export class UploadProductMediaUseCase {
  private readonly logger = new Logger(UploadProductMediaUseCase.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: IFileStorage,
  ) {}

  async uploadListingImages(
    sellerId: string,
    files?: Express.Multer.File[],
  ): Promise<string[]> {
    if (!files?.length) {
      return [];
    }
    const bucket = this.configService.get<string>(
      'SUPABASE_PRODUCT_IMAGE_BUCKET',
      'listing-images',
    );
    const uploads = files.map((file) =>
      this.uploadSingleFile({
        sellerId,
        file,
        bucket,
        folder: 'images',
        errorMsg: 'Unsupported product image type (use PNG, JPEG, or WebP)',
      }),
    );
    return Promise.all(uploads);
  }

  async uploadMapScreenshot(
    sellerId: string,
    file?: Express.Multer.File,
  ): Promise<string | null> {
    if (!file?.buffer?.length) {
      return null;
    }
    const bucket = this.configService.get<string>(
      'SUPABASE_PRODUCT_MAP_BUCKET',
      this.configService.get<string>(
        'SUPABASE_PRODUCT_IMAGE_BUCKET',
        'listing-images',
      ),
    );
    return this.uploadSingleFile({
      sellerId,
      file,
      bucket,
      folder: 'map-screenshots',
      errorMsg: 'Unsupported map screenshot type (use PNG, JPEG, or WebP)',
    });
  }

  /**
   * Best-effort delete of objects we just uploaded, when listing create/update fails.
   * Only pass URLs returned from this use case (Supabase public URLs).
   */
  async revertUploadedPublicUrls(publicUrls: string[]): Promise<void> {
    const byBucket = new Map<string, string[]>();
    for (const url of publicUrls) {
      if (!url?.trim()) {
        continue;
      }
      const parsed = parseSupabasePublicObjectUrl(url.trim());
      if (!parsed) {
        this.logger.warn(`Skip revert: could not parse storage URL: ${url}`);
        continue;
      }
      const list = byBucket.get(parsed.bucket) ?? [];
      list.push(parsed.objectPath);
      byBucket.set(parsed.bucket, list);
    }
    for (const [bucket, paths] of byBucket) {
      if (paths.length === 0) {
        continue;
      }
      await this.fileStorage.removePublicFiles(bucket, paths);
    }
  }

  private async uploadSingleFile(input: {
    sellerId: string;
    file: Express.Multer.File;
    bucket: string;
    folder: string;
    errorMsg: string;
  }): Promise<string> {
    if (!input.file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }

    const ext = this.extensionFromMime(input.file.mimetype, input.errorMsg);
    const objectPath = `listings/${input.sellerId}/${input.folder}/${randomUUID()}${ext}`;
    const { publicUrl } = await this.fileStorage.uploadPublicFile({
      bucket: input.bucket,
      path: objectPath,
      body: input.file.buffer,
      contentType: input.file.mimetype,
    });
    return publicUrl;
  }

  private extensionFromMime(mime: string, errorMsg: string): string {
    switch (mime) {
      case 'image/png':
        return '.png';
      case 'image/jpeg':
        return '.jpg';
      case 'image/webp':
        return '.webp';
      default:
        throw new BadRequestException(errorMsg);
    }
  }
}
