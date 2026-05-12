import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeleteProductDto {
  @ApiProperty({
    example: 'iPhone 13 Pro Max 256GB',
    description:
      'Must match the listing **title** exactly (after trim on both sides). Prevents accidental delete.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  confirmTitle: string;
}
