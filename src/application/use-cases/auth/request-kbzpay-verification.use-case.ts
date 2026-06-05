import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import { RequestKbzPayVerificationDto } from '../../dtos/auth/request-kbzpay-verification.dto.js';
import { VerificationActionResultDto } from '../../dtos/auth/verification-action-result.dto.js';
import { requireActiveAuthUser } from './_auth-user.helper.js';

@Injectable()
export class RequestKbzPayVerificationUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    dto: RequestKbzPayVerificationDto,
  ): Promise<VerificationActionResultDto> {
    const authData = await this.userRepository.getAuthDataByUserId(userId);
    if (!authData) {
      throw new NotFoundException('User not found');
    }
    requireActiveAuthUser(authData.user);

    const kbz = authData.kbzPayAccount;
    if (!kbz) {
      throw new NotFoundException('KBZPay account not found');
    }

    if (kbz.isVerified || kbz.status === VerificationStatus.VERIFIED) {
      throw new ConflictException('KBZPay is already verified');
    }

    await this.userRepository.requestKbzPayVerification(userId);

    const extraMessage = dto.message ? `\n\nUser message: ${dto.message}` : '';

    const adminIds = await this.userRepository.findAdminUserIds();
    await Promise.all(
      adminIds.map((adminId) =>
        this.userRepository.createNotification({
          userId: adminId,
          eventKey: 'KBZPAY_VERIFICATION_REQUESTED_ADMIN',
          metadata: {
            targetUserId: userId,
            nickname: authData.user.nickname,
            phone: authData.user.phone,
            kbzPhoneNumber: kbz.phoneNumber,
          },
          title: 'KBZPay Verification Requested',
          message: `A user requested KBZPay verification.\n\nUser: ${authData.user.nickname} (${authData.user.phone})\nKBZPay: ${kbz.phoneNumber}`,
          referenceId: userId,
        }),
      ),
    );

    await this.userRepository.createNotification({
      userId,
      eventKey: 'KBZPAY_VERIFICATION_REQUESTED_CLIENT',
      metadata: {
        message: dto.message ?? null,
      },
      title: 'KBZPay Verification Pending',
      message:
        'Your KBZPay verification request is now pending. An admin will send the transfer phone number by notification. Please transfer exactly 100 MMK once you receive it.' +
        extraMessage,
      referenceId: userId,
    });

    return new VerificationActionResultDto('KBZPAY_VERIFICATION_REQUESTED');
  }
}
