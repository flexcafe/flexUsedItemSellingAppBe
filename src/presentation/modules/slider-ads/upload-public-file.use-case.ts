import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { FILE_STORAGE } from '../../../domain/services/file-storage.interface.js';
import type { IFileStorage } from '../../../domain/services/file-storage.interface.js';

@Injectable()
export class UploadPublicFileUseCase {
  constructor(
    private readonly configService: ConfigService,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: IFileStorage,
  ) {}

  async uploadSliderAdImage(
    adminUserId: string,
    file?: Express.Multer.File,
  ): Promise<string> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }
    const ext = this.extensionFromMime(file.mimetype);
    const bucket = this.configService.get<string>(
      'SUPABASE_SLIDER_AD_BUCKET',
      'slider-ads',
    );
    const objectPath = `slider-ads/${adminUserId}/${randomUUID()}${ext}`;
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
      default:
        throw new BadRequestException('Unsupported image type');
    }
  }
}
