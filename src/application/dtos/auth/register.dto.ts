import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RegistrationType } from '../../../domain/enums/registration-type.enum.js';
import { Gender } from '../../../domain/enums/gender.enum.js';
import { MaritalStatus } from '../../../domain/enums/marital-status.enum.js';

export class RegisterDto {
  @ApiProperty({
    enum: RegistrationType,
    example: RegistrationType.PHONE_AND_FACEBOOK,
    description:
      'PHONE_AND_FACEBOOK requires facebookId. PHONE_ONLY must not include facebookId.',
  })
  @IsEnum(RegistrationType)
  registrationType: RegistrationType;

  @ApiProperty({ example: 'CoolTrader' })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiProperty({ example: '+959123456789' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'secureP@ss123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'secureP@ss123',
    minLength: 8,
    description: 'Must match password',
  })
  @IsString()
  @MinLength(8)
  confirmPassword: string;

  @ApiProperty({
    example: '100012345678901',
    required: false,
    description: 'Required only when registrationType = PHONE_AND_FACEBOOK',
  })
  @ValidateIf(
    (dto: RegisterDto) =>
      dto.registrationType === RegistrationType.PHONE_AND_FACEBOOK,
  )
  @IsString()
  @IsNotEmpty()
  facebookId?: string;

  @ApiProperty({
    example: 'Kyaw Zin',
    description: 'KBZPay account holder name',
  })
  @IsString()
  @IsNotEmpty()
  kbzPayName: string;

  @ApiProperty({
    example: '+959876543210',
    description: 'KBZPay phone number',
  })
  @IsString()
  @IsNotEmpty()
  kbzPayPhoneNumber: string;

  @ApiProperty({ enum: Gender, example: Gender.MALE })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: 27 })
  @Type(() => Number)
  @IsInt()
  @Min(13)
  age: number;

  @ApiProperty({ enum: MaritalStatus, example: MaritalStatus.SINGLE })
  @IsEnum(MaritalStatus)
  maritalStatus: MaritalStatus;

  @ApiProperty({
    example: 'Yangon Region',
    description: 'User entered region name',
  })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiProperty({
    example: 16.8409,
    description: 'GPS latitude captured from device location permission',
  })
  @Type(() => Number)
  @IsNumber()
  gpsLatitude: number;

  @ApiProperty({
    example: 96.1735,
    description: 'GPS longitude captured from device location permission',
  })
  @Type(() => Number)
  @IsNumber()
  gpsLongitude: number;

  @ApiProperty({
    example: 'REF12345',
    required: false,
    description: 'Optional referral code from existing user',
  })
  @IsString()
  @IsOptional()
  referralId?: string;
}
