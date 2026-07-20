import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@trackly/contracts';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('répond ok avec une forme conforme au contrat partagé', () => {
    const controller = new HealthController();
    const response = controller.check();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('trackly-api');
    expect(healthResponseSchema.safeParse(response).success).toBe(true);
  });
});
