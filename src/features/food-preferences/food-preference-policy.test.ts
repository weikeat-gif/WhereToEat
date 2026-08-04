import type { PlaceSummary } from '@/contracts/place';
import type { SearchCriteria } from '@/contracts/search';

import {
  applyFoodPreferencePolicy,
  criteriaWithHardFoodPreferences,
  FOOD_PREFERENCE_CATALOGUE,
} from './food-preference-policy';

const criteria: SearchCriteria = {
  center: { latitude: 3.139, longitude: 101.6869 },
  areaLabel: 'Klang Valley',
  radiusMeters: 5000,
  openNow: false,
  priceLevels: [],
  categories: [],
  verifiedHalalOnly: false,
};

const places: PlaceSummary[] = [
  {
    id: 'near-malaysian',
    name: 'Nearby Kitchen',
    subtitle: 'Malaysian favourites',
    coordinates: criteria.center,
    distanceMeters: 300,
    rating: 4.5,
    reviewCount: 80,
    isOpen: true,
    categories: ['Malaysian'],
  },
  {
    id: 'far-chinese',
    name: 'Noodle House',
    subtitle: 'Hand-pulled noodles',
    coordinates: criteria.center,
    distanceMeters: 1400,
    rating: 4.6,
    reviewCount: 120,
    isOpen: true,
    categories: ['Chinese', 'Noodles'],
    halalVerification: {
      sourceName: 'JAKIM Halal Malaysia',
      sourceUrl: 'https://www.halal.gov.my/v4/',
      verifiedAt: '2026-06-01T00:00:00.000Z',
      expiresAt: '2027-06-01T00:00:00.000Z',
    },
  },
];

describe('food preference policy', () => {
  it('keeps hard constraints separate from soft interests', () => {
    expect(
      FOOD_PREFERENCE_CATALOGUE.filter((item) => item.kind === 'hard').map(
        (item) => item.key,
      ),
    ).toEqual(['halal-required', 'vegetarian']);
    expect(
      FOOD_PREFERENCE_CATALOGUE.find((item) => item.key === 'chinese')?.kind,
    ).toBe('soft');
  });

  it('filters with a hard Halal preference', () => {
    expect(
      applyFoodPreferencePolicy(
        places,
        new Set(['halal-required']),
        criteria,
      ).map((place) => place.id),
    ).toEqual(['far-chinese']);
  });

  it('boosts a soft interest without excluding other food', () => {
    expect(
      applyFoodPreferencePolicy(places, new Set(['chinese']), criteria).map(
        (place) => place.id,
      ),
    ).toEqual(['far-chinese', 'near-malaysian']);
  });

  it('lets an explicit chat interest override a conflicting saved interest', () => {
    expect(
      applyFoodPreferencePolicy(
        places,
        new Set(['malaysian']),
        { ...criteria, explicitPreferenceKeys: ['chinese'] },
      ).map((place) => place.id),
    ).toEqual(['far-chinese', 'near-malaysian']);
  });

  it('applies hard defaults to provider search criteria', () => {
    expect(
      criteriaWithHardFoodPreferences(
        criteria,
        new Set(['halal-required', 'vegetarian']),
      ),
    ).toEqual({
      ...criteria,
      verifiedHalalOnly: true,
      categories: ['Vegetarian'],
    });
  });
});
