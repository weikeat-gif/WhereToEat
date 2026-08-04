type VerifiedUser = {
  id: string;
  providers: string[];
};

type DeleteAccountDependencies = {
  verifyUser(token: string): Promise<VerifiedUser>;
  deleteUser(userId: string): Promise<void>;
  revokeApple?(userId: string): Promise<'manual-required' | 'revoked'>;
  now?: () => number;
};

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

function response(status: number, body: object) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function bearerToken(request: Request) {
  const value = request.headers.get('Authorization') ?? '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

export function isRecentlyAuthenticated(token: string, nowSeconds: number) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return false;
    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
    const claims = JSON.parse(atob(normalized)) as {
      amr?: Array<{ method?: unknown; timestamp?: unknown }>;
      session_id?: unknown;
    };
    if (typeof claims.session_id !== 'string' || !Array.isArray(claims.amr)) {
      return false;
    }
    const latestAuthentication = Math.max(
      ...claims.amr
        .filter(
          (method) =>
            typeof method.method === 'string' &&
            typeof method.timestamp === 'number',
        )
        .map((method) => method.timestamp as number),
    );
    if (!Number.isFinite(latestAuthentication)) return false;
    const age = nowSeconds - latestAuthentication;
    return age >= -60 && age <= 600;
  } catch {
    return false;
  }
}

export function createDeleteAccountHandler({
  deleteUser,
  now = () => Math.floor(Date.now() / 1000),
  verifyUser,
  revokeApple,
}: DeleteAccountDependencies) {
  return async function deleteAccountHandler(request: Request) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return response(405, { error: 'Method not allowed.' });

    const token = bearerToken(request);
    if (!token) return response(401, { error: 'Sign in to delete your account.' });
    if (!isRecentlyAuthenticated(token, now())) {
      return response(403, {
        code: 'recent_auth_required',
        error: 'For your security, sign in again before deleting your account.',
      });
    }

    try {
      const user = await verifyUser(token);
      const appleRevocation = user.providers.includes('apple')
        ? revokeApple
          ? await revokeApple(user.id)
          : 'manual-required'
        : undefined;
      await deleteUser(user.id);
      return response(200, { deleted: true, ...(appleRevocation ? { appleRevocation } : {}) });
    } catch {
      return response(400, {
        error: 'Your account could not be deleted. Please sign in again and retry.',
      });
    }
  };
}
