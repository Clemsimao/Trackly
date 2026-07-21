import { Injectable } from '@nestjs/common';
import type { DurationWithProvenance, TimeToBeat, UpdateDurationsBody } from '@trackly/contracts';
import { PrismaService } from '../prisma/prisma.service';

const ENTITY_TYPE = 'game_work';
type DurationField = 'mainSeconds' | 'mainExtraSeconds' | 'completionistSeconds';
const FIELDS: DurationField[] = ['mainSeconds', 'mainExtraSeconds', 'completionistSeconds'];

export interface GameDurations {
  main: DurationWithProvenance;
  mainExtra: DurationWithProvenance;
  completionist: DurationWithProvenance;
}

/**
 * Provenance des données (exigence forte du cahier des charges) : chaque durée
 * affichée est `auto` (fournisseur), `manual` (saisie, le fournisseur n'avait rien)
 * ou `overridden` (valeur du fournisseur remplacée). Les overrides sont personnels
 * et survivent aux rafraîchissements du snapshot partagé.
 */
@Injectable()
export class OverridesService {
  constructor(private readonly prisma: PrismaService) {}

  async getGameDurations(
    userId: string,
    gameWorkId: string,
    snapshot: TimeToBeat | null,
  ): Promise<GameDurations> {
    const overrides = await this.prisma.fieldOverride.findMany({
      where: { userId, entityType: ENTITY_TYPE, entityId: gameWorkId },
    });
    const resolve = (field: DurationField): DurationWithProvenance => {
      const override = overrides.find((o) => o.fieldName === field);
      if (override) {
        return {
          seconds: override.value as number,
          provenance: override.source as 'manual' | 'overridden',
        };
      }
      const auto = snapshot?.[field] ?? null;
      return { seconds: auto, provenance: auto === null ? null : 'auto' };
    };
    return {
      main: resolve('mainSeconds'),
      mainExtra: resolve('mainExtraSeconds'),
      completionist: resolve('completionistSeconds'),
    };
  }

  /** null = effacer l'override et revenir à la valeur automatique. */
  async setGameDurations(
    userId: string,
    gameWorkId: string,
    snapshot: TimeToBeat | null,
    body: UpdateDurationsBody,
  ): Promise<void> {
    for (const field of FIELDS) {
      const value = body[field];
      if (value === undefined) continue;
      const where = {
        userId_entityType_entityId_fieldName: {
          userId,
          entityType: ENTITY_TYPE,
          entityId: gameWorkId,
          fieldName: field,
        },
      };
      if (value === null) {
        await this.prisma.fieldOverride.deleteMany({
          where: { userId, entityType: ENTITY_TYPE, entityId: gameWorkId, fieldName: field },
        });
        continue;
      }
      const source = snapshot?.[field] != null ? 'overridden' : 'manual';
      await this.prisma.fieldOverride.upsert({
        where,
        create: {
          userId,
          entityType: ENTITY_TYPE,
          entityId: gameWorkId,
          fieldName: field,
          value,
          source,
        },
        update: { value, source },
      });
    }
  }
}
