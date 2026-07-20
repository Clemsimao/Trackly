import { Controller, Get } from '@nestjs/common';
import { healthResponseSchema, type HealthResponse } from '@trackly/contracts';
import { Public } from '../auth/public.decorator';

@Controller('health')
export class HealthController {
  /**
   * Publique (monitoring externe, keep-alive) et ne doit JAMAIS toucher la
   * base de données (docs/cadrage/04).
   */
  @Public()
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
