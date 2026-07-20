import { queryOptions } from '@tanstack/react-query';
import {
  authSuccessSchema,
  okResponseSchema,
  type ForgotPasswordBody,
  type LoginBody,
  type PublicUser,
  type RegisterBody,
  type ResetPasswordBody,
} from '@trackly/contracts';
import { ApiClientError, apiFetch } from './client';

export async function fetchMe(): Promise<PublicUser | null> {
  try {
    const data = await apiFetch<unknown>('/api/auth/me');
    return authSuccessSchema.parse(data).user;
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 401) return null;
    throw error;
  }
}

/** État de session partagé (utilisé par le routeur et les pages). */
export const meQueryOptions = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: fetchMe,
  staleTime: 30_000,
  retry: false,
});

export async function login(body: LoginBody): Promise<PublicUser> {
  const data = await apiFetch<unknown>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return authSuccessSchema.parse(data).user;
}

export async function register(body: RegisterBody): Promise<PublicUser> {
  const data = await apiFetch<unknown>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return authSuccessSchema.parse(data).user;
}

export async function logout(): Promise<void> {
  okResponseSchema.parse(await apiFetch<unknown>('/api/auth/logout', { method: 'POST' }));
}

export async function forgotPassword(body: ForgotPasswordBody): Promise<void> {
  okResponseSchema.parse(
    await apiFetch<unknown>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}

export async function resetPassword(body: ResetPasswordBody): Promise<void> {
  okResponseSchema.parse(
    await apiFetch<unknown>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}
