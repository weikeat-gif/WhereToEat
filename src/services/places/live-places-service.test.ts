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
          isOpen: true,
          categories: ['Malaysian Restaurant', 'Restaurant'],
        },
      ],
    });
    expect(result.places[0].distanceMeters).toBeGreaterThan(0);
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
