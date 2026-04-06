import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { SendKbzPayInstructionDto } from '../../dtos/auth/send-kbzpay-instruction.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';

@Injectable()
export class SendKbzPayInstructionUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    adminUserId: string,
    targetUserId: string,
    dto: SendKbzPayInstructionDto,
  ): Promise<VerificationActionResultDto> {
    const adminUser = await this.userRepository.findById(adminUserId);
    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    if (!adminUser.isAdmin()) {
      throw new ForbiddenException('Only admins can send KBZPay instructions');
    }

    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    await this.userRepository.setKbzPayVerificationInstruction(
      targetUserId,
      dto.adminPhoneForTransfer,
      dto.adminNote,
    );

    await this.userRepository.createNotification({
      userId: targetUserId,
      title: 'KBZPay Verification Transfer Instruction',
      message: `Please transfer 100 MMK to ${dto.adminPhoneForTransfer}. After admin confirms receipt, your KBZPay account will be marked as verified.${dto.adminNote ? `\n\nAdmin note: ${dto.adminNote}` : ''}`,
      referenceId: targetUserId,
    });

    return new VerificationActionResultDto('KBZPAY_TRANSFER_INSTRUCTION_SENT');
  }
}
