import { decodeGooglePolyline } from '@/services/routes/polyline';

describe('decodeGooglePolyline', () => {
  it('decodes the Google encoded-polyline format into map coordinates', () => {
    expect(
      decodeGooglePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@'),
    ).toEqual([
      { latitude: 38.5, longitude: -120.2 },
      { latitude: 40.7, longitude: -120.95 },
      { latitude: 43.252, longitude: -126.453 },
    ]);
  });

  it('rejects an incomplete coordinate pair', () => {
    expect(() => decodeGooglePolyline('_p~iF')).toThrow('incomplete');
  });
});
