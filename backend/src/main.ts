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

  // Close cleanly on watch-restart / Ctrl-C so the port is freed immediately
  // (prevents EADDRINUSE crashes when `nest start --watch` restarts).
  app.enableShutdownHooks();
  const shutdown = async () => {
    try {
      await app.close();
    } finally {
      process.exit(0);
    }
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  const port = process.env.PORT ?? 4000;
  await listenWithRetry(app, Number(port));

  // eslint-disable-next-line no-console
  console.log(`BAPI API listening on http://localhost:${port}/api`);
}

/** Retry once on EADDRINUSE — covers the brief overlap during a watch restart. */
async function listenWithRetry(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
  port: number,
  attempt = 0,
): Promise<void> {
  try {
    await app.listen(port);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE' && attempt < 5) {
      // eslint-disable-next-line no-console
      console.warn(`Port ${port} busy, retrying… (${attempt + 1}/5)`);
      await new Promise((r) => setTimeout(r, 700));
      return listenWithRetry(app, port, attempt + 1);
    }
    throw err;
  }
}

bootstrap();
