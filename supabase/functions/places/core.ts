export type PlacesAction =
  | {
      action: 'nearby';
      latitude: number;
      longitude: number;
      radiusMeters: number;
      includedTypes?: string[];
    }
  | { action: 'autocomplete'; input: string; sessionToken: string }
  | { action: 'details'; placeId: string };

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
  allowRequest(key: string): boolean;
  getCached(key: string): unknown | undefined;
  setCached(key: string, value: unknown): void;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
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
      value.radiusMeters > 50000
    ) {
      throw new Error('Nearby search coordinates or radius are invalid.');
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
    return (
      row.source_url.startsWith('https://') &&
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
  if (action.action === 'autocomplete') return value;
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

export function createPlacesHandler(dependencies: PlacesDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return json(200, { ok: true });
    if (request.method !== 'POST') {
      return json(405, { error: { code: 'method_not_allowed' } });
    }

    const requestKey =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'anonymous';
    if (!dependencies.allowRequest(requestKey)) {
      return json(429, { error: { code: 'rate_limited' } });
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

    const cacheKey = JSON.stringify(input);
    const cached = dependencies.getCached(cacheKey);
    if (cached !== undefined) return json(200, cached);

    try {
      const googleResult = await dependencies.callGoogle(input);
      const result = await enrichHalal(
        googleResult,
        input,
        dependencies.loadHalal,
      );
      dependencies.setCached(cacheKey, result);
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
