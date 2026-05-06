import { Module } from '@nestjs/common';
import { ClientPointsController } from './client-points.controller.js';
import { AdminPointsController } from './admin-points.controller.js';
import { GetPointsSummaryUseCase } from '../../../application/use-cases/points/get-points-summary.use-case.js';
import { GetTransactionStatsUseCase } from '../../../application/use-cases/points/get-transaction-stats.use-case.js';
import { CreateTransactionReviewUseCase } from '../../../application/use-cases/points/create-transaction-review.use-case.js';
import { RequestWithdrawalUseCase } from '../../../application/use-cases/points/request-withdrawal.use-case.js';
import { ListMyWithdrawalsUseCase } from '../../../application/use-cases/points/list-my-withdrawals.use-case.js';
import { ListWithdrawalsUseCase } from '../../../application/use-cases/points/list-withdrawals.use-case.js';
import { ApproveWithdrawalUseCase } from '../../../application/use-cases/points/approve-withdrawal.use-case.js';
import { RejectWithdrawalUseCase } from '../../../application/use-cases/points/reject-withdrawal.use-case.js';
import { MarkWithdrawalPaidUseCase } from '../../../application/use-cases/points/mark-withdrawal-paid.use-case.js';
import { ManagePointConfigUseCase } from '../../../application/use-cases/points/manage-point-config.use-case.js';
import { PointsRepository } from '../../../infrastructure/repositories/points.repository.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { POINTS_REPOSITORY } from '../../../domain/repositories/points.repository.interface.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';

@Module({
  controllers: [ClientPointsController, AdminPointsController],
  providers: [
    GetPointsSummaryUseCase,
    GetTransactionStatsUseCase,
    CreateTransactionReviewUseCase,
    RequestWithdrawalUseCase,
    ListMyWithdrawalsUseCase,
    ListWithdrawalsUseCase,
    ApproveWithdrawalUseCase,
    RejectWithdrawalUseCase,
    MarkWithdrawalPaidUseCase,
    ManagePointConfigUseCase,
    {
      provide: POINTS_REPOSITORY,
      useClass: PointsRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
})
export class PointsModule {}
