import { fireEvent, render, screen } from '@testing-library/react-native';
import { FlatList, Linking, ScrollView } from 'react-native';

import type { PlaceSummary } from '@/contracts/place';

import { MapScreen } from './map-screen';

const mockPush = jest.fn();
const mockUseSearch = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('@/features/search/search-provider', () => ({
  useSearch: () => mockUseSearch(),
}));

jest.mock('@/features/map/map-canvas', () => {
  const { TouchableOpacity, View } = jest.requireActual('react-native');
  return {
    MapCanvas: ({
      onViewportChange,
      onMapPress,
    }: {
      onViewportChange: (viewport: {
        center: { latitude: number; longitude: number };
        radiusMeters: number;
      }) => void;
      onMapPress: () => void;
    }) => (
      <View accessibilityLabel="Map test canvas">
        <TouchableOpacity
          accessibilityLabel="Focus map test control"
          onPress={onMapPress}
        />
        <TouchableOpacity
          accessibilityLabel="Pan map test control"
          onPress={() =>
            onViewportChange({
              center: { latitude: 3.05, longitude: 101.45 },
              radiusMeters: 6800,
            })
          }
        />
      </View>
    ),
  };
});

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.dark,
  }),
}));

const trustedPlace: PlaceSummary = {
  id: 'trusted-place',
  name: 'Trusted Place',
  subtitle: 'Verified fixture',
  coordinates: { latitude: 3.139, longitude: 101.6869 },
  distanceMeters: 300,
  rating: 4.5,
  reviewCount: 120,
  priceLevel: 2,
  isOpen: true,
  categories: ['Malaysian'],
  halalVerification: {
    sourceName: 'JAKIM Halal Malaysia',
    sourceUrl: 'https://www.halal.gov.my/v4/',
    verifiedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2027-01-01T00:00:00.000Z',
  },
};

function searchState(overrides: Record<string, unknown> = {}) {
  return {
    autocompleteArea: jest.fn().mockResolvedValue([]),
    criteria: {
      center: { latitude: 3.139, longitude: 101.6869 },
      areaLabel: 'Klang Valley',
      radiusMeters: 3000,
      openNow: true,
      priceLevels: [1, 2],
      categories: [],
      verifiedHalalOnly: false,
    },
    error: null,
    locationCanAskAgain: true,
    locationMessage: null,
    locationStatus: 'idle',
    results: [trustedPlace],
    search: jest.fn(),
    searchCurrentLocation: jest.fn(),
    selectArea: jest.fn(),
    status: 'success',
    surprise: undefined,
    surpriseMe: jest.fn(),
    updateCriteriaAndSearch: jest.fn(),
    ...overrides,
  };
}

describe('MapScreen states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearch.mockReturnValue(searchState());
  });

  it('focuses the full map on a deliberate tap and restores nearby results', () => {
    const { UNSAFE_getAllByType, UNSAFE_getByType } = render(<MapScreen />);

    expect(screen.getByTestId('map-pane')).toHaveStyle({ flex: 1 });
    expect(screen.getByTestId('results-pane')).toBeTruthy();
    expect(screen.getByTestId('search-area-button')).toHaveStyle({
      bottom: '48%',
    });
    expect(
      screen.getByRole('button', { name: 'Focus map view' }),
    ).toHaveProp('accessibilityState', { expanded: true });
    expect(UNSAFE_getByType(FlatList).props.horizontal).toBeFalsy();
    expect(
      UNSAFE_getAllByType(ScrollView).filter(
        (scrollView) => scrollView.props.horizontal !== true,
      ),
    ).toHaveLength(1);

    fireEvent.press(screen.getByLabelText('Focus map test control'));

    expect(screen.queryByTestId('results-pane')).toBeNull();
    expect(screen.getByTestId('search-area-button')).toHaveStyle({
      bottom: 128,
    });
    const nearbyDock = screen.getByRole('button', {
      name: 'Show 1 place nearby',
    });
    expect(nearbyDock).toHaveProp('accessibilityState', { expanded: false });

    fireEvent.press(nearbyDock);

    expect(screen.getByTestId('results-pane')).toBeTruthy();
  });

  it('keeps Privacy and Terms navigation in Profile only', () => {
    render(<MapScreen />);

    expect(screen.queryByText('Privacy')).toBeNull();
    expect(screen.queryByText('Terms')).toBeNull();
  });

  it('offers an explicit accessible control to focus the map', () => {
    render(<MapScreen />);

    fireEvent.press(
      screen.getByRole('button', { name: 'Focus map view' }),
    );

    expect(screen.queryByTestId('results-pane')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Show 1 place nearby' }),
    ).toBeTruthy();
  });

  it('expands the restaurant list and hides the map when results are scrolled', () => {
    const { UNSAFE_getByType } = render(<MapScreen />);

    fireEvent.scroll(UNSAFE_getByType(FlatList), {
      nativeEvent: { contentOffset: { x: 0, y: 32 } },
    });

    expect(screen.queryByTestId('map-pane')).toBeNull();
    expect(screen.getByTestId('results-pane')).toHaveStyle({ height: '100%' });

    fireEvent.press(
      screen.getByRole('button', { name: 'Focus map view' }),
    );

    expect(screen.getByTestId('map-pane')).toBeTruthy();
    expect(screen.queryByTestId('results-pane')).toBeNull();
  });

  it('opens a shared result in place details', () => {
    render(<MapScreen />);

    fireEvent.press(screen.getByText('Trusted Place'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/[id]',
      params: { id: 'trusted-place' },
    });
    expect(screen.getByLabelText('Use my current location')).toBeTruthy();
  });

  it('searches the restaurant or cuisine query shown in criteria', () => {
    const updateCriteriaAndSearch = jest.fn();
    const state = searchState({ updateCriteriaAndSearch });
    mockUseSearch.mockReturnValue({
      ...state,
      criteria: { ...state.criteria, query: 'nasi lemak' },
    });

    render(<MapScreen />);

    const query = screen.getByLabelText('Search restaurants or cuisines');
    expect(query).toHaveProp('value', 'nasi lemak');
    fireEvent.changeText(query, '  roti canai  ');
    fireEvent(query, 'submitEditing');

    expect(updateCriteriaAndSearch).toHaveBeenCalledWith({
      query: 'roti canai',
    });
  });

  it('applies RM price filters through the shared search criteria', () => {
    const updateCriteriaAndSearch = jest.fn();
    mockUseSearch.mockReturnValue(searchState({ updateCriteriaAndSearch }));

    render(<MapScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Filter RM RM' }));

    expect(updateCriteriaAndSearch).toHaveBeenCalledWith({ priceLevels: [1] });
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it('keeps a draft query while another filter refreshes criteria', () => {
    const firstState = searchState();
    let currentState = firstState;
    mockUseSearch.mockImplementation(() => currentState);
    const view = render(<MapScreen />);
    const query = screen.getByLabelText('Search restaurants or cuisines');

    fireEvent.changeText(query, 'coffee');
    currentState = {
      ...firstState,
      criteria: {
        ...firstState.criteria,
        center: { ...firstState.criteria.center },
        openNow: false,
      },
    };
    view.rerender(<MapScreen />);

    expect(screen.getByLabelText('Search restaurants or cuisines')).toHaveProp(
      'value',
      'coffee',
    );
  });

  it('searches the explicitly panned map area only after confirmation', () => {
    const search = jest.fn();
    mockUseSearch.mockReturnValue(searchState({ search }));

    render(<MapScreen />);
    fireEvent.press(screen.getByLabelText('Pan map test control'));

    expect(search).not.toHaveBeenCalled();
    fireEvent.press(
      screen.getByRole('button', {
        name: 'Search restaurants in this map area',
      }),
    );
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        areaLabel: 'Map area',
        center: { latitude: 3.05, longitude: 101.45 },
        radiusMeters: 6800,
        rankPreference: 'POPULARITY',
      }),
    );
  });

  it('requests GPS and nearby food from the in-app map', () => {
    const searchCurrentLocation = jest.fn();
    mockUseSearch.mockReturnValue(searchState({ searchCurrentLocation }));

    render(<MapScreen />);

    fireEvent.press(
      screen.getByRole('button', { name: 'Use my current location' }),
    );

    expect(searchCurrentLocation).toHaveBeenCalledTimes(1);
  });

  it('opens app settings after location permission is permanently denied', () => {
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    mockUseSearch.mockReturnValue(
      searchState({
        locationCanAskAgain: false,
        locationMessage: 'Location permission was denied.',
        locationStatus: 'manual',
      }),
    );

    render(<MapScreen />);

    fireEvent.press(
      screen.getAllByRole('button', {
        name: 'Open app settings for location',
      })[0],
    );

    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('shows recovery guidance when app settings cannot open', async () => {
    jest
      .spyOn(Linking, 'openSettings')
      .mockRejectedValue(new Error('settings unavailable'));
    mockUseSearch.mockReturnValue(
      searchState({
        locationCanAskAgain: false,
        locationStatus: 'manual',
      }),
    );

    render(<MapScreen />);
    fireEvent.press(
      screen.getAllByRole('button', {
        name: 'Open app settings for location',
      })[0],
    );

    expect(
      await screen.findByText(/Unable to open app settings/i),
    ).toBeTruthy();
  });

  it.each([
    'Too many place searches. Please try again shortly.',
    'Unable to reach the places service.',
  ])('announces a service error and offers retry: %s', (message) => {
    const search = jest.fn();
    mockUseSearch.mockReturnValue(
      searchState({ error: message, results: [], search, status: 'error' }),
    );

    render(<MapScreen />);

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('shows an actionable empty state and disables Surprise me', () => {
    mockUseSearch.mockReturnValue(
      searchState({ results: [], status: 'empty' }),
    );

    render(<MapScreen />);

    expect(
      screen.getByText(
        'No makan spots match yet. Try a wider radius or fewer filters.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Surprise me with a nearby restaurant',
      }),
    ).toBeDisabled();
  });

  it('labels the loading indicator for assistive technology', () => {
    mockUseSearch.mockReturnValue(
      searchState({ results: [], status: 'loading' }),
    );

    render(<MapScreen />);

    expect(screen.getByLabelText('Loading nearby restaurants')).toBeTruthy();
  });
});
