import { describe, expect, it, vi } from 'vitest';
import type { TimeToBeat } from '@trackly/contracts';
import type { PrismaService } from '../prisma/prisma.service';
import { OverridesService } from './overrides.service';

const snapshot: TimeToBeat = {
  mainSeconds: 36000,
  mainExtraSeconds: 90000,
  completionistSeconds: null,
  submissionCount: 120,
};

function makePrisma(overrides: Array<{ fieldName: string; value: number; source: string }> = []) {
  return {
    fieldOverride: {
      findMany: vi.fn().mockResolvedValue(overrides),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  } as unknown as PrismaService;
}

describe('OverridesService — provenance des durées (exigence du cahier des charges)', () => {
  it('sans override : valeur du fournisseur, provenance auto ; absente : null', async () => {
    const service = new OverridesService(makePrisma());
    const durations = await service.getGameDurations('u1', 'w1', snapshot);
    expect(durations.main).toEqual({ seconds: 36000, provenance: 'auto' });
    expect(durations.completionist).toEqual({ seconds: null, provenance: null });
  });

  it('un override remplace la valeur et porte sa provenance', async () => {
    const service = new OverridesService(
      makePrisma([{ fieldName: 'mainSeconds', value: 40000, source: 'overridden' }]),
    );
    const durations = await service.getGameDurations('u1', 'w1', snapshot);
    expect(durations.main).toEqual({ seconds: 40000, provenance: 'overridden' });
    expect(durations.mainExtra).toEqual({ seconds: 90000, provenance: 'auto' });
  });

  it('écrit « overridden » si le fournisseur avait une valeur, « manual » sinon', async () => {
    const prisma = makePrisma();
    const service = new OverridesService(prisma);
    await service.setGameDurations('u1', 'w1', snapshot, {
      mainSeconds: 40000,
      completionistSeconds: 150000,
    });
    const calls = (prisma.fieldOverride.upsert as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]?.[0]?.create?.source).toBe('overridden');
    expect(calls[1]?.[0]?.create?.source).toBe('manual');
  });

  it('null efface l’override (retour à la valeur automatique)', async () => {
    const prisma = makePrisma();
    const service = new OverridesService(prisma);
    await service.setGameDurations('u1', 'w1', snapshot, { mainSeconds: null });
    expect(prisma.fieldOverride.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', entityType: 'game_work', entityId: 'w1', fieldName: 'mainSeconds' },
    });
    expect(prisma.fieldOverride.upsert).not.toHaveBeenCalled();
  });

  it('sans snapshot (jeu sans durées IGDB) : la saisie est « manual »', async () => {
    const prisma = makePrisma();
    const service = new OverridesService(prisma);
    await service.setGameDurations('u1', 'w1', null, { mainSeconds: 7200 });
    const calls = (prisma.fieldOverride.upsert as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]?.[0]?.create?.source).toBe('manual');
  });
});
