import {
  isCoordinateWithinMapBounds,
  radiusForMapBounds,
  radiusForMapRegion,
  selectMapPlacesForViewport,
} from '@/features/map/map-viewport';

describe('visible map search radius', () => {
  it('covers the farthest corner of a native map region', () => {
    const radius = radiusForMapRegion({
      latitude: 3.139,
      longitude: 101.6869,
      latitudeDelta: 0.075,
      longitudeDelta: 0.075,
    });

    expect(radius).toBeGreaterThan(5_000);
    expect(radius).toBeLessThan(7_000);
  });

  it('covers the visible web bounds and caps very wide searches', () => {
    expect(
      radiusForMapBounds(
        { latitude: 3.139, longitude: 101.6869 },
        { latitude: 3.1765, longitude: 101.7244 },
        { latitude: 3.1015, longitude: 101.6494 },
      ),
    ).toBeGreaterThan(5_000);

    expect(
      radiusForMapBounds(
        { latitude: 3.139, longitude: 101.6869 },
        { latitude: 4, longitude: 103 },
        { latitude: 2, longitude: 100 },
      ),
    ).toBe(20_000);
  });

  it('identifies only coordinates inside the visible map rectangle', () => {
    const bounds = {
      northEast: { latitude: 3.1, longitude: 101.5 },
      southWest: { latitude: 3.0, longitude: 101.4 },
    };

    expect(
      isCoordinateWithinMapBounds(
        { latitude: 3.05, longitude: 101.45 },
        bounds,
      ),
    ).toBe(true);
    expect(
      isCoordinateWithinMapBounds(
        { latitude: 3.12, longitude: 101.45 },
        bounds,
      ),
    ).toBe(false);
    expect(
      isCoordinateWithinMapBounds(
        { latitude: 3.05, longitude: 101.52 },
        bounds,
      ),
    ).toBe(false);
  });

  it('keeps one displayed place when nearby pins would overlap', () => {
    const bounds = {
      northEast: { latitude: 3.1, longitude: 101.5 },
      southWest: { latitude: 3.0, longitude: 101.4 },
    };
    const places = [
      {
        id: 'nearest',
        coordinates: { latitude: 3.05, longitude: 101.45 },
      },
      {
        id: 'overlapping',
        coordinates: { latitude: 3.051, longitude: 101.451 },
      },
      {
        id: 'separate',
        coordinates: { latitude: 3.09, longitude: 101.49 },
      },
      {
        id: 'outside',
        coordinates: { latitude: 3.12, longitude: 101.45 },
      },
    ];

    expect(
      selectMapPlacesForViewport(places, bounds).map((place) => place.id),
    ).toEqual(['nearest', 'separate']);
  });
});
