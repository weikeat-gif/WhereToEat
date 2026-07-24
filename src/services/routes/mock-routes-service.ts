import type { Coordinates } from '@/contracts/place';
import type { RouteRequest } from '@/contracts/route';
import { distanceInMeters } from '@/services/places/mock-places-service';
import type { RoutesService } from '@/services/routes/routes-service';

function interpolate(
  origin: Coordinates,
  destination: Coordinates,
  progress: number,
): Coordinates {
  const bend = Math.sin(progress * Math.PI) * 0.002;
  return {
    latitude:
      origin.latitude +
      (destination.latitude - origin.latitude) * progress +
      bend,
    longitude:
      origin.longitude +
      (destination.longitude - origin.longitude) * progress -
      bend * 0.6,
  };
}

export class MockRoutesService implements RoutesService {
  async getRoute({ origin, destination }: RouteRequest) {
    const distanceMeters = distanceInMeters(origin, destination);
    return {
      origin,
      destination,
      coordinates: Array.from({ length: 13 }, (_, index) =>
        interpolate(origin, destination, index / 12),
      ),
      distanceMeters,
      durationSeconds: Math.max(180, Math.round(distanceMeters / 8.3)),
      provider: 'mock' as const,
    };
  }
}
