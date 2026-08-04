import { createAppleCredentialHandler } from './core.ts';
import { verifyAppleIdToken } from './apple-id-token.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const APPLE_CLIENT_ID = Deno.env.get('APPLE_CLIENT_ID');
const APPLE_CLIENT_SECRET = Deno.env.get('APPLE_CLIENT_SECRET');

function environment() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !APPLE_CLIENT_ID ||
    !APPLE_CLIENT_SECRET
  ) {
    throw new Error('Apple credential storage is not configured.');
  }
  return {
    anonKey: SUPABASE_ANON_KEY,
    appleClientId: APPLE_CLIENT_ID,
    appleClientSecret: APPLE_CLIENT_SECRET,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    url: SUPABASE_URL,
  };
}

const handler = createAppleCredentialHandler({
  async verifyUser(token) {
    const env = environment();
    const response = await fetch(new URL('/auth/v1/user', env.url), {
      headers: { apikey: env.anonKey, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Invalid user session.');
    const user = (await response.json()) as {
      id?: unknown;
      identities?: Array<{
        identity_data?: { sub?: unknown };
        provider?: unknown;
        provider_id?: unknown;
      }>;
    };
    const appleIdentity = user.identities?.find(
      (identity) => identity.provider === 'apple',
    );
    const appleSubject =
      typeof appleIdentity?.provider_id === 'string'
        ? appleIdentity.provider_id
        : typeof appleIdentity?.identity_data?.sub === 'string'
          ? appleIdentity.identity_data.sub
          : undefined;
    if (typeof user.id !== 'string' || !appleSubject) {
      throw new Error('The signed-in user has no matching Apple identity.');
    }
    return { appleSubject, id: user.id };
  },
  async exchangeCode(code) {
    const env = environment();
    const body = new URLSearchParams({
      client_id: env.appleClientId,
      client_secret: env.appleClientSecret,
      code,
      grant_type: 'authorization_code',
    });
    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) throw new Error('Apple token exchange failed.');
    const tokens = (await response.json()) as {
      id_token?: unknown;
      refresh_token?: unknown;
    };
    if (
      typeof tokens.refresh_token !== 'string' ||
      typeof tokens.id_token !== 'string'
    ) {
      throw new Error('Apple credentials are unavailable.');
    }
    const subject = await verifyAppleIdToken(tokens.id_token, {
      audience: env.appleClientId,
    });
    return { refreshToken: tokens.refresh_token, subject };
  },
  async storeCredential(userId, refreshToken) {
    const env = environment();
    const url = new URL('/rest/v1/apple_auth_credentials', env.url);
    url.searchParams.set('on_conflict', 'user_id');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: env.serviceRoleKey,
        Authorization: `Bearer ${env.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
        user_id: userId,
      }),
    });
    if (!response.ok) throw new Error('Apple credential storage failed.');
  },
});

Deno.serve(handler);
