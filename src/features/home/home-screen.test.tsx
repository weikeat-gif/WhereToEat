import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from './home-screen';

const mockPush = jest.fn();
const mockSetCriteria = jest.fn();
const mockSetResults = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('expo-image', () => {
  const { Image } = jest.requireActual('react-native');
  return { Image };
});

jest.mock('@/features/search/search-provider', () => ({
  useSearch: () => ({
    criteria: {
      center: { latitude: 3.139, longitude: 101.6869 },
      areaLabel: 'Klang Valley',
      radiusMeters: 3000,
      openNow: true,
      priceLevels: [1, 2],
      categories: [],
      verifiedHalalOnly: false,
    },
    setCriteria: mockSetCriteria,
    setResults: mockSetResults,
  }),
}));

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.dark,
  }),
}));

function renderScreen() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 44, left: 0, right: 0, bottom: 34 },
      }}>
      <HomeScreen />
    </SafeAreaProvider>,
  );
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('populates shared search state from Nearby now', () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByTestId('nearby-now-button'));

    expect(mockSetCriteria).toHaveBeenCalledWith(
      expect.objectContaining({ openNow: true }),
    );
    expect(mockSetResults).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'jalan-21-burger' }),
      ]),
    );
    expect(screen.getByText('3 late-night picks ready')).toBeTruthy();
  });

  it('opens a real place from Surprise me', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const screen = renderScreen();

    fireEvent.press(screen.getByTestId('surprise-me-button'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/[id]',
      params: { id: 'jalan-21-burger' },
    });
  });
});
