import { BadRequestException } from '@nestjs/common';
import type {
  IChatRepository,
  TransactionData,
} from '../../../domain/repositories/chat.repository.interface.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';
import type { IChatMessagePublisher } from '../../../domain/services/chat-message-publisher.interface.js';

/** Transaction whose completion closes the trade (safe payment if active, else direct trade). */
export async function findAuthoritativeChatTransaction(
  chats: IChatRepository,
  chatRoomId: string,
): Promise<TransactionData | null> {
  const safePayment = await chats.findBlockingSafePaymentForChat(chatRoomId);
  if (safePayment) {
    return safePayment;
  }
  return chats.findTransactionForChat(chatRoomId, TransactionType.DIRECT_TRADE);
}

export function hasUserMarkedTransactionComplete(
  transaction: TransactionData,
  userId: string,
): boolean {
  if (transaction.buyerId === userId) {
    return transaction.buyerCompleted;
  }
  if (transaction.sellerId === userId) {
    return transaction.sellerCompleted;
  }
  return false;
}

/** Blocks start/update for users who already tapped Transaction Complete. */
export async function assertUserCanStartOrUpdateLiveLocation(
  chats: IChatRepository,
  chatRoomId: string,
  userId: string,
): Promise<void> {
  const authoritative = await findAuthoritativeChatTransaction(
    chats,
    chatRoomId,
  );
  if (!authoritative) {
    return;
  }
  if (
    authoritative.status === TransactionStatus.COMPLETED ||
    authoritative.status === TransactionStatus.CANCELLED ||
    authoritative.status === TransactionStatus.REFUNDED
  ) {
    throw new BadRequestException(
      'Transaction is closed; live location sharing is no longer available',
    );
  }
  if (hasUserMarkedTransactionComplete(authoritative, userId)) {
    throw new BadRequestException(
      'You marked the transaction as completed; live location sharing is closed for you',
    );
  }
}

/** Stops GPS for the user who just completed (direct trade row must exist). */
export async function stopLiveLocationShareForCompletingUser(
  chats: IChatRepository,
  publisher: IChatMessagePublisher,
  transaction: TransactionData,
  userId: string,
): Promise<void> {
  const directTradeTxn = await chats.findTransactionForChat(
    transaction.chatRoomId,
    TransactionType.DIRECT_TRADE,
  );
  if (!directTradeTxn) {
    return;
  }
  const directTradeId = await chats.findDirectTradeIdByTransactionId(
    directTradeTxn.id,
  );
  if (!directTradeId) {
    return;
  }

  const stoppedCount = await chats.stopLocationShare(directTradeId, userId);
  if (stoppedCount === 0) {
    return;
  }

  const locationMessage = await chats.createMessage({
    chatRoomId: transaction.chatRoomId,
    senderId: userId,
    type: MessageType.LOCATION_SHARING_STOPPED,
    content:
      'Location sharing stopped because you marked the transaction as completed.',
    metadata: {
      transactionId: transaction.id,
      reason: 'transaction_completed_by_self',
    },
  });
  publisher.publish(
    transaction.chatRoomId,
    transaction.buyerId,
    transaction.sellerId,
    locationMessage,
    'chat.location.stopped',
  );
}
