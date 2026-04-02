import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';

export class RegisterDto {
  @ApiProperty({ enum: RegistrationType, example: RegistrationType.PHONE_ONLY })
  @IsEnum(RegistrationType)
  registrationType: RegistrationType;

  @ApiProperty({ example: '+959123456789' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'secureP@ss123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'CoolTrader' })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiProperty({ example: '100012345678901', required: false })
  @IsString()
  @IsOptional()
  facebookId?: string;

  @ApiProperty({ example: 'REF123', required: false })
  @IsString()
  @IsOptional()
  referralCode?: string;
}
