import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendKbzPayInstructionDto {
  @ApiProperty({
    example: '+959700000000',
    description:
      'Phone number user must transfer 100 MMK to for KBZPay verification',
  })
  @IsString()
  @IsNotEmpty()
  adminPhoneForTransfer: string;

  @ApiProperty({
    required: false,
    example: 'Transfer exactly 100 MMK and include your nickname in note.',
  })
  @IsString()
  @IsOptional()
  adminNote?: string;
}
