import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Provider, Type } from '@nestjs/common';
import type { TestingModuleBuilder } from '@nestjs/testing';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';

export async function createHttpTestApp(options: {
  controllers: Type<unknown>[];
  providers?: Provider[];
  overrideGuards?: Array<{
    guard: Type<unknown>;
    canActivate: (context: unknown) => boolean;
  }>;
}): Promise<{ app: INestApplication; close: () => Promise<void> }> {
  let builder: TestingModuleBuilder = Test.createTestingModule({
    controllers: options.controllers,
    providers: options.providers ?? [],
  });

  for (const og of options.overrideGuards ?? []) {
    builder = builder.overrideGuard(og.guard).useValue({
      canActivate: og.canActivate,
    });
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  return {
    app,
    close: async () => {
      await app.close();
    },
  };
}
