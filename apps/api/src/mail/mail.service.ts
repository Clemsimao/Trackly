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
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        `RESEND_API_KEY absente — lien de réinitialisation pour ${to} : ${resetUrl}`,
      );
      return;
    }

    const from = this.config.get<string>('MAIL_FROM') ?? 'Trackly <onboarding@resend.dev>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Réinitialisation de ton mot de passe Trackly',
        text: [
          'Bonjour,',
          '',
          'Quelqu’un (toi, normalement) a demandé la réinitialisation du mot de passe de ton compte Trackly.',
          `Ce lien est valable 1 heure : ${resetUrl}`,
          '',
          'Si tu n’es pas à l’origine de cette demande, ignore simplement cet e-mail.',
        ].join('\n'),
      }),
    });

    if (!response.ok) {
      // On journalise sans faire échouer la requête : la réponse de /forgot-password
      // doit rester identique quoi qu'il arrive (anti-énumération, story A3)
      this.logger.error(`Échec d'envoi Resend (${response.status}) pour ${to}`);
    }
  }
}
