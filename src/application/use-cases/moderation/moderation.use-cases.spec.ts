import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { RankTier } from '../../../domain/enums/rank-tier.enum.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { ContentReportReason } from '../../../domain/enums/content-report-reason.enum.js';
import { ContentReportStatus } from '../../../domain/enums/content-report-status.enum.js';
import { ContentReportTargetType } from '../../../domain/enums/content-report-target-type.enum.js';
import { CURRENT_TERMS_VERSION } from '../../../domain/constants/terms-of-service.constant.js';
import type { IContentReportRepository } from '../../../domain/repositories/content-report.repository.interface.js';
import type { IModerationSupportRepository } from '../../../domain/repositories/moderation-support.repository.interface.js';
import type { IUserBlockRepository } from '../../../domain/repositories/user-block.repository.interface.js';
import { GetActiveTermsUseCase } from './get-active-terms.use-case.js';
import { AcceptTermsUseCase } from './accept-terms.use-case.js';
import { GetTermsAcceptanceStatusUseCase } from './get-terms-acceptance-status.use-case.js';
import { SubmitContentReportUseCase } from './submit-content-report.use-case.js';
import { ListMyContentReportsUseCase } from './list-my-content-reports.use-case.js';
import { ListContentReportsAdminUseCase } from './list-content-reports-admin.use-case.js';
import { ActionContentReportUseCase } from './action-content-report.use-case.js';
import { DismissContentReportUseCase } from './dismiss-content-report.use-case.js';
import { BlockUserUseCase } from './block-user.use-case.js';
import { UnblockUserUseCase } from './unblock-user.use-case.js';
import { ListBlockedUserIdsUseCase } from './list-blocked-user-ids.use-case.js';
import { ListContentFilterKeywordsUseCase } from './list-content-filter-keywords.use-case.js';
import { AddContentFilterKeywordUseCase } from './add-content-filter-keyword.use-case.js';
import { DeactivateContentFilterKeywordUseCase } from './deactivate-content-filter-keyword.use-case.js';

function buildUser(id: string, admin = false) {
  return new UserEntity({
    id,
    registrationType: RegistrationType.PHONE_ONLY,
    phone: '09123456789',
    email: null,
    password: 'hash',
    nickname: id === 'reporter' ? 'Reporter' : 'User',
    facebookId: null,
    isEmailVerified: true,
    isPhoneVerified: true,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    isActive: true,
    isBanned: false,
    totalPoints: 0,
    currentRank: RankTier.NEWBIE,
    referralCode: id.slice(0, 8).toUpperCase().padEnd(8, 'X'),
    referredById: null,
    adminRoleId: admin ? 'admin-role' : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function buildTerms(version = CURRENT_TERMS_VERSION) {
  return {
    id: 'terms-1',
    version,
    title: 'Terms of Use',
    content: 'Zero tolerance...',
    isActive: true,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildReport(
  overrides: Partial<{
    id: string;
    reporterId: string;
    reportedUserId: string;
    targetType: ContentReportTargetType;
    targetId: string;
    status: ContentReportStatus;
  }> = {},
) {
  return {
    id: overrides.id ?? 'report-1',
    reporterId: overrides.reporterId ?? 'reporter',
    reporterNickname: 'Reporter',
    reportedUserId: overrides.reportedUserId ?? 'bad-user',
    reportedUserNickname: 'Bad',
    targetType: overrides.targetType ?? ContentReportTargetType.LISTING,
    targetId: overrides.targetId ?? 'listing-1',
    reason: ContentReportReason.OBJECTIONABLE_CONTENT,
    details: 'nasty',
    status: overrides.status ?? ContentReportStatus.PENDING,
    adminNote: null,
    reviewedById: null,
    reviewedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildAdminUsersMock() {
  return {
    findById: jest.fn(async (id: string) => {
      if (id === 'admin-1') return buildUser('admin-1', true);
      if (id === 'reporter') return buildUser('reporter');
      if (id === 'bad-user') return buildUser('bad-user');
      return buildUser(id);
    }),
    getAdminRoleByUserId: jest.fn(async () => ({
      id: 'role-1',
      name: 'REPORT_ADMIN',
      isSystem: false,
      permissions: [AdminPermission.MANAGE_REPORTS],
    })),
    setUserBanned: jest.fn(),
    createNotification: jest.fn(),
    findAdminUserIds: jest.fn(async () => ['admin-1']),
  };
}

describe(GetActiveTermsUseCase.name, () => {
  it('seeds and returns active terms', async () => {
    const moderation = {
      ensureActiveTermsSeeded: jest.fn(async () => buildTerms()),
    } as unknown as IModerationSupportRepository;
    const useCase = new GetActiveTermsUseCase(moderation);
    const result = await useCase.execute();
    expect(result.version).toBe(CURRENT_TERMS_VERSION);
    expect(moderation.ensureActiveTermsSeeded).toHaveBeenCalled();
  });
});

describe(AcceptTermsUseCase.name, () => {
  it('accepts matching terms version', async () => {
    const moderation = {
      ensureActiveTermsSeeded: jest.fn(async () => buildTerms()),
      acceptTerms: jest.fn(),
    } as unknown as IModerationSupportRepository;
    const users = {
      findById: jest.fn(async () => buildUser('u1')),
    };
    const useCase = new AcceptTermsUseCase(moderation, users as never);
    const result = await useCase.execute('u1', {
      termsVersion: CURRENT_TERMS_VERSION,
    });
    expect(result.needsAcceptance).toBe(false);
    expect(moderation.acceptTerms).toHaveBeenCalledWith(
      'u1',
      CURRENT_TERMS_VERSION,
    );
  });

  it('rejects wrong terms version', async () => {
    const moderation = {
      ensureActiveTermsSeeded: jest.fn(async () => buildTerms()),
    } as unknown as IModerationSupportRepository;
    const users = {
      findById: jest.fn(async () => buildUser('u1')),
    };
    const useCase = new AcceptTermsUseCase(moderation, users as never);
    await expect(
      useCase.execute('u1', { termsVersion: '0.9' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing user', async () => {
    const moderation = {
      ensureActiveTermsSeeded: jest.fn(async () => buildTerms()),
    } as unknown as IModerationSupportRepository;
    const users = { findById: jest.fn(async () => null) };
    const useCase = new AcceptTermsUseCase(moderation, users as never);
    await expect(
      useCase.execute('missing', { termsVersion: CURRENT_TERMS_VERSION }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe(GetTermsAcceptanceStatusUseCase.name, () => {
  it('needsAcceptance when version mismatches', async () => {
    const moderation = {
      ensureActiveTermsSeeded: jest.fn(async () => buildTerms()),
      getUserTermsState: jest.fn(async () => ({
        termsAcceptedAt: new Date(),
        termsVersion: '0.1',
      })),
    } as unknown as IModerationSupportRepository;
    const useCase = new GetTermsAcceptanceStatusUseCase(moderation);
    const result = await useCase.execute('u1');
    expect(result.needsAcceptance).toBe(true);
  });

  it('needsAcceptance false when versions match', async () => {
    const moderation = {
      ensureActiveTermsSeeded: jest.fn(async () => buildTerms()),
      getUserTermsState: jest.fn(async () => ({
        termsAcceptedAt: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
      })),
    } as unknown as IModerationSupportRepository;
    const useCase = new GetTermsAcceptanceStatusUseCase(moderation);
    const result = await useCase.execute('u1');
    expect(result.needsAcceptance).toBe(false);
  });
});

describe(SubmitContentReportUseCase.name, () => {
  it('resolves owner, creates report, and notifies reporter + admins', async () => {
    const reports = {
      create: jest.fn(async () => buildReport()),
    } as unknown as IContentReportRepository;
    const moderation = {
      resolveContentOwner: jest.fn(async () => ({ ownerUserId: 'bad-user' })),
    } as unknown as IModerationSupportRepository;
    const users = {
      findById: jest.fn(async (id: string) =>
        id === 'reporter' ? buildUser('reporter') : buildUser('bad-user'),
      ),
      findAdminUserIds: jest.fn(async () => ['admin-1']),
      createNotification: jest.fn(),
    };
    const useCase = new SubmitContentReportUseCase(
      reports,
      moderation,
      users as never,
    );
    await useCase.execute('reporter', {
      targetType: ContentReportTargetType.LISTING,
      targetId: 'listing-1',
      reason: ContentReportReason.OBJECTIONABLE_CONTENT,
      details: 'bad content',
    });
    expect(reports.create).toHaveBeenCalled();
    expect(users.createNotification).toHaveBeenCalledTimes(2);
  });

  it('rejects self-report', async () => {
    const reports = {} as unknown as IContentReportRepository;
    const moderation = {
      resolveContentOwner: jest.fn(async () => ({ ownerUserId: 'reporter' })),
    } as unknown as IModerationSupportRepository;
    const users = {
      findById: jest.fn(async () => buildUser('reporter')),
    };
    const useCase = new SubmitContentReportUseCase(
      reports,
      moderation,
      users as never,
    );
    await expect(
      useCase.execute('reporter', {
        targetType: ContentReportTargetType.USER_PROFILE,
        targetId: 'reporter',
        reason: ContentReportReason.HARASSMENT,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing target content', async () => {
    const reports = {} as unknown as IContentReportRepository;
    const moderation = {
      resolveContentOwner: jest.fn(async () => null),
    } as unknown as IModerationSupportRepository;
    const users = {
      findById: jest.fn(async () => buildUser('reporter')),
    };
    const useCase = new SubmitContentReportUseCase(
      reports,
      moderation,
      users as never,
    );
    await expect(
      useCase.execute('reporter', {
        targetType: ContentReportTargetType.LISTING,
        targetId: 'missing',
        reason: ContentReportReason.SPAM,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects reporting an admin account', async () => {
    const reports = {} as unknown as IContentReportRepository;
    const moderation = {
      resolveContentOwner: jest.fn(async () => ({ ownerUserId: 'admin-1' })),
    } as unknown as IModerationSupportRepository;
    const users = {
      findById: jest.fn(async (id: string) =>
        id === 'reporter' ? buildUser('reporter') : buildUser('admin-1', true),
      ),
    };
    const useCase = new SubmitContentReportUseCase(
      reports,
      moderation,
      users as never,
    );
    await expect(
      useCase.execute('reporter', {
        targetType: ContentReportTargetType.USER_PROFILE,
        targetId: 'admin-1',
        reason: ContentReportReason.OTHER,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe(ListMyContentReportsUseCase.name, () => {
  it('returns reporter rows', async () => {
    const reports = {
      listByReporter: jest.fn(async () => [buildReport()]),
    } as unknown as IContentReportRepository;
    const useCase = new ListMyContentReportsUseCase(reports);
    const rows = await useCase.execute('reporter');
    expect(rows).toHaveLength(1);
  });
});

describe(ListContentReportsAdminUseCase.name, () => {
  it('requires MANAGE_REPORTS', async () => {
    const reports = {} as unknown as IContentReportRepository;
    const users = {
      findById: jest.fn(async () => buildUser('user')),
      getAdminRoleByUserId: jest.fn(),
    };
    const useCase = new ListContentReportsAdminUseCase(reports, users as never);
    await expect(useCase.execute('user')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lists for permitted admin', async () => {
    const reports = {
      listAdmin: jest.fn(async () => [buildReport()]),
    } as unknown as IContentReportRepository;
    const users = buildAdminUsersMock();
    const useCase = new ListContentReportsAdminUseCase(reports, users as never);
    const rows = await useCase.execute('admin-1');
    expect(rows).toHaveLength(1);
  });
});

describe(ActionContentReportUseCase.name, () => {
  it('removes listing content and ejects user by default', async () => {
    const reports = {
      findById: jest.fn(async () => buildReport()),
      review: jest.fn(async () =>
        buildReport({ status: ContentReportStatus.ACTIONED }),
      ),
    } as unknown as IContentReportRepository;
    const moderation = {
      softRemoveListing: jest.fn(async () => true),
      hideChatMessage: jest.fn(),
      hideReview: jest.fn(),
    } as unknown as IModerationSupportRepository;
    const users = buildAdminUsersMock();
    const useCase = new ActionContentReportUseCase(
      reports,
      moderation,
      users as never,
    );
    await useCase.execute('admin-1', 'report-1', {});
    expect(moderation.softRemoveListing).toHaveBeenCalledWith('listing-1');
    expect(users.setUserBanned).toHaveBeenCalled();
    expect(users.createNotification).toHaveBeenCalled();
  });

  it('rejects non-pending report', async () => {
    const reports = {
      findById: jest.fn(async () =>
        buildReport({ status: ContentReportStatus.ACTIONED }),
      ),
    } as unknown as IContentReportRepository;
    const moderation = {} as unknown as IModerationSupportRepository;
    const users = buildAdminUsersMock();
    const useCase = new ActionContentReportUseCase(
      reports,
      moderation,
      users as never,
    );
    await expect(
      useCase.execute('admin-1', 'report-1', {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('cannot eject an admin account', async () => {
    const reports = {
      findById: jest.fn(async () =>
        buildReport({ reportedUserId: 'admin-2' }),
      ),
    } as unknown as IContentReportRepository;
    const moderation = {
      softRemoveListing: jest.fn(async () => true),
    } as unknown as IModerationSupportRepository;
    const users = {
      ...buildAdminUsersMock(),
      findById: jest.fn(async (id: string) => {
        if (id === 'admin-1') return buildUser('admin-1', true);
        if (id === 'admin-2') return buildUser('admin-2', true);
        return buildUser(id);
      }),
    };
    const useCase = new ActionContentReportUseCase(
      reports,
      moderation,
      users as never,
    );
    await expect(
      useCase.execute('admin-1', 'report-1', { ejectUser: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('hides chat message when target is CHAT_MESSAGE', async () => {
    const reports = {
      findById: jest.fn(async () =>
        buildReport({
          targetType: ContentReportTargetType.CHAT_MESSAGE,
          targetId: 'msg-1',
        }),
      ),
      review: jest.fn(async () =>
        buildReport({ status: ContentReportStatus.ACTIONED }),
      ),
    } as unknown as IContentReportRepository;
    const moderation = {
      softRemoveListing: jest.fn(),
      hideChatMessage: jest.fn(async () => true),
      hideReview: jest.fn(),
    } as unknown as IModerationSupportRepository;
    const users = buildAdminUsersMock();
    const useCase = new ActionContentReportUseCase(
      reports,
      moderation,
      users as never,
    );
    await useCase.execute('admin-1', 'report-1', { ejectUser: false });
    expect(moderation.hideChatMessage).toHaveBeenCalledWith('msg-1');
    expect(users.setUserBanned).not.toHaveBeenCalled();
  });
});

describe(DismissContentReportUseCase.name, () => {
  it('dismisses pending report and notifies reporter', async () => {
    const reports = {
      findById: jest.fn(async () => buildReport()),
      review: jest.fn(async () =>
        buildReport({ status: ContentReportStatus.DISMISSED }),
      ),
    } as unknown as IContentReportRepository;
    const users = buildAdminUsersMock();
    const useCase = new DismissContentReportUseCase(reports, users as never);
    await useCase.execute('admin-1', 'report-1', {
      reporterMessage: 'No action needed',
    });
    expect(users.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'reporter',
        eventKey: 'CONTENT_REPORT_DISMISSED_CLIENT',
      }),
    );
  });

  it('rejects non-pending dismiss', async () => {
    const reports = {
      findById: jest.fn(async () =>
        buildReport({ status: ContentReportStatus.DISMISSED }),
      ),
    } as unknown as IContentReportRepository;
    const users = buildAdminUsersMock();
    const useCase = new DismissContentReportUseCase(reports, users as never);
    await expect(
      useCase.execute('admin-1', 'report-1', {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe(BlockUserUseCase.name, () => {
  it('creates block and notifies admins', async () => {
    const blocks = {
      findBlock: jest.fn(async () => null),
      create: jest.fn(async () => ({
        id: 'b1',
        blockerId: 'reporter',
        blockedId: 'bad-user',
        blockedNickname: 'Bad',
        blockedReferralCode: 'BADXXXXX',
        reason: 'abuse',
        createdAt: new Date(),
      })),
    } as unknown as IUserBlockRepository;
    const users = {
      findById: jest.fn(async (id: string) =>
        id === 'reporter' ? buildUser('reporter') : buildUser('bad-user'),
      ),
      findAdminUserIds: jest.fn(async () => ['admin-1']),
      createNotification: jest.fn(),
    };
    const useCase = new BlockUserUseCase(blocks, users as never);
    const row = await useCase.execute('reporter', {
      blockedUserId: 'bad-user',
      reason: 'abuse',
    });
    expect(row.blockedUserId).toBe('bad-user');
    expect(users.createNotification).toHaveBeenCalled();
  });

  it('rejects self-block', async () => {
    const useCase = new BlockUserUseCase(
      {} as never,
      { findById: jest.fn() } as never,
    );
    await expect(
      useCase.execute('u1', { blockedUserId: 'u1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects already blocked', async () => {
    const blocks = {
      findBlock: jest.fn(async () => ({
        id: 'b1',
        blockerId: 'reporter',
        blockedId: 'bad-user',
        blockedNickname: 'Bad',
        blockedReferralCode: 'BAD',
        reason: null,
        createdAt: new Date(),
      })),
    } as unknown as IUserBlockRepository;
    const users = {
      findById: jest.fn(async () => buildUser('bad-user')),
    };
    const useCase = new BlockUserUseCase(blocks, users as never);
    await expect(
      useCase.execute('reporter', { blockedUserId: 'bad-user' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects blocking admin', async () => {
    const blocks = {
      findBlock: jest.fn(async () => null),
    } as unknown as IUserBlockRepository;
    const users = {
      findById: jest.fn(async () => buildUser('admin-1', true)),
    };
    const useCase = new BlockUserUseCase(blocks, users as never);
    await expect(
      useCase.execute('reporter', { blockedUserId: 'admin-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe(UnblockUserUseCase.name, () => {
  it('throws when block missing', async () => {
    const blocks = {
      delete: jest.fn(async () => false),
    } as unknown as IUserBlockRepository;
    const useCase = new UnblockUserUseCase(blocks);
    await expect(
      useCase.execute('reporter', 'bad-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe(ListBlockedUserIdsUseCase.name, () => {
  it('returns excluded ids for viewer', async () => {
    const blocks = {
      listExcludedUserIdsForViewer: jest.fn(async () => ['a', 'b']),
    } as unknown as IUserBlockRepository;
    const useCase = new ListBlockedUserIdsUseCase(blocks);
    await expect(useCase.execute('viewer')).resolves.toEqual(['a', 'b']);
  });
});

describe('content filter keyword admin use-cases', () => {
  it('list requires permission then seeds defaults', async () => {
    const moderation = {
      listFilterKeywords: jest.fn(async () => []),
    } as unknown as IModerationSupportRepository;
    const users = buildAdminUsersMock();
    const contentFilter = {
      ensureDefaultsSeeded: jest.fn(async () => undefined),
      invalidate: jest.fn(),
    };
    const useCase = new ListContentFilterKeywordsUseCase(
      moderation,
      users as never,
      contentFilter as never,
    );
    await useCase.execute('admin-1');
    expect(contentFilter.ensureDefaultsSeeded).toHaveBeenCalled();
  });

  it('add invalidates filter cache', async () => {
    const moderation = {
      upsertFilterKeyword: jest.fn(async () => ({
        id: 'k1',
        keyword: 'spam',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    } as unknown as IModerationSupportRepository;
    const users = buildAdminUsersMock();
    const contentFilter = {
      ensureDefaultsSeeded: jest.fn(),
      invalidate: jest.fn(),
    };
    const useCase = new AddContentFilterKeywordUseCase(
      moderation,
      users as never,
      contentFilter as never,
    );
    await useCase.execute('admin-1', { keyword: 'spam' });
    expect(contentFilter.invalidate).toHaveBeenCalled();
  });

  it('deactivate invalidates filter cache', async () => {
    const moderation = {
      deactivateFilterKeyword: jest.fn(async () => true),
    } as unknown as IModerationSupportRepository;
    const users = buildAdminUsersMock();
    const contentFilter = {
      ensureDefaultsSeeded: jest.fn(),
      invalidate: jest.fn(),
    };
    const useCase = new DeactivateContentFilterKeywordUseCase(
      moderation,
      users as never,
      contentFilter as never,
    );
    await useCase.execute('admin-1', 'k1');
    expect(contentFilter.invalidate).toHaveBeenCalled();
  });
});
