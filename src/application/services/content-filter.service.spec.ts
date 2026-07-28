import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { ContentFilterService } from './content-filter.service.js';
import type { IModerationSupportRepository } from '../../domain/repositories/moderation-support.repository.interface.js';

describe(ContentFilterService.name, () => {
  function buildService(keywords: string[] = ['kys', 'spam']) {
    const moderation = {
      listActiveFilterKeywords: jest.fn(async () => keywords),
      seedDefaultFilterKeywords: jest.fn(async () => undefined),
    } as unknown as IModerationSupportRepository;
    return {
      service: new ContentFilterService(moderation),
      moderation,
    };
  }

  it('allows clean text', async () => {
    const { service } = buildService();
    await expect(service.assertClean('Nice phone for sale')).resolves.toBeUndefined();
  });

  it('blocks keyword hits case-insensitively', async () => {
    const { service } = buildService(['spam']);
    await expect(service.assertClean('This is SPAM')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('skips matching when only empty/null texts are provided', async () => {
    const { service } = buildService(['spam']);
    await expect(
      service.assertClean(null, undefined, '   '),
    ).resolves.toBeUndefined();
  });

  it('caches keywords within TTL', async () => {
    const { service, moderation } = buildService(['spam']);
    await service.assertClean('ok');
    await service.assertClean('still ok');
    expect(moderation.listActiveFilterKeywords).toHaveBeenCalledTimes(1);
  });

  it('reloads keywords after invalidate', async () => {
    const { service, moderation } = buildService(['spam']);
    await service.assertClean('ok');
    service.invalidate();
    await service.assertClean('ok again');
    expect(moderation.listActiveFilterKeywords).toHaveBeenCalledTimes(2);
  });

  it('ensureDefaultsSeeded seeds keywords and invalidates cache', async () => {
    const { service, moderation } = buildService();
    await service.ensureDefaultsSeeded();
    expect(moderation.seedDefaultFilterKeywords).toHaveBeenCalled();
  });
});
