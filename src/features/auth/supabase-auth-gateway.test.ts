import type { Session } from '@supabase/supabase-js';

import {
  parseOAuthCallback,
  SupabaseAuthGateway,
  toAuthSession,
} from './supabase-auth-gateway';

const mockUpdateUser = jest.fn();

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    auth: {
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
  },
}));

describe('Supabase auth UI session mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the protected-search anonymous session in guest UI mode', () => {
    const session = {
      access_token: 'anonymous-user-jwt',
      user: {
        id: 'anonymous-user',
        is_anonymous: true,
        user_metadata: {},
      },
    } as unknown as Session;

    expect(toAuthSession(session)).toBeNull();
  });

  it('uses the email username until the user chooses a display name', () => {
    const session = {
      access_token: 'signed-in-user-jwt',
      user: {
        id: 'user-1',
        email: 'weikeatpeng@gmail.com',
        is_anonymous: false,
        user_metadata: { full_name: 'Google Account Name' },
      },
    } as unknown as Session;

    expect(toAuthSession(session)?.user.displayName).toBe('weikeatpeng');
  });

  it('persists a user-chosen display name in Supabase account metadata', async () => {
    mockUpdateUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'weikeatpeng@gmail.com',
          user_metadata: { display_name: 'Klang Foodie' },
        },
      },
      error: null,
    });

    const user = await new SupabaseAuthGateway().updateDisplayName(
      'Klang Foodie',
    );

    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: { display_name: 'Klang Foodie' },
    });
    expect(user.displayName).toBe('Klang Foodie');
  });

  it('rejects invisible direction controls in a display name', async () => {
    const gateway = new SupabaseAuthGateway();

    await expect(
      gateway.updateDisplayName('Klang\u202EFoodie'),
    ).rejects.toThrow('unsupported characters');
    expect(mockUpdateUser).not.toHaveBeenCalled();
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
