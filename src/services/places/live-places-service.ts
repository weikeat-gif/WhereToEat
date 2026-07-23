import { z } from 'zod';

import type { SearchCriteria } from '@/contracts/search';
import {
  type PlacesService,
  PlacesServiceError,
} from '@/services/places/places-service';

const coordinatesSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
});

const halalVerificationSchema = z.object({
  sourceName: z.string().min(1),
  sourceUrl: z.string().url(),
  verifiedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const placeSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subtitle: z.string(),
  coordinates: coordinatesSchema,
  distanceMeters: z.number().nonnegative(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  isOpen: z.boolean().optional(),
  photoUrl: z.string().url().optional(),
  categories: z.array(z.string()),
  halalVerification: halalVerificationSchema.optional(),
});

const searchCriteriaSchema = z.object({
  center: coordinatesSchema,
  areaLabel: z.string(),
  radiusMeters: z.number().positive(),
  openNow: z.boolean(),
  priceLevels: z.array(
    z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  ),
  categories: z.array(z.string()),
  verifiedHalalOnly: z.boolean(),
});

const searchResultsSchema = z.object({
  criteria: searchCriteriaSchema,
  places: z.array(placeSummarySchema),
  fetchedAt: z.string().datetime(),
});

const placeDetailsSchema = placeSummarySchema.extend({
  address: z.string(),
  phoneNumber: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  openingHours: z.array(z.string()),
  description: z.string().optional(),
  photoUrls: z.array(z.string().url()),
});

const areaSuggestionsSchema = z.array(
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    secondaryLabel: z.string().optional(),
    coordinates: coordinatesSchema,
  }),
);

type Schema<T> = z.ZodType<T>;

function errorForStatus(status: number) {
  if (status === 401 || status === 403) {
    return new PlacesServiceError(
      'The places service is not authorized.',
      'unauthorized',
      false,
      status,
    );
  }
  if (status === 404) {
    return new PlacesServiceError(
      'The requested place was not found.',
      'not-found',
      false,
      status,
    );
  }
  if (status === 429) {
    return new PlacesServiceError(
      'Too many place searches. Please try again shortly.',
      'rate-limited',
      true,
      status,
    );
  }
  if (status >= 500) {
    return new PlacesServiceError(
      'The places service is temporarily unavailable.',
      'upstream',
      true,
      status,
    );
  }
  return new PlacesServiceError(
    'The places service rejected the request.',
    'upstream',
    false,
    status,
  );
}

export class LivePlacesService implements PlacesService {
  private readonly proxyUrl: string;

  constructor(proxyUrl: string | undefined, private readonly fetcher = fetch) {
    this.proxyUrl = proxyUrl?.replace(/\/+$/, '') ?? '';
  }

  async autocompleteArea(input: string, sessionToken: string) {
    return this.request(
      '/autocomplete',
      areaSuggestionsSchema,
      {
        method: 'POST',
        body: JSON.stringify({ input, sessionToken }),
      },
    );
  }

  async searchNearby(criteria: SearchCriteria) {
    return this.request('/search', searchResultsSchema, {
      method: 'POST',
      body: JSON.stringify({ criteria }),
    });
  }

  async getPlaceDetails(placeId: string) {
    return this.request(
      `/places/${encodeURIComponent(placeId)}`,
      placeDetailsSchema,
      { method: 'GET' },
    );
  }

  private async request<T>(
    path: string,
    schema: Schema<T>,
    init: RequestInit,
  ): Promise<T> {
    if (!this.proxyUrl) {
      throw new PlacesServiceError(
        'EXPO_PUBLIC_PLACES_PROXY_URL is required in live data mode.',
        'configuration',
        false,
      );
    }

    let response: Response;
    try {
      response = await this.fetcher(`${this.proxyUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });
    } catch {
      throw new PlacesServiceError(
        'Unable to reach the places service.',
        'network',
        true,
      );
    }

    if (!response.ok) throw errorForStatus(response.status);

    try {
      const payload: unknown = await response.json();
      return schema.parse(payload);
    } catch {
      throw new PlacesServiceError(
        'The places service returned an invalid response.',
        'invalid-response',
        false,
        response.status,
      );
    }
  }
}
