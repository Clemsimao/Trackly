import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Connexion paresseuse (premier accès réel) : l'API doit démarrer et répondre
 * sur /health même si la base est indisponible (règle actée, docs/cadrage/04).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
