import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
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

  @ApiProperty({ example: '123456', description: 'Password-reset verification code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'newSecureP@ss1', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({
    example: 'newSecureP@ss1',
    minLength: 8,
    description: 'Must match newPassword',
  })
  @IsString()
  @MinLength(8)
  confirmNewPassword: string;
}
