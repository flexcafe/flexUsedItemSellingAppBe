import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AdminVerifyKbzPayDto {
  @ApiProperty({
    required: false,
    example: 'Received 100 MMK and confirmed account owner.',
  })
  @IsString()
  @IsOptional()
  adminNote?: string;
}
