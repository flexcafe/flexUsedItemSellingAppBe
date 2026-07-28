import { Injectable } from '@nestjs/common';
import PrismaPkg from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import type {
  ContentFilterKeywordData,
  IModerationSupportRepository,
  TermsOfServiceData,
} from '../../domain/repositories/moderation-support.repository.interface.js';

const { ListingStatus: PrismaListingStatus } = PrismaPkg;

@Injectable()
export class ModerationSupportRepository
  implements IModerationSupportRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async getActiveTerms(): Promise<TermsOfServiceData | null> {
    const row = await this.prisma.termsOfService.findFirst({
      where: { isActive: true },
      orderBy: { publishedAt: 'desc' },
    });
    return row ? this.mapTerms(row) : null;
  }

  async ensureActiveTermsSeeded(data: {
    version: string;
    title: string;
    content: string;
  }): Promise<TermsOfServiceData> {
    const existing = await this.prisma.termsOfService.findUnique({
      where: { version: data.version },
    });
    if (existing) {
      if (!existing.isActive) {
        await this.prisma.termsOfService.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
        const activated = await this.prisma.termsOfService.update({
          where: { id: existing.id },
          data: { isActive: true, title: data.title, content: data.content },
        });
        return this.mapTerms(activated);
      }
      return this.mapTerms(existing);
    }

    await this.prisma.termsOfService.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    const created = await this.prisma.termsOfService.create({
      data: {
        version: data.version,
        title: data.title,
        content: data.content,
        isActive: true,
        publishedAt: new Date(),
      },
    });
    return this.mapTerms(created);
  }

  async acceptTerms(userId: string, version: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        termsAcceptedAt: new Date(),
        termsVersion: version,
      },
    });
  }

  async getUserTermsState(
    userId: string,
  ): Promise<{ termsAcceptedAt: Date | null; termsVersion: string | null }> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { termsAcceptedAt: true, termsVersion: true },
    });
    return {
      termsAcceptedAt: row?.termsAcceptedAt ?? null,
      termsVersion: row?.termsVersion ?? null,
    };
  }

  async listActiveFilterKeywords(): Promise<string[]> {
    const rows = await this.prisma.contentFilterKeyword.findMany({
      where: { isActive: true },
      select: { keyword: true },
    });
    return rows.map((r) => r.keyword);
  }

  async listFilterKeywords(): Promise<ContentFilterKeywordData[]> {
    const rows = await this.prisma.contentFilterKeyword.findMany({
      orderBy: { keyword: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      keyword: r.keyword,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async upsertFilterKeyword(keyword: string): Promise<ContentFilterKeywordData> {
    const normalized = keyword.trim().toLowerCase();
    const row = await this.prisma.contentFilterKeyword.upsert({
      where: { keyword: normalized },
      create: { keyword: normalized, isActive: true },
      update: { isActive: true },
    });
    return {
      id: row.id,
      keyword: row.keyword,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async deactivateFilterKeyword(keywordId: string): Promise<boolean> {
    const result = await this.prisma.contentFilterKeyword.updateMany({
      where: { id: keywordId },
      data: { isActive: false },
    });
    return result.count > 0;
  }

  async seedDefaultFilterKeywords(keywords: string[]): Promise<void> {
    for (const keyword of keywords) {
      const normalized = keyword.trim().toLowerCase();
      if (!normalized) continue;
      await this.prisma.contentFilterKeyword.upsert({
        where: { keyword: normalized },
        create: { keyword: normalized, isActive: true },
        update: {},
      });
    }
  }

  async softRemoveListing(listingId: string): Promise<boolean> {
    const result = await this.prisma.listing.updateMany({
      where: { id: listingId, isDeleted: false },
      data: {
        isDeleted: true,
        status: PrismaListingStatus.REMOVED,
      },
    });
    return result.count > 0;
  }

  async hideChatMessage(messageId: string): Promise<boolean> {
    const result = await this.prisma.chatMessage.updateMany({
      where: { id: messageId },
      data: { isHidden: true, content: '[Removed by moderation]' },
    });
    return result.count > 0;
  }

  async hideReview(reviewId: string): Promise<boolean> {
    const result = await this.prisma.review.updateMany({
      where: { id: reviewId },
      data: { isHidden: true, comment: null },
    });
    return result.count > 0;
  }

  async resolveContentOwner(
    targetType: 'LISTING' | 'CHAT_MESSAGE' | 'REVIEW' | 'USER_PROFILE',
    targetId: string,
  ): Promise<{ ownerUserId: string } | null> {
    switch (targetType) {
      case 'LISTING': {
        const listing = await this.prisma.listing.findUnique({
          where: { id: targetId },
          select: { sellerId: true },
        });
        return listing ? { ownerUserId: listing.sellerId } : null;
      }
      case 'CHAT_MESSAGE': {
        const message = await this.prisma.chatMessage.findUnique({
          where: { id: targetId },
          select: { senderId: true },
        });
        return message ? { ownerUserId: message.senderId } : null;
      }
      case 'REVIEW': {
        const review = await this.prisma.review.findUnique({
          where: { id: targetId },
          select: { reviewerId: true },
        });
        return review ? { ownerUserId: review.reviewerId } : null;
      }
      case 'USER_PROFILE': {
        const user = await this.prisma.user.findUnique({
          where: { id: targetId },
          select: { id: true },
        });
        return user ? { ownerUserId: user.id } : null;
      }
      default:
        return null;
    }
  }

  private mapTerms(row: {
    id: string;
    version: string;
    title: string;
    content: string;
    isActive: boolean;
    publishedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): TermsOfServiceData {
    return {
      id: row.id,
      version: row.version,
      title: row.title,
      content: row.content,
      isActive: row.isActive,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
