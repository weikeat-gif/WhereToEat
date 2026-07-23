import type { PlacesService } from '@/services/places/places-service';

import { loadDisplayPlace } from './place-details-loader';

describe('loadDisplayPlace', () => {
  it('loads an unknown Google place through the configured Places service', async () => {
    const service: PlacesService = {
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
        priceLevel: 2,
        isOpen: true,
        categories: ['Malaysian Restaurant'],
        address: 'Klang, Selangor',
        openingHours: ['Monday: 6:00 PM – 1:00 AM'],
        photoUrls: [],
      }),
    };

    const place = await loadDisplayPlace('google-place-1', service);

    expect(service.getPlaceDetails).toHaveBeenCalledWith('google-place-1');
    expect(place).toMatchObject({
      id: 'google-place-1',
      name: 'Klang Supper Club',
      openingNote: 'Monday: 6:00 PM – 1:00 AM',
    });
    expect(place.image).toBeUndefined();
    expect(place.popularPicks).toEqual([]);
  });

  it('rejects a missing route id instead of showing the wrong restaurant', async () => {
    const service = {
      autocompleteArea: jest.fn(),
      searchNearby: jest.fn(),
      getPlaceDetails: jest.fn(),
    } satisfies PlacesService;

    await expect(loadDisplayPlace(undefined, service)).rejects.toThrow(
      'Place ID is missing.',
    );
    expect(service.getPlaceDetails).not.toHaveBeenCalled();
  });
});
