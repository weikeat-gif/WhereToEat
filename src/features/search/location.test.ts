import { requestSearchLocation } from '@/features/search/location';

describe('requestSearchLocation', () => {
  it('returns manual-area fallback when foreground permission is denied', async () => {
    const result = await requestSearchLocation({
      requestForegroundPermissionsAsync: async () => ({
        status: 'denied',
        canAskAgain: false,
      }),
      getCurrentPositionAsync: jest.fn(),
    });

    expect(result).toEqual({
      kind: 'manual',
      reason: 'denied',
      canAskAgain: false,
    });
  });

  it('returns coordinates only after permission is granted', async () => {
    const result = await requestSearchLocation({
      requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
      getCurrentPositionAsync: async () => ({
        coords: { latitude: 3.0449, longitude: 101.4456 },
      }),
    });

    expect(result).toEqual({
      kind: 'granted',
      coordinates: { latitude: 3.0449, longitude: 101.4456 },
    });
  });
});
