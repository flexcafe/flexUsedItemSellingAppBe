import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../../domain/repositories/user.repository.interface.js';
import {
  POINTS_REPOSITORY,
  type IPointsRepository,
} from '../../../domain/repositories/points.repository.interface.js';
import {
  RequestWithdrawalDto,
  WithdrawalRequestDto,
} from '../../dtos/points/withdrawal.dto.js';

@Injectable()
export class RequestWithdrawalUseCase {
  constructor(
    @Inject(POINTS_REPOSITORY)
    private readonly pointsRepository: IPointsRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    dto: RequestWithdrawalDto,
  ): Promise<WithdrawalRequestDto> {
    const summary = await this.pointsRepository.getUserPointsSummary(userId);
    if (!summary) {
      throw new NotFoundException('User not found');
    }

    const authData = await this.userRepository.getAuthDataByUserId(userId);
    if (!authData?.kbzPayAccount?.isVerified) {
      throw new BadRequestException(
        'KBZPay must be verified before requesting withdrawal',
      );
    }

    if (dto.amount > summary.availableWithdrawalPoints) {
      throw new BadRequestException(
        'Withdrawal amount exceeds available points',
      );
    }

    const request = await this.pointsRepository.createWithdrawalRequest({
      userId,
      amount: dto.amount,
    });

    return new WithdrawalRequestDto(request);
  }
}
