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

export type PlacesServiceErrorCode =
  | 'configuration'
  | 'network'
  | 'unauthorized'
  | 'rate-limited'
  | 'not-found'
  | 'upstream'
  | 'invalid-response';

export class PlacesServiceError extends Error {
  constructor(
    message: string,
    readonly code: PlacesServiceErrorCode,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'PlacesServiceError';
  }
}
