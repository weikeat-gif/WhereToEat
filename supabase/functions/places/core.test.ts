import {
  createPlacesHandler,
  fetchWithTimeout,
  filterCurrentHalalRecords,
  setBoundedMapValue,
  type PlacesDependencies,
  UpstreamError,
  validatePlacesRequest,
} from './core';

function dependencies(
  overrides: Partial<PlacesDependencies> = {},
): PlacesDependencies {
  return {
    callGoogle: jest.fn().mockResolvedValue({ places: [] }),
    loadHalal: jest.fn().mockResolvedValue([]),
    allowRequest: jest.fn(() => true),
    getCached: jest.fn(),
    setCached: jest.fn(),
    ...overrides,
  };
}

describe('places Edge Function core', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects invalid nearby input', () => {
    expect(() =>
      validatePlacesRequest({
        action: 'nearby',
        latitude: 120,
        longitude: 101.6,
        radiusMeters: 500,
      }),
    ).toThrow('invalid');
  });

  it('excludes expired Halal verification records', () => {
    const rows = filterCurrentHalalRecords(
      [
        {
          google_place_id: 'current',
          source_name: 'JAKIM Halal Malaysia',
          source_url: 'https://www.halal.gov.my/current',
          verified_at: '2026-01-01T00:00:00Z',
          expires_at: '2027-01-01T00:00:00Z',
        },
        {
          google_place_id: 'lookalike',
          source_name: 'JAKIM Halal Malaysia',
          source_url: 'https://halal.gov.my.example.com/current',
          verified_at: '2026-01-01T00:00:00Z',
          expires_at: '2027-01-01T00:00:00Z',
        },
        {
          google_place_id: 'expired',
          source_name: 'JAKIM',
          source_url: 'https://example.com/expired',
          verified_at: '2025-01-01T00:00:00Z',
          expires_at: '2026-01-01T00:00:00Z',
        },
      ],
      new Date('2026-07-23T00:00:00Z'),
    );
    expect(rows.map((row) => row.google_place_id)).toEqual(['current']);
  });

  it('maps Google rate limits without exposing upstream payloads', async () => {
    const handler = createPlacesHandler(
      dependencies({
        callGoogle: jest
          .fn()
          .mockRejectedValue(new UpstreamError('Google request failed.', 429)),
      }),
    );
    const response = await handler(
      new Request('https://example.test/places', {
        method: 'POST',
        body: JSON.stringify({
          action: 'details',
          placeId: 'ChIJ12345',
        }),
      }),
    );
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'upstream_rate_limited',
        message: 'Google request failed.',
      },
    });
  });

  it('returns a structured validation error', async () => {
    const handler = createPlacesHandler(dependencies());
    const response = await handler(
      new Request('https://example.test/places', {
        method: 'POST',
        body: JSON.stringify({ action: 'details', placeId: '../bad' }),
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'invalid_request' },
    });
  });

  it('bounds fallback cache and rate-limit maps', () => {
    const values = new Map<string, number>([
      ['oldest', 1],
      ['newer', 2],
    ]);

    setBoundedMapValue(values, 2, 'newest', 3);

    expect([...values.entries()]).toEqual([
      ['newer', 2],
      ['newest', 3],
    ]);
  });

  it('aborts stalled upstream response bodies at the configured deadline', async () => {
    jest.useFakeTimers();
    const fetcher = jest.fn(
      async (_input: string | URL | Request, init?: RequestInit) =>
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

    const failure = fetchWithTimeout(
      fetcher,
      'https://places.example.test',
      {},
      (response) => response.json(),
      25,
    ).catch((error) => error);
    await jest.advanceTimersByTimeAsync(25);

    await expect(failure).resolves.toMatchObject({ name: 'AbortError' });
  });
});
