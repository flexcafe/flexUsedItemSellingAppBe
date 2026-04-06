import { ApiProperty } from '@nestjs/swagger';

export class VerificationActionResultDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'PHONE_VERIFIED' })
  action: string;

  constructor(action: string) {
    this.success = true;
    this.action = action;
  }
}
