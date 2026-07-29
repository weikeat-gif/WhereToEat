import {
  buildGoogleRequest,
  createPlacesHandler,
  fetchWithTimeout,
  type GooglePlacesAction,
  type HalalRecord,
  normalizeBoundaryResponse,
  readJsonResponseWithLimit,
  type PlacesAction,
  type PromotionRecord,
  setBoundedMapValue,
  UpstreamError,
} from './core.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const GOOGLE_API_KEY =
  Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY') ??
  Deno.env.get('GOOGLE_PLACES_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RATE_LIMIT_HMAC_SECRET = Deno.env.get('RATE_LIMIT_HMAC_SECRET');

const rate = new Map<string, { count: number; resetAt: number }>();
const MAX_RATE_ENTRIES = 5_000;
const boundaryCache = new Map<
  string,
  { expiresAt: number; value: unknown }
>();
const MAX_BOUNDARY_CACHE_ENTRIES = 500;
let lastBoundaryRequestAt = 0;

async function rateBucketKey(value: string) {
  if (!RATE_LIMIT_HMAC_SECRET) {
    throw new Error('RATE_LIMIT_HMAC_SECRET is not configured.');
  }
  const signingKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(RATE_LIMIT_HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const encoded = new TextEncoder().encode(value);
  const signature = await crypto.subtle.sign('HMAC', signingKey, encoded);
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function consumeDurableRateLimit(
  bucket: string,
  action: PlacesAction['action'],
  requestLimit: number,
  windowSeconds = 60,
): Promise<boolean | undefined> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return undefined;
  if (!RATE_LIMIT_HMAC_SECRET) return false;

  const query = new URL(
    '/rest/v1/rpc/consume_places_rate_limit',
    SUPABASE_URL,
  );
  try {
    return await fetchWithTimeout(
      fetch,
      query,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_bucket_key: bucket,
          p_request_limit: requestLimit,
          p_window_seconds: windowSeconds,
        }),
      },
      async (response) => {
        if (!response.ok) return false;
        return (await response.json()) === true;
      },
    );
  } catch {
    return false;
  }
}

async function googleRequest(input: GooglePlacesAction): Promise<unknown> {
  if (!GOOGLE_API_KEY) throw new Error('Google Places is not configured.');
  const { url, init } = buildGoogleRequest(GOOGLE_API_KEY, input);

  return fetchWithTimeout(fetch, url, init, async (response) => {
    if (!response.ok) {
      throw new UpstreamError(
        input.action === 'route'
          ? 'Google Routes request failed.'
          : 'Google Places request failed.',
        response.status,
      );
    }
    return response.json();
  });
}

async function loadHalal(placeIds: string[]): Promise<HalalRecord[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || placeIds.length === 0) return [];
  const values = placeIds.map((id) => `"${id.replaceAll('"', '')}"`).join(',');
  const query = new URL('/rest/v1/halal_verifications', SUPABASE_URL);
  query.searchParams.set(
    'select',
    'google_place_id,source_name,source_url,verified_at,expires_at',
  );
  query.searchParams.set('google_place_id', `in.(${values})`);
  return fetchWithTimeout(
    fetch,
    query,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
    async (response) => {
      if (!response.ok) return [];
      return response.json() as Promise<HalalRecord[]>;
    },
  );
}

async function waitForBoundaryRequestSlot() {
  const delay = Math.max(0, lastBoundaryRequestAt + 1_100 - Date.now());
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastBoundaryRequestAt = Date.now();
}

async function loadBoundary(
  input: Extract<PlacesAction, { action: 'boundary' }>,
): Promise<unknown> {
  const cacheKey = `${input.label.toLocaleLowerCase()}|${input.center.latitude.toFixed(3)}|${input.center.longitude.toFixed(3)}`;
  const cached = boundaryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const globalBoundaryBucket = await rateBucketKey('boundary-provider:global');
  if (
    (await consumeDurableRateLimit(
      globalBoundaryBucket,
      input.action,
      1,
      2,
    )) !== true
  ) {
    throw new UpstreamError(
      'OpenStreetMap boundary request is temporarily rate limited.',
      429,
    );
  }
  await waitForBoundaryRequestSlot();
  const query = new URL('https://nominatim.openstreetmap.org/search');
  query.searchParams.set('format', 'jsonv2');
  query.searchParams.set('countrycodes', 'my');
  query.searchParams.set('limit', '5');
  query.searchParams.set('polygon_geojson', '1');
  query.searchParams.set('polygon_threshold', '0.00015');
  query.searchParams.set(
    'viewbox',
    [
      input.center.longitude - 0.12,
      input.center.latitude + 0.12,
      input.center.longitude + 0.12,
      input.center.latitude - 0.12,
    ].join(','),
  );
  query.searchParams.set('q', input.label);
  const value = await fetchWithTimeout(
    fetch,
    query,
    {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en-MY,en;q=0.9',
        'User-Agent':
          'MakanMana/1.0 boundary lookup (https://github.com/weikeat-gif/WhereToEat)',
      },
    },
    async (response) => {
      if (!response.ok) {
        throw new UpstreamError(
          'OpenStreetMap boundary request failed.',
          response.status,
        );
      }
      return readJsonResponseWithLimit(
        response,
        2_000_000,
        'OpenStreetMap boundary',
      );
    },
  );
  const boundary = normalizeBoundaryResponse(value, input.center);
  setBoundedMapValue(
    boundaryCache,
    MAX_BOUNDARY_CACHE_ENTRIES,
    cacheKey,
    {
      expiresAt:
        Date.now() + (boundary ? 30 * 24 * 60 * 60_000 : 24 * 60 * 60_000),
      value: boundary,
    },
  );
  return boundary;
}

async function loadPromotions(placeIds: string[]): Promise<PromotionRecord[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || placeIds.length === 0) {
    return [];
  }
  const values = placeIds.map((id) => `"${id.replaceAll('"', '')}"`).join(',');
  const query = new URL('/rest/v1/restaurant_promotions', SUPABASE_URL);
  query.searchParams.set(
    'select',
    'id,google_place_id,starts_at,ends_at',
  );
  const now = new Date().toISOString();
  query.searchParams.set('google_place_id', `in.(${values})`);
  query.searchParams.set('starts_at', `lte.${now}`);
  query.searchParams.set('ends_at', `gt.${now}`);
  query.searchParams.set('order', 'starts_at.asc');
  return fetchWithTimeout(
    fetch,
    query,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
    async (response) => {
      if (!response.ok) return [];
      return response.json() as Promise<PromotionRecord[]>;
    },
  );
}

const handler = createPlacesHandler({
  callGoogle: googleRequest,
  loadBoundary,
  loadHalal,
  loadPromotions,
  async allowRequest(key, input) {
    const now = Date.now();
    if (!RATE_LIMIT_HMAC_SECRET) return false;
    const requestLimit =
      input.action === 'route'
        ? 12
        : input.action === 'boundary'
          ? 10
        : input.action === 'nearby' && input.query
          ? 20
          : 60;
    const bucket = await rateBucketKey(`${input.action}:${key}`);
    const localKey = `${input.action}:${bucket}`;
    const window = rate.get(localKey);
    if (!window || window.resetAt <= now) {
      setBoundedMapValue(rate, MAX_RATE_ENTRIES, localKey, {
        count: 1,
        resetAt: now + 60_000,
      });
    } else {
      window.count += 1;
      if (window.count > requestLimit) return false;
    }
    return (
      (await consumeDurableRateLimit(bucket, input.action, requestLimit)) ?? true
    );
  },
});

Deno.serve(handler);
