import { verifyAppleIdToken } from './apple-id-token';

function encodeBase64Url(value: string | Uint8Array) {
  const bytes =
    typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function signedToken(overrides: Record<string, unknown> = {}) {
  const keys = await crypto.subtle.generateKey(
    {
      hash: 'SHA-256',
      modulusLength: 2048,
      name: 'RSASSA-PKCS1-v1_5',
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ['sign', 'verify'],
  );
  const encodedHeader = encodeBase64Url(
    JSON.stringify({ alg: 'RS256', kid: 'apple-key-1', typ: 'JWT' }),
  );
  const encodedPayload = encodeBase64Url(
    JSON.stringify({
      aud: 'com.makanmana.app',
      exp: 2_000_000_000,
      iss: 'https://appleid.apple.com',
      sub: 'apple-user-1',
      ...overrides,
    }),
  );
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keys.privateKey,
    new TextEncoder().encode(signingInput),
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
  return {
    jwks: [{ ...publicJwk, kid: 'apple-key-1', use: 'sig' }],
    token: `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`,
  };
}

describe('Apple identity token verification', () => {
  it('verifies the Apple signature, issuer, audience, expiry, and returns its subject', async () => {
    const fixture = await signedToken();

    await expect(
      verifyAppleIdToken(fixture.token, {
        audience: 'com.makanmana.app',
        fetchJwks: async () => fixture.jwks,
        nowSeconds: 1_900_000_000,
      }),
    ).resolves.toBe('apple-user-1');
  });

  it('rejects a signed token issued for another app', async () => {
    const fixture = await signedToken({ aud: 'another.client' });

    await expect(
      verifyAppleIdToken(fixture.token, {
        audience: 'com.makanmana.app',
        fetchJwks: async () => fixture.jwks,
        nowSeconds: 1_900_000_000,
      }),
    ).rejects.toThrow('expired or for another app');
  });
});
