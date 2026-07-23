import { act, render, screen, waitFor } from '@testing-library/react-native';
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

  it('does not let a late restored session overwrite a newer auth event', async () => {
    let resolveRestore!: (value: Awaited<ReturnType<AuthGateway['restoreSession']>>) => void;
    const restore = new Promise<Awaited<ReturnType<AuthGateway['restoreSession']>>>(
      (resolve) => {
        resolveRestore = resolve;
      },
    );
    let emit!: Parameters<AuthGateway['subscribe']>[0];
    const gateway = fakeGateway();
    gateway.restoreSession = jest.fn(() => restore);
    gateway.subscribe = jest.fn((listener) => {
      emit = listener;
      return () => undefined;
    });
    render(
      <AuthProvider gateway={gateway}>
        <Consumer />
      </AuthProvider>,
    );

    await act(async () => {
      emit({
        accessToken: 'new-token',
        user: { id: 'new-user', email: 'new@example.com' },
      });
      resolveRestore({
        accessToken: 'old-token',
        user: { id: 'old-user', email: 'old@example.com' },
      });
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByText('new@example.com')).toBeTruthy(),
    );
    expect(screen.queryByText('old@example.com')).toBeNull();
  });
});
