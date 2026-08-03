import {
  buildGoogleMapsNavigationUrl,
  buildGoogleMapsPlaceUrl,
  buildWazeLocationUrl,
  buildWazeNavigationUrl,
} from '@/features/directions/external-navigation';

const destination = { latitude: 3.0449, longitude: 101.4456 };

describe('external navigation URLs', () => {
  it('shares a Waze location without starting navigation', () => {
    const url = new URL(buildWazeLocationUrl(destination));

    expect(`${url.origin}${url.pathname}`).toBe('https://waze.com/ul');
    expect(url.searchParams.get('ll')).toBe('3.0449,101.4456');
    expect(url.searchParams.has('navigate')).toBe(false);
    expect(url.searchParams.get('utm_source')).toBe('makanmana');
  });

  it('starts Waze navigation at the restaurant coordinates', () => {
    const url = new URL(buildWazeNavigationUrl(destination));

    expect(`${url.origin}${url.pathname}`).toBe('https://waze.com/ul');
    expect(url.searchParams.get('ll')).toBe('3.0449,101.4456');
    expect(url.searchParams.get('navigate')).toBe('yes');
    expect(url.searchParams.get('utm_source')).toBe('makanmana');
  });

  it('opens keyless Google Maps driving directions to the exact place', () => {
    const url = new URL(
      buildGoogleMapsNavigationUrl(destination, 'ChIJ-food-place'),
    );

    expect(`${url.origin}${url.pathname}`).toBe(
      'https://www.google.com/maps/dir/',
    );
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('destination')).toBe('3.0449,101.4456');
    expect(url.searchParams.get('destination_place_id')).toBe(
      'ChIJ-food-place',
    );
    expect(url.searchParams.get('travelmode')).toBe('driving');
    expect(url.searchParams.has('key')).toBe(false);
  });

  it('opens the exact restaurant page in Google Maps without an API key', () => {
    const url = new URL(
      buildGoogleMapsPlaceUrl('Klang Kopitiam', 'ChIJ-food-place'),
    );

    expect(`${url.origin}${url.pathname}`).toBe(
      'https://www.google.com/maps/search/',
    );
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('query')).toBe('Klang Kopitiam');
    expect(url.searchParams.get('query_place_id')).toBe('ChIJ-food-place');
    expect(url.searchParams.has('key')).toBe(false);
  });
});
