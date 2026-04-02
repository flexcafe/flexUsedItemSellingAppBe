import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

type SupabaseInstance = ReturnType<typeof createClient>;

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseInstance;

  constructor(private readonly configService: ConfigService) {
    this.client = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_KEY'),
    );
  }

  getClient(): SupabaseInstance {
    return this.client;
  }

  get storage() {
    return this.client.storage;
  }
}
