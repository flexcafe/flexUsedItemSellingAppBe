import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';

class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-04-30T12:00:00.000Z',
  })
  timestamp: string;
}

@Controller()
@ApiTags('Health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOkResponse({
    description: 'Application health status',
    type: HealthResponseDto,
  })
  healthCheck(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }
}
