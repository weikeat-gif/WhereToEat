import {
  radiusForMapBounds,
  radiusForMapRegion,
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
});
