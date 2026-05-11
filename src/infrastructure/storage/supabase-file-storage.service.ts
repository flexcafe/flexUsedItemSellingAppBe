import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import type {
  IFileStorage,
  UploadPublicFileInput,
  UploadPublicFileResult,
} from '../../domain/services/file-storage.interface.js';

@Injectable()
export class SupabaseFileStorageService implements IFileStorage {
  private readonly logger = new Logger(SupabaseFileStorageService.name);

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
      this.logger.error(
        `Supabase storage upload failed bucket=${input.bucket} path=${input.path}: ${error.message}`,
      );
      const msg = (error.message ?? '').toLowerCase();
      const credentialHint =
        msg.includes('signature verification') || msg.includes('invalid jwt')
          ? ' Fix: set SUPABASE_SERVICE_KEY to the service_role secret (Project Settings → API), not the anon key; SUPABASE_URL must be the same project URL.'
          : '';
      throw new BadGatewayException(
        `Supabase upload failed: ${error.message}.${credentialHint}`,
      );
    }

    const { data } = bucket.getPublicUrl(input.path);
    if (!data?.publicUrl) {
      throw new BadGatewayException('Supabase public URL generation failed');
    }

    return { publicUrl: data.publicUrl };
  }

  async removePublicFiles(
    bucket: string,
    objectPaths: string[],
  ): Promise<void> {
    const paths = objectPaths.filter((p) => p.length > 0);
    if (paths.length === 0) {
      return;
    }
    const client = this.supabase.getClient();
    const { error } = await client.storage.from(bucket).remove(paths);
    if (error) {
      this.logger.warn(
        `Supabase storage remove failed bucket=${bucket} paths=${paths.join(',')}: ${error.message}`,
      );
    }
  }
}
