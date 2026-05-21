import { jest } from '@jest/globals';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SubmitSuggestionUseCase } from './submit-suggestion.use-case.js';
import { RewardSuggestionUseCase } from './reward-suggestion.use-case.js';
import { DismissSuggestionUseCase } from './dismiss-suggestion.use-case.js';
import { ListSuggestionsAdminUseCase } from './list-suggestions-admin.use-case.js';
import { SuggestionStatus } from '../../../domain/enums/suggestion-status.enum.js';
import type {
  ISuggestionRepository,
  SuggestionData,
} from '../../../domain/repositories/suggestion.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';

const USER_ID = '22222222-2222-2222-2222-222222222222';
const ADMIN_ID = '33333333-3333-3333-3333-333333333333';
const SUGGESTION_ID = '44444444-4444-4444-4444-444444444444';

function buildSuggestion(
  overrides: Partial<SuggestionData> = {},
): SuggestionData {
  return {
    id: SUGGESTION_ID,
    userId: USER_ID,
    userNickname: 'buyer_nick',
    userPhone: '09123456789',
    nickname: 'Ko Ko',
    name: 'Aung Aung',
    details: 'Add dark mode',
    status: SuggestionStatus.PENDING,
    pointsAwarded: 0,
    adminNote: null,
    reviewedById: null,
    reviewedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  };
}

function buildSuggestionRepoMock(): jest.Mocked<ISuggestionRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    listByUserId: jest.fn(),
    listForAdmin: jest.fn(),
    rewardWithPoints: jest.fn(),
    dismiss: jest.fn(),
  };
}

function buildUserRepoMock(): jest.Mocked<
  Pick<
    IUserRepository,
    'findById' | 'createNotification' | 'findAdminUserIds'
  >
> {
  return {
    findById: jest.fn(),
    createNotification: jest.fn(),
    findAdminUserIds: jest.fn(() => Promise.resolve([ADMIN_ID])),
  };
}

describe(SubmitSuggestionUseCase.name, () => {
  it('creates suggestion and notifies user and admins', async () => {
    const suggestions = buildSuggestionRepoMock();
    const users = buildUserRepoMock();
    const row = buildSuggestion();
    suggestions.create.mockResolvedValue(row);
    users.findById.mockResolvedValue({ id: USER_ID } as never);

    const useCase = new SubmitSuggestionUseCase(suggestions, users as never);
    const result = await useCase.execute(USER_ID, {
      nickname: 'Ko Ko',
      name: 'Aung Aung',
      details: 'Add dark mode',
    });

    expect(result.id).toBe(SUGGESTION_ID);
    expect(suggestions.create).toHaveBeenCalled();
    expect(users.createNotification).toHaveBeenCalledTimes(2);
  });

  it('rejects when user does not exist', async () => {
    const suggestions = buildSuggestionRepoMock();
    const users = buildUserRepoMock();
    users.findById.mockResolvedValue(null);

    const useCase = new SubmitSuggestionUseCase(suggestions, users as never);

    await expect(
      useCase.execute(USER_ID, {
        nickname: 'Ko Ko',
        name: 'Aung',
        details: 'x',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe(RewardSuggestionUseCase.name, () => {
  it('rewards points and notifies the submitter', async () => {
    const suggestions = buildSuggestionRepoMock();
    const users = buildUserRepoMock();
    users.findById.mockResolvedValue({ isAdmin: () => true } as never);
    suggestions.rewardWithPoints.mockResolvedValue(
      buildSuggestion({
        status: SuggestionStatus.REWARDED,
        pointsAwarded: 25,
      }),
    );

    const useCase = new RewardSuggestionUseCase(suggestions, users as never);
    const result = await useCase.execute(ADMIN_ID, SUGGESTION_ID, {
      points: 25,
      adminNote: 'Shipped',
    });

    expect(result.pointsAwarded).toBe(25);
    expect(users.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        eventKey: 'SUGGESTION_REWARDED_CLIENT',
      }),
    );
  });

  it('rejects non-admin', async () => {
    const suggestions = buildSuggestionRepoMock();
    const users = buildUserRepoMock();
    users.findById.mockResolvedValue({ isAdmin: () => false } as never);

    const useCase = new RewardSuggestionUseCase(suggestions, users as never);

    await expect(
      useCase.execute(USER_ID, SUGGESTION_ID, { points: 10 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe(DismissSuggestionUseCase.name, () => {
  it('dismisses and notifies the submitter', async () => {
    const suggestions = buildSuggestionRepoMock();
    const users = buildUserRepoMock();
    users.findById.mockResolvedValue({ isAdmin: () => true } as never);
    suggestions.dismiss.mockResolvedValue(
      buildSuggestion({ status: SuggestionStatus.DISMISSED }),
    );

    const useCase = new DismissSuggestionUseCase(suggestions, users as never);
    await useCase.execute(ADMIN_ID, SUGGESTION_ID, { adminNote: 'Duplicate' });

    expect(users.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        eventKey: 'SUGGESTION_DISMISSED_CLIENT',
      }),
    );
  });
});

describe(ListSuggestionsAdminUseCase.name, () => {
  it('lists pending suggestions for admin', async () => {
    const suggestions = buildSuggestionRepoMock();
    const users = buildUserRepoMock();
    users.findById.mockResolvedValue({ isAdmin: () => true } as never);
    suggestions.listForAdmin.mockResolvedValue([buildSuggestion()]);

    const useCase = new ListSuggestionsAdminUseCase(suggestions, users as never);
    const rows = await useCase.execute(ADMIN_ID, SuggestionStatus.PENDING);

    expect(rows).toHaveLength(1);
    expect(suggestions.listForAdmin).toHaveBeenCalledWith(
      SuggestionStatus.PENDING,
    );
  });
});
