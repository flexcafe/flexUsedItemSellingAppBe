import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateAdminUserRoleDto {
  @ApiProperty({ example: 'ROLE_ID_UUID', description: 'New admin role ID to assign. Set to null to demote to client.' })
  @IsString()
  adminRoleId: string;
}