import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  MODERATION_SUPPORT_REPOSITORY,
  type IModerationSupportRepository,
} from '../../domain/repositories/moderation-support.repository.interface.js';

const DEFAULT_KEYWORDS = [
  'nigger',
  'faggot',
  'kill yourself',
  'kys',
  'rape',
  'child porn',
  'childporn',
  'csam',
  'terrorist attack',
];

@Injectable()
export class ContentFilterService {
  private cache: string[] | null = null;
  private cacheAt = 0;
  private readonly ttlMs = 60_000;

  constructor(
    @Inject(MODERATION_SUPPORT_REPOSITORY)
    private readonly moderation: IModerationSupportRepository,
  ) {}

  async ensureDefaultsSeeded(): Promise<void> {
    await this.moderation.seedDefaultFilterKeywords(DEFAULT_KEYWORDS);
    this.invalidate();
  }

  invalidate(): void {
    this.cache = null;
    this.cacheAt = 0;
  }

  async assertClean(...texts: Array<string | null | undefined>): Promise<void> {
    const keywords = await this.getActiveKeywords();
    if (keywords.length === 0) return;

    const haystack = texts
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .join('\n')
      .toLowerCase();

    if (!haystack) return;

    for (const keyword of keywords) {
      if (haystack.includes(keyword)) {
        throw new BadRequestException(
          'Your content was blocked because it appears to contain objectionable material. Please revise and try again.',
        );
      }
    }
  }

  private async getActiveKeywords(): Promise<string[]> {
    const now = Date.now();
    if (this.cache && now - this.cacheAt < this.ttlMs) {
      return this.cache;
    }
    const keywords = await this.moderation.listActiveFilterKeywords();
    this.cache = keywords.map((k) => k.toLowerCase());
    this.cacheAt = now;
    return this.cache;
  }
}
