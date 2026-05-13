import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  FILE_STORAGE,
  type IFileStorage,
} from '../../../domain/services/file-storage.interface.js';

@Injectable()
export class UploadProductMediaUseCase {
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
