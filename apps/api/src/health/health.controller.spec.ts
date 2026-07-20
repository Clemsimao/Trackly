import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@trackly/contracts';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('répond ok avec une forme conforme au contrat partagé', () => {
    const controller = new HealthController();
    const response = controller.check();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('trackly-api');
    expect(healthResponseSchema.safeParse(response).success).toBe(true);
  });

  it('reste publique — le monitoring et le keep-alive en dépendent (régression Lot 1)', () => {
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, HealthController.prototype.check) as
      boolean | undefined;
    expect(isPublic).toBe(true);
  });
});
