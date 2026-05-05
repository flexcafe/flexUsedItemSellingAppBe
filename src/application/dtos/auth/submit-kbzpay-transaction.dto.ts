import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitKbzPayTransactionDto {
  @ApiProperty({
    example: 'KBZ-TXN-20260506-000321',
    description:
      'KBZPay transfer transaction number submitted after sending 100 MMK',
  })
  @IsString()
  @IsNotEmpty()
  kbzTransactionId: string;
}
