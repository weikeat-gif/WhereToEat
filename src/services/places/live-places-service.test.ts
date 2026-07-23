import { LivePlacesService } from '@/services/places/live-places-service';
import { PlacesServiceError } from '@/services/places/places-service';
import { createPlacesHandler } from '../../../supabase/functions/places/core';

describe('LivePlacesService', () => {
  const criteria = {
    center: { latitude: 3.139, longitude: 101.6869 },
    areaLabel: 'Klang Valley',
    radiusMeters: 3000,
    openNow: true,
    priceLevels: [1, 2] as (1 | 2)[],
    categories: [],
    verifiedHalalOnly: false,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls only the configured proxy and maps rate-limit responses', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('Too many requests', { status: 429 }));
    const service = new LivePlacesService('https://places.example.test/api');

    await expect(
      service.autocompleteArea('Klang', 'session-123'),
    ).rejects.toMatchObject<Partial<PlacesServiceError>>({
      code: 'rate-limited',
      retryable: true,
      status: 429,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://places.example.test/api',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          action: 'autocomplete',
          input: 'Klang',
          sessionToken: 'session-123',
        }),
      }),
    );
  });

  it('maps network failures without exposing provider details', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
    const service = new LivePlacesService('https://places.example.test/api');

    await expect(
      service.getPlaceDetails('place-1'),
    ).rejects.toMatchObject<Partial<PlacesServiceError>>({
      code: 'network',
      retryable: true,
    });
  });

  it('normalizes the Edge Function Google payload into shared search results', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        places: [
          {
            id: 'google-place-1',
            displayName: { text: 'Klang Supper Club' },
            formattedAddress: 'Klang, Selangor',
            location: { latitude: 3.14, longitude: 101.69 },
            rating: 4.7,
            userRatingCount: 321,
            priceLevel: 'PRICE_LEVEL_MODERATE',
            currentOpeningHours: {
              openNow: true,
              weekdayDescriptions: ['Monday: 6:00 PM – 1:00 AM'],
            },
            types: ['malaysian_restaurant', 'restaurant'],
          },
        ],
      }),
    );
    const service = new LivePlacesService(
      'https://project.supabase.co/functions/v1/places',
    );

    const result = await service.searchNearby(criteria);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/functions/v1/places',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          action: 'nearby',
          latitude: criteria.center.latitude,
          longitude: criteria.center.longitude,
          radiusMeters: criteria.radiusMeters,
          includedTypes: ['restaurant', 'cafe'],
        }),
      }),
    );
    expect(result).toMatchObject({
      criteria,
      places: [
        {
          id: 'google-place-1',
          name: 'Klang Supper Club',
          priceLevel: 2,
          isOpen: true,
          categories: ['Malaysian Restaurant', 'Restaurant'],
        },
      ],
    });
    expect(result.places[0].distanceMeters).toBeGreaterThan(0);
  });

  it('returns autocomplete predictions without issuing details requests per keystroke', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        suggestions: [
          {
            placePrediction: {
              placeId: 'klang-1',
              text: { text: 'Klang, Selangor' },
            },
          },
        ],
      }),
    );
    const service = new LivePlacesService(
      'https://project.supabase.co/functions/v1/places',
    );

    await expect(
      service.autocompleteArea('Klang', 'session-123'),
    ).resolves.toEqual([
      {
        id: 'klang-1',
        label: 'Klang, Selangor',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('matches the deployed Edge handler contract end to end', async () => {
    const handler = createPlacesHandler({
      callGoogle: jest.fn().mockResolvedValue({
        places: [
          {
            id: 'contract-place-1',
            displayName: { text: 'Contract Kitchen' },
            formattedAddress: 'Klang, Selangor',
            location: { latitude: 3.14, longitude: 101.69 },
            priceLevel: 'PRICE_LEVEL_MODERATE',
            currentOpeningHours: { openNow: true },
            types: ['restaurant'],
          },
        ],
      }),
      loadHalal: jest.fn().mockResolvedValue([]),
      allowRequest: () => true,
      getCached: () => undefined,
      setCached: () => undefined,
    });
    const service = new LivePlacesService(
      'https://project.supabase.co/functions/v1/places',
      (url, init) => handler(new Request(url, init)),
    );

    const result = await service.searchNearby(criteria);

    expect(result.places[0]).toMatchObject({
      id: 'contract-place-1',
      name: 'Contract Kitchen',
    });
  });
});
