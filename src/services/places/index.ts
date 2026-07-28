import { env } from '@/config/env';
import { LivePlacesService } from '@/services/places/live-places-service';
import { MockPlacesService } from '@/services/places/mock-places-service';
import type { PlacesService } from '@/services/places/places-service';

const getFunctionsAccessToken = async () =>
  (
    await import('@/services/supabase/functions-session')
  ).getFunctionsAccessToken();

export function createPlacesService(
  mode = env.EXPO_PUBLIC_DATA_MODE,
  proxyUrl = env.EXPO_PUBLIC_PLACES_PROXY_URL,
): PlacesService {
  return mode === 'live'
    ? new LivePlacesService(
        proxyUrl,
        (...args) => fetch(...args),
        10_000,
        env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        getFunctionsAccessToken,
      )
    : new MockPlacesService();
}

export const placesService = createPlacesService();

export * from '@/services/places/live-places-service';
export * from '@/services/places/mock-places-service';
export * from '@/services/places/places-service';
