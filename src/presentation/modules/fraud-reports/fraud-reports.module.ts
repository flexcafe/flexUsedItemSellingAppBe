import { Module } from '@nestjs/common';
import { ClientFraudReportsController } from './client-fraud-reports.controller.js';
import { AdminFraudReportsController } from './admin-fraud-reports.controller.js';
import { SubmitFraudReportUseCase } from '../../../application/use-cases/fraud-reports/submit-fraud-report.use-case.js';
import { ListMyFraudReportsUseCase } from '../../../application/use-cases/fraud-reports/list-my-fraud-reports.use-case.js';
import { ListFraudReportsAdminUseCase } from '../../../application/use-cases/fraud-reports/list-fraud-reports-admin.use-case.js';
import { ConfirmFraudReportUseCase } from '../../../application/use-cases/fraud-reports/confirm-fraud-report.use-case.js';
import { DismissFraudReportUseCase } from '../../../application/use-cases/fraud-reports/dismiss-fraud-report.use-case.js';
import { BanUserAdminUseCase } from '../../../application/use-cases/fraud-reports/ban-user-admin.use-case.js';
import { UnbanUserAdminUseCase } from '../../../application/use-cases/fraud-reports/unban-user-admin.use-case.js';
import { FraudReportRepository } from '../../../infrastructure/repositories/fraud-report.repository.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { FRAUD_REPORT_REPOSITORY } from '../../../domain/repositories/fraud-report.repository.interface.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';

@Module({
  controllers: [ClientFraudReportsController, AdminFraudReportsController],
  providers: [
    SubmitFraudReportUseCase,
    ListMyFraudReportsUseCase,
    ListFraudReportsAdminUseCase,
    ConfirmFraudReportUseCase,
    DismissFraudReportUseCase,
    BanUserAdminUseCase,
    UnbanUserAdminUseCase,
    {
      provide: FRAUD_REPORT_REPOSITORY,
      useClass: FraudReportRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
})
export class FraudReportsModule {}
