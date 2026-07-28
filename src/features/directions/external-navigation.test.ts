import {
  buildGoogleMapsNavigationUrl,
  buildWazeNavigationUrl,
} from '@/features/directions/external-navigation';

const destination = { latitude: 3.0449, longitude: 101.4456 };

describe('external navigation URLs', () => {
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
});
