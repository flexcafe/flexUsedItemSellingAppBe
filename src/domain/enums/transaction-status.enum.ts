export enum TransactionStatus {
  INITIATED = 'INITIATED',
  SAFE_PAYMENT_AWAITING_INSTRUCTION = 'SAFE_PAYMENT_AWAITING_INSTRUCTION',
  SAFE_PAYMENT_INSTRUCTION_SENT = 'SAFE_PAYMENT_INSTRUCTION_SENT',
  SAFE_PAYMENT_PENDING = 'SAFE_PAYMENT_PENDING',
  SAFE_PAYMENT_RECEIVED = 'SAFE_PAYMENT_RECEIVED',
  BUYER_COMPLETED = 'BUYER_COMPLETED',
  SELLER_COMPLETED = 'SELLER_COMPLETED',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/** Terminal — row is closed; do not attach new direct-trade / location actions. */
export const TERMINAL_CHAT_TRANSACTION_STATUSES: readonly TransactionStatus[] =
  [
    TransactionStatus.COMPLETED,
    TransactionStatus.CANCELLED,
    TransactionStatus.REFUNDED,
  ];

export function isTerminalChatTransactionStatus(
  status: TransactionStatus,
): boolean {
  return TERMINAL_CHAT_TRANSACTION_STATUSES.includes(status);
}
