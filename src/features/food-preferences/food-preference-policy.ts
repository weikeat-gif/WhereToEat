import type {
  FoodPreferenceDefinition,
  FoodPreferenceKey,
} from '@/contracts/food-preference';
import type { PlaceSummary } from '@/contracts/place';
import type { SearchCriteria } from '@/contracts/search';
import { hasTrustedHalalVerification } from '@/services/places/mock-places-service';

export const FOOD_PREFERENCE_CATALOGUE: FoodPreferenceDefinition[] = [
  {
    key: 'halal-required',
    label: 'Halal required',
    kind: 'hard',
    description: 'Only show places with current trusted Halal verification.',
  },
  {
    key: 'vegetarian',
    label: 'Vegetarian',
    kind: 'hard',
    description: 'Only show places identified as vegetarian or vegan.',
  },
  {
    key: 'malaysian',
    label: 'Malaysian',
    kind: 'soft',
    description: 'Prefer Malaysian food.',
  },
  {
    key: 'malay',
    label: 'Malay',
    kind: 'soft',
    description: 'Prefer Malay food.',
  },
  {
    key: 'chinese',
    label: 'Chinese',
    kind: 'soft',
    description: 'Prefer Chinese food.',
  },
  {
    key: 'indian',
    label: 'Indian',
    kind: 'soft',
    description: 'Prefer Indian food.',
  },
  {
    key: 'noodles',
    label: 'Noodles',
    kind: 'soft',
    description: 'Prefer noodle dishes.',
  },
  {
    key: 'rice',
    label: 'Rice dishes',
    kind: 'soft',
    description: 'Prefer rice dishes.',
  },
  {
    key: 'cafe-dessert',
    label: 'Cafe & dessert',
    kind: 'soft',
    description: 'Prefer cafes, coffee, bakeries, and desserts.',
  },
  {
    key: 'spicy',
    label: 'Spicy',
    kind: 'soft',
    description: 'Prefer food described as spicy.',
  },
  {
    key: 'mild',
    label: 'Mild',
    kind: 'soft',
    description: 'Prefer food described as mild.',
  },
  {
    key: 'supper',
    label: 'Supper',
    kind: 'soft',
    description: 'Prefer supper and late-night places.',
  },
  {
    key: 'open-now',
    label: 'Open now',
    kind: 'soft',
    description: 'Prefer places that are currently open.',
  },
];

export const FOOD_PREFERENCE_KEYS = FOOD_PREFERENCE_CATALOGUE.map(
  (item) => item.key,
);

export function isFoodPreferenceKey(value: unknown): value is FoodPreferenceKey {
  return (
    typeof value === 'string' &&
    FOOD_PREFERENCE_KEYS.some((key) => key === value)
  );
}

const SOFT_GROUPS: Record<string, FoodPreferenceKey[]> = {
  cuisine: ['malaysian', 'malay', 'chinese', 'indian'],
  format: ['noodles', 'rice', 'cafe-dessert', 'supper'],
  taste: ['spicy', 'mild'],
  availability: ['open-now'],
};

function groupFor(key: FoodPreferenceKey) {
  return Object.values(SOFT_GROUPS).find((group) => group.includes(key));
}

function searchablePlaceText(place: PlaceSummary) {
  return [place.name, place.subtitle, ...place.categories]
    .join(' ')
    .toLocaleLowerCase();
}

function placeMatchesSoftPreference(
  place: PlaceSummary,
  key: FoodPreferenceKey,
) {
  const text = searchablePlaceText(place);
  switch (key) {
    case 'malaysian':
      return text.includes('malaysian');
    case 'malay':
      return /\bmalay\b/.test(text);
    case 'chinese':
      return text.includes('chinese');
    case 'indian':
      return text.includes('indian');
    case 'noodles':
      return /\b(noodle|noodles|ramen|laksa)\b/.test(text);
    case 'rice':
      return /\b(rice|nasi)\b/.test(text);
    case 'cafe-dessert':
      return /\b(cafe|coffee|kopi|dessert|bakery|cake)\b/.test(text);
    case 'spicy':
      return /\b(spicy|pedas|sambal|curry)\b/.test(text);
    case 'mild':
      return /\b(mild|light|plain)\b/.test(text);
    case 'supper':
      return /\b(supper|late.night|night)\b/.test(text);
    case 'open-now':
      return place.isOpen === true;
    default:
      return false;
  }
}

export function criteriaWithHardFoodPreferences(
  criteria: SearchCriteria,
  preferences: ReadonlySet<FoodPreferenceKey>,
) {
  const vegetarianDefault =
    preferences.has('vegetarian') &&
    !criteria.query?.trim() &&
    criteria.categories.length === 0;
  return {
    ...criteria,
    verifiedHalalOnly:
      criteria.verifiedHalalOnly || preferences.has('halal-required'),
    categories: vegetarianDefault ? ['Vegetarian'] : [...criteria.categories],
  };
}

export function applyFoodPreferencePolicy(
  places: PlaceSummary[],
  preferences: ReadonlySet<FoodPreferenceKey>,
  criteria: SearchCriteria,
) {
  const hardFiltered = places.filter(
    (place) =>
      (!preferences.has('halal-required') ||
        hasTrustedHalalVerification(place.halalVerification)) &&
      (!preferences.has('vegetarian') ||
        place.categories.some((category) =>
          /\b(vegetarian|vegan)\b/i.test(category),
        )),
  );
  const activeSoft = new Set(
    [...preferences].filter(
      (key) =>
        FOOD_PREFERENCE_CATALOGUE.find((item) => item.key === key)?.kind ===
        'soft',
    ),
  );
  for (const explicitKey of criteria.explicitPreferenceKeys ?? []) {
    const group = groupFor(explicitKey);
    if (group) group.forEach((key) => activeSoft.delete(key));
    activeSoft.add(explicitKey);
  }
  const score = (place: PlaceSummary) =>
    [...activeSoft].reduce(
      (total, key) =>
        total + (placeMatchesSoftPreference(place, key) ? 1 : 0),
      0,
    );

  return [...hardFiltered].sort(
    (left, right) =>
      Number(Boolean(right.promotion)) - Number(Boolean(left.promotion)) ||
      score(right) - score(left) ||
      left.distanceMeters - right.distanceMeters ||
      right.rating - left.rating,
  );
}
