import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProfileScreen } from './profile-screen';

const mockSetMode = jest.fn();

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
    expect(screen.getByLabelText('System theme')).toBeTruthy();
  });
});
