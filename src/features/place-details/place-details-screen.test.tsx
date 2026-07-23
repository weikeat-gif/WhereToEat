import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PlaceDetailsScreen } from './place-details-screen';

jest.mock('expo-image', () => {
  const { Image } = jest.requireActual('react-native');
  return { Image };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'jalan-21-burger' }),
}));

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.dark,
  }),
}));

describe('PlaceDetailsScreen', () => {
  it('renders place data and toggles the save control', () => {
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <PlaceDetailsScreen />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Jalan 21 Burger')).toBeTruthy();
    expect(screen.getByText('Popular picks')).toBeTruthy();

    fireEvent.press(screen.getByTestId('save-place-button'));

    expect(screen.getByLabelText('Remove from saved places')).toBeTruthy();
  });
});
