import type { AreaBoundary } from '@/contracts/search';
import {
  isCoordinateWithinAreaBoundary,
  mapBoundsForAreaBoundary,
} from '@/features/map/area-boundary';

const boundary: AreaBoundary = {
  source: 'openstreetmap',
  sourceUrl: 'https://www.openstreetmap.org/relation/1',
  label: 'Test area',
  polygons: [
    {
      outer: [
        { latitude: 3, longitude: 101 },
        { latitude: 3.1, longitude: 101 },
        { latitude: 3.1, longitude: 101.1 },
        { latitude: 3, longitude: 101.1 },
        { latitude: 3, longitude: 101 },
      ],
      holes: [
        [
          { latitude: 3.04, longitude: 101.04 },
          { latitude: 3.06, longitude: 101.04 },
          { latitude: 3.06, longitude: 101.06 },
          { latitude: 3.04, longitude: 101.06 },
          { latitude: 3.04, longitude: 101.04 },
        ],
      ],
    },
  ],
};

describe('area boundary geometry', () => {
  it('includes points in the irregular outer ring and excludes holes', () => {
    expect(
      isCoordinateWithinAreaBoundary(
        { latitude: 3.02, longitude: 101.02 },
        boundary,
      ),
    ).toBe(true);
    expect(
      isCoordinateWithinAreaBoundary(
        { latitude: 3.05, longitude: 101.05 },
        boundary,
      ),
    ).toBe(false);
    expect(
      isCoordinateWithinAreaBoundary(
        { latitude: 3.2, longitude: 101.2 },
        boundary,
      ),
    ).toBe(false);
  });

  it('includes the outer edge and excludes the edge of a hole', () => {
    expect(
      isCoordinateWithinAreaBoundary(
        { latitude: 3.05, longitude: 101 },
        boundary,
      ),
    ).toBe(true);
    expect(
      isCoordinateWithinAreaBoundary(
        { latitude: 3.05, longitude: 101.04 },
        boundary,
      ),
    ).toBe(false);
  });

  it('derives map-fit bounds from the irregular geometry', () => {
    expect(mapBoundsForAreaBoundary(boundary)).toEqual({
      northEast: { latitude: 3.1, longitude: 101.1 },
      southWest: { latitude: 3, longitude: 101 },
    });
  });
});
