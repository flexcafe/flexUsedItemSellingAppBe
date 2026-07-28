import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    example: 'myCurrentPassword',
    description: 'Current account password (confirmation step)',
  })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty({
    example: 'DELETE',
    description:
      'Must be exactly DELETE to confirm permanent account deletion (App Store Guideline 5.1.1(v))',
  })
  @IsString()
  @Equals('DELETE', {
    message: 'confirm must be exactly DELETE',
  })
  confirm: string;
}

export class DeleteAccountResultDto {
  @ApiProperty({ example: true })
  deleted: boolean;

  @ApiProperty({
    example: '2026-07-29T12:00:00.000Z',
    description: 'When the account was permanently deleted',
  })
  deletedAt: Date;

  constructor(deletedAt: Date) {
    this.deleted = true;
    this.deletedAt = deletedAt;
  }
}
