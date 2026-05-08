import { ApiProperty } from '@nestjs/swagger';

export class UploadAvatarResponseDto {
  @ApiProperty()
  avatarUrl: string;

  constructor(avatarUrl: string) {
    this.avatarUrl = avatarUrl;
  }
}
