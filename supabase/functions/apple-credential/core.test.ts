import { createAppleCredentialHandler } from './core';

describe('apple-credential Edge Function', () => {
  it('stores only a verified user credential exchanged server-side', async () => {
    const exchangeCode = jest.fn().mockResolvedValue({
      refreshToken: 'apple-refresh-token',
      subject: 'apple-subject-1',
    });
    const storeCredential = jest.fn().mockResolvedValue(undefined);
    const verifyUser = jest.fn().mockResolvedValue({
      appleSubject: 'apple-subject-1',
      id: 'user-1',
    });
    const handler = createAppleCredentialHandler({
      exchangeCode,
      storeCredential,
      verifyUser,
    });

    const response = await handler(
      new Request('https://example.test', {
        method: 'POST',
        headers: { Authorization: 'Bearer user-jwt' },
        body: JSON.stringify({ authorizationCode: 'apple-code-123' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(verifyUser).toHaveBeenCalledWith('user-jwt');
    expect(exchangeCode).toHaveBeenCalledWith('apple-code-123');
    expect(storeCredential).toHaveBeenCalledWith('user-1', 'apple-refresh-token');
  });

  it('rejects an Apple code that belongs to a different signed-in identity', async () => {
    const storeCredential = jest.fn();
    const handler = createAppleCredentialHandler({
      exchangeCode: jest.fn().mockResolvedValue({
        refreshToken: 'account-a-refresh-token',
        subject: 'apple-account-a',
      }),
      storeCredential,
      verifyUser: jest.fn().mockResolvedValue({
        appleSubject: 'apple-account-b',
        id: 'supabase-user-b',
      }),
    });

    const response = await handler(
      new Request('https://example.test', {
        method: 'POST',
        headers: { Authorization: 'Bearer user-b-jwt' },
        body: JSON.stringify({ authorizationCode: 'apple-code-for-a' }),
      }),
    );

    expect(response.status).toBe(400);
    expect(storeCredential).not.toHaveBeenCalled();
  });

  it('rejects missing auth and malformed authorization codes', async () => {
    const dependencies = {
      exchangeCode: jest.fn(),
      storeCredential: jest.fn(),
      verifyUser: jest.fn(),
    };
    const handler = createAppleCredentialHandler(dependencies);
    expect((await handler(new Request('https://example.test', { method: 'POST' }))).status).toBe(401);
    expect(
      (
        await handler(
          new Request('https://example.test', {
            method: 'POST',
            headers: { Authorization: 'Bearer token' },
            body: JSON.stringify({ authorizationCode: 'short' }),
          }),
        )
      ).status,
    ).toBe(400);
    expect(dependencies.exchangeCode).not.toHaveBeenCalled();
  });
});
