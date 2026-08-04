import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AppUser } from '@/contracts/auth';

import { ProfileScreen } from './profile-screen';

const mockSetMode = jest.fn();
const mockPush = jest.fn();
const mockUpdateDisplayName = jest.fn();
const mockSignOut = jest.fn();
const mockAuthState = {
  user: {
    id: 'user-1',
    email: 'weikeatpeng@gmail.com',
  } as AppUser | null,
  isBusy: false,
  error: null as string | null,
  updateDisplayName: mockUpdateDisplayName,
  signOut: mockSignOut,
};

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.light,
    mode: 'system',
    resolvedMode: 'light',
    setMode: mockSetMode,
  }),
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.user = {
      id: 'user-1',
      email: 'weikeatpeng@gmail.com',
    };
    mockAuthState.error = null;
    mockAuthState.isBusy = false;
    mockUpdateDisplayName.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
  });

  it('offers accessible theme options and selects dark mode', () => {
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <ProfileScreen />
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByTestId('theme-dark'));

    expect(mockSetMode).toHaveBeenCalledWith('dark');
    expect(screen.getByLabelText('System theme')).toHaveProp('accessibilityState', {
      checked: true,
    });
  });

  it('shows the email username and lets the user save a custom name', async () => {
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <ProfileScreen />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('weikeatpeng')).toBeTruthy();
    expect(screen.getByText('weikeatpeng@gmail.com')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Edit display name' }));
    fireEvent.changeText(screen.getByLabelText('Display name'), 'Klang Foodie');
    fireEvent.press(screen.getByRole('button', { name: 'Save display name' }));

    await waitFor(() =>
      expect(mockUpdateDisplayName).toHaveBeenCalledWith('Klang Foodie'),
    );

    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('keeps Privacy and Terms available from Profile', () => {
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <ProfileScreen />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Privacy notice')).toBeTruthy();
    expect(screen.getByText('Terms of use')).toBeTruthy();
  });
});
