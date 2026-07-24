import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProfileScreen } from './profile-screen';

const mockSetMode = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@example.com' } }),
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

  it('provides a reachable account and sign-out route', () => {
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <ProfileScreen />
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Manage account' }));

    expect(screen.getByText('test@example.com')).toBeTruthy();
    expect(mockPush).toHaveBeenCalledWith('/auth');
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
