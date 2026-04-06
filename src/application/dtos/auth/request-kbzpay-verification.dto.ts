import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RequestKbzPayVerificationDto {
  @ApiProperty({
    required: false,
    example: 'Please verify my KBZPay quickly. I already transferred.',
  })
  @IsString()
  @IsOptional()
  message?: string;
}
