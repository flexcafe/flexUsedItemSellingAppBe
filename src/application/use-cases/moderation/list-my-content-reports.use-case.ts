import { Inject, Injectable } from '@nestjs/common';
import {
  CONTENT_REPORT_REPOSITORY,
  type IContentReportRepository,
} from '../../../domain/repositories/content-report.repository.interface.js';
import { ContentReportDto } from '../../dtos/moderation/moderation.dto.js';

@Injectable()
export class ListMyContentReportsUseCase {
  constructor(
    @Inject(CONTENT_REPORT_REPOSITORY)
    private readonly reports: IContentReportRepository,
  ) {}

  async execute(reporterId: string): Promise<ContentReportDto[]> {
    const rows = await this.reports.listByReporter(reporterId);
    return rows.map((r) => new ContentReportDto(r));
  }
}
