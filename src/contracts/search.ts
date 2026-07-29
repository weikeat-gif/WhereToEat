import type {
  CoordinateBounds,
  Coordinates,
  PlaceSummary,
  PriceLevel,
} from '@/contracts/place';

export type SearchCriteria = {
  query?: string;
  center: Coordinates;
  areaLabel: string;
  areaBounds?: CoordinateBounds;
  radiusMeters: number;
  rankPreference?: 'DISTANCE' | 'POPULARITY';
  openNow: boolean;
  priceLevels: PriceLevel[];
  categories: string[];
  verifiedHalalOnly: boolean;
};

export type AreaSuggestion = {
  id: string;
  label: string;
  secondaryLabel?: string;
  coordinates?: Coordinates;
  viewport?: CoordinateBounds;
};

export type SearchResults = {
  criteria: SearchCriteria;
  places: PlaceSummary[];
  fetchedAt: string;
};
