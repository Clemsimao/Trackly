import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { SessionGuard } from './auth/session.guard';
import { CatalogModule } from './catalog/catalog.module';
import { AppThrottlerGuard } from './common/throttler.guard';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        // JSON structuré en production, lisible en dev
        transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    // Limite globale généreuse ; les routes d'auth ont leur @Throttle strict.
    // L'IP réelle du client est extraite par AppThrottlerGuard (CF-Connecting-IP).
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 100, ttl: 60_000 }],
    }),
    PrismaModule,
    AuthModule,
    CatalogModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
