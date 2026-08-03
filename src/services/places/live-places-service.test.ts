import { LivePlacesService } from '@/services/places/live-places-service';
import { PlacesServiceError } from '@/services/places/places-service';
import { createPlacesHandler } from '../../../supabase/functions/places/core';

const userJwt = `e30.${btoa(
  JSON.stringify({ role: 'authenticated', sub: 'contract-user' }),
).replaceAll('=', '')}.signature`;

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
    jest.useRealTimers();
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

  it('calls the browser fetch function with its global receiver', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(function (this: typeof globalThis) {
        if (this !== globalThis) {
          throw new TypeError("Failed to execute 'fetch': Illegal invocation");
        }
        return Promise.resolve(
          Response.json({
            id: 'place-1',
            displayName: { text: 'Food shop' },
            location: { latitude: 3.139, longitude: 101.6869 },
            types: ['restaurant'],
          }),
        );
      });
    const service = new LivePlacesService('https://places.example.test/api');

    await expect(service.getPlaceDetails('place-1')).resolves.toMatchObject({
      id: 'place-1',
      name: 'Food shop',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the Google display viewport when resolving a searched area', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        id: 'taman-sentosa',
        displayName: { text: 'Taman Sentosa' },
        formattedAddress: 'Taman Sentosa, Klang, Selangor, Malaysia',
        location: { latitude: 3.0268, longitude: 101.4372 },
        viewport: {
          low: { latitude: 3.008, longitude: 101.418 },
          high: { latitude: 3.046, longitude: 101.458 },
        },
        types: ['neighborhood', 'political'],
      }),
    );
    const service = new LivePlacesService('https://places.example.test/api');

    await expect(service.getPlaceDetails('taman-sentosa')).resolves.toMatchObject(
      {
        viewport: {
          northEast: { latitude: 3.046, longitude: 101.458 },
          southWest: { latitude: 3.008, longitude: 101.418 },
        },
      },
    );
  });

  it('maps attributed Google review excerpts on place details', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        id: 'reviewed-place',
        displayName: { text: 'Reviewed Kopitiam' },
        location: { latitude: 3.139, longitude: 101.6869 },
        types: ['restaurant'],
        reviews: [
          {
            name: 'places/reviewed-place/reviews/review-1',
            rating: 5,
            text: { text: 'Excellent kopi and quick service.' },
            relativePublishTimeDescription: '2 weeks ago',
            publishTime: '2026-07-15T08:00:00Z',
            googleMapsUri: 'https://www.google.com/maps/reviews/review-1',
            authorAttribution: {
              displayName: 'Aisha R.',
              uri: 'https://www.google.com/maps/contrib/aisha',
              photoUri: 'https://example.test/aisha.jpg',
            },
          },
        ],
      }),
    );
    const service = new LivePlacesService('https://places.example.test/api');

    await expect(service.getPlaceDetails('reviewed-place')).resolves.toMatchObject({
      reviews: [
        {
          id: 'places/reviewed-place/reviews/review-1',
          authorName: 'Aisha R.',
          rating: 5,
          text: 'Excellent kopi and quick service.',
          relativePublishTime: '2 weeks ago',
          googleMapsUrl: 'https://www.google.com/maps/reviews/review-1',
        },
      ],
    });
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

  it('aborts a stalled proxy request with a retryable timeout error', async () => {
    jest.useFakeTimers();
    const fetcher = jest.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const service = new LivePlacesService(
      'https://places.example.test/api',
      fetcher,
      25,
    );

    const failure = service.getPlaceDetails('place-1').catch((error) => error);
    await jest.advanceTimersByTimeAsync(25);

    await expect(failure).resolves.toMatchObject<Partial<PlacesServiceError>>(
      {
        code: 'network',
        retryable: true,
        message: 'The places request timed out.',
      },
    );
  });

  it('loads a validated irregular area boundary through the protected proxy', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        source: 'openstreetmap',
        sourceUrl: 'https://www.openstreetmap.org/relation/18743759',
        label: 'Bandar Sentosa, Klang, Selangor, Malaysia',
        polygons: [
          {
            outer: [
              { latitude: 2.998, longitude: 101.46 },
              { latitude: 2.988, longitude: 101.487 },
              { latitude: 3.025, longitude: 101.488 },
              { latitude: 2.998, longitude: 101.46 },
            ],
            holes: [],
          },
        ],
      }),
    );
    const service = new LivePlacesService('https://places.example.test/api');

    await expect(
      service.getAreaBoundary('Taman Sentosa, Klang, Selangor', {
        latitude: 2.999458,
        longitude: 101.4745,
      }),
    ).resolves.toMatchObject({
      source: 'openstreetmap',
      polygons: [{ outer: expect.any(Array) }],
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      action: 'boundary',
      label: 'Taman Sentosa, Klang, Selangor',
      center: { latitude: 2.999458, longitude: 101.4745 },
    });
  });

  it('keeps the timeout active while the proxy response body is parsed', async () => {
    jest.useFakeTimers();
    const fetcher = jest.fn(
      async (_url: string | URL | Request, init?: RequestInit) =>
        ({
          ok: true,
          status: 200,
          json: () =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener('abort', () =>
                reject(new DOMException('Aborted', 'AbortError')),
              );
            }),
        }) as Response,
    );
    const service = new LivePlacesService(
      'https://places.example.test/api',
      fetcher,
      25,
    );

    const failure = service.getPlaceDetails('place-1').catch((error) => error);
    await jest.advanceTimersByTimeAsync(25);

    await expect(failure).resolves.toMatchObject<Partial<PlacesServiceError>>(
      {
        code: 'network',
        retryable: true,
        message: 'The places request timed out.',
      },
    );
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
            priceRange: {
              startPrice: { currencyCode: 'MYR', units: '20' },
              endPrice: { currencyCode: 'MYR', units: '40' },
            },
            currentOpeningHours: {
              openNow: true,
              nextCloseTime: '2026-08-03T14:00:00Z',
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
          includedTypes: [
            'restaurant',
            'cafe',
            'bakery',
            'coffee_shop',
            'food_court',
            'meal_takeaway',
            'dessert_shop',
            'ice_cream_shop',
          ],
          openNow: criteria.openNow,
          priceLevels: criteria.priceLevels,
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
          priceRange: {
            currencyCode: 'MYR',
            start: 20,
            endExclusive: 40,
          },
          isOpen: true,
          nextCloseTime: '2026-08-03T14:00:00Z',
          categories: ['Malaysian Restaurant', 'Restaurant'],
        },
      ],
    });
    expect(result.places[0].distanceMeters).toBeGreaterThan(0);
  });

  it('keeps paid placement explicit while placing it before organic results', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        places: [
          {
            id: 'organic-place',
            displayName: { text: 'Closer Organic Restaurant' },
            location: { latitude: 3.1391, longitude: 101.687 },
            priceLevel: 'PRICE_LEVEL_MODERATE',
            currentOpeningHours: { openNow: true },
            types: ['restaurant'],
          },
          {
            id: 'promoted-place',
            displayName: { text: 'Clearly Sponsored Restaurant' },
            location: { latitude: 3.14, longitude: 101.69 },
            priceLevel: 'PRICE_LEVEL_MODERATE',
            currentOpeningHours: { openNow: true },
            types: ['restaurant'],
            promotion: {
              id: '3be82851-f46d-43af-9a87-466ef33685d7',
            },
          },
        ],
      }),
    );
    const service = new LivePlacesService(
      'https://project.supabase.co/functions/v1/places',
    );

    const result = await service.searchNearby(criteria);

    expect(result.places.map((place) => place.id)).toEqual([
      'promoted-place',
      'organic-place',
    ]);
    expect(result.places[0].promotion).toEqual({
      id: '3be82851-f46d-43af-9a87-466ef33685d7',
    });
  });

  it('sends a restaurant text query through the single nearby action envelope', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ places: [] }));
    const service = new LivePlacesService(
      'https://project.supabase.co/functions/v1/places',
    );

    await service.searchNearby({ ...criteria, query: 'nasi kandar' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/functions/v1/places',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          action: 'nearby',
          latitude: criteria.center.latitude,
          longitude: criteria.center.longitude,
          radiusMeters: criteria.radiusMeters,
          includedTypes: ['restaurant'],
          query: 'nasi kandar',
          openNow: criteria.openNow,
          priceLevels: criteria.priceLevels,
        }),
      }),
    );
  });

  it('forwards popularity ranking for a visible-map search', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ places: [] }));
    const service = new LivePlacesService(
      'https://project.supabase.co/functions/v1/places',
    );

    await service.searchNearby({
      ...criteria,
      radiusMeters: 6800,
      rankPreference: 'POPULARITY',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/functions/v1/places',
      expect.objectContaining({
        body: expect.stringContaining('"rankPreference":"POPULARITY"'),
      }),
    );
  });

  it('forwards exact selected-area bounds before Google applies its result cap', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ places: [] }));
    const service = new LivePlacesService(
      'https://project.supabase.co/functions/v1/places',
    );
    const areaBounds = {
      northEast: { latitude: 3.046, longitude: 101.458 },
      southWest: { latitude: 3.008, longitude: 101.418 },
    };

    await service.searchNearby({ ...criteria, areaBounds, openNow: false });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toMatchObject({
      action: 'nearby',
      areaBounds,
    });
  });

  it.each([
    {
      label: 'Cafe filter',
      changes: { categories: ['Cafe'], query: 'brunch' },
      includedTypes: ['cafe'],
    },
    {
      label: 'coffee query',
      changes: { categories: [], query: 'coffee' },
      includedTypes: ['cafe'],
    },
    {
      label: 'Chinese filter',
      changes: { categories: ['Chinese'], query: 'dumplings' },
      includedTypes: ['chinese_restaurant'],
    },
  ])(
    'maps $label to a strict Google place type',
    async ({ changes, includedTypes }) => {
      const fetchMock = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(Response.json({ places: [] }));
      const service = new LivePlacesService(
        'https://project.supabase.co/functions/v1/places',
      );

      await service.searchNearby({ ...criteria, ...changes });

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(JSON.parse(init.body as string)).toMatchObject({ includedTypes });
    },
  );

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
    const callGoogle = jest.fn().mockResolvedValue({
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
    });
    const handler = createPlacesHandler({
      callGoogle,
      loadHalal: jest.fn().mockResolvedValue([]),
      allowRequest: () => true,
    });
    const service = new LivePlacesService(
      'https://project.supabase.co/functions/v1/places',
      (url, init) => handler(new Request(url, init)),
      10_000,
      'publishable-anon-key',
      async () => userJwt,
    );

    const result = await service.searchNearby({
      ...criteria,
      query: 'contract kitchen',
    });

    expect(result.places[0]).toMatchObject({
      id: 'contract-place-1',
      name: 'Contract Kitchen',
    });
    expect(callGoogle).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'nearby',
        query: 'contract kitchen',
      }),
    );
  });
});
