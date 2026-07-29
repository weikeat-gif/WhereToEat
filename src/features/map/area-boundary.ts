import type { Coordinates } from '@/contracts/place';
import type { AreaBoundary } from '@/contracts/search';
import type { MapBounds } from '@/features/map/map-viewport';

function isOnSegment(
  point: Coordinates,
  start: Coordinates,
  end: Coordinates,
) {
  const cross =
    (point.longitude - start.longitude) * (end.latitude - start.latitude) -
    (point.latitude - start.latitude) * (end.longitude - start.longitude);
  if (Math.abs(cross) > 1e-10) return false;
  return (
    point.longitude >= Math.min(start.longitude, end.longitude) - 1e-10 &&
    point.longitude <= Math.max(start.longitude, end.longitude) + 1e-10 &&
    point.latitude >= Math.min(start.latitude, end.latitude) - 1e-10 &&
    point.latitude <= Math.max(start.latitude, end.latitude) + 1e-10
  );
}

function isInsideRing(point: Coordinates, ring: Coordinates[]) {
  let inside = false;
  for (
    let current = 0, previous = ring.length - 1;
    current < ring.length;
    previous = current, current += 1
  ) {
    const left = ring[current];
    const right = ring[previous];
    if (isOnSegment(point, left, right)) return true;
    const intersects =
      left.latitude > point.latitude !== right.latitude > point.latitude &&
      point.longitude <
        ((right.longitude - left.longitude) *
          (point.latitude - left.latitude)) /
          (right.latitude - left.latitude) +
          left.longitude;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isCoordinateWithinAreaBoundary(
  point: Coordinates,
  boundary: AreaBoundary,
) {
  return boundary.polygons.some(
    (polygon) =>
      isInsideRing(point, polygon.outer) &&
      !polygon.holes.some((hole) => isInsideRing(point, hole)),
  );
}

export function mapBoundsForAreaBoundary(
  boundary: AreaBoundary,
): MapBounds | undefined {
  const points = boundary.polygons.flatMap((polygon) => polygon.outer);
  if (points.length === 0) return undefined;
  return {
    northEast: {
      latitude: Math.max(...points.map((point) => point.latitude)),
      longitude: Math.max(...points.map((point) => point.longitude)),
    },
    southWest: {
      latitude: Math.min(...points.map((point) => point.latitude)),
      longitude: Math.min(...points.map((point) => point.longitude)),
    },
  };
}
