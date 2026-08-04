import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { FoodPreferenceKey } from '@/contracts/food-preference';
import type { PlaceDetails, PlaceSummary } from '@/contracts/place';
import type {
  AreaBoundary,
  AreaSuggestion,
  SearchCriteria,
  SearchResults,
} from '@/contracts/search';
import {
  SearchProvider,
  useSearch,
} from '@/features/search/search-provider';
import type { PlacesService } from '@/services/places/places-service';

const result: PlaceSummary = {
  id: 'result-1',
  name: 'Search result',
  subtitle: 'Demo',
  coordinates: { latitude: 3.14, longitude: 101.69 },
  distanceMeters: 400,
  rating: 4.5,
  reviewCount: 30,
  priceLevel: 2,
  isOpen: true,
  categories: ['Malaysian'],
};

class FakePlacesService implements PlacesService {
  async autocompleteArea(
    _input: string,
    _sessionToken: string,
  ): Promise<AreaSuggestion[]> {
    return [];
  }

  async getAreaBoundary(): Promise<AreaBoundary | null> {
    return null;
  }

  async searchNearby(criteria: SearchCriteria): Promise<SearchResults> {
    return {
      criteria,
      places: criteria.openNow ? [] : [result],
      fetchedAt: '2026-07-23T00:00:00.000Z',
    };
  }

  async getPlaceDetails(_placeId: string): Promise<PlaceDetails> {
    throw new Error('Not needed');
  }
}

const preferencePlaces: PlaceSummary[] = [
  {
    ...result,
    id: 'near-malaysian',
    name: 'Nearby Kitchen',
    distanceMeters: 300,
    categories: ['Malaysian'],
  },
  {
    ...result,
    id: 'far-chinese',
    name: 'Noodle House',
    distanceMeters: 1400,
    categories: ['Chinese', 'Noodles'],
    halalVerification: {
      sourceName: 'JAKIM Halal Malaysia',
      sourceUrl: 'https://www.halal.gov.my/v4/',
      verifiedAt: '2026-06-01T00:00:00.000Z',
      expiresAt: '2027-06-01T00:00:00.000Z',
    },
  },
];

class PreferencePlacesService extends FakePlacesService {
  readonly searches: SearchCriteria[] = [];

  override async searchNearby(criteria: SearchCriteria): Promise<SearchResults> {
    this.searches.push(criteria);
    return {
      criteria,
      places: preferencePlaces,
      fetchedAt: '2026-08-04T00:00:00.000Z',
    };
  }
}

function Harness() {
  const { criteria, results, status, updateCriteriaAndSearch } = useSearch();
  return (
    <View>
      <Text testID="state">
        {criteria.openNow ? 'open' : 'any'}:{status}:{results.length}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Open restaurants only"
        onPress={() => void updateCriteriaAndSearch({ openNow: true })}>
        <Text>Change filter</Text>
      </TouchableOpacity>
    </View>
  );
}

function AreaHarness() {
  const {
    criteria,
    clearRecentAreas,
    error,
    recentAreas,
    results,
    selectArea,
    status,
    surpriseMe,
    updateCriteriaAndSearch,
  } = useSearch();
  const [surpriseId, setSurpriseId] = useState('none');
  return (
    <View>
      <Text testID="area">{criteria.areaLabel}</Text>
      <Text testID="area-status">{`${status}:${error ?? 'none'}`}</Text>
      <Text testID="area-results">{results.length}</Text>
      <Text testID="area-boundary">
        {criteria.areaBoundary?.label ?? 'none'}
      </Text>
      <Text testID="area-filter">{criteria.openNow ? 'open' : 'any'}</Text>
      <Text testID="recent-areas">
        {recentAreas.map((area) => area.label).join('|') || 'none'}
      </Text>
      <Text testID="area-surprise">{surpriseId}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Select Klang"
        onPress={() =>
          void selectArea(
            { id: 'klang-1', label: 'Klang, Selangor' },
            { query: undefined },
          )
        }>
        <Text>Select</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Pick selected-area surprise"
        onPress={() => setSurpriseId(surpriseMe()?.id ?? 'none')}>
        <Text>Surprise</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Show open selected-area restaurants"
        onPress={() => void updateCriteriaAndSearch({ openNow: true })}>
        <Text>Open only</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Clear recent selected areas"
        onPress={clearRecentAreas}>
        <Text>Clear recents</Text>
      </TouchableOpacity>
    </View>
  );
}

function PreferenceHarness() {
  const { criteria, results, search } = useSearch();
  return (
    <View>
      <Text testID="preference-results">
        {results.map((place) => place.id).join('|')}
      </Text>
      <Text testID="preference-area">{criteria.areaLabel}</Text>
      <TouchableOpacity
        accessibilityLabel="Search preference test area"
        accessibilityRole="button"
        onPress={() =>
          void search({
            ...criteria,
            areaLabel: 'Petaling Jaya',
            center: { latitude: 3.1073, longitude: 101.6067 },
            query: 'noodles',
          })
        }>
        <Text>Change preference area</Text>
      </TouchableOpacity>
    </View>
  );
}

function LocationRaceHarness() {
  const { criteria, locationStatus, searchCurrentLocation, selectArea, userCoordinates } =
    useSearch();
  return (
    <View>
      <Text testID="race-area">{criteria.areaLabel}</Text>
      <Text testID="location-status">{locationStatus}</Text>
      <Text testID="user-coordinates">
        {userCoordinates
          ? `${userCoordinates.latitude},${userCoordinates.longitude}`
          : 'unavailable'}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Use location"
        onPress={() => void searchCurrentLocation()}>
        <Text>Location</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Choose slow area"
        onPress={() =>
          void selectArea({
            id: 'slow-1',
            label: 'Slow area',
          })
        }>
        <Text>Slow area</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Choose manual area"
        onPress={() =>
          void selectArea({
            id: 'manual-1',
            label: 'Petaling Jaya',
            coordinates: { latitude: 3.1073, longitude: 101.6067 },
          })
        }>
        <Text>Manual</Text>
      </TouchableOpacity>
    </View>
  );
}

describe('SearchProvider synchronization', () => {
  it('shares soft food interests with normal search ranking', async () => {
    const service = new PreferencePlacesService();
    render(
      <SearchProvider
        preferenceKeys={new Set<FoodPreferenceKey>(['chinese'])}
        service={service}>
        <PreferenceHarness />
      </SearchProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('preference-results')).toHaveTextContent(
        'far-chinese|near-malaysian',
      ),
    );
  });

  it('uses a shared hard preference as a default filter', async () => {
    const service = new PreferencePlacesService();
    render(
      <SearchProvider
        preferenceKeys={new Set<FoodPreferenceKey>(['halal-required'])}
        service={service}>
        <PreferenceHarness />
      </SearchProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('preference-results')).toHaveTextContent(
        'far-chinese',
      ),
    );
    expect(service.searches[0].verifiedHalalOnly).toBe(true);
  });

  it('waits for account preferences before publishing the initial search', async () => {
    const service = new PreferencePlacesService();
    const tree = (preferencesReady: boolean) => (
      <SearchProvider
        preferenceKeys={new Set<FoodPreferenceKey>(['halal-required'])}
        preferencesReady={preferencesReady}
        service={service}>
        <PreferenceHarness />
      </SearchProvider>
    );
    const view = render(tree(false));

    await act(async () => undefined);
    expect(service.searches).toHaveLength(0);
    expect(view.getByTestId('preference-results')).toHaveTextContent('');
    fireEvent.press(
      view.getByRole('button', { name: 'Search preference test area' }),
    );
    await act(async () => undefined);
    expect(service.searches).toHaveLength(0);

    view.rerender(tree(true));
    await waitFor(() => expect(service.searches).toHaveLength(1));
    expect(service.searches[0].verifiedHalalOnly).toBe(true);
    expect(view.getByTestId('preference-results')).toHaveTextContent(
      'far-chinese',
    );
  });

  it('does not publish an in-flight search after preferences become unready', async () => {
    let resolveSearch!: (results: SearchResults) => void;
    const service = new PreferencePlacesService();
    jest.spyOn(service, 'searchNearby').mockImplementation(
      (criteria) =>
        new Promise((resolve) => {
          resolveSearch = resolve;
          service.searches.push(criteria);
        }),
    );
    const tree = (preferencesReady: boolean) => (
      <SearchProvider preferencesReady={preferencesReady} service={service}>
        <PreferenceHarness />
      </SearchProvider>
    );
    const view = render(tree(true));
    await waitFor(() => expect(service.searches).toHaveLength(1));

    view.rerender(tree(false));
    await act(async () =>
      resolveSearch({
        criteria: service.searches[0],
        places: preferencePlaces,
        fetchedAt: '2026-08-04T00:00:00.000Z',
      }),
    );

    expect(view.getByTestId('preference-results')).toHaveTextContent('');
  });

  it('refreshes the current search instead of resetting location when preferences change', async () => {
    const service = new PreferencePlacesService();
    const tree = (key: FoodPreferenceKey) => (
      <SearchProvider
        preferenceKeys={new Set<FoodPreferenceKey>([key])}
        service={service}>
        <PreferenceHarness />
      </SearchProvider>
    );
    const view = render(tree('chinese'));
    await waitFor(() => expect(service.searches.length).toBeGreaterThan(0));

    fireEvent.press(
      view.getByRole('button', { name: 'Search preference test area' }),
    );
    await waitFor(() =>
      expect(view.getByTestId('preference-area')).toHaveTextContent(
        'Petaling Jaya',
      ),
    );
    view.rerender(tree('indian'));

    await waitFor(() =>
      expect(service.searches.at(-1)).toMatchObject({
        areaLabel: 'Petaling Jaya',
        query: 'noodles',
      }),
    );
    expect(view.getByTestId('preference-area')).toHaveTextContent(
      'Petaling Jaya',
    );
  });

  it('keeps criteria and result state synchronized across consumers', async () => {
    render(
      <SearchProvider service={new FakePlacesService()}>
        <Harness />
      </SearchProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('any:success:1'),
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Open restaurants only' }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('open:empty:0'),
    );
  });

  it('resolves coordinates only after an autocomplete prediction is selected', async () => {
    const service = new FakePlacesService();
    const searchNearby = jest.spyOn(service, 'searchNearby');
    jest.spyOn(service, 'getPlaceDetails').mockResolvedValue({
      ...result,
      id: 'klang-1',
      coordinates: { latitude: 3.0449, longitude: 101.4456 },
      viewport: {
        northEast: { latitude: 3.0849, longitude: 101.4856 },
        southWest: { latitude: 3.0049, longitude: 101.4056 },
      },
      address: 'Klang, Selangor',
      openingHours: [],
      photoUrls: [],
    });
    render(
      <SearchProvider service={service}>
        <AreaHarness />
      </SearchProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Select Klang' }));

    await waitFor(() =>
      expect(screen.getByTestId('area')).toHaveTextContent('Klang, Selangor'),
    );
    expect(service.getPlaceDetails).toHaveBeenCalledWith('klang-1');
    expect(searchNearby).toHaveBeenLastCalledWith(
      expect.objectContaining({
        areaBounds: {
          northEast: { latitude: 3.0849, longitude: 101.4856 },
          southWest: { latitude: 3.0049, longitude: 101.4056 },
        },
        areaLabel: 'Klang, Selangor',
        query: undefined,
        radiusMeters: expect.any(Number),
      }),
    );
    expect(
      (searchNearby.mock.calls.at(-1)?.[0] as SearchCriteria).radiusMeters,
    ).toBeGreaterThan(6_000);
    expect(screen.getByTestId('recent-areas')).toHaveTextContent(
      'Klang, Selangor',
    );
  });

  it('adds the real area boundary and filters results to its polygon', async () => {
    const service = new FakePlacesService();
    jest.spyOn(service, 'getPlaceDetails').mockResolvedValue({
      ...result,
      id: 'klang-1',
      coordinates: { latitude: 3.0449, longitude: 101.4456 },
      address: 'Klang, Selangor',
      openingHours: [],
      photoUrls: [],
    });
    jest.spyOn(service, 'getAreaBoundary').mockResolvedValue({
      source: 'openstreetmap',
      sourceUrl: 'https://www.openstreetmap.org/relation/18743759',
      label: 'Klang District',
      polygons: [
        {
          outer: [
            { latitude: 3.03, longitude: 101.43 },
            { latitude: 3.06, longitude: 101.43 },
            { latitude: 3.06, longitude: 101.46 },
            { latitude: 3.03, longitude: 101.43 },
          ],
          holes: [],
        },
      ],
    });
    render(
      <SearchProvider service={service}>
        <AreaHarness />
      </SearchProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Select Klang' }));

    await waitFor(() =>
      expect(screen.getByTestId('area-boundary')).toHaveTextContent(
        'Klang District',
      ),
    );
    expect(screen.getByTestId('area')).toHaveTextContent('Klang District');
    expect(service.getAreaBoundary).toHaveBeenCalledWith(
      'Klang, Selangor',
      { latitude: 3.0449, longitude: 101.4456 },
    );
    expect(screen.getByTestId('area-results')).toHaveTextContent('0');
  });

  it('does not let a late boundary overwrite a newer filter search', async () => {
    let resolveBoundary!: (value: AreaBoundary) => void;
    const service = new FakePlacesService();
    jest.spyOn(service, 'getPlaceDetails').mockResolvedValue({
      ...result,
      id: 'klang-1',
      coordinates: { latitude: 3.0449, longitude: 101.4456 },
      address: 'Klang, Selangor',
      openingHours: [],
      photoUrls: [],
    });
    jest.spyOn(service, 'getAreaBoundary').mockImplementation(
      () =>
        new Promise<AreaBoundary>((resolve) => {
          resolveBoundary = resolve;
        }),
    );
    render(
      <SearchProvider service={service}>
        <AreaHarness />
      </SearchProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Select Klang' }));
    await waitFor(() =>
      expect(screen.getByTestId('area-results')).toHaveTextContent('1'),
    );
    fireEvent.press(
      screen.getByRole('button', {
        name: 'Show open selected-area restaurants',
      }),
    );
    await waitFor(() => {
      expect(screen.getByTestId('area-filter')).toHaveTextContent('open');
      expect(screen.getByTestId('area-results')).toHaveTextContent('0');
    });

    await act(async () => {
      resolveBoundary({
        source: 'openstreetmap',
        sourceUrl: 'https://www.openstreetmap.org/relation/18743759',
        label: 'Bandar Sentosa',
        polygons: [
          {
            outer: [
              { latitude: 3.03, longitude: 101.43 },
              { latitude: 3.16, longitude: 101.43 },
              { latitude: 3.16, longitude: 101.72 },
              { latitude: 3.03, longitude: 101.43 },
            ],
            holes: [],
          },
        ],
      });
      await Promise.resolve();
    });

    expect(screen.getByTestId('area-filter')).toHaveTextContent('open');
    expect(screen.getByTestId('area-results')).toHaveTextContent('0');
    expect(screen.getByTestId('area-boundary')).toHaveTextContent('none');
  });

  it('orders clearing persistent history after an in-flight save', async () => {
    let resolveSave!: () => void;
    const operations: string[] = [];
    const service = new FakePlacesService();
    jest.spyOn(service, 'getPlaceDetails').mockResolvedValue({
      ...result,
      id: 'klang-1',
      coordinates: { latitude: 3.0449, longitude: 101.4456 },
      address: 'Klang, Selangor',
      openingHours: [],
      photoUrls: [],
    });
    const setItem = AsyncStorage.setItem as jest.MockedFunction<
      typeof AsyncStorage.setItem
    >;
    const removeItem = AsyncStorage.removeItem as jest.MockedFunction<
      typeof AsyncStorage.removeItem
    >;
    setItem.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          operations.push('save-start');
          resolveSave = () => {
            operations.push('save-end');
            resolve();
          };
        }),
    );
    removeItem.mockImplementation(async () => {
      operations.push('remove');
    });
    render(
      <SearchProvider historyScope="guest" service={service}>
        <AreaHarness />
      </SearchProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Select Klang' }));
    await waitFor(() => expect(setItem).toHaveBeenCalled());
    fireEvent.press(
      screen.getByRole('button', { name: 'Clear recent selected areas' }),
    );
    expect(removeItem).not.toHaveBeenCalled();

    await act(async () => {
      resolveSave();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(removeItem).toHaveBeenCalled());
    expect(operations).toEqual(['save-start', 'save-end', 'remove']);
    setItem.mockReset().mockResolvedValue(undefined);
    removeItem.mockReset().mockResolvedValue(undefined);
  });

  it('keeps out-of-area results out of shared state and Surprise me', async () => {
    const service = new FakePlacesService();
    jest.spyOn(service, 'getPlaceDetails').mockResolvedValue({
      ...result,
      id: 'klang-1',
      coordinates: { latitude: 3.0449, longitude: 101.4456 },
      viewport: {
        northEast: { latitude: 3.0849, longitude: 101.4856 },
        southWest: { latitude: 3.0049, longitude: 101.4056 },
      },
      address: 'Klang, Selangor',
      openingHours: [],
      photoUrls: [],
    });
    render(
      <SearchProvider service={service}>
        <AreaHarness />
      </SearchProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Select Klang' }));

    await waitFor(() =>
      expect(screen.getByTestId('area-status')).toHaveTextContent('empty:none'),
    );
    expect(screen.getByTestId('area-results')).toHaveTextContent('0');
    fireEvent.press(
      screen.getByRole('button', { name: 'Pick selected-area surprise' }),
    );
    expect(screen.getByTestId('area-surprise')).toHaveTextContent('none');
  });

  it('does not let a late location result overwrite a newer manual area', async () => {
    let resolvePermission!: (value: { status: string }) => void;
    const locationClient = {
      requestForegroundPermissionsAsync: jest.fn(
        () =>
          new Promise<{ status: string }>((resolve) => {
            resolvePermission = resolve;
          }),
      ),
      getCurrentPositionAsync: jest.fn().mockResolvedValue({
        coords: { latitude: 3.2, longitude: 101.7 },
      }),
    };
    render(
      <SearchProvider
        locationClient={locationClient}
        service={new FakePlacesService()}>
        <LocationRaceHarness />
      </SearchProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Use location' }));
    fireEvent.press(screen.getByRole('button', { name: 'Choose manual area' }));
    resolvePermission({ status: 'granted' });

    await waitFor(() =>
      expect(screen.getByTestId('race-area')).toHaveTextContent(
        'Petaling Jaya',
      ),
    );
    expect(locationClient.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('user-coordinates')).toHaveTextContent(
      'unavailable',
    );
    expect(screen.getByTestId('location-status')).not.toHaveTextContent(
      'requesting',
    );
  });

  it('keeps granted GPS coordinates available for the map location marker', async () => {
    const locationClient = {
      requestForegroundPermissionsAsync: jest
        .fn()
        .mockResolvedValue({ status: 'granted' }),
      getCurrentPositionAsync: jest.fn().mockResolvedValue({
        coords: { latitude: 3.2, longitude: 101.7 },
      }),
    };
    render(
      <SearchProvider
        locationClient={locationClient}
        service={new FakePlacesService()}>
        <LocationRaceHarness />
      </SearchProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Use location' }));

    await waitFor(() =>
      expect(screen.getByTestId('user-coordinates')).toHaveTextContent(
        '3.2,101.7',
      ),
    );
    expect(screen.getByTestId('race-area')).toHaveTextContent(
      'Current location',
    );
  });

  it('does not let slow area resolution overwrite a newer manual area', async () => {
    let resolveDetails!: (value: PlaceDetails) => void;
    const service = new FakePlacesService();
    jest.spyOn(service, 'getPlaceDetails').mockImplementation(
      () =>
        new Promise<PlaceDetails>((resolve) => {
          resolveDetails = resolve;
        }),
    );
    render(
      <SearchProvider service={service}>
        <LocationRaceHarness />
      </SearchProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Choose slow area' }));
    fireEvent.press(screen.getByRole('button', { name: 'Choose manual area' }));
    await act(async () => {
      resolveDetails({
        ...result,
        id: 'slow-1',
        coordinates: { latitude: 3.01, longitude: 101.4 },
        address: 'Slow area',
        openingHours: [],
        photoUrls: [],
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('race-area')).toHaveTextContent(
      'Petaling Jaya',
    );
  });

  it('reports area-resolution failures through shared search state', async () => {
    const service = new FakePlacesService();
    jest
      .spyOn(service, 'getPlaceDetails')
      .mockRejectedValue(new Error('Unable to resolve that area.'));
    render(
      <SearchProvider service={service}>
        <AreaHarness />
      </SearchProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Select Klang' }));

    await waitFor(() =>
      expect(screen.getByTestId('area-status')).toHaveTextContent(
        'error:Unable to resolve that area.',
      ),
    );
    expect(screen.getByTestId('area')).toHaveTextContent('Klang Valley');
  });
});
