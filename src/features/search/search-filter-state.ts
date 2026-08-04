import type { PriceLevel } from '@/contracts/place';
import type { SearchCriteria } from '@/contracts/search';
import type { FoodPreferenceKey } from '@/contracts/food-preference';
import { FOOD_PREFERENCE_CATALOGUE } from '@/features/food-preferences/food-preference-policy';

export const DEFAULT_FILTER_RADIUS_METERS = 3000;

export type ActiveSearchFilter = {
  key:
    | 'query'
    | 'open-now'
    | 'verified-halal'
    | 'price'
    | 'category'
    | 'radius'
    | 'preference';
  label: string;
  changes: Partial<SearchCriteria>;
  explicitPreferenceKey?: FoodPreferenceKey;
};

const priceNames: Record<PriceLevel, string> = {
  1: 'Budget',
  2: 'Moderate',
  3: 'Pricey',
  4: 'Premium',
};

export function activeSearchFilters(criteria: SearchCriteria): ActiveSearchFilter[] {
  const filters: ActiveSearchFilter[] = [];
  const queryExplicitKeys = new Set<FoodPreferenceKey>();
  if (criteria.query) {
    if (/\b(noodle|noodles|ramen|laksa)\b/i.test(criteria.query)) queryExplicitKeys.add('noodles');
    if (/\b(nasi|rice)\b/i.test(criteria.query)) queryExplicitKeys.add('rice');
    if (/\b(spicy|pedas)\b/i.test(criteria.query)) queryExplicitKeys.add('spicy');
    if (/\bmild\b/i.test(criteria.query)) queryExplicitKeys.add('mild');
    if (/\b(supper|late.night|night)\b/i.test(criteria.query)) queryExplicitKeys.add('supper');
  }
  if (criteria.query) {
    filters.push({
      key: 'query',
      label: `Search: ${criteria.query}`,
      changes: {
        query: undefined,
        explicitPreferenceKeys: criteria.explicitPreferenceKeys?.filter(
          (key) => !queryExplicitKeys.has(key),
        ),
      },
    });
  }
  if (criteria.openNow) {
    filters.push({ key: 'open-now', label: 'Open now', changes: { openNow: false } });
  }
  if (criteria.verifiedHalalOnly) {
    filters.push({
      key: 'verified-halal',
      label: 'Verified Halal',
      changes: { verifiedHalalOnly: false },
    });
  }
  if (criteria.priceLevels.length > 0) {
    filters.push({
      key: 'price',
      label: criteria.priceLevels.map((level) => priceNames[level]).join(', '),
      changes: { priceLevels: [] },
    });
  }
  if (criteria.categories.length > 0) {
    filters.push({
      key: 'category',
      label: criteria.categories.join(', '),
      changes: { categories: [] },
    });
  }
  if (
    criteria.radiusMeters !== DEFAULT_FILTER_RADIUS_METERS &&
    !criteria.areaBounds &&
    !criteria.areaBoundary
  ) {
    filters.push({
      key: 'radius',
      label: `Within ${criteria.radiusMeters / 1000} km`,
      changes: { radiusMeters: DEFAULT_FILTER_RADIUS_METERS },
    });
  }
  const representedExplicitKeys = new Set<FoodPreferenceKey>([
    ...queryExplicitKeys,
    ...(criteria.openNow ? ['open-now'] as FoodPreferenceKey[] : []),
    ...(criteria.verifiedHalalOnly ? ['halal-required'] as FoodPreferenceKey[] : []),
    ...criteria.categories.map((category) =>
      category.toLocaleLowerCase() === 'cafe'
        ? 'cafe-dessert' as const
        : category.toLocaleLowerCase() as FoodPreferenceKey,
    ),
  ]);
  for (const key of criteria.explicitPreferenceKeys ?? []) {
    if (representedExplicitKeys.has(key)) continue;
    const definition = FOOD_PREFERENCE_CATALOGUE.find((item) => item.key === key);
    if (!definition) continue;
    filters.push({
      changes: {
        explicitPreferenceKeys: criteria.explicitPreferenceKeys?.filter(
          (candidate) => candidate !== key,
        ),
      },
      explicitPreferenceKey: key,
      key: 'preference',
      label: definition.label,
    });
  }
  return filters;
}

export function clearedSearchFilters(criteria: SearchCriteria): SearchCriteria {
  return {
    ...criteria,
    categories: [],
    explicitPreferenceKeys: undefined,
    openNow: false,
    priceLevels: [],
    query: undefined,
    radiusMeters:
      criteria.areaBounds || criteria.areaBoundary
        ? criteria.radiusMeters
        : DEFAULT_FILTER_RADIUS_METERS,
    verifiedHalalOnly: false,
  };
}
