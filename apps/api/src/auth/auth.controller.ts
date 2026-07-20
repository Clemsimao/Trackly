import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  type AuthSuccess,
  type ForgotPasswordBody,
  type LoginBody,
  type OkResponse,
  type RegisterBody,
  type ResetPasswordBody,
} from '@trackly/contracts';
import type { User } from '@prisma/client';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService, toPublicUser } from './auth.service';
import { CurrentUser, type RequestWithUser } from './current-user.decorator';
import { Public } from './public.decorator';
import { SESSION_COOKIE, SessionService } from './session.service';

/** Anti-brute-force (story A2) : 5 tentatives/min sur les routes sensibles. */
const STRICT_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Throttle(STRICT_THROTTLE)
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerBodySchema)) body: RegisterBody,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccess> {
    const user = await this.auth.register(body.email, body.password, body.displayName);
    // Connexion automatique après inscription (story A1)
    await this.startSession(res, user.id, false);
    return { user: toPublicUser(user) };
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @HttpCode(200)
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginBodySchema)) body: LoginBody,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccess> {
    const user = await this.auth.login(body.email, body.password);
    await this.startSession(res, user.id, body.rememberMe);
    return { user: toPublicUser(user) };
  }

  @HttpCode(200)
  @Post('logout')
  async logout(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<OkResponse> {
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (token) await this.sessions.revoke(token);
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: User): AuthSuccess {
    return { user: toPublicUser(user) };
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @HttpCode(200)
  @Post('forgot-password')
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordBodySchema)) body: ForgotPasswordBody,
  ): Promise<OkResponse> {
    await this.auth.requestPasswordReset(body.email);
    // Toujours la même réponse, e-mail connu ou non (story A3)
    return { ok: true };
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordBodySchema)) body: ResetPasswordBody,
  ): Promise<OkResponse> {
    await this.auth.resetPassword(body.token, body.password);
    return { ok: true };
  }

  private async startSession(res: Response, userId: string, rememberMe: boolean): Promise<void> {
    const { token, maxAgeMs } = await this.sessions.create(userId, rememberMe);
    res.cookie(SESSION_COOKIE, token, {
      ...this.cookieOptions(),
      ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
  }
}
