import { LiveRoutesService } from '@/services/routes/live-routes-service';
import { RoutesServiceError } from '@/services/routes/routes-service';
import {
  createPlacesHandler,
  type PlacesDependencies,
} from '../../../supabase/functions/places/core';

const userJwt = `e30.${btoa(
  JSON.stringify({ role: 'authenticated', sub: 'contract-user' }),
).replaceAll('=', '')}.signature`;

describe('LiveRoutesService', () => {
  const request = {
    origin: { latitude: 3.139, longitude: 101.6869 },
    destination: { latitude: 3.0449, longitude: 101.4456 },
    travelMode: 'DRIVE' as const,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requests the protected route action and normalizes the route polyline', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      Response.json({
        routes: [
          {
            distanceMeters: 788_000,
            duration: '10800s',
            polyline: {
              encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
            },
          },
        ],
      }),
    );
    const service = new LiveRoutesService(
      'https://project.supabase.co/functions/v1/places',
      fetcher,
      10_000,
      'publishable-anon-key',
      async () => userJwt,
    );

    await expect(service.getRoute(request)).resolves.toMatchObject({
      origin: request.origin,
      destination: request.destination,
      distanceMeters: 788_000,
      durationSeconds: 10_800,
      provider: 'google',
      coordinates: [
        { latitude: 38.5, longitude: -120.2 },
        { latitude: 40.7, longitude: -120.95 },
        { latitude: 43.252, longitude: -126.453 },
      ],
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://project.supabase.co/functions/v1/places',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'publishable-anon-key',
          Authorization: `Bearer ${userJwt}`,
        }),
        body: JSON.stringify({
          action: 'route',
          origin: request.origin,
          destination: request.destination,
          travelMode: 'DRIVE',
        }),
      }),
    );
  });

  it('maps route rate limits into a retryable app error', async () => {
    const service = new LiveRoutesService(
      'https://project.supabase.co/functions/v1/places',
      jest.fn().mockResolvedValue(new Response(null, { status: 429 })),
    );

    await expect(service.getRoute(request)).rejects.toMatchObject<
      Partial<RoutesServiceError>
    >({
      code: 'rate-limited',
      retryable: true,
    });
  });

  it('maps malformed Google polylines to an invalid response', async () => {
    const service = new LiveRoutesService(
      'https://project.supabase.co/functions/v1/places',
      jest.fn().mockResolvedValue(
        Response.json({
          routes: [
            {
              distanceMeters: 1000,
              duration: '300s',
              polyline: { encodedPolyline: '_' },
            },
          ],
        }),
      ),
    );

    await expect(service.getRoute(request)).rejects.toMatchObject<
      Partial<RoutesServiceError>
    >({
      code: 'invalid-response',
      retryable: false,
    });
  });

  it('matches the deployed handler request and response contract', async () => {
    const dependencies: PlacesDependencies = {
      allowRequest: jest.fn().mockResolvedValue(true),
      callGoogle: jest.fn().mockResolvedValue({
        routes: [
          {
            distanceMeters: 32_000,
            duration: '2400s',
            polyline: {
              encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
            },
          },
        ],
      }),
      loadHalal: jest.fn().mockResolvedValue([]),
    };
    const handler = createPlacesHandler(dependencies);
    const fetcher = (input: RequestInfo | URL, init?: RequestInit) =>
      handler(new Request(input, init));
    const service = new LiveRoutesService(
      'https://project.supabase.co/functions/v1/places',
      fetcher,
      10_000,
      'publishable-anon-key',
      async () => userJwt,
    );

    await expect(service.getRoute(request)).resolves.toMatchObject({
      provider: 'google',
      distanceMeters: 32_000,
      durationSeconds: 2400,
    });
    expect(dependencies.allowRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ action: 'route' }),
    );
  });
});
