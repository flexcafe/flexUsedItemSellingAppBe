import type { SuggestionStatus } from '../enums/suggestion-status.enum.js';

export interface SuggestionData {
  id: string;
  userId: string;
  userNickname: string;
  userPhone: string;
  nickname: string;
  name: string;
  details: string;
  status: SuggestionStatus;
  pointsAwarded: number;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSuggestionData {
  userId: string;
  nickname: string;
  name: string;
  details: string;
}

export interface RewardSuggestionData {
  suggestionId: string;
  adminId: string;
  points: number;
  adminNote?: string;
}

export interface DismissSuggestionData {
  suggestionId: string;
  adminId: string;
  adminNote?: string;
}

export interface ISuggestionRepository {
  create(data: CreateSuggestionData): Promise<SuggestionData>;
  findById(id: string): Promise<SuggestionData | null>;
  listByUserId(userId: string): Promise<SuggestionData[]>;
  listForAdmin(status?: SuggestionStatus): Promise<SuggestionData[]>;
  rewardWithPoints(data: RewardSuggestionData): Promise<SuggestionData>;
  dismiss(data: DismissSuggestionData): Promise<SuggestionData>;
}

export const SUGGESTION_REPOSITORY = Symbol('SUGGESTION_REPOSITORY');
