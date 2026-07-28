import type { Coordinates } from '@/contracts/place';

export type MapViewport = {
  center: Coordinates;
  radiusMeters: number;
};

const EARTH_RADIUS_METERS = 6_371_000;
const MIN_SEARCH_RADIUS_METERS = 100;
const MAX_SEARCH_RADIUS_METERS = 20_000;

function radians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInMeters(left: Coordinates, right: Coordinates) {
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const leftLatitude = radians(left.latitude);
  const rightLatitude = radians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function boundedRadius(radiusMeters: number) {
  return Math.min(
    MAX_SEARCH_RADIUS_METERS,
    Math.max(MIN_SEARCH_RADIUS_METERS, Math.ceil(radiusMeters)),
  );
}

export function radiusForMapRegion(region: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}) {
  const center = {
    latitude: region.latitude,
    longitude: region.longitude,
  };
  const corner = {
    latitude: region.latitude + region.latitudeDelta / 2,
    longitude: region.longitude + region.longitudeDelta / 2,
  };
  return boundedRadius(distanceInMeters(center, corner));
}

export function radiusForMapBounds(
  center: Coordinates,
  northEast: Coordinates,
  southWest: Coordinates,
) {
  const corners = [
    northEast,
    southWest,
    { latitude: northEast.latitude, longitude: southWest.longitude },
    { latitude: southWest.latitude, longitude: northEast.longitude },
  ];
  return boundedRadius(
    Math.max(...corners.map((corner) => distanceInMeters(center, corner))),
  );
}
