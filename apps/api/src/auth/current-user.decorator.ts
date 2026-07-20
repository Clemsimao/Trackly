import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@prisma/client';

export interface RequestWithUser extends Request {
  user?: User;
  sessionId?: string;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  if (!request.user) {
    // Le SessionGuard garantit la présence de user sur les routes non publiques
    throw new Error('CurrentUser utilisé sur une route sans session');
  }
  return request.user;
});
