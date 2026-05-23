export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM',
  SAFE_PAYMENT_REQUESTED = 'SAFE_PAYMENT_REQUESTED',
  SAFE_PAYMENT_INSTRUCTION_SENT = 'SAFE_PAYMENT_INSTRUCTION_SENT',
  SAFE_PAYMENT_INITIATED = 'SAFE_PAYMENT_INITIATED',
  SAFE_PAYMENT_VERIFIED = 'SAFE_PAYMENT_VERIFIED',
  PAYMENT_TRANSFERRED = 'PAYMENT_TRANSFERRED',
  DIRECT_TRADE_REQUEST = 'DIRECT_TRADE_REQUEST',
  LOCATION_SHARING_STARTED = 'LOCATION_SHARING_STARTED',
  LOCATION_SHARING_STOPPED = 'LOCATION_SHARING_STOPPED',
  TRANSACTION_COMPLETED = 'TRANSACTION_COMPLETED',
  /** Buyer chose a meeting spot from the listing (product) locations */
  DIRECT_TRADE_LOCATION_ACCEPTED = 'DIRECT_TRADE_LOCATION_ACCEPTED',
  /** Buyer asked for a different meeting place than listing options */
  DIRECT_TRADE_LOCATION_CHANGE_REQUESTED = 'DIRECT_TRADE_LOCATION_CHANGE_REQUESTED',
  /** Seller accepted the buyer's alternate location */
  DIRECT_TRADE_LOCATION_CHANGE_ACCEPTED = 'DIRECT_TRADE_LOCATION_CHANGE_ACCEPTED',
  /** Seller declined the buyer's alternate location */
  DIRECT_TRADE_LOCATION_CHANGE_DENIED = 'DIRECT_TRADE_LOCATION_CHANGE_DENIED',
}

/** Message types clients may send via chat.message.send / POST .../messages */
export const CLIENT_SENDABLE_MESSAGE_TYPES = [
  MessageType.TEXT,
  MessageType.IMAGE,
] as const;

export type ClientSendableMessageType =
  (typeof CLIENT_SENDABLE_MESSAGE_TYPES)[number];

export function isClientSendableMessageType(
  type: MessageType,
): type is ClientSendableMessageType {
  return (CLIENT_SENDABLE_MESSAGE_TYPES as readonly MessageType[]).includes(
    type,
  );
}
