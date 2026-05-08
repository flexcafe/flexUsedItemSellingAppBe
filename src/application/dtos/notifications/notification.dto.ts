import { ApiProperty } from '@nestjs/swagger';
import type { NotificationData } from '../../../domain/repositories/user.repository.interface.js';

export class NotificationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty({ nullable: true })
  referenceId: string | null;

  @ApiProperty()
  createdAt: Date;

  constructor(data: NotificationData) {
    this.id = data.id;
    this.title = data.title;
    this.message = data.message;
    this.type = data.type;
    this.isRead = data.isRead;
    this.referenceId = data.referenceId;
    this.createdAt = data.createdAt;
  }
}
