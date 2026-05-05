import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RequestKbzPayVerificationDto {
  @ApiPropertyOptional({
    example: 'Please verify my KBZPay account.',
    description:
      'Optional note from user. This endpoint does not accept kbzTransactionId.',
  })
  @IsString()
  @IsOptional()
  message?: string;
}
