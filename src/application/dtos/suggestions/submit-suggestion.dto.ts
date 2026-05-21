import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SubmitSuggestionDto {
  @ApiProperty({ example: 'Ko Ko', description: 'Display nickname for this suggestion' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nickname: string;

  @ApiProperty({ example: 'Aung Aung', description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({
    example: 'Add dark mode and filter by district in search.',
    description: 'Suggestion details',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  details: string;
}
