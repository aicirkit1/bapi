import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnv } from './common/env';

async function bootstrap() {
  loadEnv(); // tiny .env loader (no extra dependency)

  const app = await NestFactory.create(AppModule);

  // All routes are served under /api.
  app.setGlobalPrefix('api');

  // Allow the Angular dev server to call the API.
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:5200',
    ],
  });

  // Validate and strip request bodies against the DTOs.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`BAPI API listening on http://localhost:${port}/api`);
}
bootstrap();
