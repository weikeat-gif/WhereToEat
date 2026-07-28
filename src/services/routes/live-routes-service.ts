import { z } from 'zod';

import type { RouteRequest } from '@/contracts/route';
import { decodeGooglePolyline } from '@/services/routes/polyline';
import {
  type RoutesService,
  RoutesServiceError,
} from '@/services/routes/routes-service';

const routeResponseSchema = z.object({
  routes: z
    .array(
      z.object({
        distanceMeters: z.number().int().nonnegative(),
        duration: z.string().regex(/^\d+(?:\.\d+)?s$/),
        polyline: z.object({ encodedPolyline: z.string().min(1) }),
      }),
    )
    .min(1),
});

function errorForStatus(status: number) {
  if (status === 429) {
    return new RoutesServiceError(
      'Too many route requests. Please try again shortly.',
      'rate-limited',
      true,
      status,
    );
  }
  if (status >= 500) {
    return new RoutesServiceError(
      'Directions are temporarily unavailable.',
      'upstream',
      true,
      status,
    );
  }
  return new RoutesServiceError(
    'The directions request was rejected.',
    'upstream',
    false,
    status,
  );
}

export class LiveRoutesService implements RoutesService {
  private readonly proxyUrl: string;

  constructor(
    proxyUrl: string | undefined,
    private readonly fetcher: typeof fetch = (...args) => fetch(...args),
    private readonly timeoutMs = 10_000,
    private readonly apiKey?: string,
    private readonly getAccessToken?: () => Promise<string>,
  ) {
    this.proxyUrl = proxyUrl?.replace(/\/+$/, '') ?? '';
  }

  async getRoute(request: RouteRequest) {
    if (!this.proxyUrl) {
      throw new RoutesServiceError(
        'EXPO_PUBLIC_PLACES_PROXY_URL is required for live directions.',
        'configuration',
        false,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const accessToken = await this.getAccessToken?.();
      const response = await this.fetcher(this.proxyUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(this.apiKey
            ? {
                apikey: this.apiKey,
              }
            : {}),
          ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
        },
        body: JSON.stringify({
          action: 'route',
          origin: request.origin,
          destination: request.destination,
          travelMode: request.travelMode,
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw errorForStatus(response.status);

      const payload = routeResponseSchema.parse(await response.json());
      const route = payload.routes[0];
      let coordinates;
      try {
        coordinates = decodeGooglePolyline(route.polyline.encodedPolyline);
      } catch {
        throw new RoutesServiceError(
          'The directions service returned an invalid route.',
          'invalid-response',
          false,
        );
      }
      if (coordinates.length < 2) {
        throw new RoutesServiceError(
          'Google Maps did not return a usable route.',
          'no-route',
          false,
        );
      }

      return {
        origin: request.origin,
        destination: request.destination,
        coordinates,
        distanceMeters: route.distanceMeters,
        durationSeconds: Math.round(Number.parseFloat(route.duration)),
        provider: 'google' as const,
      };
    } catch (error) {
      if (error instanceof RoutesServiceError) throw error;
      if (controller.signal.aborted) {
        throw new RoutesServiceError(
          'The directions request timed out.',
          'network',
          true,
        );
      }
      if (error instanceof z.ZodError) {
        throw new RoutesServiceError(
          'The directions service returned an invalid response.',
          'invalid-response',
          false,
        );
      }
      throw new RoutesServiceError(
        'Unable to reach the directions service.',
        'network',
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
