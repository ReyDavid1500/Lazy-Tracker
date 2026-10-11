import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Default JSON limit is 100kb; /scan receives base64 photos that are several hundred kb
  app.useBodyParser('json', { limit: '10mb' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,        // auto-cast to DTO types
    }),
  );
  app.enableCors({
    origin: '*', // Allow all origins (for development purposes)
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 lazyTracker running on http://localhost:${port}`);
}

bootstrap();
