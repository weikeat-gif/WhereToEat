import { createFunctionsAccessTokenProvider } from './functions-session';

jest.mock('@/services/supabase/client', () => ({ supabase: null }));

describe('Edge Function guest session', () => {
  it('creates one anonymous-user JWT for concurrent guest requests', async () => {
    const session = { access_token: 'guest-user-jwt' };
    const signInAnonymously = jest.fn().mockResolvedValue({
      data: { session },
      error: null,
    });
    const provider = createFunctionsAccessTokenProvider({
      auth: {
        getSession: jest
          .fn()
          .mockResolvedValue({ data: { session: null }, error: null }),
        signInAnonymously,
      },
    } as never);

    await expect(Promise.all([provider(), provider()])).resolves.toEqual([
      'guest-user-jwt',
      'guest-user-jwt',
    ]);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('reuses a restored user session without creating a guest', async () => {
    const signInAnonymously = jest.fn();
    const provider = createFunctionsAccessTokenProvider({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { access_token: 'restored-jwt' } },
          error: null,
        }),
        signInAnonymously,
      },
    } as never);

    await expect(provider()).resolves.toBe('restored-jwt');
    expect(signInAnonymously).not.toHaveBeenCalled();
  });
});
