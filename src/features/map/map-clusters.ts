import type { Coordinates, PlaceSummary } from '@/contracts/place';

export type MapPlaceCluster = {
  id: string;
  coordinate: Coordinates;
  placeIds: string[];
  places: PlaceSummary[];
};

export function clusterPlaces(places: PlaceSummary[], zoom: number): MapPlaceCluster[] {
  const cellDegrees = (360 / 2 ** Math.max(1, zoom)) * 0.22;
  const groups = new Map<string, PlaceSummary[]>();
  for (const place of places) {
    const latitudeCell = Math.floor(place.coordinates.latitude / cellDegrees);
    const longitudeCell = Math.floor(place.coordinates.longitude / cellDegrees);
    const key = `${latitudeCell}:${longitudeCell}`;
    groups.set(key, [...(groups.get(key) ?? []), place]);
  }

  return [...groups.values()]
    .map((group) => {
      const sorted = [...group].sort((left, right) => left.id.localeCompare(right.id));
      const coordinate =
        sorted.length === 1
          ? sorted[0].coordinates
          : {
              latitude:
                sorted.reduce((sum, place) => sum + place.coordinates.latitude, 0) /
                sorted.length,
              longitude:
                sorted.reduce((sum, place) => sum + place.coordinates.longitude, 0) /
                sorted.length,
            };
      const placeIds = sorted.map((place) => place.id);
      return {
        id: placeIds.join('|'),
        coordinate,
        placeIds,
        places: sorted,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}
