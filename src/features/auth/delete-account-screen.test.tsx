import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AppUser } from '@/contracts/auth';

import { DeleteAccountScreen } from './delete-account-screen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDeleteAccount = jest.fn();
const mockAuth = {
  user: null as AppUser | null,
  deleteAccount: mockDeleteAccount,
  error: null as string | null,
  isBusy: false,
};

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock('./auth-provider', () => ({ useAuth: () => mockAuth }));
jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.light,
  }),
}));

function renderScreen() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 44, left: 0, right: 0, bottom: 34 },
      }}>
      <DeleteAccountScreen />
    </SafeAreaProvider>,
  );
}

describe('public Delete account screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.user = null;
    mockAuth.error = null;
    mockDeleteAccount.mockResolvedValue(undefined);
  });

  it('lets a signed-out user enter the sign-in flow and return for deletion', () => {
    const screen = renderScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Sign in to delete account' }));
    expect(mockPush).toHaveBeenCalledWith('/auth');
  });

  it('requires a second confirmation before deleting a signed-in account', async () => {
    mockAuth.user = { id: 'user-1', email: 'me@example.com' };
    const screen = renderScreen();

    fireEvent.press(
      screen.getByRole('button', { name: 'Continue to deletion confirmation' }),
    );
    expect(mockDeleteAccount).not.toHaveBeenCalled();
    fireEvent.press(
      screen.getByRole('button', { name: 'Permanently delete my account' }),
    );

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/profile');
  });

  it('cancels confirmation when the signed-in account changes', () => {
    mockAuth.user = { id: 'user-a', email: 'a@example.com' };
    const screen = renderScreen();
    fireEvent.press(
      screen.getByRole('button', { name: 'Continue to deletion confirmation' }),
    );
    expect(
      screen.getByRole('button', { name: 'Permanently delete my account' }),
    ).toBeTruthy();

    mockAuth.user = { id: 'user-b', email: 'b@example.com' };
    screen.rerender(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <DeleteAccountScreen />
      </SafeAreaProvider>,
    );

    expect(
      screen.queryByRole('button', { name: 'Permanently delete my account' }),
    ).toBeNull();
    expect(screen.getByText('b@example.com')).toBeTruthy();
  });
});
