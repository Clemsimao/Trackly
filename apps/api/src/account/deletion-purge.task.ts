import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccountService } from './account.service';

/**
 * Purge des comptes dont le délai de grâce est écoulé (CA A5).
 *
 * Planifié dans l'API plutôt que sur le LXC : le déploiement suffit, aucune
 * entrée de crontab à poser à la main. Contrepartie : si le conteneur est
 * arrêté longtemps, la purge ne tourne pas — elle rattrape au redémarrage,
 * puisqu'elle travaille sur une échéance et non sur un instant précis.
 */
@Injectable()
export class DeletionPurgeTask {
  private readonly logger = new Logger(DeletionPurgeTask.name);

  constructor(private readonly account: AccountService) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'purge-comptes-supprimes' })
  async purger(): Promise<void> {
    try {
      const nombre = await this.account.purgeExpiredDeletions();
      if (nombre > 0) this.logger.log(`${nombre} compte(s) purgé(s)`);
    } catch (error) {
      // Une purge qui échoue ne doit pas faire tomber l'application :
      // le prochain passage reprendra les comptes encore dus.
      this.logger.error('Échec de la purge des comptes supprimés', error);
    }
  }
}
