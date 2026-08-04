import { createDeleteAccountHandler, isRecentlyAuthenticated } from './core';

function jwt(authenticatedAt: number, issuedAt = authenticatedAt) {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  return `${encode({ alg: 'none' })}.${encode({
    amr: [{ method: 'password', timestamp: authenticatedAt }],
    iat: issuedAt,
    session_id: 'session-1',
    sub: 'user-1',
  })}.signature`;
}

describe('delete-account Edge Function', () => {
  it('requires a freshly authenticated, verified user', async () => {
    const now = 1_800_000_000;
    const verifyUser = jest.fn();
    const deleteUser = jest.fn();
    const handler = createDeleteAccountHandler({ deleteUser, now: () => now, verifyUser });

    const missing = await handler(new Request('https://example.test', { method: 'POST' }));
    expect(missing.status).toBe(401);

    const stale = await handler(
      new Request('https://example.test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt(now - 601)}` },
      }),
    );
    expect(stale.status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('deletes only the user verified from the bearer token', async () => {
    const now = 1_800_000_000;
    const verifyUser = jest.fn().mockResolvedValue({
      id: 'verified-user',
      lastSignInAt: new Date((now - 30) * 1000).toISOString(),
      providers: [],
    });
    const deleteUser = jest.fn().mockResolvedValue(undefined);
    const handler = createDeleteAccountHandler({ deleteUser, now: () => now, verifyUser });
    const token = jwt(now - 30);

    const response = await handler(
      new Request('https://example.test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(verifyUser).toHaveBeenCalledWith(token);
    expect(deleteUser).toHaveBeenCalledWith('verified-user');
  });

  it('does not treat a background JWT refresh as recent session-bound authentication', async () => {
    const now = 1_800_000_000;
    const deleteUser = jest.fn();
    const handler = createDeleteAccountHandler({
      deleteUser,
      now: () => now,
      verifyUser: jest.fn().mockResolvedValue({
        id: 'verified-user',
        providers: [],
      }),
    });

    const response = await handler(
      new Request('https://example.test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt(now - 601, now - 20)}` },
      }),
    );

    expect(response.status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('revokes Apple authorization before deleting an Apple-authenticated user', async () => {
    const now = 1_800_000_000;
    const revokeApple = jest.fn().mockResolvedValue('revoked');
    const deleteUser = jest.fn().mockResolvedValue(undefined);
    const handler = createDeleteAccountHandler({
      deleteUser,
      now: () => now,
      revokeApple,
      verifyUser: jest.fn().mockResolvedValue({
        id: 'apple-user',
        lastSignInAt: new Date((now - 20) * 1000).toISOString(),
        providers: ['apple'],
      }),
    });

    const response = await handler(
      new Request('https://example.test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt(now - 20)}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(revokeApple).toHaveBeenCalledWith('apple-user');
    expect(revokeApple.mock.invocationCallOrder[0]).toBeLessThan(
      deleteUser.mock.invocationCallOrder[0],
    );
  });

  it('still deletes an Apple account when no revocable credential is available', async () => {
    const now = 1_800_000_000;
    const deleteUser = jest.fn().mockResolvedValue(undefined);
    const handler = createDeleteAccountHandler({
      deleteUser,
      now: () => now,
      revokeApple: jest.fn().mockResolvedValue('manual-required'),
      verifyUser: jest.fn().mockResolvedValue({
        id: 'legacy-apple-user',
        lastSignInAt: new Date((now - 20) * 1000).toISOString(),
        providers: ['apple'],
      }),
    });

    const response = await handler(
      new Request('https://example.test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt(now - 20)}` },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      appleRevocation: 'manual-required',
      deleted: true,
    });
    expect(deleteUser).toHaveBeenCalledWith('legacy-apple-user');
  });
});

describe('recent authentication guard', () => {
  it('accepts at most ten minutes and rejects malformed tokens', () => {
    const now = 1_800_000_000;
    expect(isRecentlyAuthenticated(jwt(now - 600), now)).toBe(true);
    expect(isRecentlyAuthenticated(jwt(now - 601), now)).toBe(false);
    expect(isRecentlyAuthenticated('not-a-jwt', now)).toBe(false);
  });
});
