type Dependencies = {
  verifyUser(token: string): Promise<{ appleSubject: string; id: string }>;
  exchangeCode(code: string): Promise<{ refreshToken: string; subject: string }>;
  storeCredential(userId: string, refreshToken: string): Promise<void>;
};

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

function json(status: number, body: object) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function createAppleCredentialHandler(dependencies: Dependencies) {
  return async function appleCredentialHandler(request: Request) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });
    const authorization = request.headers.get('Authorization') ?? '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : '';
    if (!token) return json(401, { error: 'Sign in with Apple first.' });

    try {
      const body = (await request.json()) as { authorizationCode?: unknown };
      if (
        typeof body.authorizationCode !== 'string' ||
        body.authorizationCode.length < 8 ||
        body.authorizationCode.length > 4096
      ) {
        return json(400, { error: 'Apple authorization code is invalid.' });
      }
      const user = await dependencies.verifyUser(token);
      const credential = await dependencies.exchangeCode(body.authorizationCode);
      if (credential.subject !== user.appleSubject) {
        throw new Error('Apple identity does not match the signed-in user.');
      }
      await dependencies.storeCredential(user.id, credential.refreshToken);
      return json(200, { stored: true });
    } catch {
      return json(400, {
        error: 'Apple sign-in could not be prepared for secure account deletion.',
      });
    }
  };
}
