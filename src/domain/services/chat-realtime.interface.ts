export interface IChatRealtime {
  emitToChatRoom(chatRoomId: string, event: string, payload: unknown): void;
  emitToUser(userId: string, event: string, payload: unknown): void;
}

export const CHAT_REALTIME = Symbol('CHAT_REALTIME');
