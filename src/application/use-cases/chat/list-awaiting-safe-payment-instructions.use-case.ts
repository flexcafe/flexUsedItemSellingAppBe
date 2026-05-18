import { Inject, Injectable } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type IChatRepository,
} from '../../../domain/repositories/chat.repository.interface.js';

@Injectable()
export class ListAwaitingSafePaymentInstructionsUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chats: IChatRepository,
  ) {}

  execute(cursor: string | null, take: number) {
    return this.chats.listAwaitingSafePaymentInstructions(cursor, take);
  }
}
