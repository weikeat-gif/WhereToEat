import type { SearchCriteria } from '@/contracts/search';

import { activeSearchFilters, clearedSearchFilters } from './search-filter-state';

const criteria: SearchCriteria = {
  center: { latitude: 3.139, longitude: 101.6869 },
  areaLabel: 'Klang District',
  radiusMeters: 5000,
  openNow: true,
  priceLevels: [1, 2],
  categories: ['Chinese', 'Cafe'],
  verifiedHalalOnly: true,
  query: 'noodles',
  explicitPreferenceKeys: ['chinese', 'open-now'],
};

describe('shared Search filter state', () => {
  it('uses one visible chip per badge-counted filter group', () => {
    expect(activeSearchFilters(criteria).map((filter) => filter.key)).toEqual([
      'query',
      'open-now',
      'verified-halal',
      'price',
      'category',
      'radius',
    ]);
  });

  it('clears query, filter criteria, radius, and assistant explicit defaults together', () => {
    expect(clearedSearchFilters(criteria)).toEqual(
      expect.objectContaining({
        query: undefined,
        openNow: false,
        verifiedHalalOnly: false,
        priceLevels: [],
        categories: [],
        radiusMeters: 3000,
        explicitPreferenceKeys: undefined,
      }),
    );
    expect(clearedSearchFilters(criteria).areaLabel).toBe('Klang District');
  });

  it('preserves an area-derived radius and does not expose it as a removable filter', () => {
    const selectedArea = {
      ...criteria,
      areaBounds: {
        northEast: { latitude: 3.2, longitude: 101.8 },
        southWest: { latitude: 3, longitude: 101.6 },
      },
      radiusMeters: 12_000,
    };

    expect(activeSearchFilters(selectedArea).some((filter) => filter.key === 'radius')).toBe(false);
    expect(clearedSearchFilters(selectedArea).radiusMeters).toBe(12_000);
  });

  it('shows explicit-only assistant preferences as removable filters', () => {
    const explicitOnly: SearchCriteria = {
      ...criteria,
      categories: [],
      explicitPreferenceKeys: ['spicy', 'supper'],
      openNow: false,
      priceLevels: [],
      query: undefined,
      radiusMeters: 3000,
      verifiedHalalOnly: false,
    };

    expect(
      activeSearchFilters(explicitOnly).map((filter) => ({
        explicitPreferenceKey: filter.explicitPreferenceKey,
        label: filter.label,
      })),
    ).toEqual([
      { explicitPreferenceKey: 'spicy', label: 'Spicy' },
      { explicitPreferenceKey: 'supper', label: 'Supper' },
    ]);
  });

  it('keeps a taste preference visible when the query represents only a dish format', () => {
    const mixed: SearchCriteria = {
      ...criteria,
      categories: [],
      explicitPreferenceKeys: ['rice', 'spicy'],
      openNow: false,
      priceLevels: [],
      query: 'nasi lemak',
      radiusMeters: 3000,
      verifiedHalalOnly: false,
    };

    const filters = activeSearchFilters(mixed);
    expect(filters.map((filter) => filter.label)).toEqual([
      'Search: nasi lemak',
      'Spicy',
    ]);
    expect(filters[0].changes.explicitPreferenceKeys).toEqual(['spicy']);
  });
});
