import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: '+959123456789' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456', description: '6-digit SMS OTP' })
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
