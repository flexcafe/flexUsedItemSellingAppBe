import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestKbzPayVerificationDto {
  @ApiProperty({
    required: false,
    example: 'KBZ-TXN-20260505-000123',
    description:
      'KBZPay transfer transaction number that user submitted after sending 100 MMK',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  kbzTransactionId?: string;

  @ApiProperty({
    required: false,
    example: 'Please verify my KBZPay quickly. I already transferred.',
  })
  @IsString()
  @IsOptional()
  message?: string;
}
