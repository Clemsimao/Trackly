import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import type { PublicUser } from '@trackly/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PasswordService } from './password.service';
import { ResetTokenService } from './reset-token.service';
import { SessionService } from './session.service';

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly resetTokens: ResetTokenService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string, displayName: string): Promise<User> {
    const passwordHash = await this.passwords.hash(password);
    try {
      const user = await this.prisma.user.create({
        data: { email, displayName, passwordHash },
      });
      this.logger.log(`Compte créé : ${user.id}`);
      return user;
    } catch (error: unknown) {
      // E-mail déjà pris (P2002) : message générique, sans confirmer l'existence
      // du compte (anti-énumération, story A1)
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          statusCode: 409,
          code: 'REGISTRATION_FAILED',
          message: 'Impossible de créer un compte avec ces informations.',
        });
      }
      throw error;
    }
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Temps de réponse constant que l'e-mail existe ou non (story A2)
      await this.passwords.verifyDummy(password);
      throw this.invalidCredentials();
    }
    const valid = await this.passwords.verify(user.passwordHash, password);
    if (!valid) throw this.invalidCredentials();
    return user;
  }

  /** Réponse identique que l'e-mail existe ou non (story A3). */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;
    const token = await this.resetTokens.create(user.id);
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:5173';
    const resetUrl = `${appUrl}/reinitialisation?token=${token}`;
    await this.mail.sendPasswordReset(user.email, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.resetTokens.consume(token);
    if (!userId) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_RESET_TOKEN',
        message: 'Lien invalide ou expiré. Refais une demande de réinitialisation.',
      });
    }
    const passwordHash = await this.passwords.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    // Toutes les sessions existantes sont révoquées (story A3)
    await this.sessions.revokeAllForUser(userId);
    this.logger.log(`Mot de passe réinitialisé : ${userId}`);
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail ou mot de passe incorrect.',
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}
