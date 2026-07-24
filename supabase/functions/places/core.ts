export type PlacesAction =
  | {
      action: 'nearby';
      latitude: number;
      longitude: number;
      radiusMeters: number;
      includedTypes?: string[];
    }
  | { action: 'autocomplete'; input: string; sessionToken: string }
  | { action: 'details'; placeId: string }
  | {
      action: 'route';
      origin: { latitude: number; longitude: number };
      destination: { latitude: number; longitude: number };
      travelMode: 'DRIVE';
    };

export type HalalRecord = {
  google_place_id: string;
  source_name: string;
  source_url: string;
  verified_at: string;
  expires_at: string;
};

export interface PlacesDependencies {
  callGoogle(input: PlacesAction): Promise<unknown>;
  loadHalal(placeIds: string[]): Promise<HalalRecord[]>;
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
              (item) => typeof item === 'string' && item.length <= 80,
            )
          ? value.includedTypes
          : null;
    if (includedTypes === null) throw new Error('includedTypes is invalid.');
    return {
      action: 'nearby',
      latitude: value.latitude,
      longitude: value.longitude,
      radiusMeters: value.radiusMeters,
      includedTypes,
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

function placeId(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (typeof value.id === 'string') return value.id;
  if (typeof value.name === 'string' && value.name.startsWith('places/')) {
    return value.name.slice('places/'.length);
  }
  return null;
}

async function enrichHalal(
  value: unknown,
  action: PlacesAction,
  loadHalal: PlacesDependencies['loadHalal'],
): Promise<unknown> {
  if (action.action === 'autocomplete' || action.action === 'route') {
    return value;
  }
  const places =
    action.action === 'nearby' && isRecord(value) && Array.isArray(value.places)
      ? value.places
      : [value];
  const ids = places.map(placeId).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return value;

  const current = filterCurrentHalalRecords(await loadHalal(ids));
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
  const enriched = places.map((place) => {
    const id = placeId(place);
    if (!id || !isRecord(place) || !byPlace.has(id)) return place;
    return { ...place, halalVerification: byPlace.get(id) };
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
        `user:${identity.subject}`,
        input,
      ))
    ) {
      return json(429, { error: { code: 'rate_limited' } });
    }

    try {
      const googleResult = await dependencies.callGoogle(input);
      const result = await enrichHalal(
        googleResult,
        input,
        dependencies.loadHalal,
      );
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
