import { ApiProperty } from '@nestjs/swagger';
import type { UserTransactionStatsData } from '../../../domain/repositories/points.repository.interface.js';

export class TransactionStatsDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  totalTransactionsMade: number;

  @ApiProperty()
  completedSales: number;

  @ApiProperty()
  completedPurchases: number;

  constructor(data: UserTransactionStatsData) {
    this.userId = data.userId;
    this.totalTransactionsMade = data.totalTransactionsMade;
    this.completedSales = data.completedSales;
    this.completedPurchases = data.completedPurchases;
  }
}
