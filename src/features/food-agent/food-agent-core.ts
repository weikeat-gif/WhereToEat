import type { PlaceSummary, PriceLevel } from '@/contracts/place';
import type { FoodPreferenceKey } from '@/contracts/food-preference';
import type { SearchCriteria } from '@/contracts/search';
import { FOOD_PREFERENCE_CATALOGUE } from '@/features/food-preferences/food-preference-policy';
import { hasTrustedHalalVerification } from '@/services/places/mock-places-service';

export const FOOD_ONLY_MESSAGE =
  "I'm MakanMana's food assistant. I can help you choose food or find restaurants nearby.";

export type FoodPreferences = {
  budgetApproximation?: string;
  categories?: string[];
  halalOnly?: boolean;
  openNow?: boolean;
  priceLevels?: PriceLevel[];
  query?: string;
  radiusMeters?: number;
  taste?: 'spicy' | 'mild';
};

export type FoodRequest =
  | { kind: 'food-search'; preferences: FoodPreferences }
  | { kind: 'out-of-scope'; message: typeof FOOD_ONLY_MESSAGE };

const CATEGORY_TERMS = [
  ['malaysian', 'Malaysian'],
  ['malay', 'Malay'],
  ['chinese', 'Chinese'],
  ['indian', 'Indian'],
  ['japanese', 'Japanese'],
  ['korean', 'Korean'],
  ['thai', 'Thai'],
  ['vegetarian', 'Vegetarian'],
  ['vegan', 'Vegetarian'],
  ['cafe', 'Cafe'],
  ['coffee', 'Cafe'],
  ['seafood', 'Seafood'],
] as const;

const DISH_TERMS = [
  'bak kut teh',
  'char kway teow',
  'dim sum',
  'nasi kandar',
  'nasi lemak',
  'roti canai',
  'burger',
  'laksa',
  'noodles',
  'pizza',
  'ramen',
  'satay',
  'sushi',
] as const;

const FOOD_DISCOVERY_TERMS =
  /\b(food|eat|eating|hungry|craving|restaurant|meal|breakfast|brunch|lunch|dinner|supper|makan|nearby|dish|cuisine)\b/i;
const NON_FOOD_TERMS =
  /\b(code|coding|python|javascript|homework|weather|politics|stock|email|medical|relationship|news)\b/i;

function includedTerms<T extends readonly (readonly [string, string])[]>(
  input: string,
  terms: T,
) {
  return Array.from(
    new Set(
      terms
        .filter(([term]) =>
          new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`).test(
            input,
          ),
        )
        .map(([, value]) => value),
    ),
  );
}

function findDish(input: string) {
  return DISH_TERMS.find((dish) => input.includes(dish));
}

function priceLevelsFor(input: string): PriceLevel[] | undefined {
  const exactBudget = input.match(/(?:under|below|less than)\s*rm\s*(\d{1,3})/i);
  if (exactBudget) {
    const maximum = Number(exactBudget[1]);
    if (maximum <= 20) return [1];
    if (maximum <= 50) return [1, 2];
  }
  return /\b(cheap|budget|budget-friendly|affordable)\b/i.test(input)
    ? [1]
    : undefined;
}

function radiusFor(input: string) {
  const match = input.match(/(\d+(?:\.\d+)?)\s*km\b/i);
  if (!match) return undefined;
  return Math.round(Math.min(10, Math.max(1, Number(match[1]))) * 1000);
}

export function understandFoodRequest(input: string): FoodRequest {
  const normalized = input.trim().toLocaleLowerCase().slice(0, 240);
  const categories = includedTerms(normalized, CATEGORY_TERMS);
  const query = findDish(normalized);
  const hasFoodCue =
    FOOD_DISCOVERY_TERMS.test(normalized) ||
    categories.length > 0 ||
    query !== undefined;

  if (!normalized || !hasFoodCue || (NON_FOOD_TERMS.test(normalized) && !query)) {
    return { kind: 'out-of-scope', message: FOOD_ONLY_MESSAGE };
  }

  const preferences: FoodPreferences = {};
  if (categories.length > 0) preferences.categories = categories;
  if (query) preferences.query = query;
  if (/\bhalal\b/i.test(normalized)) preferences.halalOnly = true;
  if (/\b(open now|open right now|still open)\b/i.test(normalized)) {
    preferences.openNow = true;
  }
  if (/\b(spicy|pedas)\b/i.test(normalized)) preferences.taste = 'spicy';
  else if (/\bmild\b/i.test(normalized)) preferences.taste = 'mild';
  const priceLevels = priceLevelsFor(normalized);
  const exactBudget = normalized.match(
    /(?:under|below|less than)\s*rm\s*(\d{1,3})/i,
  );
  if (priceLevels) {
    preferences.priceLevels = priceLevels;
  }
  if (exactBudget) {
    const target = Number(exactBudget[1]);
    preferences.budgetApproximation = priceLevels
      ? `Approximate price tier for an RM${target} target`
      : `No exact price filter is available for an RM${target} target`;
  }
  const radiusMeters = radiusFor(normalized);
  if (radiusMeters) preferences.radiusMeters = radiusMeters;

  return { kind: 'food-search', preferences };
}

export function foodPreferenceKeysFor(
  preferences: FoodPreferences,
): FoodPreferenceKey[] {
  const keys: FoodPreferenceKey[] = [];
  if (preferences.halalOnly) keys.push('halal-required');
  if (preferences.categories?.includes('Vegetarian')) keys.push('vegetarian');
  const categoryKeys: Partial<Record<string, FoodPreferenceKey>> = {
    Malaysian: 'malaysian',
    Malay: 'malay',
    Chinese: 'chinese',
    Indian: 'indian',
    Cafe: 'cafe-dessert',
  };
  for (const category of preferences.categories ?? []) {
    const key = categoryKeys[category];
    if (key && !keys.includes(key)) keys.push(key);
  }
  const query = preferences.query;
  if (query && /\b(noodle|ramen|laksa)\b/i.test(query)) keys.push('noodles');
  else if (query && /\b(nasi|rice)\b/i.test(query)) keys.push('rice');
  if (preferences.taste) keys.push(preferences.taste);
  if (preferences.openNow) keys.push('open-now');
  return [...new Set(keys)];
}

export function applyFoodPreferences(
  criteria: SearchCriteria,
  preferences: FoodPreferences,
): SearchCriteria {
  const explicitPreferenceKeys = foodPreferenceKeysFor(preferences).filter(
    (key) =>
      FOOD_PREFERENCE_CATALOGUE.find((item) => item.key === key)?.kind ===
      'soft',
  );
  return {
    center: criteria.center,
    areaLabel: criteria.areaLabel,
    radiusMeters: criteria.radiusMeters,
    openNow: false,
    priceLevels: [],
    categories: [],
    verifiedHalalOnly: false,
    ...(criteria.areaBounds ? { areaBounds: criteria.areaBounds } : {}),
    ...(criteria.areaBoundary ? { areaBoundary: criteria.areaBoundary } : {}),
    ...(criteria.areaPlaceId ? { areaPlaceId: criteria.areaPlaceId } : {}),
    ...(criteria.rankPreference
      ? { rankPreference: criteria.rankPreference }
      : {}),
    ...(preferences.query !== undefined ? { query: preferences.query } : {}),
    ...(preferences.radiusMeters !== undefined
      ? { radiusMeters: preferences.radiusMeters }
      : {}),
    ...(preferences.openNow !== undefined
      ? { openNow: preferences.openNow }
      : {}),
    ...(preferences.priceLevels !== undefined
      ? { priceLevels: [...preferences.priceLevels] }
      : {}),
    ...(preferences.categories !== undefined
      ? { categories: [...preferences.categories] }
      : {}),
    ...(preferences.halalOnly !== undefined
      ? { verifiedHalalOnly: preferences.halalOnly }
      : {}),
    ...(explicitPreferenceKeys.length > 0 ? { explicitPreferenceKeys } : {}),
  };
}

export function buildMatchReason(
  place: PlaceSummary,
  preferences: FoodPreferences,
) {
  const reasons: string[] = [];
  const requestedCategory = preferences.categories?.find((category) =>
    place.categories.some(
      (placeCategory) =>
        placeCategory.toLocaleLowerCase() === category.toLocaleLowerCase(),
    ),
  );
  if (requestedCategory) reasons.push(requestedCategory);
  if (
    preferences.halalOnly &&
    hasTrustedHalalVerification(place.halalVerification)
  ) {
    reasons.push('JAKIM-verified Halal');
  }
  if (preferences.openNow && place.isOpen) reasons.push('open now');
  reasons.push(
    place.distanceMeters < 1000
      ? `${place.distanceMeters} m away`
      : `${(place.distanceMeters / 1000).toFixed(1)} km away`,
  );
  return reasons.join(' · ');
}
