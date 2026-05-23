import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../../domain/repositories/product.repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import type { OpenChatRoomDto } from '../../dtos/chat/chat.dto.js';
import { requireActiveChatUser } from './_helpers.js';

@Injectable()
export class OpenChatRoomUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: IProductRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(userId: string, dto: OpenChatRoomDto) {
    const listing = await this.products.findById(dto.listingId);
    if (!listing || listing.isDeleted) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.sellerId !== dto.sellerId) {
      throw new BadRequestException('Seller does not own this listing');
    }
    if (listing.sellerId === userId) {
      throw new BadRequestException('Seller cannot open chat as buyer');
    }
    if (!listing.canAcceptNewBuyerChat()) {
      throw new BadRequestException(
        'Chat is not available for this listing status',
      );
    }

    await requireActiveChatUser(this.users, userId);
    await requireActiveChatUser(this.users, dto.sellerId);

    return this.chats.getOrCreateRoom(
      {
        listingId: dto.listingId,
        buyerId: userId,
        sellerId: dto.sellerId,
      },
      userId,
    );
  }
}
