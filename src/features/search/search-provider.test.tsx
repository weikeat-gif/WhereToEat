import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';

import type { PlaceDetails, PlaceSummary } from '@/contracts/place';
import type {
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
  const { criteria, error, selectArea, status } = useSearch();
  return (
    <View>
      <Text testID="area">{criteria.areaLabel}</Text>
      <Text testID="area-status">{`${status}:${error ?? 'none'}`}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Select Klang"
        onPress={() =>
          void selectArea({ id: 'klang-1', label: 'Klang, Selangor' })
        }>
        <Text>Select</Text>
      </TouchableOpacity>
    </View>
  );
}

function LocationRaceHarness() {
  const { criteria, searchCurrentLocation, selectArea } = useSearch();
  return (
    <View>
      <Text testID="race-area">{criteria.areaLabel}</Text>
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
    jest.spyOn(service, 'getPlaceDetails').mockResolvedValue({
      ...result,
      id: 'klang-1',
      coordinates: { latitude: 3.0449, longitude: 101.4456 },
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
