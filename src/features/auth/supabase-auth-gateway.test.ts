import type { Session } from '@supabase/supabase-js';

import { parseOAuthCallback, toAuthSession } from './supabase-auth-gateway';

jest.mock('@/services/supabase/client', () => ({ supabase: null }));

describe('Supabase auth UI session mapping', () => {
  it('keeps the protected-search anonymous session in guest UI mode', () => {
    const session = {
      access_token: 'anonymous-user-jwt',
      user: {
        id: 'anonymous-user',
        is_anonymous: true,
        user_metadata: {},
      },
    } as Session;

    expect(toAuthSession(session)).toBeNull();
  });
});

describe('Google OAuth callback parsing', () => {
  it('returns the PKCE exchange code', () => {
    expect(
      parseOAuthCallback('makanmana://auth?code=google-pkce-code'),
    ).toBe('google-pkce-code');
  });

  it('maps a provider denial to a stable cancellation message', () => {
    expect(() =>
      parseOAuthCallback(
        'makanmana://auth?error=access_denied&error_description=Access%20was%20denied',
      ),
    ).toThrow('Google sign-in was cancelled.');
  });

  it('rejects a callback sent to a different app address', () => {
    expect(() =>
      parseOAuthCallback('otherapp://auth?code=stolen-code'),
    ).toThrow('unexpected app address');
  });
});
