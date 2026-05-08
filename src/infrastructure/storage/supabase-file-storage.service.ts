import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import type {
  IFileStorage,
  UploadPublicFileInput,
  UploadPublicFileResult,
} from '../../domain/services/file-storage.interface.js';

@Injectable()
export class SupabaseFileStorageService implements IFileStorage {
  constructor(private readonly supabase: SupabaseService) {}

  async uploadPublicFile(
    input: UploadPublicFileInput,
  ): Promise<UploadPublicFileResult> {
    const client = this.supabase.getClient();
    const bucket = client.storage.from(input.bucket);

    const { error } = await bucket.upload(input.path, input.body, {
      contentType: input.contentType,
      upsert: true,
    });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data } = bucket.getPublicUrl(input.path);
    if (!data?.publicUrl) {
      throw new Error('Supabase public URL generation failed');
    }

    return { publicUrl: data.publicUrl };
  }
}
