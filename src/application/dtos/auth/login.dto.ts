import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Client app: phone or email + password (exactly one identifier). */
export class ClientLoginDto {
  @ApiPropertyOptional({
    example: '+959123456789',
    description: 'Registered client phone number (provide phone OR email)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiPropertyOptional({
    example: 'client@example.com',
    description: 'Registered client email (provide email OR phone)',
  })
  @IsOptional()
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ApiProperty({ example: 'secureP@ss123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

/** Admin dashboard: email + password only (any user with an admin role). */
export class AdminLoginDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Admin account email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'secureP@ss123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

// Facebook ID login — not supported yet; use phone (clients) or email (admins).
