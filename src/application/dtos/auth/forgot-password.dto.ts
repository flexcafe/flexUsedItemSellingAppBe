import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiPropertyOptional({
    example: '+959123456789',
    description: 'Registered client phone number (provide phone OR email)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Registered client email (provide email OR phone)',
  })
  @IsOptional()
  @IsEmail()
  @IsNotEmpty()
  email?: string;
}
