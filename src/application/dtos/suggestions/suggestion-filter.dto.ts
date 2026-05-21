import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SuggestionStatus } from '../../../domain/enums/suggestion-status.enum.js';

export class SuggestionFilterDto {
  @ApiPropertyOptional({ enum: SuggestionStatus })
  @IsOptional()
  @IsEnum(SuggestionStatus)
  status?: SuggestionStatus;
}
