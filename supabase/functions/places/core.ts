export type PlacesAction =
  | {
      action: 'nearby';
      latitude: number;
      longitude: number;
      radiusMeters: number;
      areaBounds?: {
        northEast: { latitude: number; longitude: number };
        southWest: { latitude: number; longitude: number };
      };
      includedTypes?: string[];
      query?: string;
      openNow?: boolean;
      priceLevels?: number[];
      rankPreference?: 'DISTANCE' | 'POPULARITY';
    }
  | { action: 'autocomplete'; input: string; sessionToken: string }
  | { action: 'details'; placeId: string }
  | {
      action: 'boundary';
      label: string;
      center: { latitude: number; longitude: number };
    }
  | {
      action: 'route';
      origin: { latitude: number; longitude: number };
      destination: { latitude: number; longitude: number };
      travelMode: 'DRIVE';
    };

export type GooglePlacesAction = Exclude<
  PlacesAction,
  { action: 'boundary' }
>;

export type HalalRecord = {
  google_place_id: string;
  source_name: string;
  source_url: string;
  verified_at: string;
  expires_at: string;
};

export type PromotionRecord = {
  id: string;
  google_place_id: string;
  starts_at: string;
  ends_at: string;
};

export interface PlacesDependencies {
  callGoogle(input: GooglePlacesAction): Promise<unknown>;
  loadBoundary?(
    input: Extract<PlacesAction, { action: 'boundary' }>,
  ): Promise<unknown>;
  loadHalal(placeIds: string[]): Promise<HalalRecord[]>;
  loadPromotions?(placeIds: string[]): Promise<PromotionRecord[]>;
  allowRequest(key: string, input: PlacesAction): Promise<boolean> | boolean;
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

const FIELD_MASKS = {
  nearby:
    'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.priceRange,places.currentOpeningHours,places.types',
  autocomplete:
    'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
  details:
    'id,displayName,formattedAddress,location,viewport,rating,userRatingCount,priceLevel,priceRange,currentOpeningHours,internationalPhoneNumber,websiteUri,types',
  route:
    'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
} as const;

const GOOGLE_PRICE_LEVELS: Record<number, string> = {
  1: 'PRICE_LEVEL_INEXPENSIVE',
  2: 'PRICE_LEVEL_MODERATE',
  3: 'PRICE_LEVEL_EXPENSIVE',
  4: 'PRICE_LEVEL_VERY_EXPENSIVE',
};
const ALLOWED_SEARCH_TYPES = new Set([
  'restaurant',
  'cafe',
  'bakery',
  'coffee_shop',
  'food_court',
  'meal_takeaway',
  'dessert_shop',
  'ice_cream_shop',
  'malaysian_restaurant',
  'chinese_restaurant',
  'indian_restaurant',
]);

function textSearchRectangle(
  latitude: number,
  longitude: number,
  radiusMeters: number,
) {
  const latitudeDelta = radiusMeters / 111_320;
  const longitudeDelta =
    radiusMeters /
    (111_320 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01));
  return {
    low: {
      latitude: Math.max(-90, latitude - latitudeDelta),
      longitude: Math.max(-180, longitude - longitudeDelta),
    },
    high: {
      latitude: Math.min(90, latitude + latitudeDelta),
      longitude: Math.min(180, longitude + longitudeDelta),
    },
  };
}

export function buildGoogleRequest(
  apiKey: string,
  input: PlacesAction,
  options: { includeReviews?: boolean } = {},
): { url: string; init: RequestInit } {
  if (input.action === 'boundary') {
    throw new Error('Boundary requests do not use Google Places.');
  }
  const fieldMask =
    input.action === 'details' && options.includeReviews
      ? `${FIELD_MASKS.details},reviews`
      : FIELD_MASKS[input.action];
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': fieldMask,
  };

  if (input.action === 'nearby') {
    if (input.query || input.areaBounds) {
      const rectangle = input.areaBounds
        ? {
            low: input.areaBounds.southWest,
            high: input.areaBounds.northEast,
          }
        : textSearchRectangle(
            input.latitude,
            input.longitude,
            input.radiusMeters,
          );
      const restrictToSingleType =
        Boolean(input.query) || input.includedTypes?.length === 1;
      return {
        url: 'https://places.googleapis.com/v1/places:searchText',
        init: {
          method: 'POST',
          headers,
          body: JSON.stringify({
            textQuery: input.query ?? 'food',
            ...(restrictToSingleType
              ? {
                  includedType: input.includedTypes?.[0] ?? 'restaurant',
                  strictTypeFiltering: true,
                }
              : {}),
            pageSize: 20,
            locationRestriction: {
              rectangle,
            },
            ...(input.openNow ? { openNow: true } : {}),
            ...(input.priceLevels?.length
              ? {
                  priceLevels: input.priceLevels.map(
                    (level) => GOOGLE_PRICE_LEVELS[level],
                  ),
                }
              : {}),
          }),
        },
      };
    }

    return {
      url: 'https://places.googleapis.com/v1/places:searchNearby',
      init: {
        method: 'POST',
        headers,
        body: JSON.stringify({
          includedTypes: input.includedTypes,
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: {
                latitude: input.latitude,
                longitude: input.longitude,
              },
              radius: input.radiusMeters,
            },
          },
          rankPreference: input.rankPreference ?? 'DISTANCE',
        }),
      },
    };
  }

  if (input.action === 'autocomplete') {
    return {
      url: 'https://places.googleapis.com/v1/places:autocomplete',
      init: {
        method: 'POST',
        headers,
        body: JSON.stringify({
          input: input.input,
          sessionToken: input.sessionToken,
          includedPrimaryTypes: ['(regions)'],
          includedRegionCodes: ['my'],
          regionCode: 'MY',
        }),
      },
    };
  }

  if (input.action === 'details') {
    return {
      url: `https://places.googleapis.com/v1/places/${encodeURIComponent(input.placeId)}`,
      init: { method: 'GET', headers },
    };
  }

  return {
    url: 'https://routes.googleapis.com/directions/v2:computeRoutes',
    init: {
      method: 'POST',
      headers,
      body: JSON.stringify({
        origin: {
          location: {
            latLng: input.origin,
          },
        },
        destination: {
          location: {
            latLng: input.destination,
          },
        },
        travelMode: input.travelMode,
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        polylineQuality: 'OVERVIEW',
        languageCode: 'en-US',
        units: 'METRIC',
      }),
    },
  };
}

export function setBoundedMapValue<Key, Value>(
  map: Map<Key, Value>,
  maxEntries: number,
  key: Key,
  value: Value,
) {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new Error('maxEntries must be a positive integer.');
  }
  map.delete(key);
  while (map.size >= maxEntries) {
    const oldestKey = map.keys().next().value as Key | undefined;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
  map.set(key, value);
}

export async function fetchWithTimeout<Result>(
  fetcher: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit = {},
  consume: (response: Response) => Promise<Result>,
  timeoutMs = 10_000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(input, {
      ...init,
      signal: controller.signal,
    });
    return await consume(response);
  } finally {
    clearTimeout(timeout);
  }
}

export async function readJsonResponseWithLimit(
  response: Response,
  maxBytes: number,
  sourceName = 'Upstream',
): Promise<unknown> {
  const declaredLength = response.headers.get('content-length');
  if (
    declaredLength &&
    /^\d+$/.test(declaredLength) &&
    Number(declaredLength) > maxBytes
  ) {
    throw new UpstreamError(`${sourceName} response is too large.`, 502);
  }
  if (!response.body) {
    throw new UpstreamError(`${sourceName} returned an empty response.`, 502);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new UpstreamError(`${sourceName} response is too large.`, 502);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError(`${sourceName} returned invalid JSON.`, 502);
  } finally {
    reader.releaseLock();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validCoordinates(
  value: unknown,
): value is { latitude: number; longitude: number } {
  return (
    isRecord(value) &&
    isFiniteNumber(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    isFiniteNumber(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180
  );
}

type BoundaryCoordinate = { latitude: number; longitude: number };
type BoundaryPolygon = {
  outer: BoundaryCoordinate[];
  holes: BoundaryCoordinate[][];
};

function geoJsonRing(value: unknown): BoundaryCoordinate[] | undefined {
  if (!Array.isArray(value) || value.length < 4 || value.length > 2_000) {
    return undefined;
  }
  const points = value.map((point) =>
    Array.isArray(point) &&
    point.length >= 2 &&
    isFiniteNumber(point[0]) &&
    point[0] >= -180 &&
    point[0] <= 180 &&
    isFiniteNumber(point[1]) &&
    point[1] >= -90 &&
    point[1] <= 90
      ? { latitude: point[1], longitude: point[0] }
      : undefined,
  );
  return points.every(
    (point): point is BoundaryCoordinate => point !== undefined,
  )
    ? points
    : undefined;
}

function geoJsonPolygons(value: unknown): BoundaryPolygon[] | undefined {
  if (!isRecord(value) || !Array.isArray(value.coordinates)) return undefined;
  const polygonValues =
    value.type === 'Polygon'
      ? [value.coordinates]
      : value.type === 'MultiPolygon'
        ? value.coordinates
        : undefined;
  if (!polygonValues || polygonValues.length === 0 || polygonValues.length > 50) {
    return undefined;
  }
  const polygons = polygonValues.map((polygon): BoundaryPolygon | undefined => {
    if (!Array.isArray(polygon) || polygon.length === 0) return undefined;
    const outer = geoJsonRing(polygon[0]);
    const holes = polygon.slice(1).map(geoJsonRing);
    return outer &&
      holes.every((hole): hole is BoundaryCoordinate[] => Boolean(hole))
      ? { outer, holes }
      : undefined;
  });
  if (
    !polygons.every(
      (polygon): polygon is BoundaryPolygon => polygon !== undefined,
    )
  ) {
    return undefined;
  }
  const totalPoints = polygons.reduce(
    (sum, polygon) =>
      sum +
      polygon.outer.length +
      polygon.holes.reduce((holeSum, hole) => holeSum + hole.length, 0),
    0,
  );
  return totalPoints <= 10_000
    ? polygons
    : undefined;
}

function pointIsOnSegment(
  point: BoundaryCoordinate,
  start: BoundaryCoordinate,
  end: BoundaryCoordinate,
) {
  const cross =
    (point.longitude - start.longitude) *
      (end.latitude - start.latitude) -
    (point.latitude - start.latitude) *
      (end.longitude - start.longitude);
  if (Math.abs(cross) > 1e-10) return false;
  return (
    point.longitude >= Math.min(start.longitude, end.longitude) - 1e-10 &&
    point.longitude <= Math.max(start.longitude, end.longitude) + 1e-10 &&
    point.latitude >= Math.min(start.latitude, end.latitude) - 1e-10 &&
    point.latitude <= Math.max(start.latitude, end.latitude) + 1e-10
  );
}

function pointIsInRing(
  point: BoundaryCoordinate,
  ring: BoundaryCoordinate[],
) {
  let inside = false;
  for (
    let currentIndex = 0, previousIndex = ring.length - 1;
    currentIndex < ring.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const current = ring[currentIndex];
    const previous = ring[previousIndex];
    if (pointIsOnSegment(point, previous, current)) return true;
    const crossesLatitude =
      current.latitude > point.latitude !==
      previous.latitude > point.latitude;
    if (
      crossesLatitude &&
      point.longitude <
        ((previous.longitude - current.longitude) *
          (point.latitude - current.latitude)) /
          (previous.latitude - current.latitude) +
          current.longitude
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function boundaryContainsCenter(
  polygons: BoundaryPolygon[],
  center: BoundaryCoordinate,
) {
  return polygons.some(
    (polygon) =>
      pointIsInRing(center, polygon.outer) &&
      !polygon.holes.some((hole) => pointIsInRing(center, hole)),
  );
}

function osmSourceUrl(value: Record<string, unknown>) {
  const kind =
    value.osm_type === 'relation'
      ? 'relation'
      : value.osm_type === 'way'
        ? 'way'
        : value.osm_type === 'node'
          ? 'node'
          : undefined;
  const id =
    typeof value.osm_id === 'number' && Number.isInteger(value.osm_id)
      ? value.osm_id
      : typeof value.osm_id === 'string' && /^\d+$/.test(value.osm_id)
        ? value.osm_id
        : undefined;
  return kind && id
    ? `https://www.openstreetmap.org/${kind}/${id}`
    : undefined;
}

export function normalizeBoundaryResponse(
  value: unknown,
  center: BoundaryCoordinate,
) {
  if (!Array.isArray(value)) return null;
  const candidates = value
    .map((candidate) => {
      if (!isRecord(candidate)) return undefined;
      const polygons = geoJsonPolygons(candidate.geojson);
      const sourceUrl = osmSourceUrl(candidate);
      if (
        !polygons ||
        !boundaryContainsCenter(polygons, center) ||
        !sourceUrl ||
        typeof candidate.display_name !== 'string' ||
        candidate.display_name.length === 0
      ) {
        return undefined;
      }
      const category =
        typeof candidate.category === 'string'
          ? candidate.category
          : typeof candidate.class === 'string'
            ? candidate.class
            : '';
      const candidateLatitude = Number(candidate.lat);
      const candidateLongitude = Number(candidate.lon);
      const centerDistance =
        Number.isFinite(candidateLatitude) && Number.isFinite(candidateLongitude)
          ? straightLineDistanceMeters(center, {
              latitude: candidateLatitude,
              longitude: candidateLongitude,
            })
          : 100_000;
      const score =
        (category === 'place' ? 100_000 : category === 'boundary' ? 50_000 : 0) -
        centerDistance;
      return {
        boundary: {
          source: 'openstreetmap' as const,
          sourceUrl,
          label: candidate.display_name,
          polygons,
        },
        score,
      };
    })
    .filter(
      (
        candidate,
      ): candidate is {
        boundary: {
          source: 'openstreetmap';
          sourceUrl: string;
          label: string;
          polygons: BoundaryPolygon[];
        };
        score: number;
      } => Boolean(candidate),
    )
    .sort((left, right) => right.score - left.score);
  return candidates[0]?.boundary ?? null;
}

const SUPPORTED_KLANG_VALLEY_BOUNDS = {
  minLatitude: 2.7,
  maxLatitude: 3.6,
  minLongitude: 100.9,
  maxLongitude: 102,
} as const;
const MAX_ROUTE_DISTANCE_METERS = 100_000;

function isSupportedServiceCoordinate(value: {
  latitude: number;
  longitude: number;
}) {
  return (
    value.latitude >= SUPPORTED_KLANG_VALLEY_BOUNDS.minLatitude &&
    value.latitude <= SUPPORTED_KLANG_VALLEY_BOUNDS.maxLatitude &&
    value.longitude >= SUPPORTED_KLANG_VALLEY_BOUNDS.minLongitude &&
    value.longitude <= SUPPORTED_KLANG_VALLEY_BOUNDS.maxLongitude
  );
}

function straightLineDistanceMeters(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number },
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const startLatitude = radians(left.latitude);
  const endLatitude = radians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
}

export function validatePlacesRequest(value: unknown): PlacesAction {
  if (!isRecord(value) || typeof value.action !== 'string') {
    throw new Error('A valid action is required.');
  }

  if (value.action === 'nearby') {
    if (
      !isFiniteNumber(value.latitude) ||
      value.latitude < -90 ||
      value.latitude > 90 ||
      !isFiniteNumber(value.longitude) ||
      value.longitude < -180 ||
      value.longitude > 180 ||
      !isFiniteNumber(value.radiusMeters) ||
      value.radiusMeters < 100 ||
      value.radiusMeters > 20000
    ) {
      throw new Error('Nearby search coordinates or radius are invalid.');
    }
    if (
      !isSupportedServiceCoordinate({
        latitude: value.latitude,
        longitude: value.longitude,
      })
    ) {
      throw new Error('Nearby search must stay inside the Klang Valley service area.');
    }
    const includedTypes =
      value.includedTypes === undefined
        ? undefined
        : Array.isArray(value.includedTypes) &&
            value.includedTypes.length <= 10 &&
            value.includedTypes.every(
              (item) =>
                typeof item === 'string' && ALLOWED_SEARCH_TYPES.has(item),
            )
          ? value.includedTypes
          : null;
    if (includedTypes === null) throw new Error('includedTypes is invalid.');
    const areaBounds =
      value.areaBounds === undefined
        ? undefined
        : isRecord(value.areaBounds) &&
            validCoordinates(value.areaBounds.northEast) &&
            validCoordinates(value.areaBounds.southWest) &&
            value.areaBounds.southWest.latitude <
              value.areaBounds.northEast.latitude &&
            value.areaBounds.southWest.longitude <
              value.areaBounds.northEast.longitude &&
            isSupportedServiceCoordinate(value.areaBounds.northEast) &&
            isSupportedServiceCoordinate(value.areaBounds.southWest)
          ? {
              northEast: {
                latitude: value.areaBounds.northEast.latitude,
                longitude: value.areaBounds.northEast.longitude,
              },
              southWest: {
                latitude: value.areaBounds.southWest.latitude,
                longitude: value.areaBounds.southWest.longitude,
              },
            }
          : null;
    if (areaBounds === null) throw new Error('Nearby search area bounds are invalid.');
    const query =
      value.query === undefined
        ? undefined
        : typeof value.query === 'string' && value.query.length <= 120
          ? value.query.trim() || undefined
          : null;
    if (query === null) throw new Error('Nearby search query is invalid.');
    const openNow =
      value.openNow === undefined
        ? undefined
        : typeof value.openNow === 'boolean'
          ? value.openNow
          : null;
    if (openNow === null) throw new Error('openNow is invalid.');
    const priceLevels =
      value.priceLevels === undefined
        ? undefined
        : Array.isArray(value.priceLevels) &&
            value.priceLevels.length <= 4 &&
            value.priceLevels.every(
              (level) =>
                typeof level === 'number' &&
                Number.isInteger(level) &&
                level >= 1 &&
                level <= 4,
            )
          ? [...new Set(value.priceLevels)]
          : null;
    if (priceLevels === null) throw new Error('priceLevels is invalid.');
    const rankPreference =
      value.rankPreference === undefined
        ? undefined
        : value.rankPreference === 'DISTANCE' ||
            value.rankPreference === 'POPULARITY'
          ? value.rankPreference
          : null;
    if (rankPreference === null) {
      throw new Error('rankPreference is invalid.');
    }
    return {
      action: 'nearby',
      latitude: value.latitude,
      longitude: value.longitude,
      radiusMeters: value.radiusMeters,
      areaBounds,
      includedTypes,
      query,
      openNow,
      priceLevels,
      rankPreference,
    };
  }

  if (value.action === 'autocomplete') {
    if (
      typeof value.input !== 'string' ||
      value.input.trim().length < 2 ||
      value.input.length > 120 ||
      typeof value.sessionToken !== 'string' ||
      value.sessionToken.length < 8 ||
      value.sessionToken.length > 128
    ) {
      throw new Error('Autocomplete input or session token is invalid.');
    }
    return {
      action: 'autocomplete',
      input: value.input.trim(),
      sessionToken: value.sessionToken,
    };
  }

  if (value.action === 'details') {
    if (
      typeof value.placeId !== 'string' ||
      !/^[A-Za-z0-9_-]{5,255}$/.test(value.placeId)
    ) {
      throw new Error('Place ID is invalid.');
    }
    return { action: 'details', placeId: value.placeId };
  }

  if (value.action === 'boundary') {
    if (
      typeof value.label !== 'string' ||
      value.label.trim().length < 2 ||
      value.label.length > 120 ||
      !validCoordinates(value.center) ||
      !isSupportedServiceCoordinate(value.center)
    ) {
      throw new Error('Boundary label or center is invalid.');
    }
    return {
      action: 'boundary',
      label: value.label.trim(),
      center: {
        latitude: value.center.latitude,
        longitude: value.center.longitude,
      },
    };
  }

  if (value.action === 'route') {
    if (
      !validCoordinates(value.origin) ||
      !validCoordinates(value.destination) ||
      value.travelMode !== 'DRIVE'
    ) {
      throw new Error('Route coordinates or travel mode are invalid.');
    }
    if (
      !isSupportedServiceCoordinate(value.origin) ||
      !isSupportedServiceCoordinate(value.destination)
    ) {
      throw new Error('Routes must stay inside the Klang Valley service area.');
    }
    if (
      straightLineDistanceMeters(value.origin, value.destination) >
      MAX_ROUTE_DISTANCE_METERS
    ) {
      throw new Error('Routes must be within 100 km.');
    }
    return {
      action: 'route',
      origin: {
        latitude: value.origin.latitude,
        longitude: value.origin.longitude,
      },
      destination: {
        latitude: value.destination.latitude,
        longitude: value.destination.longitude,
      },
      travelMode: value.travelMode,
    };
  }

  throw new Error('Unsupported places action.');
}

export function filterCurrentHalalRecords(
  rows: HalalRecord[],
  now = new Date(),
): HalalRecord[] {
  const timestamp = now.getTime();
  return rows.filter((row) => {
    const verifiedAt = Date.parse(row.verified_at);
    const expiresAt = Date.parse(row.expires_at);
    let trustedSource = false;
    try {
      const source = new URL(row.source_url);
      trustedSource =
        source.protocol === 'https:' &&
        (source.hostname === 'halal.gov.my' ||
          source.hostname === 'www.halal.gov.my') &&
        row.source_name === 'JAKIM Halal Malaysia';
    } catch {
      trustedSource = false;
    }
    return (
      trustedSource &&
      Number.isFinite(verifiedAt) &&
      Number.isFinite(expiresAt) &&
      verifiedAt <= timestamp &&
      expiresAt > timestamp
    );
  });
}

export function filterActivePromotionRecords(
  rows: PromotionRecord[],
  now = new Date(),
): PromotionRecord[] {
  const timestamp = now.getTime();
  return rows.filter((row) => {
    const startsAt = Date.parse(row.starts_at);
    const endsAt = Date.parse(row.ends_at);
    return (
      /^[0-9a-f-]{36}$/i.test(row.id) &&
      row.google_place_id.length >= 5 &&
      Number.isFinite(startsAt) &&
      Number.isFinite(endsAt) &&
      startsAt <= timestamp &&
      endsAt > timestamp
    );
  });
}

function placeId(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (typeof value.id === 'string') return value.id;
  if (typeof value.name === 'string' && value.name.startsWith('places/')) {
    return value.name.slice('places/'.length);
  }
  return null;
}

async function enrichLocalData(
  value: unknown,
  action: PlacesAction,
  dependencies: PlacesDependencies,
): Promise<unknown> {
  if (
    action.action === 'autocomplete' ||
    action.action === 'route' ||
    action.action === 'boundary'
  ) {
    return value;
  }
  const places =
    action.action === 'nearby' && isRecord(value) && Array.isArray(value.places)
      ? value.places
      : [value];
  const ids = places.map(placeId).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return value;

  const [current, activePromotions] = await Promise.all([
    dependencies.loadHalal(ids).then(filterCurrentHalalRecords),
    dependencies.loadPromotions
      ? dependencies.loadPromotions(ids).then(filterActivePromotionRecords)
      : [],
  ]);
  const byPlace = new Map(
    current.map((row) => [
      row.google_place_id,
      {
        sourceName: row.source_name,
        sourceUrl: row.source_url,
        verifiedAt: row.verified_at,
        expiresAt: row.expires_at,
      },
    ]),
  );
  const promotionsByPlace = new Map(
    activePromotions.map((row) => [
      row.google_place_id,
      { id: row.id },
    ]),
  );
  const enriched = places.map((place) => {
    const id = placeId(place);
    if (!id || !isRecord(place)) return place;
    return {
      ...place,
      ...(byPlace.has(id)
        ? { halalVerification: byPlace.get(id) }
        : {}),
      ...(promotionsByPlace.has(id)
        ? { promotion: promotionsByPlace.get(id) }
        : {}),
    };
  });

  return action.action === 'nearby' && isRecord(value)
    ? { ...value, places: enriched }
    : enriched[0];
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
    },
  });
}

function jwtIdentity(
  request: Request,
): { role: 'authenticated'; subject: string } | null {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const payload = token?.split('.')[1];
  if (!payload) return null;

  try {
    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const decoded = JSON.parse(atob(padded)) as unknown;
    if (
      !isRecord(decoded) ||
      decoded.role !== 'authenticated' ||
      typeof decoded.sub !== 'string' ||
      decoded.sub.trim().length === 0
    ) {
      return null;
    }
    return {
      role: 'authenticated',
      subject: decoded.sub.slice(0, 128),
    };
  } catch {
    return null;
  }
}

function requestNetworkIdentity(request: Request) {
  const forwarded =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded && /^[0-9a-f:.]{3,64}$/i.test(forwarded)
    ? forwarded
    : 'unknown';
}

export function createPlacesHandler(dependencies: PlacesDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return json(200, { ok: true });
    if (request.method !== 'POST') {
      return json(405, { error: { code: 'method_not_allowed' } });
    }

    const identity = jwtIdentity(request);
    if (!identity) {
      return json(401, { error: { code: 'user_session_required' } });
    }

    let input: PlacesAction;
    try {
      input = validatePlacesRequest(await request.json());
    } catch (error) {
      return json(400, {
        error: {
          code: 'invalid_request',
          message: error instanceof Error ? error.message : 'Invalid request.',
        },
      });
    }

    if (
      !(await dependencies.allowRequest(
        `user:${identity.subject}|network:${requestNetworkIdentity(request)}`,
        input,
      ))
    ) {
      return json(429, { error: { code: 'rate_limited' } });
    }

    try {
      if (input.action === 'boundary') {
        if (!dependencies.loadBoundary) {
          return json(200, null);
        }
        return json(200, await dependencies.loadBoundary(input));
      }
      const googleResult = await dependencies.callGoogle(input);
      const result = await enrichLocalData(googleResult, input, dependencies);
      return json(200, result);
    } catch (error) {
      if (error instanceof UpstreamError) {
        return json(error.status === 429 ? 429 : 502, {
          error: {
            code:
              error.status === 429 ? 'upstream_rate_limited' : 'places_upstream',
            message: error.message,
          },
        });
      }
      return json(500, { error: { code: 'internal_error' } });
    }
  };
}
