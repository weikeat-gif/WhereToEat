import type { Coordinates } from '@/contracts/place';

export function buildWazeNavigationUrl(destination: Coordinates) {
  const url = new URL('https://waze.com/ul');
  url.searchParams.set(
    'll',
    `${destination.latitude},${destination.longitude}`,
  );
  url.searchParams.set('navigate', 'yes');
  url.searchParams.set('utm_source', 'makanmana');
  return url.toString();
}

export function buildGoogleMapsNavigationUrl(
  destination: Coordinates,
  placeId?: string,
) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set(
    'destination',
    `${destination.latitude},${destination.longitude}`,
  );
  if (placeId) url.searchParams.set('destination_place_id', placeId);
  url.searchParams.set('travelmode', 'driving');
  return url.toString();
}
