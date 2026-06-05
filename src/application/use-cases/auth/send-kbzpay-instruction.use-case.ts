import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { SendKbzPayInstructionDto } from '../../dtos/auth/send-kbzpay-instruction.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';
import { AdminPermission } from '../../../domain/enums/admin-permission.enum.js';
import { requireAdminPermission } from '../_helpers/admin-authorization.helper.js';

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
    await requireAdminPermission(
      this.userRepository,
      adminUserId,
      AdminPermission.MANAGE_USERS,
    );

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
      eventKey: 'KBZPAY_INSTRUCTION_SENT_CLIENT',
      metadata: {
        transferPhone: dto.adminPhoneForTransfer,
        amount: 100,
        adminNote: dto.adminNote ?? null,
      },
      title: 'KBZPay Verification Transfer Instruction',
      message: `Please transfer 100 MMK to ${dto.adminPhoneForTransfer}. After admin confirms receipt, your KBZPay account will be marked as verified.${dto.adminNote ? `\n\nAdmin note: ${dto.adminNote}` : ''}`,
      referenceId: targetUserId,
    });

    await this.userRepository.createNotification({
      userId: adminUserId,
      eventKey: 'KBZPAY_INSTRUCTION_SENT_ADMIN',
      metadata: {
        targetUserId,
        targetPhone: targetUser.phone,
        transferPhone: dto.adminPhoneForTransfer,
        amount: 100,
      },
      title: 'KBZPay Instruction Sent',
      message: `Transfer instruction sent to user ${targetUser.phone}.\n\nTransfer phone: ${dto.adminPhoneForTransfer}`,
      referenceId: targetUserId,
    });

    return new VerificationActionResultDto('KBZPAY_TRANSFER_INSTRUCTION_SENT');
  }
}
