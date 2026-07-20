import { Controller, Get } from '@nestjs/common';
import { healthResponseSchema, type HealthResponse } from '@trackly/contracts';

@Controller('health')
export class HealthController {
  /**
   * Ne doit JAMAIS toucher la base de données : sert au monitoring externe
   * et au keep-alive éventuel sans réveiller Postgres (docs/cadrage/04).
   */
  @Get()
  check(): HealthResponse {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'trackly-api',
      version: process.env.APP_VERSION ?? '0.1.0',
      timestamp: new Date().toISOString(),
    });
  }
}
