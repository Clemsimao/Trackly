import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Envoi d'e-mails transactionnels via l'API HTTP Resend.
 * Sans RESEND_API_KEY configurée, le lien est journalisé (mode dev/démo) :
 * l'application reste utilisable, l'e-mail réel s'active en posant la clé.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send(to, 'Réinitialisation de ton mot de passe Trackly', [
      'Bonjour,',
      '',
      'Quelqu’un (toi, normalement) a demandé la réinitialisation du mot de passe de ton compte Trackly.',
      `Ce lien est valable 1 heure : ${resetUrl}`,
      '',
      'Si tu n’es pas à l’origine de cette demande, ignore simplement cet e-mail.',
    ]);
  }

  /**
   * Suppression demandée (A5). C'est le filet de sécurité du délai de grâce :
   * il doit fonctionner même si l'utilisateur n'a plus accès à son compte,
   * d'où le lien d'annulation à jeton plutôt qu'un simple avertissement.
   */
  async sendDeletionRequested(to: string, cancelUrl: string, scheduledFor: Date): Promise<void> {
    const quand = scheduledFor.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    await this.send(to, 'Ton compte Trackly sera supprimé le ' + quand, [
      'Bonjour,',
      '',
      `La suppression de ton compte Trackly a été demandée. Il sera effacé définitivement le ${quand}, avec toute ta bibliothèque.`,
      '',
      'Tu peux encore tout annuler d’un clic, sans te connecter :',
      cancelUrl,
      '',
      'Si tu n’es pas à l’origine de cette demande, utilise ce lien maintenant et change ton mot de passe.',
    ]);
  }

  /** Purge effectuée : dernier message envoyé à cette adresse. */
  async sendDeletionCompleted(to: string): Promise<void> {
    await this.send(to, 'Ton compte Trackly a été supprimé', [
      'Bonjour,',
      '',
      'Ton compte Trackly et toutes les données associées ont été définitivement effacés.',
      '',
      'Il ne reste rien à ton nom dans nos bases. Merci d’avoir essayé Trackly.',
    ]);
  }

  private async send(to: string, subject: string, lines: string[]): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(`RESEND_API_KEY absente — e-mail « ${subject} » pour ${to} :`);
      this.logger.warn(lines.join('\n'));
      return;
    }

    const from = this.config.get<string>('MAIL_FROM') ?? 'Trackly <onboarding@resend.dev>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, text: lines.join('\n') }),
    });

    if (!response.ok) {
      // On journalise sans faire échouer la requête : la réponse de /forgot-password
      // doit rester identique quoi qu'il arrive (anti-énumération, story A3)
      this.logger.error(`Échec d'envoi Resend (${response.status}) pour ${to}`);
    }
  }
}
