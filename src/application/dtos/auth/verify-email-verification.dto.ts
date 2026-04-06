import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailVerificationDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'a6fb4cfd1db846dab97f8f7ebfda8e8c',
    description: 'Email verification token sent to user email',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
