export interface TermsOfServiceData {
  id: string;
  version: string;
  title: string;
  content: string;
  isActive: boolean;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentFilterKeywordData {
  id: string;
  keyword: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IModerationSupportRepository {
  getActiveTerms(): Promise<TermsOfServiceData | null>;
  ensureActiveTermsSeeded(data: {
    version: string;
    title: string;
    content: string;
  }): Promise<TermsOfServiceData>;
  acceptTerms(userId: string, version: string): Promise<void>;
  getUserTermsState(
    userId: string,
  ): Promise<{ termsAcceptedAt: Date | null; termsVersion: string | null }>;

  listActiveFilterKeywords(): Promise<string[]>;
  listFilterKeywords(): Promise<ContentFilterKeywordData[]>;
  upsertFilterKeyword(keyword: string): Promise<ContentFilterKeywordData>;
  deactivateFilterKeyword(keywordId: string): Promise<boolean>;
  seedDefaultFilterKeywords(keywords: string[]): Promise<void>;

  softRemoveListing(listingId: string): Promise<boolean>;
  hideChatMessage(messageId: string): Promise<boolean>;
  hideReview(reviewId: string): Promise<boolean>;
  resolveContentOwner(
    targetType: 'LISTING' | 'CHAT_MESSAGE' | 'REVIEW' | 'USER_PROFILE',
    targetId: string,
  ): Promise<{ ownerUserId: string } | null>;
}

export const MODERATION_SUPPORT_REPOSITORY = Symbol(
  'MODERATION_SUPPORT_REPOSITORY',
);
