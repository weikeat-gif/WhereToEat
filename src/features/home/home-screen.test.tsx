import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from './home-screen';

const mockPush = jest.fn();
const mockSearch = jest.fn();
const mockSurpriseMe = jest.fn();
let mockResults: { id: string; name?: string }[] = [];
let mockStatus = 'idle';

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
    results: mockResults,
    status: mockStatus,
    search: mockSearch,
    surpriseMe: mockSurpriseMe,
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
    mockResults = [];
    mockStatus = 'idle';
    mockSearch.mockResolvedValue({
      places: [{ id: 'mock-seri-klang-kitchen' }],
    });
    mockSurpriseMe.mockReturnValue({
      id: 'mock-seri-klang-kitchen',
    });
  });

  it('runs the shared nearby search instead of injecting fixture results', async () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByTestId('nearby-now-button'));

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ openNow: true }),
    );
    await waitFor(() =>
      expect(screen.getByText('1 nearby place ready')).toBeTruthy(),
    );
  });

  it('opens only a place selected from current shared results', () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByTestId('surprise-me-button'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/[id]',
      params: { id: 'mock-seri-klang-kitchen' },
    });
  });

  it('runs verified-only Halal through the shared search service', async () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByText('Halal'));

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        verifiedHalalOnly: true,
        categories: [],
      }),
    );

    fireEvent.press(screen.getByText('Halal'));

    expect(mockSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        verifiedHalalOnly: false,
        categories: [],
      }),
    );
    await waitFor(() =>
      expect(screen.getByText('1 nearby place ready')).toBeTruthy(),
    );
  });

  it('does not substitute demo restaurants for an empty completed search', () => {
    mockStatus = 'empty';
    const screen = renderScreen();

    expect(screen.queryByText('Jalan 21 Burger')).toBeNull();
    expect(screen.getByText('No places match these filters yet.')).toBeTruthy();
  });
});
