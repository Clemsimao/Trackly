import { dashboardResponseSchema, type DashboardResponse } from '@trackly/contracts';
import { apiFetch } from './client';

export async function getDashboard(): Promise<DashboardResponse> {
  return dashboardResponseSchema.parse(await apiFetch<unknown>('/api/dashboard'));
}
