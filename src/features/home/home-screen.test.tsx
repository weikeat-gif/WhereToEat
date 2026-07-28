import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { PlaceSummary } from '@/contracts/place';
import { DISCOVERY_PLACES } from '@/features/home/discovery-data';

import { HomeScreen } from './home-screen';

const mockPush = jest.fn();
const mockSearch = jest.fn();
const mockSearchCurrentLocation = jest.fn();
const mockSurpriseMe = jest.fn();
let mockResults: PlaceSummary[] = [];
let mockStatus = 'idle';
let mockDataMode: 'mock' | 'live' = 'mock';

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
      openNow: false,
      priceLevels: [],
      categories: [],
      verifiedHalalOnly: false,
    },
    results: mockResults,
    status: mockStatus,
    search: mockSearch,
    searchCurrentLocation: mockSearchCurrentLocation,
    surpriseMe: mockSurpriseMe,
  }),
}));

jest.mock('@/config/env', () => ({
  env: {
    get EXPO_PUBLIC_DATA_MODE() {
      return mockDataMode;
    },
  },
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
    mockDataMode = 'mock';
    mockSearch.mockResolvedValue({
      places: [{ id: 'mock-seri-klang-kitchen' }],
    });
    mockSearchCurrentLocation.mockResolvedValue({
      places: [{ id: 'mock-seri-klang-kitchen' }],
    });
    mockSurpriseMe.mockReturnValue({
      id: 'mock-seri-klang-kitchen',
    });
  });

  it('uses GPS for the nearby search and opens the shared map results', async () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByTestId('nearby-now-button'));

    await waitFor(() => expect(mockSearchCurrentLocation).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith('/map');
  });

  it('prevents duplicate GPS searches from rapid presses', async () => {
    let resolveLocation: (() => void) | undefined;
    mockSearchCurrentLocation.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLocation = resolve;
      }),
    );
    const screen = renderScreen();
    const button = screen.getByTestId('nearby-now-button');

    fireEvent.press(button);
    fireEvent.press(button);

    expect(mockSearchCurrentLocation).toHaveBeenCalledTimes(1);
    resolveLocation?.();
    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
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

  it('lets the Open now chip disable and re-enable the filter', () => {
    mockSearch.mockResolvedValue(undefined);
    const screen = renderScreen();

    fireEvent.press(screen.getByText('Open now'));
    expect(mockSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ openNow: true }),
    );

    fireEvent.press(screen.getByText('Open now'));
    expect(mockSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ openNow: false }),
    );
  });

  it('does not substitute demo restaurants for an empty completed search', () => {
    mockStatus = 'empty';
    const screen = renderScreen();

    expect(screen.queryByText('Jalan 21 Burger')).toBeNull();
    expect(screen.getByText('No places match these filters yet.')).toBeTruthy();
  });

  it('opens the map from the nearby results control', () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByLabelText('See all nearby restaurants'));

    expect(mockPush).toHaveBeenCalledWith('/map');
  });

  it('opens the canonical map search from the search control', () => {
    const screen = renderScreen();
    const searchControl = screen.getByLabelText('Search restaurants on map');

    expect(searchControl.props.accessibilityHint).toBe(
      'Opens the map to search restaurants, cuisines, or dishes',
    );

    fireEvent.press(searchControl);

    expect(mockPush).toHaveBeenCalledWith('/map');
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('uses concise food-discovery wording for primary choices', () => {
    const screen = renderScreen();

    expect(screen.getByText('MakanMana')).toBeTruthy();
    expect(screen.getByText('Find nearby')).toBeTruthy();
    expect(screen.getByText('Surprise me')).toBeTruthy();
    expect(screen.getByText('Nearby for you')).toBeTruthy();
  });

  it('uses the transparent icon-only brand mark', () => {
    const screen = renderScreen();
    const mark = screen.getByTestId('brand-mark');

    expect(mark).toHaveProp(
      'source',
      require('../../../assets/images/brand/makanmana-mark-tight.png'),
    );
    expect(mark).toHaveStyle({ height: 52, width: 40 });
  });

  it('automatically advances through Malaysian food hero slides', () => {
    jest.useFakeTimers();
    const screen = renderScreen();

    expect(
      screen.getByLabelText(
        'Featured Malaysian food: Char kway teow with teh tarik',
      ),
    ).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(4500);
    });

    expect(
      screen.getByLabelText(
        'Featured Malaysian food: Nasi lemak ayam berempah',
      ),
    ).toBeTruthy();
    jest.useRealTimers();
  });

  it('never flashes demo restaurants while live discovery starts', () => {
    mockDataMode = 'live';
    const screen = renderScreen();

    expect(screen.queryByText('Jalan 21 Burger')).toBeNull();
    expect(screen.queryByText('Nasi Lemak Antarabangsa')).toBeNull();
  });

  it('clearly discloses a paid restaurant placement', () => {
    mockDataMode = 'live';
    mockResults = [
      {
        ...DISCOVERY_PLACES[0],
        promotion: { id: '3be82851-f46d-43af-9a87-466ef33685d7' },
      },
    ];
    const screen = renderScreen();

    expect(screen.getByText('Sponsored')).toBeTruthy();
  });

  it('keeps the unavailable surprise message clear and actionable', () => {
    mockSurpriseMe.mockReturnValue(undefined);
    const screen = renderScreen();

    fireEvent.press(screen.getByTestId('surprise-me-button'));

    expect(
      screen.getByText('Find nearby food first, then let MakanMana pick.'),
    ).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
