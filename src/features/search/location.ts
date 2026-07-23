import * as Location from 'expo-location';

import type { Coordinates } from '@/contracts/place';

export type SearchLocationClient = {
  requestForegroundPermissionsAsync: () => Promise<{ status: string }>;
  getCurrentPositionAsync: (options?: {
    accuracy?: number;
  }) => Promise<{ coords: Coordinates }>;
};

export type SearchLocationResult =
  | { kind: 'granted'; coordinates: Coordinates }
  | { kind: 'manual'; reason: 'denied' | 'unavailable' };

export async function requestSearchLocation(
  client: SearchLocationClient = Location,
): Promise<SearchLocationResult> {
  try {
    const permission = await client.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      return { kind: 'manual', reason: 'denied' };
    }

    const location = await client.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      kind: 'granted',
      coordinates: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
    };
  } catch {
    return { kind: 'manual', reason: 'unavailable' };
  }
}
