import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { FILE_STORAGE } from '../../../domain/services/file-storage.interface.js';
import type { IFileStorage } from '../../../domain/services/file-storage.interface.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';

type UploadAvatarInput = {
  originalName: string;
  mimeType: string;
  body: Buffer;
};

@Injectable()
export class UploadAvatarUseCase {
  constructor(
    private readonly configService: ConfigService,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: IFileStorage,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string, file: UploadAvatarInput): Promise<string> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!file.body?.length) {
      throw new BadRequestException('File is required');
    }

    const bucket = this.configService.get<string>(
      'SUPABASE_AVATAR_BUCKET',
      'avatars',
    );
    const previousAvatarUrl =
      await this.userRepository.getProfileAvatarUrl(userId);

    const ext = this.extensionFromMime(file.mimeType);
    const objectPath = `users/${userId}/${randomUUID()}${ext}`;

    const { publicUrl } = await this.fileStorage.uploadPublicFile({
      bucket,
      path: objectPath,
      body: file.body,
      contentType: file.mimeType,
    });

    await this.userRepository.setProfileAvatar(userId, publicUrl);

    const oldPath = this.extractOwnedAvatarObjectPath(
      previousAvatarUrl,
      bucket,
      userId,
    );
    if (oldPath && oldPath !== objectPath) {
      await this.fileStorage.removePublicFiles(bucket, [oldPath]);
    }

    return publicUrl;
  }

  /**
   * Supabase public URL: .../object/public/{bucket}/{path}
   * Only returns a path we are willing to delete (under users/{userId}/).
   */
  private extractOwnedAvatarObjectPath(
    publicUrl: string | null,
    bucket: string,
    userId: string,
  ): string | null {
    if (!publicUrl?.trim()) {
      return null;
    }
    const marker = `/object/public/${bucket}/`;
    const i = publicUrl.indexOf(marker);
    if (i === -1) {
      return null;
    }
    const raw = publicUrl.slice(i + marker.length).split('?')[0] ?? '';
    const path = decodeURIComponent(raw);
    const prefix = `users/${userId}/`;
    if (!path.startsWith(prefix) || path.includes('..')) {
      return null;
    }
    return path;
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
