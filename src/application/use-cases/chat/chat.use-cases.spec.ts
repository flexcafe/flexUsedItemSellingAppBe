import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OpenChatRoomUseCase } from './open-chat-room.use-case.js';
import { ListChatRoomsUseCase } from './list-chat-rooms.use-case.js';
import { ListChatMessagesUseCase } from './list-chat-messages.use-case.js';
import { SendChatMessageUseCase } from './send-chat-message.use-case.js';
import { MarkChatRoomReadUseCase } from './mark-chat-room-read.use-case.js';
import { GetChatSafePaymentStatusUseCase } from './get-chat-safe-payment-status.use-case.js';
import { RequestChatSafePaymentUseCase } from './request-chat-safe-payment.use-case.js';
import { SubmitChatSafePaymentUseCase } from './submit-chat-safe-payment.use-case.js';
import { CompleteChatTransactionUseCase } from './complete-chat-transaction.use-case.js';
import { AdminMarkSafePaymentTransferredUseCase } from './admin-mark-safe-payment-transferred.use-case.js';
import { AdminSendSafePaymentInstructionUseCase } from './admin-send-safe-payment-instruction.use-case.js';
import { AdminMarkSafePaymentReceivedUseCase } from './admin-mark-safe-payment-received.use-case.js';
import { StartDirectTradeUseCase } from './start-direct-trade.use-case.js';
import { SubmitChatReviewAfterCompletionUseCase } from './submit-chat-review-after-completion.use-case.js';
import { CreateTransactionReviewUseCase } from '../points/create-transaction-review.use-case.js';
import { MessageType } from '../../../domain/enums/message-type.enum.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.enum.js';
import { TransactionType } from '../../../domain/enums/transaction-type.enum.js';
import {
  buildChatMessage,
  buildChatRepoMock,
  buildChatRoom,
  buildIdempotencyMock,
  buildProductRepoMock,
  buildPublisherMock,
  buildRealtimeMock,
  buildTransaction,
  buildUserRepoMock,
  BUYER_ID,
  LISTING_ID,
  ROOM_ID,
  SELLER_ID,
  TX_ID,
} from './_chat-test-mocks.js';

describe(OpenChatRoomUseCase.name, () => {
  it('rejects when listing is missing', async () => {
    const products = buildProductRepoMock();
    products.findById.mockResolvedValue(null);
    const useCase = new OpenChatRoomUseCase(
      buildChatRepoMock(),
      products,
      buildUserRepoMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, {
        listingId: LISTING_ID,
        sellerId: SELLER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects when seller tries to open chat as buyer', async () => {
    const products = buildProductRepoMock();
    products.findById.mockResolvedValue({
      sellerId: SELLER_ID,
      isDeleted: false,
    } as never);
    const useCase = new OpenChatRoomUseCase(
      buildChatRepoMock(),
      products,
      buildUserRepoMock(),
    );

    await expect(
      useCase.execute(SELLER_ID, {
        listingId: LISTING_ID,
        sellerId: SELLER_ID,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when requested seller does not own listing', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    products.findById.mockResolvedValue({
      sellerId: '77777777-7777-7777-7777-777777777777',
      isDeleted: false,
    } as never);
    const useCase = new OpenChatRoomUseCase(chats, products, buildUserRepoMock());

    await expect(
      useCase.execute(BUYER_ID, {
        listingId: LISTING_ID,
        sellerId: SELLER_ID,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chats.getOrCreateRoom).not.toHaveBeenCalled();
  });

  it('rejects when buyer or seller account is missing', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    const users = buildUserRepoMock();
    products.findById.mockResolvedValue({
      sellerId: SELLER_ID,
      isDeleted: false,
    } as never);
    users.findById.mockImplementation(async (id: string) =>
      id === BUYER_ID ? null : ({ id } as never),
    );
    const useCase = new OpenChatRoomUseCase(chats, products, users);

    await expect(
      useCase.execute(BUYER_ID, {
        listingId: LISTING_ID,
        sellerId: SELLER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(chats.getOrCreateRoom).not.toHaveBeenCalled();
  });

  it('creates room for valid buyer', async () => {
    const chats = buildChatRepoMock();
    const products = buildProductRepoMock();
    const users = buildUserRepoMock();
    const room = buildChatRoom();

    products.findById.mockResolvedValue({
      sellerId: SELLER_ID,
      isDeleted: false,
    } as never);
    users.findById.mockImplementation(async (id: string) => ({ id }) as never);
    chats.getOrCreateRoom.mockResolvedValue(room);

    const useCase = new OpenChatRoomUseCase(chats, products, users);
    const result = await useCase.execute(BUYER_ID, {
      listingId: LISTING_ID,
      sellerId: SELLER_ID,
    });

    expect(result).toBe(room);
    expect(chats.getOrCreateRoom).toHaveBeenCalledWith(
      {
        listingId: LISTING_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
      },
      BUYER_ID,
    );
  });
});

describe(ListChatRoomsUseCase.name, () => {
  it('delegates to repository with cursor pagination', async () => {
    const chats = buildChatRepoMock();
    const page = { items: [], nextCursor: 'abc' };
    chats.listRoomsForUser.mockResolvedValue(page);

    const useCase = new ListChatRoomsUseCase(chats);
    const result = await useCase.execute(BUYER_ID, 'cursor-1', 20);

    expect(result).toBe(page);
    expect(chats.listRoomsForUser).toHaveBeenCalledWith(
      BUYER_ID,
      'cursor-1',
      20,
    );
  });
});

describe(ListChatMessagesUseCase.name, () => {
  it('throws when user is not a room participant', async () => {
    const chats = buildChatRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());

    const useCase = new ListChatMessagesUseCase(chats);
    await expect(
      useCase.execute(
        '99999999-9999-9999-9999-999999999999',
        ROOM_ID,
        null,
        20,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe(SendChatMessageUseCase.name, () => {
  it('creates message and publishes to room participants', async () => {
    const chats = buildChatRepoMock();
    const idempotency = buildIdempotencyMock();
    const publisher = buildPublisherMock();
    const room = buildChatRoom();
    const message = buildChatMessage();

    chats.findRoomById.mockResolvedValue(room);
    chats.createMessage.mockResolvedValue(message);

    const useCase = new SendChatMessageUseCase(
      chats,
      idempotency,
      publisher,
    );
    const result = await useCase.execute(BUYER_ID, ROOM_ID, 'hi');

    expect(result).toBe(message);
    expect(publisher.publish).toHaveBeenCalledWith(
      ROOM_ID,
      BUYER_ID,
      SELLER_ID,
      message,
    );
  });

  it('rejects duplicate idempotency key', async () => {
    const chats = buildChatRepoMock();
    const idempotency = buildIdempotencyMock();
    const publisher = buildPublisherMock();

    chats.findRoomById.mockResolvedValue(buildChatRoom());
    idempotency.reserve.mockResolvedValue(false);

    const useCase = new SendChatMessageUseCase(
      chats,
      idempotency,
      publisher,
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, 'hi', MessageType.TEXT, 'dup-key'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(chats.createMessage).not.toHaveBeenCalled();
  });

  it('reserves idempotency key and supports non-text message types', async () => {
    const chats = buildChatRepoMock();
    const idempotency = buildIdempotencyMock();
    const publisher = buildPublisherMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    chats.createMessage.mockResolvedValue(
      buildChatMessage({ type: MessageType.IMAGE }),
    );
    const useCase = new SendChatMessageUseCase(chats, idempotency, publisher);

    await useCase.execute(
      BUYER_ID,
      ROOM_ID,
      'https://cdn.local/image.png',
      MessageType.IMAGE,
      'img-1',
    );

    expect(idempotency.reserve).toHaveBeenCalledWith(
      `chat:message:${ROOM_ID}:${BUYER_ID}:img-1`,
      180,
    );
    expect(chats.createMessage).toHaveBeenCalledWith({
      chatRoomId: ROOM_ID,
      senderId: BUYER_ID,
      content: 'https://cdn.local/image.png',
      type: MessageType.IMAGE,
    });
  });
});

describe(StartDirectTradeUseCase.name, () => {
  it('creates/updates direct trade and publishes system message', async () => {
    const chats = buildChatRepoMock();
    const publisher = buildPublisherMock();
    const room = buildChatRoom();
    const tx = buildTransaction({
      type: TransactionType.DIRECT_TRADE,
      amount: 0,
    });
    const message = buildChatMessage({
      type: MessageType.DIRECT_TRADE_REQUEST,
    });
    chats.findRoomById.mockResolvedValue(room);
    chats.getOrCreateTransaction.mockResolvedValue(tx);
    chats.createMessage.mockResolvedValue(message);
    const useCase = new StartDirectTradeUseCase(chats, publisher);

    const dto = {
      meetingDate: '2026-06-01',
      meetingTime: '18:30',
      meetingLocation: 'Junction City',
      meetingLatitude: 16.784,
      meetingLongitude: 96.157,
    };
    const result = await useCase.execute(BUYER_ID, ROOM_ID, dto);

    expect(result).toBe(tx);
    expect(chats.getOrCreateTransaction).toHaveBeenCalledWith(
      ROOM_ID,
      LISTING_ID,
      BUYER_ID,
      SELLER_ID,
      TransactionType.DIRECT_TRADE,
      0,
    );
    expect(chats.upsertDirectTrade).toHaveBeenCalledWith({
      transactionId: tx.id,
      meetingDate: new Date(dto.meetingDate),
      meetingTime: dto.meetingTime,
      meetingLocation: dto.meetingLocation,
      meetingLatitude: dto.meetingLatitude,
      meetingLongitude: dto.meetingLongitude,
    });
    expect(publisher.publish).toHaveBeenCalledWith(
      ROOM_ID,
      BUYER_ID,
      SELLER_ID,
      message,
      'chat.directTrade.requested',
    );
  });
});

describe(MarkChatRoomReadUseCase.name, () => {
  it('marks messages read for participant', async () => {
    const chats = buildChatRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    chats.markRoomMessagesRead.mockResolvedValue(3);

    const useCase = new MarkChatRoomReadUseCase(chats);
    const count = await useCase.execute(BUYER_ID, ROOM_ID);

    expect(count).toBe(3);
    expect(chats.markRoomMessagesRead).toHaveBeenCalledWith(ROOM_ID, BUYER_ID);
  });
});

describe(GetChatSafePaymentStatusUseCase.name, () => {
  it('includes buyer KBZ account when buyer requests status', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    const room = buildChatRoom();
    const tx = buildTransaction({
      status: TransactionStatus.SAFE_PAYMENT_AWAITING_INSTRUCTION,
    });

    chats.findRoomById.mockResolvedValue(room);
    chats.findSafePaymentStatusByChatRoom.mockResolvedValue({
      transaction: tx,
      safePayment: {} as never,
      canSubmitPayment: false,
      buyerKbzAccount: null,
    });
    users.getAuthDataByUserId.mockResolvedValue({
      kbzPayAccount: {
        accountName: 'Buyer KBZ',
        phoneNumber: '09123456789',
        isVerified: true,
      },
    } as never);

    const useCase = new GetChatSafePaymentStatusUseCase(chats, users);
    const result = await useCase.execute(BUYER_ID, ROOM_ID);

    expect(result.buyerKbzAccount).toEqual({
      accountName: 'Buyer KBZ',
      phoneNumber: '09123456789',
      isVerified: true,
    });
  });
});

describe(RequestChatSafePaymentUseCase.name, () => {
  it('rejects when seller requests safe payment', async () => {
    const chats = buildChatRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());

    const useCase = new RequestChatSafePaymentUseCase(
      chats,
      buildUserRepoMock(),
      buildPublisherMock(),
    );

    await expect(useCase.execute(SELLER_ID, ROOM_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('notifies admins when buyer requests safe payment', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    const publisher = buildPublisherMock();
    const room = buildChatRoom();
    const tx = buildTransaction({
      status: TransactionStatus.SAFE_PAYMENT_AWAITING_INSTRUCTION,
    });

    chats.findRoomById.mockResolvedValue(room);
    chats.requestSafePayment.mockResolvedValue({
      transaction: tx,
      safePayment: {} as never,
    });
    chats.createMessage.mockResolvedValue(buildChatMessage());
    users.findAdminUserIds.mockResolvedValue(['admin-1']);
    users.createNotification.mockResolvedValue(undefined as never);

    const useCase = new RequestChatSafePaymentUseCase(
      chats,
      users,
      publisher,
    );
    const result = await useCase.execute(BUYER_ID, ROOM_ID);

    expect(result).toBe(tx);
    expect(users.createNotification).toHaveBeenCalledTimes(2);
    expect(publisher.publish).toHaveBeenCalled();
  });

  it('returns existing transaction when request hits duplicate conflict', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    const room = buildChatRoom();
    const existingTx = buildTransaction({
      status: TransactionStatus.SAFE_PAYMENT_AWAITING_INSTRUCTION,
    });
    chats.findRoomById.mockResolvedValue(room);
    chats.requestSafePayment.mockRejectedValue(new ConflictException());
    chats.findSafePaymentStatusByChatRoom.mockResolvedValue({
      transaction: existingTx,
      safePayment: {} as never,
      canSubmitPayment: false,
    });
    const useCase = new RequestChatSafePaymentUseCase(
      chats,
      users,
      buildPublisherMock(),
    );

    const result = await useCase.execute(BUYER_ID, ROOM_ID);
    expect(result).toBe(existingTx);
    expect(chats.createMessage).not.toHaveBeenCalled();
    expect(users.createNotification).not.toHaveBeenCalled();
  });
});

describe(SubmitChatSafePaymentUseCase.name, () => {
  it('rejects when seller submits safe payment', async () => {
    const chats = buildChatRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());

    const useCase = new SubmitChatSafePaymentUseCase(
      chats,
      buildUserRepoMock(),
      buildIdempotencyMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(SELLER_ID, ROOM_ID, {
        payerKbzName: 'A',
        payerKbzPhone: '09',
        paymentAmount: 10,
        kbzTransactionId: 'KBZ1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('notifies admins and publishes on buyer submit', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    const publisher = buildPublisherMock();
    const room = buildChatRoom();
    const tx = buildTransaction();

    chats.findRoomById.mockResolvedValue(room);
    chats.findSafePaymentStatusByChatRoom.mockResolvedValue({
      transaction: tx,
      safePayment: {
        instructionSentAt: new Date(),
        adminReceivingPhone: '09111111111',
      } as never,
      canSubmitPayment: true,
    });
    chats.submitSafePayment.mockResolvedValue({} as never);
    chats.createMessage.mockResolvedValue(buildChatMessage());
    chats.findTransactionById.mockResolvedValue(tx);
    users.findAdminUserIds.mockResolvedValue(['admin-1']);
    users.createNotification.mockResolvedValue(undefined as never);

    const useCase = new SubmitChatSafePaymentUseCase(
      chats,
      users,
      buildIdempotencyMock(),
      publisher,
    );

    const result = await useCase.execute(BUYER_ID, ROOM_ID, {
      payerKbzName: 'Buyer',
      payerKbzPhone: '09123456789',
      paymentAmount: 100,
      kbzTransactionId: 'KBZ123',
    });

    expect(result).toBe(tx);
    expect(users.createNotification).toHaveBeenCalledTimes(2);
    expect(publisher.publish).toHaveBeenCalled();
  });

  it('rejects when admin instruction has not been sent', async () => {
    const chats = buildChatRepoMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    chats.findSafePaymentStatusByChatRoom.mockResolvedValue({
      transaction: buildTransaction({
        status: TransactionStatus.SAFE_PAYMENT_AWAITING_INSTRUCTION,
      }),
      safePayment: {} as never,
      canSubmitPayment: false,
    });
    const useCase = new SubmitChatSafePaymentUseCase(
      chats,
      buildUserRepoMock(),
      buildIdempotencyMock(),
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, {
        payerKbzName: 'Buyer',
        payerKbzPhone: '09111111111',
        paymentAmount: 500,
        kbzTransactionId: 'KBZX',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chats.submitSafePayment).not.toHaveBeenCalled();
  });

  it('blocks duplicate submit by idempotency key', async () => {
    const chats = buildChatRepoMock();
    const idempotency = buildIdempotencyMock();
    chats.findRoomById.mockResolvedValue(buildChatRoom());
    idempotency.reserve.mockResolvedValue(false);
    const useCase = new SubmitChatSafePaymentUseCase(
      chats,
      buildUserRepoMock(),
      idempotency,
      buildPublisherMock(),
    );

    await expect(
      useCase.execute(BUYER_ID, ROOM_ID, {
        payerKbzName: 'Buyer',
        payerKbzPhone: '09111111111',
        paymentAmount: 500,
        kbzTransactionId: 'KBZY',
        idempotencyKey: 'dup-safe-pay',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(chats.findSafePaymentStatusByChatRoom).not.toHaveBeenCalled();
    expect(chats.submitSafePayment).not.toHaveBeenCalled();
  });
});

describe(CompleteChatTransactionUseCase.name, () => {
  it('rejects when transaction does not exist', async () => {
    const chats = buildChatRepoMock();
    chats.findTransactionById.mockResolvedValue(null);
    const useCase = new CompleteChatTransactionUseCase(
      chats,
      buildPublisherMock(),
    );

    await expect(useCase.execute(BUYER_ID, TX_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects when user is not part of transaction', async () => {
    const chats = buildChatRepoMock();
    chats.findTransactionById.mockResolvedValue(buildTransaction());

    const useCase = new CompleteChatTransactionUseCase(
      chats,
      buildPublisherMock(),
    );

    await expect(
      useCase.execute('99999999-9999-9999-9999-999999999999', TX_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('publishes partial completion event when only one side completes', async () => {
    const chats = buildChatRepoMock();
    const publisher = buildPublisherMock();
    chats.findTransactionById.mockResolvedValue(buildTransaction());
    const next = buildTransaction({
      status: TransactionStatus.BUYER_COMPLETED,
      buyerCompleted: true,
      sellerCompleted: false,
    });
    const msg = buildChatMessage({
      type: MessageType.TRANSACTION_COMPLETED,
      content:
        'Transaction marked completed by one side. Waiting for the other side.',
    });
    chats.markTransactionCompletedByUser.mockResolvedValue(next);
    chats.createMessage.mockResolvedValue(msg);
    const useCase = new CompleteChatTransactionUseCase(chats, publisher);

    const result = await useCase.execute(BUYER_ID, TX_ID);

    expect(result).toBe(next);
    expect(publisher.publish).toHaveBeenCalledWith(
      ROOM_ID,
      BUYER_ID,
      SELLER_ID,
      msg,
      'chat.transaction.completedByBuyer',
    );
  });

  it('publishes final completion event when both sides completed', async () => {
    const chats = buildChatRepoMock();
    const publisher = buildPublisherMock();
    chats.findTransactionById.mockResolvedValue(buildTransaction());
    const next = buildTransaction({
      status: TransactionStatus.COMPLETED,
      buyerCompleted: true,
      sellerCompleted: true,
      completedAt: new Date('2026-06-10T10:00:00.000Z'),
    });
    const msg = buildChatMessage({
      type: MessageType.TRANSACTION_COMPLETED,
      content: 'Both sides marked transaction as completed.',
    });
    chats.markTransactionCompletedByUser.mockResolvedValue(next);
    chats.createMessage.mockResolvedValue(msg);
    const useCase = new CompleteChatTransactionUseCase(chats, publisher);

    await useCase.execute(SELLER_ID, TX_ID);

    expect(publisher.publish).toHaveBeenCalledWith(
      ROOM_ID,
      BUYER_ID,
      SELLER_ID,
      msg,
      'chat.transaction.completed',
    );
  });
});

describe(AdminSendSafePaymentInstructionUseCase.name, () => {
  it('emits realtime payload and creates admin + buyer notifications', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    const realtime = buildRealtimeMock();
    users.findById.mockResolvedValue({ isAdmin: () => true } as never);
    const tx = buildTransaction({
      status: TransactionStatus.SAFE_PAYMENT_INSTRUCTION_SENT,
    });
    chats.sendSafePaymentInstruction.mockResolvedValue({
      transaction: tx,
      safePayment: { instructionSentAt: new Date('2026-06-01T10:00:00.000Z') } as never,
    });
    users.createNotification.mockResolvedValue(undefined as never);
    const useCase = new AdminSendSafePaymentInstructionUseCase(
      chats,
      users,
      realtime,
    );

    await useCase.execute('admin-1', TX_ID, {
      adminReceivingPhone: '0911222333',
      adminNote: 'check amount',
    });

    expect(realtime.emitToChatRoom).toHaveBeenCalledWith(
      ROOM_ID,
      'chat.safePayment.instructionSent',
      expect.objectContaining({
        transactionId: TX_ID,
        chatRoomId: ROOM_ID,
        adminReceivingPhone: '0911222333',
        adminNote: 'check amount',
      }),
    );
    expect(users.createNotification).toHaveBeenCalledTimes(2);
  });
});

describe(AdminMarkSafePaymentReceivedUseCase.name, () => {
  it('notifies buyer, seller, and admin with role-specific metadata', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    const realtime = buildRealtimeMock();
    users.findById.mockResolvedValue({ isAdmin: () => true } as never);
    const next = buildTransaction({
      status: TransactionStatus.SAFE_PAYMENT_RECEIVED,
    });
    chats.markSafePaymentReceived.mockResolvedValue(next);
    users.createNotification.mockResolvedValue(undefined as never);
    const useCase = new AdminMarkSafePaymentReceivedUseCase(
      chats,
      users,
      realtime,
    );

    await useCase.execute('admin-1', TX_ID, {
      adminReceivingPhone: '099888777',
      adminNote: 'bank confirmed',
    });

    expect(realtime.emitToChatRoom).toHaveBeenCalledWith(
      ROOM_ID,
      'chat.safePayment.received',
      { transactionId: TX_ID, chatRoomId: ROOM_ID, status: next.status },
    );
    expect(users.createNotification).toHaveBeenCalledTimes(3);
    expect(users.createNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: BUYER_ID,
        eventKey: 'CHAT_SAFE_PAYMENT_RECEIVED_CLIENT',
        metadata: expect.objectContaining({ role: 'buyer' }),
      }),
    );
    expect(users.createNotification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: SELLER_ID,
        eventKey: 'CHAT_SAFE_PAYMENT_RECEIVED_CLIENT',
        metadata: expect.objectContaining({ role: 'seller' }),
      }),
    );
  });
});

describe(AdminMarkSafePaymentTransferredUseCase.name, () => {
  it('requires transaction completed by both parties', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    users.findById.mockResolvedValue({ isAdmin: () => true } as never);
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({ status: TransactionStatus.SAFE_PAYMENT_RECEIVED }),
    );

    const useCase = new AdminMarkSafePaymentTransferredUseCase(
      chats,
      users,
      buildRealtimeMock(),
    );

    await expect(
      useCase.execute('admin-1', TX_ID, { transferRef: 'REF1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when transaction id is unknown', async () => {
    const chats = buildChatRepoMock();
    const users = buildUserRepoMock();
    users.findById.mockResolvedValue({ isAdmin: () => true } as never);
    chats.findTransactionById.mockResolvedValue(null);
    const useCase = new AdminMarkSafePaymentTransferredUseCase(
      chats,
      users,
      buildRealtimeMock(),
    );

    await expect(
      useCase.execute('admin-1', TX_ID, { transferRef: 'REF1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe(SubmitChatReviewAfterCompletionUseCase.name, () => {
  it('delegates to review use-case when transaction is completed', async () => {
    const chats = buildChatRepoMock();
    const reviewUseCase = {
      execute: jest.fn(async () => ({ id: 'review-1' })),
    } as unknown as CreateTransactionReviewUseCase;

    chats.findTransactionById.mockResolvedValue(
      buildTransaction({ status: TransactionStatus.COMPLETED }),
    );

    const useCase = new SubmitChatReviewAfterCompletionUseCase(
      chats,
      reviewUseCase,
    );

    const dto = { stars: 5, comment: 'Great trade' };
    const result = await useCase.execute(BUYER_ID, TX_ID, dto);

    expect(result).toEqual({ id: 'review-1' });
    expect(reviewUseCase.execute).toHaveBeenCalledWith(TX_ID, BUYER_ID, dto);
  });

  it('rejects review before transaction completion', async () => {
    const chats = buildChatRepoMock();
    chats.findTransactionById.mockResolvedValue(
      buildTransaction({ status: TransactionStatus.SAFE_PAYMENT_PENDING }),
    );

    const useCase = new SubmitChatReviewAfterCompletionUseCase(
      chats,
      { execute: jest.fn() } as unknown as CreateTransactionReviewUseCase,
    );

    await expect(
      useCase.execute(BUYER_ID, TX_ID, { stars: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
