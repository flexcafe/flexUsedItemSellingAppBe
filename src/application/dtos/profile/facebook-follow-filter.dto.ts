import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { FacebookFollowSubmissionStatus } from '../../../domain/enums/facebook-follow-submission-status.enum.js';

export class FacebookFollowFilterDto {
  @ApiPropertyOptional({ enum: FacebookFollowSubmissionStatus })
  @IsOptional()
  @IsEnum(FacebookFollowSubmissionStatus)
  status?: FacebookFollowSubmissionStatus;
}
