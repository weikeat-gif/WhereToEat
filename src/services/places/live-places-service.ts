import { z } from 'zod';

import type {
  HalalVerification,
  PlaceDetails,
  PlacePriceRange,
  PlaceSummary,
  PriceLevel,
} from '@/contracts/place';
import type {
  AreaBoundary,
  AreaSuggestion,
  SearchCriteria,
  SearchResults,
} from '@/contracts/search';
import {
  distanceInMeters,
  hasTrustedHalalVerification,
} from '@/services/places/mock-places-service';
import {
  type PlacesService,
  PlacesServiceError,
} from '@/services/places/places-service';

const coordinatesSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
});

const areaBoundarySchema = z.object({
  source: z.literal('openstreetmap'),
  sourceUrl: z
    .string()
    .url()
    .refine((value) => value.startsWith('https://www.openstreetmap.org/')),
  label: z.string().min(1),
  polygons: z
    .array(
      z.object({
        outer: z.array(coordinatesSchema).min(4).max(2_000),
        holes: z.array(z.array(coordinatesSchema).min(4).max(2_000)).max(50),
      }),
    )
    .min(1)
    .max(50),
}).refine(
  (boundary) =>
    boundary.polygons.reduce(
      (sum, polygon) =>
        sum +
        polygon.outer.length +
        polygon.holes.reduce((holeSum, hole) => holeSum + hole.length, 0),
      0,
    ) <= 10_000,
);

const halalVerificationSchema = z.object({
  sourceName: z.string().min(1),
  sourceUrl: z.string().url(),
  verifiedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const moneySchema = z.object({
  currencyCode: z.string().min(3).max(3),
  units: z.union([z.string(), z.number()]).optional(),
  nanos: z.number().int().min(-999_999_999).max(999_999_999).optional(),
});

const priceRangeSchema = z
  .object({
    startPrice: moneySchema.optional(),
    endPrice: moneySchema.optional(),
  })
  .optional();

const reviewSchema = z.object({
  name: z.string().min(1),
  relativePublishTimeDescription: z.string().min(1).optional(),
  text: z.object({ text: z.string().min(1) }),
  rating: z.number().min(1).max(5),
  authorAttribution: z.object({
    displayName: z.string().min(1),
    uri: z.string().url().optional(),
    photoUri: z.string().url().optional(),
  }),
  publishTime: z.string().datetime().optional(),
  googleMapsUri: z.string().url(),
});

const rawPlaceSchema = z.object({
  id: z.string().min(1),
  displayName: z.object({ text: z.string().min(1) }),
  formattedAddress: z.string().optional(),
  location: coordinatesSchema,
  viewport: z
    .object({
      low: coordinatesSchema,
      high: coordinatesSchema,
    })
    .optional(),
  rating: z.number().min(0).max(5).optional(),
  userRatingCount: z.number().int().nonnegative().optional(),
  priceLevel: z.string().optional(),
  priceRange: priceRangeSchema,
  currentOpeningHours: z
    .object({
      openNow: z.boolean().optional(),
      nextOpenTime: z.string().datetime().optional(),
      nextCloseTime: z.string().datetime().optional(),
      weekdayDescriptions: z.array(z.string()).optional(),
    })
    .optional(),
  reviews: z.array(reviewSchema).max(5).optional(),
  types: z.array(z.string()).optional(),
  halalVerification: halalVerificationSchema.optional(),
  promotion: z.object({ id: z.string().uuid() }).optional(),
});

const rawNearbySchema = z.object({
  places: z.array(rawPlaceSchema).default([]),
});

const rawAutocompleteSchema = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({
            placeId: z.string().min(1),
            text: z.object({ text: z.string().min(1) }),
          })
          .optional(),
      }),
    )
    .default([]),
});

type RawPlace = z.infer<typeof rawPlaceSchema>;

type PlacesAction =
  | {
      action: 'nearby';
      latitude: number;
      longitude: number;
      radiusMeters: number;
      areaBounds?: SearchCriteria['areaBounds'];
      includedTypes: string[];
      query?: string;
      openNow?: boolean;
      priceLevels?: PriceLevel[];
      rankPreference?: 'DISTANCE' | 'POPULARITY';
    }
  | { action: 'autocomplete'; input: string; sessionToken: string }
  | { action: 'details'; placeId: string }
  | {
      action: 'boundary';
      label: string;
      center: { latitude: number; longitude: number };
    };

const PRICE_LEVELS: Record<string, PriceLevel | undefined> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const CATEGORY_PLACE_TYPES: Record<string, string> = {
  malaysian: 'malaysian_restaurant',
  cafe: 'cafe',
  chinese: 'chinese_restaurant',
  indian: 'indian_restaurant',
};
const NEARBY_FOOD_TYPES = [
  'restaurant',
  'cafe',
  'bakery',
  'coffee_shop',
  'food_court',
  'meal_takeaway',
  'dessert_shop',
  'ice_cream_shop',
] as const;

function includedTypesFor(criteria: SearchCriteria) {
  const selectedType = criteria.categories
    .map((category) => CATEGORY_PLACE_TYPES[category.toLocaleLowerCase()])
    .find(Boolean);
  if (selectedType) return [selectedType];
  if (/\b(cafe|coffee|kopi|kopitiam)\b/i.test(criteria.query ?? '')) {
    return ['cafe'];
  }
  return criteria.query ? ['restaurant'] : [...NEARBY_FOOD_TYPES];
}

function isFoodPlace(place: RawPlace) {
  return (place.types ?? []).some(
    (type) =>
      NEARBY_FOOD_TYPES.includes(
        type as (typeof NEARBY_FOOD_TYPES)[number],
      ) || type.endsWith('_restaurant'),
  );
}

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

function toCategory(type: string) {
  return type
    .split('_')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function trustedHalal(
  verification: HalalVerification | undefined,
): HalalVerification | undefined {
  return hasTrustedHalalVerification(verification) ? verification : undefined;
}

function toPriceRange(place: RawPlace): PlacePriceRange | undefined {
  const start = place.priceRange?.startPrice;
  const end = place.priceRange?.endPrice;
  const currencyCode = start?.currencyCode ?? end?.currencyCode;
  if (!currencyCode) return undefined;
  const amount = (money: typeof start) => {
    if (!money) return undefined;
    const units = Number(money.units ?? 0);
    const nanos = money.nanos ?? 0;
    const value = units + nanos / 1_000_000_000;
    return Number.isFinite(value) ? value : undefined;
  };
  return {
    currencyCode,
    start: amount(start),
    endExclusive: amount(end),
  };
}

function toSummary(place: RawPlace, criteria: SearchCriteria): PlaceSummary {
  const categories = (place.types ?? []).map(toCategory);
  return {
    id: place.id,
    name: place.displayName.text,
    subtitle: place.formattedAddress ?? categories[0] ?? 'Restaurant',
    coordinates: place.location,
    distanceMeters: distanceInMeters(criteria.center, place.location),
    rating: place.rating ?? 0,
    reviewCount: place.userRatingCount ?? 0,
    priceLevel: place.priceLevel
      ? PRICE_LEVELS[place.priceLevel]
      : undefined,
    priceRange: toPriceRange(place),
    isOpen: place.currentOpeningHours?.openNow,
    nextOpenTime: place.currentOpeningHours?.nextOpenTime,
    nextCloseTime: place.currentOpeningHours?.nextCloseTime,
    categories,
    halalVerification: trustedHalal(place.halalVerification),
    promotion: place.promotion,
  };
}

function matchesCriteria(place: PlaceSummary, criteria: SearchCriteria) {
  const categories = criteria.categories.map((category) =>
    category.toLocaleLowerCase(),
  );
  const categoryMatches =
    categories.length === 0 ||
    categories.some((selected) =>
      place.categories.some((category) =>
        category.toLocaleLowerCase().includes(selected),
      ),
    );

  return (
    place.distanceMeters <= criteria.radiusMeters &&
    (!criteria.openNow || place.isOpen === true) &&
    (criteria.priceLevels.length === 0 ||
      (place.priceLevel !== undefined &&
        criteria.priceLevels.includes(place.priceLevel))) &&
    categoryMatches &&
    (!criteria.verifiedHalalOnly ||
      hasTrustedHalalVerification(place.halalVerification))
  );
}

function toDetails(place: RawPlace): PlaceDetails {
  const criteria: SearchCriteria = {
    center: place.location,
    areaLabel: place.formattedAddress ?? place.displayName.text,
    radiusMeters: 50_000,
    openNow: false,
    priceLevels: [],
    categories: [],
    verifiedHalalOnly: false,
  };
  return {
    ...toSummary(place, criteria),
    address: place.formattedAddress ?? '',
    openingHours: place.currentOpeningHours?.weekdayDescriptions ?? [],
    photoUrls: [],
    reviews: (place.reviews ?? []).map((review) => ({
      id: review.name,
      authorName: review.authorAttribution.displayName,
      authorUrl: review.authorAttribution.uri,
      authorPhotoUrl: review.authorAttribution.photoUri,
      rating: review.rating,
      text: review.text.text,
      relativePublishTime: review.relativePublishTimeDescription,
      publishTime: review.publishTime,
      googleMapsUrl: review.googleMapsUri,
    })),
    viewport: place.viewport
      ? {
          northEast: place.viewport.high,
          southWest: place.viewport.low,
        }
      : undefined,
  };
}

export class LivePlacesService implements PlacesService {
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

  async autocompleteArea(
    input: string,
    sessionToken: string,
  ): Promise<AreaSuggestion[]> {
    const payload = rawAutocompleteSchema.parse(
      await this.request({
        action: 'autocomplete',
        input,
        sessionToken,
      }),
    );
    return payload.suggestions
      .map((suggestion) => suggestion.placePrediction)
      .filter((prediction): prediction is NonNullable<typeof prediction> =>
        Boolean(prediction),
      )
      .slice(0, 5)
      .map(
        (prediction) =>
          ({
            id: prediction.placeId,
            label: prediction.text.text,
          }) satisfies AreaSuggestion,
      );
  }

  async searchNearby(criteria: SearchCriteria): Promise<SearchResults> {
    const payload = rawNearbySchema.parse(
      await this.request({
        action: 'nearby',
        latitude: criteria.center.latitude,
        longitude: criteria.center.longitude,
        radiusMeters: criteria.radiusMeters,
        areaBounds: criteria.areaBounds,
        includedTypes: includedTypesFor(criteria),
        query: criteria.query,
        openNow: criteria.openNow,
        priceLevels: criteria.priceLevels,
        rankPreference: criteria.rankPreference,
      }),
    );
    const places = payload.places
      .filter(isFoodPlace)
      .map((place) => toSummary(place, criteria))
      .filter((place) => matchesCriteria(place, criteria))
      .sort(
        (left, right) =>
          Number(Boolean(right.promotion)) -
            Number(Boolean(left.promotion)) ||
          left.distanceMeters - right.distanceMeters,
      );

    return {
      criteria: {
        ...criteria,
        center: { ...criteria.center },
        priceLevels: [...criteria.priceLevels],
        categories: [...criteria.categories],
      },
      places,
      fetchedAt: new Date().toISOString(),
    };
  }

  async getAreaBoundary(
    label: string,
    center: { latitude: number; longitude: number },
  ): Promise<AreaBoundary | null> {
    return areaBoundarySchema
      .nullable()
      .parse(await this.request({ action: 'boundary', label, center }));
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    const payload = rawPlaceSchema.parse(
      await this.request({ action: 'details', placeId }),
    );
    return toDetails(payload);
  }

  private async request(input: PlacesAction): Promise<unknown> {
    if (!this.proxyUrl) {
      throw new PlacesServiceError(
        'EXPO_PUBLIC_PLACES_PROXY_URL is required in live data mode.',
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
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      if (!response.ok) throw errorForStatus(response.status);
      try {
        return await response.json();
      } catch {
        if (controller.signal.aborted) {
          throw new PlacesServiceError(
            'The places request timed out.',
            'network',
            true,
          );
        }
        throw new PlacesServiceError(
          'The places service returned an invalid response.',
          'invalid-response',
          false,
          response.status,
        );
      }
    } catch (requestError) {
      if (requestError instanceof PlacesServiceError) throw requestError;
      if (controller.signal.aborted) {
        throw new PlacesServiceError(
          'The places request timed out.',
          'network',
          true,
        );
      }
      throw new PlacesServiceError(
        'Unable to reach the places service.',
        'network',
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
