import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendPhoneOtpDto {
  @ApiProperty({ example: '+959123456789' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
