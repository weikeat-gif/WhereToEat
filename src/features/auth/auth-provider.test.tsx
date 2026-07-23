import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { AuthGateway } from './auth-gateway';
import { AuthProvider, useAuth } from './auth-provider';

jest.mock('@/services/supabase/client', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));
jest.mock('./supabase-auth-gateway', () => ({
  defaultAuthGateway: {},
}));

function Consumer() {
  const { user, isLoading } = useAuth();
  return <Text>{isLoading ? 'loading' : (user?.email ?? 'guest')}</Text>;
}

function fakeGateway(): AuthGateway {
  return {
    restoreSession: jest.fn().mockResolvedValue({
      accessToken: 'token',
      user: { id: 'user-1', email: 'test@example.com' },
    }),
    subscribe: jest.fn(() => () => undefined),
    signInWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
    requestEmailCode: jest.fn(),
    verifyEmailCode: jest.fn(),
    signOut: jest.fn(),
  };
}

describe('AuthProvider', () => {
  it('restores the persisted session before exposing the account', async () => {
    const gateway = fakeGateway();
    const screen = render(
      <AuthProvider gateway={gateway}>
        <Consumer />
      </AuthProvider>,
    );

    expect(screen.getByText('loading')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('test@example.com')).toBeTruthy());
    expect(gateway.restoreSession).toHaveBeenCalledTimes(1);
  });
});
