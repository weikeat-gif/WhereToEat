import type { CoordinateBounds, Coordinates } from '@/contracts/place';

export type MapViewport = {
  center: Coordinates;
  radiusMeters: number;
  bounds?: MapBounds;
};

export type MapBounds = CoordinateBounds;

const EARTH_RADIUS_METERS = 6_371_000;
const MIN_SEARCH_RADIUS_METERS = 100;
const MAX_SEARCH_RADIUS_METERS = 20_000;
const MIN_PIN_SEPARATION_FRACTION = 0.1;

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

export function boundsForMapRegion(region: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}): MapBounds {
  return {
    northEast: {
      latitude: region.latitude + region.latitudeDelta / 2,
      longitude: region.longitude + region.longitudeDelta / 2,
    },
    southWest: {
      latitude: region.latitude - region.latitudeDelta / 2,
      longitude: region.longitude - region.longitudeDelta / 2,
    },
  };
}

export function isCoordinateWithinMapBounds(
  coordinate: Coordinates,
  bounds: MapBounds,
) {
  const withinLatitude =
    coordinate.latitude >= bounds.southWest.latitude &&
    coordinate.latitude <= bounds.northEast.latitude;
  const crossesAntimeridian =
    bounds.southWest.longitude > bounds.northEast.longitude;
  const withinLongitude = crossesAntimeridian
    ? coordinate.longitude >= bounds.southWest.longitude ||
      coordinate.longitude <= bounds.northEast.longitude
    : coordinate.longitude >= bounds.southWest.longitude &&
      coordinate.longitude <= bounds.northEast.longitude;
  return withinLatitude && withinLongitude;
}

function longitudeSpan(bounds: MapBounds) {
  const direct =
    bounds.northEast.longitude - bounds.southWest.longitude;
  return direct >= 0 ? direct : 360 + direct;
}

function longitudeDistance(left: number, right: number) {
  const direct = Math.abs(left - right);
  return Math.min(direct, 360 - direct);
}

export function selectMapPlacesForViewport<
  Place extends { coordinates: Coordinates },
>(places: Place[], bounds: MapBounds) {
  const latitudeSpan = Math.max(
    bounds.northEast.latitude - bounds.southWest.latitude,
    Number.EPSILON,
  );
  const visibleLongitudeSpan = Math.max(
    longitudeSpan(bounds),
    Number.EPSILON,
  );
  const minimumLatitudeSeparation =
    latitudeSpan * MIN_PIN_SEPARATION_FRACTION;
  const minimumLongitudeSeparation =
    visibleLongitudeSpan * MIN_PIN_SEPARATION_FRACTION;

  return places.reduce<Place[]>((displayed, place) => {
    if (!isCoordinateWithinMapBounds(place.coordinates, bounds)) {
      return displayed;
    }
    const overlapsDisplayedPin = displayed.some(
      (candidate) =>
        Math.abs(
          candidate.coordinates.latitude - place.coordinates.latitude,
        ) < minimumLatitudeSeparation &&
        longitudeDistance(
          candidate.coordinates.longitude,
          place.coordinates.longitude,
        ) < minimumLongitudeSeparation,
    );
    if (!overlapsDisplayedPin) displayed.push(place);
    return displayed;
  }, []);
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
