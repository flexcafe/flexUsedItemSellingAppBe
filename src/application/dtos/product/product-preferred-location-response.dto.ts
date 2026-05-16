import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreferredTradeLocationEntity } from '../../../domain/entities/preferred-trade-location.entity.js';

export class ProductPreferredLocationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Location 1' })
  label: string;

  @ApiProperty({ example: 'Pabedan Township, Yangon' })
  address: string;

  @ApiPropertyOptional({ nullable: true })
  latitude: number | null;

  @ApiPropertyOptional({ nullable: true })
  longitude: number | null;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  constructor(entity: PreferredTradeLocationEntity) {
    this.id = entity.id;
    this.label = entity.label;
    this.address = entity.address;
    this.latitude = entity.latitude;
    this.longitude = entity.longitude;
    this.sortOrder = entity.sortOrder;
  }
}
