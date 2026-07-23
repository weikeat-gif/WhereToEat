import type { PlaceSummary } from '@/contracts/place';
import { pickSurprise } from '@/features/search/surprise';

const places = ['a', 'b', 'c'].map(
  (id): PlaceSummary => ({
    id,
    name: id,
    subtitle: 'Demo',
    coordinates: { latitude: 3, longitude: 101 },
    distanceMeters: 100,
    rating: 4,
    reviewCount: 10,
    categories: ['Cafe'],
  }),
);

describe('pickSurprise', () => {
  it('selects only from current filtered results and Try another avoids the previous result', () => {
    expect(pickSurprise([], undefined, () => 0.5)).toBeUndefined();
    const first = pickSurprise(places.slice(0, 2), undefined, () => 0.9);
    expect(first?.id).toBe('b');

    const another = pickSurprise(places.slice(0, 2), first?.id, () => 0.9);
    expect(another?.id).toBe('a');
    expect(places.slice(0, 2)).toContain(another);
  });
});
