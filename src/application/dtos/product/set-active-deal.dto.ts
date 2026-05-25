import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class SetActiveDealDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Chat room id to mark as the active deal for this listing. Omit or send null to clear.',
  })
  @IsOptional()
  @IsUUID()
  chatRoomId?: string | null;
}

