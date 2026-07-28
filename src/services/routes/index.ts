import { env } from '@/config/env';
import { LiveRoutesService } from '@/services/routes/live-routes-service';
import { MockRoutesService } from '@/services/routes/mock-routes-service';
import type { RoutesService } from '@/services/routes/routes-service';

const getFunctionsAccessToken = async () =>
  (
    await import('@/services/supabase/functions-session')
  ).getFunctionsAccessToken();

export function createRoutesService(
  mode = env.EXPO_PUBLIC_DATA_MODE,
  proxyUrl = env.EXPO_PUBLIC_PLACES_PROXY_URL,
): RoutesService {
  return mode === 'live'
    ? new LiveRoutesService(
        proxyUrl,
        (...args) => fetch(...args),
        10_000,
        env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        getFunctionsAccessToken,
      )
    : new MockRoutesService();
}

export const routesService = createRoutesService();

export * from '@/services/routes/live-routes-service';
export * from '@/services/routes/mock-routes-service';
export * from '@/services/routes/routes-service';
