import type { PlaceDetails } from '@/contracts/place';
import type {
  AreaSuggestion,
  SearchCriteria,
  SearchResults,
} from '@/contracts/search';

export interface PlacesService {
  autocompleteArea(input: string, sessionToken: string): Promise<AreaSuggestion[]>;
  searchNearby(criteria: SearchCriteria): Promise<SearchResults>;
  getPlaceDetails(placeId: string): Promise<PlaceDetails>;
}
