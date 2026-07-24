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
    allowRequest: jest.fn(async () => true),
    ...overrides,
  };
}

function sessionToken(subject = 'test-user') {
  const payload = btoa(
    JSON.stringify({ role: 'authenticated', sub: subject }),
  ).replaceAll('=', '');
  return `e30.${payload}.signature`;
}

function authorizedRequest(body: unknown, subject = 'test-user') {
  return new Request('https://example.test/places', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken(subject)}` },
    body: JSON.stringify(body),
  });
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

  it('accepts a bounded driving route and rejects invalid coordinates', () => {
    expect(
      validatePlacesRequest({
        action: 'route',
        origin: { latitude: 3.139, longitude: 101.6869 },
        destination: { latitude: 3.0449, longitude: 101.4456 },
        travelMode: 'DRIVE',
      }),
    ).toMatchObject({ action: 'route', travelMode: 'DRIVE' });

    expect(() =>
      validatePlacesRequest({
        action: 'route',
        origin: { latitude: 95, longitude: 101.6869 },
        destination: { latitude: 3.0449, longitude: 101.4456 },
        travelMode: 'DRIVE',
      }),
    ).toThrow('Route coordinates');

    expect(() =>
      validatePlacesRequest({
        action: 'route',
        origin: { latitude: 51.5072, longitude: -0.1276 },
        destination: { latitude: 51.51, longitude: -0.12 },
        travelMode: 'DRIVE',
      }),
    ).toThrow('Klang Valley service area');

    expect(() =>
      validatePlacesRequest({
        action: 'route',
        origin: { latitude: 2.71, longitude: 100.91 },
        destination: { latitude: 3.59, longitude: 101.99 },
        travelMode: 'DRIVE',
      }),
    ).toThrow('100 km');
  });

  it('rejects nearby searches outside the Klang Valley service area', () => {
    expect(() =>
      validatePlacesRequest({
        action: 'nearby',
        latitude: 5.4141,
        longitude: 100.3288,
        radiusMeters: 3000,
      }),
    ).toThrow('Klang Valley service area');
  });

  it('does not cache Google content in the proxy', async () => {
    const callGoogle = jest.fn().mockResolvedValue({
      routes: [
        {
          distanceMeters: 1000,
          duration: '300s',
          polyline: { encodedPolyline: 'route' },
        },
      ],
    });
    const handler = createPlacesHandler(
      dependencies({ callGoogle }),
    );

    const request = () =>
      authorizedRequest({
        action: 'route',
        origin: { latitude: 3.139, longitude: 101.6869 },
        destination: { latitude: 3.0449, longitude: 101.4456 },
        travelMode: 'DRIVE',
      });
    const firstResponse = await handler(request());
    const secondResponse = await handler(request());

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(callGoogle).toHaveBeenCalledTimes(2);
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
      authorizedRequest({
        action: 'details',
        placeId: 'ChIJ12345',
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
      authorizedRequest({ action: 'details', placeId: '../bad' }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'invalid_request' },
    });
  });

  it('preserves a safe route-specific upstream label', async () => {
    const handler = createPlacesHandler(
      dependencies({
        callGoogle: jest
          .fn()
          .mockRejectedValue(new UpstreamError('Google Routes request failed.', 500)),
      }),
    );

    const response = await handler(
      authorizedRequest({
        action: 'route',
        origin: { latitude: 3.139, longitude: 101.6869 },
        destination: { latitude: 3.0449, longitude: 101.4456 },
        travelMode: 'DRIVE',
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'places_upstream',
        message: 'Google Routes request failed.',
      },
    });
  });

  it('rate-limits by the JWT user subject when available', async () => {
    const allowRequest = jest.fn().mockResolvedValue(true);
    const handler = createPlacesHandler(dependencies({ allowRequest }));

    const response = await handler(
      authorizedRequest(
        { action: 'details', placeId: 'ChIJ12345' },
        'anonymous-user-123',
      ),
    );

    expect(response.status).toBe(200);
    expect(allowRequest).toHaveBeenCalledWith(
      'user:anonymous-user-123',
      expect.objectContaining({ action: 'details' }),
    );
  });

  it('rejects a reusable project anon JWT without a user subject', async () => {
    const payload = btoa(JSON.stringify({ role: 'anon' })).replaceAll('=', '');
    const handler = createPlacesHandler(dependencies());

    const response = await handler(
      new Request('https://example.test/places', {
        method: 'POST',
        headers: { Authorization: `Bearer e30.${payload}.signature` },
        body: JSON.stringify({
          action: 'details',
          placeId: 'ChIJ12345',
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: 'user_session_required' },
    });
  });

  it('bounds fallback rate-limit maps', () => {
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
