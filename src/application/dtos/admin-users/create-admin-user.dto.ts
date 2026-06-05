import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty({ example: 'Staff Manager' })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiProperty({ example: '+959987654321' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'staff@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'securePass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'ROLE_ID_UUID', description: 'Admin role ID to assign' })
  @IsString()
  @IsNotEmpty()
  adminRoleId: string;
}