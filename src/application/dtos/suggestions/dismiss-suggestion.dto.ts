import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DismissSuggestionDto {
  @ApiPropertyOptional({ example: 'Duplicate of an existing request.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
