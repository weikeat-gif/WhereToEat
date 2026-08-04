import type {
  CoordinateBounds,
  Coordinates,
  PlaceSummary,
  PriceLevel,
} from '@/contracts/place';
import type { FoodPreferenceKey } from '@/contracts/food-preference';

export type SearchCriteria = {
  query?: string;
  center: Coordinates;
  areaLabel: string;
  areaBounds?: CoordinateBounds;
  areaBoundary?: AreaBoundary;
  areaPlaceId?: string;
  radiusMeters: number;
  rankPreference?: 'DISTANCE' | 'POPULARITY';
  openNow: boolean;
  priceLevels: PriceLevel[];
  categories: string[];
  verifiedHalalOnly: boolean;
  explicitPreferenceKeys?: FoodPreferenceKey[];
};

export type AreaBoundaryPolygon = {
  outer: Coordinates[];
  holes: Coordinates[][];
};

export type AreaBoundary = {
  source: 'openstreetmap';
  sourceUrl: string;
  label: string;
  polygons: AreaBoundaryPolygon[];
};

export type AreaSuggestion = {
  id: string;
  label: string;
  secondaryLabel?: string;
  coordinates?: Coordinates;
  viewport?: CoordinateBounds;
  boundary?: AreaBoundary;
};

export type SearchResults = {
  criteria: SearchCriteria;
  places: PlaceSummary[];
  fetchedAt: string;
};
