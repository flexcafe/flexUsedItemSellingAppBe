import { applyDecorators, HttpStatus } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseDto } from '../../application/dtos/common/api-response.dto.js';
import { PaginatedResponseDto } from '../../application/dtos/common/pagination.dto.js';

type ResponseOptions = {
  status?: HttpStatus;
  description: string;
};

function baseResponseSchema(
  dataSchema?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    allOf: [
      { $ref: getSchemaPath(ApiResponseDto) },
      {
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation successful' },
          data: dataSchema,
          error: { type: 'string', nullable: true, example: null },
          listingDisplayTimezone: {
            type: 'string',
            nullable: true,
            example: 'Asia/Yangon',
            description:
              'On public product list/detail only: IANA zone used for `createdAtDisplay` (server `LISTING_DISPLAY_TIMEZONE`).',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2026-04-30T12:00:00.000Z',
          },
        },
      },
    ],
  };
}

export function ApiSuccessResponse<TModel extends Type<unknown>>(
  model: TModel,
  options: ResponseOptions,
) {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiResponse({
      status: options.status ?? HttpStatus.OK,
      description: options.description,
      schema: baseResponseSchema({
        $ref: getSchemaPath(model) as unknown as string,
      }),
    }),
  );
}

export function ApiArraySuccessResponse<TModel extends Type<unknown>>(
  model: TModel,
  options: ResponseOptions,
) {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiResponse({
      status: options.status ?? HttpStatus.OK,
      description: options.description,
      schema: baseResponseSchema({
        type: 'array',
        items: { $ref: getSchemaPath(model) as unknown as string },
      }),
    }),
  );
}

export function ApiPaginatedSuccessResponse<TModel extends Type<unknown>>(
  model: TModel,
  options: ResponseOptions,
) {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto, PaginatedResponseDto, model),
    ApiResponse({
      status: options.status ?? HttpStatus.OK,
      description: options.description,
      schema: baseResponseSchema({
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(model) as unknown as string },
              },
            },
          },
        ],
      }),
    }),
  );
}

export function ApiBooleanSuccessResponse(options: ResponseOptions) {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto),
    ApiResponse({
      status: options.status ?? HttpStatus.OK,
      description: options.description,
      schema: baseResponseSchema({ type: 'boolean', example: true }),
    }),
  );
}

export function ApiNumberSuccessResponse(options: ResponseOptions) {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto),
    ApiResponse({
      status: options.status ?? HttpStatus.OK,
      description: options.description,
      schema: baseResponseSchema({
        type: 'number',
        example: 0,
        description: 'Numeric payload in `data`',
      }),
    }),
  );
}

export function ApiNullSuccessResponse(options: ResponseOptions) {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto),
    ApiResponse({
      status: options.status ?? HttpStatus.OK,
      description: options.description,
      schema: baseResponseSchema({ type: 'null', example: null }),
    }),
  );
}

/** Cursor page (`items` + `nextCursor`) with typed item schema in `data`. */
export function ApiCursorPageSuccessResponse<TModel extends Type<unknown>>(
  model: TModel,
  options: ResponseOptions,
) {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiResponse({
      status: options.status ?? HttpStatus.OK,
      description: options.description,
      schema: baseResponseSchema({
        type: 'object',
        required: ['items', 'nextCursor'],
        properties: {
          items: {
            type: 'array',
            items: { $ref: getSchemaPath(model) as unknown as string },
          },
          nextCursor: {
            type: 'string',
            nullable: true,
            description:
              'Opaque cursor for the next page, or null if no more pages',
            example: null,
          },
        },
      }),
    }),
  );
}

export function ApiErrorResponse(options: ResponseOptions) {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto),
    ApiResponse({
      status: options.status ?? HttpStatus.BAD_REQUEST,
      description: options.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              success: { type: 'boolean', example: false },
              message: { type: 'string', example: options.description },
              error: { type: 'string', example: 'Bad Request' },
              timestamp: {
                type: 'string',
                format: 'date-time',
                example: '2026-04-30T12:00:00.000Z',
              },
            },
          },
        ],
      },
    }),
  );
}
