import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { FlatList, Linking, ScrollView } from 'react-native';

import type { PlaceSummary } from '@/contracts/place';

import {
  MAP_AUTO_SEARCH_DELAY_MS,
  MAP_QUERY_SUGGESTION_DELAY_MS,
  MapScreen,
} from './map-screen';

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
      showsUserLocation,
      userCoordinates,
    }: {
      onViewportChange: (
        viewport: {
          center: { latitude: number; longitude: number };
          radiusMeters: number;
          bounds?: {
            northEast: { latitude: number; longitude: number };
            southWest: { latitude: number; longitude: number };
          };
        },
        source: 'gesture' | 'programmatic',
      ) => void;
      onMapPress: () => void;
      showsUserLocation: boolean;
      userCoordinates?: { latitude: number; longitude: number } | null;
    }) => (
      <View accessibilityLabel="Map test canvas">
        {showsUserLocation && userCoordinates ? (
          <View
            accessibilityLabel={`Current location marker ${userCoordinates.latitude},${userCoordinates.longitude}`}
          />
        ) : null}
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
              bounds: {
                northEast: { latitude: 3.1, longitude: 101.5 },
                southWest: { latitude: 3.0, longitude: 101.4 },
              },
            }, 'gesture')
          }
        />
        <TouchableOpacity
          accessibilityLabel="Programmatic map update test control"
          onPress={() =>
            onViewportChange(
              {
                center: { latitude: 3.05, longitude: 101.45 },
                radiusMeters: 6800,
              },
              'programmatic',
            )
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
    clearRecentAreas: jest.fn(),
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
    userCoordinates: null,
    results: [trustedPlace],
    recentAreas: [],
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

  afterEach(() => {
    jest.useRealTimers();
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

    const query = screen.getByLabelText(
      'Search restaurants, cuisines, or locations',
    );
    expect(query).toHaveProp('value', 'nasi lemak');
    fireEvent.changeText(query, '  roti canai  ');
    fireEvent(query, 'submitEditing');

    expect(updateCriteriaAndSearch).toHaveBeenCalledWith({
      query: 'roti canai',
    });
  });

  it('suggests a matching area before submission and moves the map there', async () => {
    jest.useFakeTimers();
    const area = {
      id: 'klang',
      label: 'Klang',
      secondaryLabel: 'Selangor',
      coordinates: { latitude: 3.0449, longitude: 101.4456 },
    };
    const autocompleteArea = jest.fn().mockResolvedValue([area]);
    const selectArea = jest.fn().mockResolvedValue(undefined);
    const updateCriteriaAndSearch = jest.fn();
    mockUseSearch.mockReturnValue(
      searchState({
        autocompleteArea,
        selectArea,
        updateCriteriaAndSearch,
      }),
    );

    render(<MapScreen />);
    const query = screen.getByLabelText(
      'Search restaurants, cuisines, or locations',
    );
    fireEvent(query, 'focus');
    fireEvent.changeText(query, 'Klang');
    await act(async () => {
      jest.advanceTimersByTime(MAP_QUERY_SUGGESTION_DELAY_MS);
      await Promise.resolve();
    });

    expect(autocompleteArea).toHaveBeenCalledWith('Klang');
    fireEvent.press(
      screen.getByRole('button', { name: 'Go to Klang, Selangor' }),
    );

    expect(selectArea).toHaveBeenCalledWith(
      {
        ...area,
        label: 'Klang, Selangor',
      },
      { query: undefined },
    );
    expect(updateCriteriaAndSearch).not.toHaveBeenCalled();
    expect(query).toHaveProp('value', '');
    expect(screen.queryByTestId('results-pane')).toBeNull();
  });

  it('shows recent areas in the unified search field and selects one', () => {
    const recentArea = {
      id: 'taman-sentosa',
      label: 'Taman Sentosa, Klang, Selangor',
      coordinates: { latitude: 2.999458, longitude: 101.4745 },
    };
    const selectArea = jest.fn();
    mockUseSearch.mockReturnValue(
      searchState({
        recentAreas: [recentArea],
        selectArea,
      }),
    );

    render(<MapScreen />);
    fireEvent(
      screen.getByLabelText('Search restaurants, cuisines, or locations'),
      'focus',
    );

    expect(screen.getByText('Recent areas')).toBeTruthy();
    fireEvent.press(
      screen.getByRole('button', {
        name: 'Go to Taman Sentosa, Klang, Selangor',
      }),
    );
    expect(selectArea).toHaveBeenCalledWith(recentArea, { query: undefined });
  });

  it('limits selected-area restaurants to the irregular area boundary', () => {
    const insidePlace: PlaceSummary = {
      ...trustedPlace,
      id: 'inside-place',
      name: 'Inside Taman Sentosa',
      coordinates: { latitude: 3.0268, longitude: 101.4372 },
    };
    const outsidePlace: PlaceSummary = {
      ...trustedPlace,
      id: 'outside-place',
      name: 'Outside Taman Sentosa',
      coordinates: { latitude: 3.08, longitude: 101.5 },
    };
    const state = searchState({
      results: [insidePlace, outsidePlace],
    });
    mockUseSearch.mockReturnValue({
      ...state,
      criteria: {
        ...state.criteria,
        areaLabel: 'Taman Sentosa, Klang',
        center: { latitude: 3.0268, longitude: 101.4372 },
        areaBounds: {
          northEast: { latitude: 3.046, longitude: 101.458 },
          southWest: { latitude: 3.008, longitude: 101.418 },
        },
        areaBoundary: {
          source: 'openstreetmap',
          sourceUrl: 'https://www.openstreetmap.org/relation/18743759',
          label: 'Bandar Sentosa',
          polygons: [
            {
              outer: [
                { latitude: 3, longitude: 101.42 },
                { latitude: 3.05, longitude: 101.42 },
                { latitude: 3.05, longitude: 101.46 },
                { latitude: 3, longitude: 101.42 },
              ],
              holes: [],
            },
          ],
        },
      },
    });

    render(<MapScreen />);

    expect(
      screen.queryByText('Approximate area: Taman Sentosa, Klang'),
    ).toBeNull();
    expect(screen.getByText('Inside Taman Sentosa')).toBeTruthy();
    expect(screen.queryByText('Outside Taman Sentosa')).toBeNull();
    expect(
      screen.getByText('Boundary © OpenStreetMap contributors'),
    ).toBeTruthy();
    fireEvent.press(
      screen.getByRole('button', { name: 'Focus map view' }),
    );
    expect(
      screen.getByRole('button', { name: 'Show 1 place nearby' }),
    ).toBeTruthy();
  });

  it('applies RM price filters through the shared search criteria', () => {
    const updateCriteriaAndSearch = jest.fn();
    mockUseSearch.mockReturnValue(searchState({ updateCriteriaAndSearch }));

    render(<MapScreen />);
    fireEvent.press(
      screen.getByRole('button', { name: 'Open search filters' }),
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Filter Moderate' }),
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Apply search filters' }),
    );

    expect(updateCriteriaAndSearch).toHaveBeenCalledWith({
      categories: [],
      openNow: true,
      priceLevels: [1],
      radiusMeters: 3000,
      verifiedHalalOnly: false,
    });
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it('keeps a draft query while another filter refreshes criteria', () => {
    const firstState = searchState();
    let currentState = firstState;
    mockUseSearch.mockImplementation(() => currentState);
    const view = render(<MapScreen />);
    const query = screen.getByLabelText(
      'Search restaurants, cuisines, or locations',
    );

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

    expect(
      screen.getByLabelText(
        'Search restaurants, cuisines, or locations',
      ),
    ).toHaveProp('value', 'coffee');
  });

  it('automatically searches a settled panned area and keeps manual search available', () => {
    jest.useFakeTimers();
    const search = jest.fn().mockResolvedValue(undefined);
    mockUseSearch.mockReturnValue(searchState({ search }));

    render(<MapScreen />);
    fireEvent.press(screen.getByLabelText('Pan map test control'));

    expect(search).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(MAP_AUTO_SEARCH_DELAY_MS - 1);
    });
    expect(search).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        areaBounds: undefined,
        areaLabel: 'Map area',
        center: { latitude: 3.05, longitude: 101.45 },
        radiusMeters: 6800,
        rankPreference: 'POPULARITY',
      }),
    );

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Search restaurants in this map area',
      }),
    );
    expect(search).toHaveBeenLastCalledWith(
      expect.objectContaining({
        areaBounds: undefined,
        areaLabel: 'Map area',
        center: { latitude: 3.05, longitude: 101.45 },
        radiusMeters: 6800,
        rankPreference: 'POPULARITY',
      }),
    );
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('does not search again after an internal programmatic map movement', () => {
    jest.useFakeTimers();
    const search = jest.fn().mockResolvedValue(undefined);
    mockUseSearch.mockReturnValue(searchState({ search }));

    render(<MapScreen />);
    fireEvent.press(
      screen.getByLabelText('Programmatic map update test control'),
    );
    act(() => {
      jest.advanceTimersByTime(MAP_AUTO_SEARCH_DELAY_MS);
    });

    expect(search).not.toHaveBeenCalled();
  });

  it('shows the exact granted GPS position separately from restaurant pins', () => {
    mockUseSearch.mockReturnValue(
      searchState({
        locationStatus: 'granted',
        userCoordinates: { latitude: 3.139, longitude: 101.6869 },
      }),
    );

    render(<MapScreen />);

    expect(
      screen.getByLabelText('Current location marker 3.139,101.6869'),
    ).toBeTruthy();
    expect(
      screen.getByText('GPS ready — your location is marked on the map.'),
    ).toBeTruthy();
  });

  it('keeps the map count and list limited to places inside visible bounds', () => {
    const visiblePlace: PlaceSummary = {
      ...trustedPlace,
      id: 'visible-place',
      name: 'Visible Place',
      coordinates: { latitude: 3.05, longitude: 101.45 },
    };
    const outsidePlace: PlaceSummary = {
      ...trustedPlace,
      id: 'outside-place',
      name: 'Outside Place',
      coordinates: { latitude: 3.12, longitude: 101.45 },
    };
    const overlappingPlace: PlaceSummary = {
      ...trustedPlace,
      id: 'overlapping-place',
      name: 'Overlapping Place',
      coordinates: { latitude: 3.051, longitude: 101.451 },
    };
    mockUseSearch.mockReturnValue(
      searchState({
        results: [visiblePlace, overlappingPlace, outsidePlace],
      }),
    );

    render(<MapScreen />);
    fireEvent.press(screen.getByLabelText('Pan map test control'));

    expect(screen.getByText('1 spot around Klang Valley')).toBeTruthy();
    expect(screen.getByText('Visible Place')).toBeTruthy();
    expect(screen.queryByText('Overlapping Place')).toBeNull();
    expect(screen.queryByText('Outside Place')).toBeNull();

    fireEvent.press(
      screen.getByRole('button', { name: 'Focus map view' }),
    );
    expect(
      screen.getByRole('button', { name: 'Show 1 place nearby' }),
    ).toBeTruthy();
  });

  it('clears stale visible bounds when a selected suggestion recentres the map', () => {
    const firstState = searchState();
    let currentState = firstState;
    mockUseSearch.mockImplementation(() => currentState);
    const view = render(<MapScreen />);

    fireEvent.press(screen.getByLabelText('Pan map test control'));
    expect(screen.queryByText('Trusted Place')).toBeNull();

    const selectedAreaPlace: PlaceSummary = {
      ...trustedPlace,
      id: 'selected-area-place',
      name: 'Selected Area Place',
      coordinates: { latitude: 5.4141, longitude: 100.3288 },
    };
    currentState = {
      ...firstState,
      criteria: {
        ...firstState.criteria,
        areaLabel: 'George Town, Penang',
        center: { latitude: 5.4141, longitude: 100.3288 },
      },
      results: [selectedAreaPlace],
    };
    view.rerender(<MapScreen />);

    expect(screen.getByText('Selected Area Place')).toBeTruthy();
    expect(screen.getByText('1 spot around George Town, Penang')).toBeTruthy();
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
