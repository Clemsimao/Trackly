import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  // Derrière nginx + Cloudflare : req.ip et req.secure reflètent le client réel
  app.set('trust proxy', 1);
  app.use(cookieParser());
  // API JSON : en-têtes de sécurité utiles, sans CSP (gérée côté front/nginx)
  app.use(helmet({ contentSecurityPolicy: false }));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`API Trackly démarrée sur le port ${port}`);
}

void bootstrap();
