import type { Coordinates, PlaceSummary, PriceLevel } from '@/contracts/place';

export type SearchCriteria = {
  center: Coordinates;
  areaLabel: string;
  radiusMeters: number;
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
};

export type SearchResults = {
  criteria: SearchCriteria;
  places: PlaceSummary[];
  fetchedAt: string;
};
