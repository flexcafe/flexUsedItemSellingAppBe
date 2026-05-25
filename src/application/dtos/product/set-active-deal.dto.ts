import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class SetActiveDealDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Chat room id to mark as the active deal for this listing. Omit or send null to clear.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  chatRoomId?: string | null;
}
