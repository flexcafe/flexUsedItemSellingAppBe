import type { ChatMessageData } from '../repositories/chat.repository.interface.js';

export interface IChatMessagePublisher {
  publish(
    chatRoomId: string,
    buyerId: string,
    sellerId: string,
    message: ChatMessageData,
    event?: string,
  ): void;
}

export const CHAT_MESSAGE_PUBLISHER = Symbol('CHAT_MESSAGE_PUBLISHER');
