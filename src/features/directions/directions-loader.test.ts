import type { PlacesService } from '@/services/places/places-service';
import type { RoutesService } from '@/services/routes/routes-service';

import {
  DirectionsLocationError,
  loadDirections,
} from './directions-loader';

const places = {
  autocompleteArea: jest.fn(),
  searchNearby: jest.fn(),
  getPlaceDetails: jest.fn().mockResolvedValue({
    id: 'google-place-1',
    name: 'Klang Supper Club',
    subtitle: 'Klang, Selangor',
    coordinates: { latitude: 3.04, longitude: 101.45 },
    distanceMeters: 1200,
    rating: 4.7,
    reviewCount: 123,
    categories: ['Restaurant'],
    address: 'Klang, Selangor',
    openingHours: [],
    photoUrls: [],
  }),
} satisfies PlacesService;

describe('loadDirections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses foreground GPS as the origin and keeps routing inside the app', async () => {
    const routes = {
      getRoute: jest.fn().mockResolvedValue({
        origin: { latitude: 3.14, longitude: 101.69 },
        destination: { latitude: 3.04, longitude: 101.45 },
        coordinates: [
          { latitude: 3.14, longitude: 101.69 },
          { latitude: 3.04, longitude: 101.45 },
        ],
        distanceMeters: 28_000,
        durationSeconds: 2400,
        provider: 'google',
      }),
    } satisfies RoutesService;
    const location = {
      requestForegroundPermissionsAsync: jest
        .fn()
        .mockResolvedValue({ status: 'granted' }),
      getCurrentPositionAsync: jest.fn().mockResolvedValue({
        coords: { latitude: 3.14, longitude: 101.69 },
      }),
    };

    await expect(
      loadDirections('google-place-1', { places, routes, location }),
    ).resolves.toMatchObject({
      place: { id: 'google-place-1' },
      route: { provider: 'google', distanceMeters: 28_000 },
    });
    expect(routes.getRoute).toHaveBeenCalledWith({
      origin: { latitude: 3.14, longitude: 101.69 },
      destination: { latitude: 3.04, longitude: 101.45 },
      travelMode: 'DRIVE',
    });
  });

  it('returns an actionable error when GPS permission is denied', async () => {
    const routes = { getRoute: jest.fn() } satisfies RoutesService;
    const location = {
      requestForegroundPermissionsAsync: jest
        .fn()
        .mockResolvedValue({ status: 'denied', canAskAgain: false }),
      getCurrentPositionAsync: jest.fn(),
    };

    await expect(
      loadDirections('google-place-1', { places, routes, location }),
    ).rejects.toMatchObject<Partial<DirectionsLocationError>>({
      reason: 'denied',
      canAskAgain: false,
      message: expect.stringContaining('Enable GPS permission'),
    });
    expect(routes.getRoute).not.toHaveBeenCalled();
  });
});
