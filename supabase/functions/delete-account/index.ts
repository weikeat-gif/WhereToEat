import { createDeleteAccountHandler } from './core.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const APPLE_CLIENT_ID = Deno.env.get('APPLE_CLIENT_ID');
const APPLE_CLIENT_SECRET = Deno.env.get('APPLE_CLIENT_SECRET');

function requireEnvironment() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Account deletion is not configured.');
  }
  return {
    anonKey: SUPABASE_ANON_KEY,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    url: SUPABASE_URL,
  };
}

const handler = createDeleteAccountHandler({
  async verifyUser(token) {
    const environment = requireEnvironment();
    const result = await fetch(new URL('/auth/v1/user', environment.url), {
      headers: {
        apikey: environment.anonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!result.ok) throw new Error('Invalid user session.');
    const user = (await result.json()) as {
      app_metadata?: { providers?: unknown };
      id?: unknown;
    };
    if (typeof user.id !== 'string') {
      throw new Error('Invalid user session.');
    }
    return {
      id: user.id,
      providers: Array.isArray(user.app_metadata?.providers)
        ? user.app_metadata.providers.filter(
            (provider): provider is string => typeof provider === 'string',
          )
        : [],
    };
  },
  async revokeApple(userId) {
    const env = requireEnvironment();
    if (!APPLE_CLIENT_ID || !APPLE_CLIENT_SECRET) {
      return 'manual-required';
    }
    const credentialUrl = new URL('/rest/v1/apple_auth_credentials', env.url);
    credentialUrl.searchParams.set('select', 'refresh_token');
    credentialUrl.searchParams.set('user_id', `eq.${userId}`);
    credentialUrl.searchParams.set('limit', '1');
    const credentialResponse = await fetch(credentialUrl, {
      headers: {
        apikey: env.serviceRoleKey,
        Authorization: `Bearer ${env.serviceRoleKey}`,
      },
    });
    if (!credentialResponse.ok) return 'manual-required';
    const credentials = (await credentialResponse.json()) as Array<{
      refresh_token?: unknown;
    }>;
    const refreshToken = credentials[0]?.refresh_token;
    if (typeof refreshToken !== 'string') {
      return 'manual-required';
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const revokeResponse = await fetch('https://appleid.apple.com/auth/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: APPLE_CLIENT_ID,
            client_secret: APPLE_CLIENT_SECRET,
            token: refreshToken,
            token_type_hint: 'refresh_token',
          }),
        });
        if (revokeResponse.ok) return 'revoked';
      } catch {
        // Retry transient Apple/network failures without blocking account deletion forever.
      }
    }
    return 'manual-required';
  },
  async deleteUser(userId) {
    const environment = requireEnvironment();
    const result = await fetch(
      new URL(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, environment.url),
      {
        method: 'DELETE',
        headers: {
          apikey: environment.serviceRoleKey,
          Authorization: `Bearer ${environment.serviceRoleKey}`,
        },
      },
    );
    if (!result.ok) throw new Error('Account deletion failed.');
  },
});

Deno.serve(handler);
