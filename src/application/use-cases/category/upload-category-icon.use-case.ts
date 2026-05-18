import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  FILE_STORAGE,
  type IFileStorage,
} from '../../../domain/services/file-storage.interface.js';

export type CategoryIconUploadFile = {
  buffer: Buffer;
  mimetype: string;
};

@Injectable()
export class UploadCategoryIconUseCase {
  constructor(
    private readonly configService: ConfigService,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: IFileStorage,
  ) {}

  /**
   * Uploads icon to Supabase public bucket. Returns public URL, or null if no file.
   */
  async execute(
    adminUserId: string,
    file?: CategoryIconUploadFile | null,
  ): Promise<string | null> {
    if (!file?.buffer?.length) {
      return null;
    }
    const ext = this.extensionFromMime(file.mimetype);
    const bucket = this.configService.get<string>(
      'SUPABASE_CATEGORY_ICON_BUCKET',
      'category-icons',
    );
    const objectPath = `category-icons/${adminUserId}/${randomUUID()}${ext}`;
    const { publicUrl } = await this.fileStorage.uploadPublicFile({
      bucket,
      path: objectPath,
      body: file.buffer,
      contentType: file.mimetype,
    });
    return publicUrl;
  }

  private extensionFromMime(mime: string): string {
    switch (mime) {
      case 'image/png':
        return '.png';
      case 'image/jpeg':
        return '.jpg';
      case 'image/webp':
        return '.webp';
      case 'image/svg+xml':
        return '.svg';
      default:
        throw new BadRequestException(
          'Unsupported icon type (use PNG, JPEG, WebP, or SVG)',
        );
    }
  }
}
