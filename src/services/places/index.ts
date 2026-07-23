import { env } from '@/config/env';
import { LivePlacesService } from '@/services/places/live-places-service';
import { MockPlacesService } from '@/services/places/mock-places-service';
import type { PlacesService } from '@/services/places/places-service';

export function createPlacesService(
  mode = env.EXPO_PUBLIC_DATA_MODE,
  proxyUrl = env.EXPO_PUBLIC_PLACES_PROXY_URL,
): PlacesService {
  return mode === 'live'
    ? new LivePlacesService(proxyUrl)
    : new MockPlacesService();
}

export const placesService = createPlacesService();

export * from '@/services/places/live-places-service';
export * from '@/services/places/mock-places-service';
export * from '@/services/places/places-service';
