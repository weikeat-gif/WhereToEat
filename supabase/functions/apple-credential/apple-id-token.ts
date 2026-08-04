type AppleJwk = JsonWebKey & { kid?: string; kty?: string; use?: string };

type VerifyAppleIdTokenOptions = {
  audience: string;
  fetchJwks?: () => Promise<AppleJwk[]>;
  nowSeconds?: number;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const decoded = atob(padded);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function decodeJson(value: string) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as Record<
    string,
    unknown
  >;
}

async function fetchAppleJwks() {
  const response = await fetch('https://appleid.apple.com/auth/keys');
  if (!response.ok) throw new Error('Apple signing keys are unavailable.');
  const body = (await response.json()) as { keys?: unknown };
  if (!Array.isArray(body.keys)) throw new Error('Apple signing keys are invalid.');
  return body.keys as AppleJwk[];
}

export async function verifyAppleIdToken(
  idToken: string,
  options: VerifyAppleIdTokenOptions,
) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Apple identity token is malformed.');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson(encodedHeader);
  const claims = decodeJson(encodedPayload);
  if (
    header.alg !== 'RS256' ||
    typeof header.kid !== 'string' ||
    claims.iss !== 'https://appleid.apple.com' ||
    typeof claims.sub !== 'string' ||
    typeof claims.exp !== 'number'
  ) {
    throw new Error('Apple identity token claims are invalid.');
  }
  const audienceMatches =
    claims.aud === options.audience ||
    (Array.isArray(claims.aud) && claims.aud.includes(options.audience));
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!audienceMatches || claims.exp <= nowSeconds) {
    throw new Error('Apple identity token is expired or for another app.');
  }
  const keys = await (options.fetchJwks ?? fetchAppleJwks)();
  const jwk = keys.find(
    (candidate) =>
      candidate.kid === header.kid &&
      candidate.kty === 'RSA' &&
      (!candidate.use || candidate.use === 'sig'),
  );
  if (!jwk) throw new Error('Apple signing key was not found.');
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { hash: 'SHA-256', name: 'RSASSA-PKCS1-v1_5' },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    decodeBase64Url(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!valid) throw new Error('Apple identity token signature is invalid.');
  return claims.sub;
}
