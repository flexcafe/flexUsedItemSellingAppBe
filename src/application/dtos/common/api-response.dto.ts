import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data?: T;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty()
  timestamp: string;

  constructor(success: boolean, message: string, data?: T, error?: string) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(
    data: T,
    message = 'Operation successful',
  ): ApiResponseDto<T> {
    return new ApiResponseDto<T>(true, message, data);
  }

  static error<T>(message: string, error?: string): ApiResponseDto<T> {
    return new ApiResponseDto<T>(false, message, undefined, error);
  }
}
