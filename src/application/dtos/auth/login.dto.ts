import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/** Client app: phone + password only. */
export class ClientLoginDto {
  @ApiProperty({
    example: '+959123456789',
    description: 'Registered client phone number',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

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
