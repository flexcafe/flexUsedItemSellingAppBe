import {
  BadRequestException,
  ForbiddenException,
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
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { requireActiveChatUser } from '../chat/_helpers.js';

@Injectable()
export class SetActiveDealUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: IProductRepository,
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(
    sellerId: string,
    listingId: string,
    chatRoomId: string | null,
  ): Promise<void> {
    await requireActiveChatUser(this.users, sellerId);

    const listing = await this.products.findByIdForSeller(listingId, sellerId);
    if (!listing || listing.isDeleted) {
      throw new NotFoundException('Product not found');
    }
    if (listing.status === ListingStatus.SOLD) {
      throw new BadRequestException('Listing is already sold');
    }

    if (!chatRoomId) {
      await this.products.setActiveDealChatRoomId(listingId, sellerId, null);
      return;
    }

    const room = await this.chats.findRoomById(chatRoomId);
    if (!room) {
      throw new NotFoundException('Chat room not found');
    }
    if (room.listingId !== listingId) {
      throw new BadRequestException('Chat room does not match listing');
    }
    if (room.sellerId !== sellerId) {
      throw new ForbiddenException('You can only set deals for your own listing');
    }

    const previousActiveDealChatRoomId =
      await this.products.getActiveDealChatRoomId(listingId);
    await this.products.setActiveDealChatRoomId(listingId, sellerId, chatRoomId);

    if (previousActiveDealChatRoomId === chatRoomId) {
      return;
    }

    await this.users.createNotification({
      userId: room.buyerId,
      eventKey: 'CHAT_ACTIVE_DEAL_SELECTED_BUYER',
      title: 'Seller selected your deal',
      message:
        'The seller selected your chat as the active deal. You can continue with trade steps now.',
      referenceId: listingId,
      metadata: {
        listingId,
        chatRoomId,
        sellerId,
      },
    });

    if (!previousActiveDealChatRoomId) {
      return;
    }

    const previousRoom = await this.chats.findRoomById(previousActiveDealChatRoomId);
    if (
      !previousRoom ||
      previousRoom.listingId !== listingId ||
      previousRoom.sellerId !== sellerId
    ) {
      return;
    }

    await this.users.createNotification({
      userId: previousRoom.buyerId,
      eventKey: 'CHAT_ACTIVE_DEAL_REPLACED_BUYER',
      title: 'Seller selected another buyer',
      message:
        'The seller selected another chat as active deal for this listing.',
      referenceId: listingId,
      metadata: {
        listingId,
        previousChatRoomId: previousActiveDealChatRoomId,
        replacementChatRoomId: chatRoomId,
        sellerId,
      },
    });
  }
}
