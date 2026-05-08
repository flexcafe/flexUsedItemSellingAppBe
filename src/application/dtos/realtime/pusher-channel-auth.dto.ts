import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PusherChannelAuthDto {
  @ApiProperty()
  @IsString()
  socket_id: string;

  @ApiProperty()
  @IsString()
  channel_name: string;
}
