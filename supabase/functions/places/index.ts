import {
  createPlacesHandler,
  fetchWithTimeout,
  type HalalRecord,
  type PlacesAction,
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
  key: string,
  action: PlacesAction['action'],
): Promise<boolean | undefined> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return undefined;
  if (!RATE_LIMIT_HMAC_SECRET) return false;

  const query = new URL(
    '/rest/v1/rpc/consume_places_rate_limit',
    SUPABASE_URL,
  );
  const bucket = await rateBucketKey(`${action}:${key}`);
  const requestLimit = action === 'route' ? 12 : 60;

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
          p_window_seconds: 60,
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

const FIELD_MASKS = {
  nearby:
    'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.types',
  autocomplete:
    'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
  details:
    'id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,currentOpeningHours,internationalPhoneNumber,websiteUri,types',
  route:
    'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
} as const;

async function googleRequest(input: PlacesAction): Promise<unknown> {
  if (!GOOGLE_API_KEY) throw new Error('Google Places is not configured.');
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': GOOGLE_API_KEY,
    'X-Goog-FieldMask': FIELD_MASKS[input.action],
  };
  let url = 'https://places.googleapis.com/v1/places:searchNearby';
  let init: RequestInit = { method: 'POST', headers };

  if (input.action === 'nearby') {
    init.body = JSON.stringify({
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
    });
  } else if (input.action === 'autocomplete') {
    url = 'https://places.googleapis.com/v1/places:autocomplete';
    init.body = JSON.stringify({
      input: input.input,
      sessionToken: input.sessionToken,
      includedPrimaryTypes: ['(regions)'],
      regionCode: 'MY',
    });
  } else if (input.action === 'details') {
    url = `https://places.googleapis.com/v1/places/${encodeURIComponent(input.placeId)}`;
    init = { method: 'GET', headers };
  } else {
    url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    init.body = JSON.stringify({
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
    });
  }

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

const handler = createPlacesHandler({
  callGoogle: googleRequest,
  loadHalal,
  async allowRequest(key, input) {
    const now = Date.now();
    const localKey = `${input.action}:${key}`;
    const requestLimit = input.action === 'route' ? 12 : 60;
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
    return (await consumeDurableRateLimit(key, input.action)) ?? true;
  },
});

Deno.serve(handler);
