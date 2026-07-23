import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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
      places: criteria.openNow ? [result] : [],
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
        accessibilityLabel="Show closed too"
        onPress={() => void updateCriteriaAndSearch({ openNow: false })}>
        <Text>Change filter</Text>
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

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('open:success:1'));
    fireEvent.press(screen.getByRole('button', { name: 'Show closed too' }));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('any:empty:0'));
  });
});
