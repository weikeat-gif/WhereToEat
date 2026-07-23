// @ts-expect-error Deno requires explicit TypeScript extensions for local imports.
import { createPlacesHandler, type HalalRecord, type PlacesAction, UpstreamError } from './core.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const cache = new Map<string, { expiresAt: number; value: unknown }>();
const rate = new Map<string, { count: number; resetAt: number }>();

const FIELD_MASKS = {
  nearby:
    'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.photos,places.types',
  autocomplete:
    'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
  details:
    'id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,currentOpeningHours,internationalPhoneNumber,websiteUri,photos,types',
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
      includedPrimaryTypes: ['restaurant', 'cafe'],
      regionCode: 'MY',
    });
  } else {
    url = `https://places.googleapis.com/v1/places/${encodeURIComponent(input.placeId)}`;
    init = { method: 'GET', headers };
  }

  const response = await fetch(url, init);
  if (!response.ok) {
    throw new UpstreamError('Google Places request failed.', response.status);
  }
  return response.json();
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
  const response = await fetch(query, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!response.ok) return [];
  return response.json() as Promise<HalalRecord[]>;
}

const handler = createPlacesHandler({
  callGoogle: googleRequest,
  loadHalal,
  allowRequest(key) {
    const now = Date.now();
    const window = rate.get(key);
    if (!window || window.resetAt <= now) {
      rate.set(key, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    window.count += 1;
    return window.count <= 60;
  },
  getCached(key) {
    const hit = cache.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      cache.delete(key);
      return undefined;
    }
    return hit.value;
  },
  setCached(key, value) {
    cache.set(key, { expiresAt: Date.now() + 30_000, value });
  },
});

Deno.serve(handler);
