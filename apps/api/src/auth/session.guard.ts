import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SESSION_COOKIE, SessionService } from './session.service';
import type { RequestWithUser } from './current-user.decorator';

/**
 * Guard global : toute route est protégée sauf marquage explicite @Public().
 * Sécurisé par défaut — impossible d'oublier de protéger un futur endpoint.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];

    // Même sur une route publique, on attache l'utilisateur si la session est valide
    if (token) {
      const session = await this.sessions.validate(token);
      if (session) {
        request.user = session.user;
        request.sessionId = session.id;
      }
    }

    if (isPublic) return true;
    if (!request.user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Connexion requise',
      });
    }
    return true;
  }
}
