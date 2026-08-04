import type { PlaceSummary } from '@/contracts/place';

import { clusterPlaces } from './map-clusters';

function place(id: string, latitude: number, longitude: number): PlaceSummary {
  return {
    id,
    name: id,
    subtitle: 'Restaurant',
    coordinates: { latitude, longitude },
    distanceMeters: 100,
    rating: 4,
    reviewCount: 10,
    categories: ['Restaurant'],
  };
}

describe('map marker clustering', () => {
  const places = [
    place('a', 3.139, 101.6869),
    place('b', 3.1392, 101.6871),
    place('c', 3.2, 101.75),
  ];

  it('groups dense pins at a city zoom without changing singleton coordinates', () => {
    const clusters = clusterPlaces(places, 13);
    expect(clusters).toHaveLength(2);
    expect(clusters.find((cluster) => cluster.placeIds.includes('a'))?.placeIds).toEqual([
      'a',
      'b',
    ]);
    expect(clusters.find((cluster) => cluster.placeIds[0] === 'c')?.coordinate).toEqual(
      places[2].coordinates,
    );
  });

  it('predictably expands the same dense pins at a close zoom', () => {
    expect(clusterPlaces(places, 19)).toHaveLength(3);
  });
});
