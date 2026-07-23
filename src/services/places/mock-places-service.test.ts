import type { SearchCriteria } from '@/contracts/search';
import {
  hasTrustedHalalVerification,
  MockPlacesService,
} from '@/services/places/mock-places-service';

const criteria: SearchCriteria = {
  center: { latitude: 3.139, longitude: 101.6869 },
  areaLabel: 'Kuala Lumpur',
  radiusMeters: 20_000,
  openNow: false,
  priceLevels: [],
  categories: [],
  verifiedHalalOnly: false,
};

describe('MockPlacesService discovery', () => {
  it('applies radius, open, price, category, and verified Halal filters together', async () => {
    const service = new MockPlacesService();

    const result = await service.searchNearby({
      ...criteria,
      radiusMeters: 15_000,
      openNow: true,
      priceLevels: [2],
      categories: ['Malaysian'],
      verifiedHalalOnly: true,
    });

    expect(result.criteria.areaLabel).toBe('Kuala Lumpur');
    expect(result.places.length).toBeGreaterThan(0);
    expect(result.places).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Seri Klang Kitchen' }),
      ]),
    );
    expect(
      result.places.every(
        (place) =>
          place.distanceMeters <= 15_000 &&
          place.isOpen === true &&
          place.priceLevel === 2 &&
          place.categories.includes('Malaysian') &&
          hasTrustedHalalVerification(place.halalVerification),
      ),
    ).toBe(true);
  });

  it('never treats missing, expired, or untrusted verification as verified Halal', () => {
    expect(hasTrustedHalalVerification(undefined)).toBe(false);
    expect(
      hasTrustedHalalVerification({
        sourceName: 'Restaurant website',
        sourceUrl: 'https://example.com/halal',
        verifiedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2027-01-01T00:00:00.000Z',
      }),
    ).toBe(false);
    expect(
      hasTrustedHalalVerification({
        sourceName: 'JAKIM Halal Malaysia',
        sourceUrl: 'https://www.halal.gov.my/example',
        verifiedAt: '2025-01-01T00:00:00.000Z',
        expiresAt: '2025-12-31T23:59:59.000Z',
      }),
    ).toBe(false);
  });
});
