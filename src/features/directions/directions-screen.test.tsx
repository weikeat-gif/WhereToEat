import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { DirectionsScreen } from './directions-screen';

const mockLoadDirections = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: (...args: unknown[]) => mockPush(...args),
  },
  useLocalSearchParams: () => ({ id: 'place-1' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('@/features/directions/directions-loader', () => ({
  DirectionsLocationError: class DirectionsLocationError extends Error {
    reason = 'denied';
    constructor(readonly canAskAgain = true) {
      super('Location permission is required.');
    }
  },
  loadDirections: (...args: unknown[]) => mockLoadDirections(...args),
}));

jest.mock('@/features/directions/directions-map', () => ({
  DirectionsMap: () => {
    const { View } = jest.requireActual('react-native');
    return <View accessibilityLabel="Directions map" />;
  },
}));

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.light,
  }),
}));

describe('DirectionsScreen location disclosure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadDirections.mockResolvedValue({
      place: {
        id: 'place-1',
        name: 'Klang Kitchen',
        address: 'Klang',
      },
      route: {
        coordinates: [
          { latitude: 3.1, longitude: 101.6 },
          { latitude: 3.2, longitude: 101.7 },
        ],
        destination: { latitude: 3.2, longitude: 101.7 },
        distanceMeters: 1000,
        durationSeconds: 300,
        origin: { latitude: 3.1, longitude: 101.6 },
        provider: 'google',
      },
    });
  });

  it('waits for explicit consent before requesting GPS or a route', async () => {
    render(<DirectionsScreen />);

    expect(mockLoadDirections).not.toHaveBeenCalled();
    expect(screen.getByText(/precise foreground location/i)).toBeTruthy();

    fireEvent.press(
      screen.getByRole('button', { name: 'Allow GPS and build route' }),
    );

    await waitFor(() =>
      expect(mockLoadDirections).toHaveBeenCalledWith('place-1'),
    );
  });

  it('handles app-settings failures without an unhandled rejection', async () => {
    const { DirectionsLocationError } = jest.requireMock(
      '@/features/directions/directions-loader',
    ) as { DirectionsLocationError: new (canAskAgain: boolean) => Error };
    mockLoadDirections.mockRejectedValue(
      new DirectionsLocationError(false),
    );
    jest
      .spyOn(Linking, 'openSettings')
      .mockRejectedValue(new Error('settings unavailable'));

    render(<DirectionsScreen />);
    fireEvent.press(
      screen.getByRole('button', { name: 'Allow GPS and build route' }),
    );
    await screen.findByRole('button', { name: 'Open app settings' });
    fireEvent.press(
      screen.getByRole('button', { name: 'Open app settings' }),
    );

    expect(
      await screen.findByText(/Unable to open app settings/i),
    ).toBeTruthy();
  });
});
