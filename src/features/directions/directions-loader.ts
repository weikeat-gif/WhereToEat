import type { RoutePlan } from '@/contracts/route';
import {
  requestSearchLocation,
  type SearchLocationClient,
} from '@/features/search/location';
import { placesService } from '@/services/places';
import type { PlacesService } from '@/services/places/places-service';
import { routesService } from '@/services/routes';
import type { RoutesService } from '@/services/routes/routes-service';

import {
  loadDisplayPlace,
} from '@/features/place-details/place-details-loader';
import type { DiscoveryPlace } from '@/features/home/discovery-data';

export class DirectionsLocationError extends Error {
  constructor(
    readonly reason: 'denied' | 'unavailable',
    readonly canAskAgain?: boolean,
  ) {
    super(
      reason === 'denied'
        ? 'Location access is required to build an in-app route. Enable GPS permission and try again.'
        : 'Your current location is unavailable. Check GPS and try again.',
    );
    this.name = 'DirectionsLocationError';
  }
}

export async function loadDirections(
  id: string | undefined,
  dependencies: {
    places?: PlacesService;
    routes?: RoutesService;
    location?: SearchLocationClient;
  } = {},
): Promise<{ place: DiscoveryPlace; route: RoutePlan }> {
  const place = await loadDisplayPlace(id, dependencies.places ?? placesService);
  const location = await requestSearchLocation(dependencies.location);
  if (location.kind === 'manual') {
    throw new DirectionsLocationError(
      location.reason,
      location.canAskAgain,
    );
  }

  const route = await (dependencies.routes ?? routesService).getRoute({
    origin: location.coordinates,
    destination: place.coordinates,
    travelMode: 'DRIVE',
  });

  return { place, route };
}
