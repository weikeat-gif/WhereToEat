import { MockRoutesService } from '@/services/routes/mock-routes-service';

describe('MockRoutesService', () => {
  it('returns an in-app preview route without calling an external map app', async () => {
    const service = new MockRoutesService();
    const route = await service.getRoute({
      origin: { latitude: 3.139, longitude: 101.6869 },
      destination: { latitude: 3.1468, longitude: 101.6952 },
      travelMode: 'DRIVE',
    });

    expect(route.provider).toBe('mock');
    expect(route.coordinates).toHaveLength(13);
    expect(route.coordinates[0]).toEqual(route.origin);
    expect(route.coordinates.at(-1)).toEqual(route.destination);
    expect(route.distanceMeters).toBeGreaterThan(0);
    expect(route.durationSeconds).toBeGreaterThanOrEqual(180);
  });
});
