import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Optional envelope fields for `ApiResponseDto.success` when the second argument is an object. */
export type ApiSuccessEnvelopeOptions = {
  message?: string;
  /**
   * IANA timezone used to compute each listing’s `createdAtDisplay` on public catalog/detail.
   * Omitted on routes that do not expose `createdAtDisplay`.
   */
  listingDisplayTimezone?: string;
};

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data?: T;

  @ApiProperty({ required: false })
  error?: string;

  @ApiPropertyOptional({
    description:
      'Present on **public** product catalog (`GET …/products`) and **public** product detail (`GET …/products/:id`): IANA zone (same as server `LISTING_DISPLAY_TIMEZONE`, default `UTC`) used for each item’s `createdAtDisplay`. Omitted elsewhere.',
    example: 'Asia/Yangon',
  })
  listingDisplayTimezone?: string;

  @ApiProperty()
  timestamp: string;

  constructor(success: boolean, message: string, data?: T, error?: string) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T): ApiResponseDto<T>;
  static success<T>(data: T, message: string): ApiResponseDto<T>;
  static success<T>(
    data: T,
    options: ApiSuccessEnvelopeOptions,
  ): ApiResponseDto<T>;
  static success<T>(
    data: T,
    messageOrOptions?: string | ApiSuccessEnvelopeOptions,
  ): ApiResponseDto<T> {
    let message = 'Operation successful';
    let listingDisplayTimezone: string | undefined;
    if (typeof messageOrOptions === 'string') {
      message = messageOrOptions;
    } else if (
      messageOrOptions !== null &&
      typeof messageOrOptions === 'object'
    ) {
      message = messageOrOptions.message ?? 'Operation successful';
      listingDisplayTimezone = messageOrOptions.listingDisplayTimezone;
    }
    const dto = new ApiResponseDto<T>(true, message, data);
    dto.listingDisplayTimezone = listingDisplayTimezone;
    return dto;
  }

  static error<T>(message: string, error?: string): ApiResponseDto<T> {
    return new ApiResponseDto<T>(false, message, undefined, error);
  }
}
