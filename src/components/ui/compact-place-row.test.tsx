import { render, screen } from '@testing-library/react-native';

import type { PlaceSummary } from '@/contracts/place';

import { CompactPlaceRow } from './compact-place-row';

jest.mock('expo-image', () => {
  const { Image } = jest.requireActual('react-native');
  return { Image };
});

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.dark,
  }),
}));

const place: PlaceSummary = {
  id: 'distance-place',
  name: 'Distance Place',
  subtitle:
    'A long restaurant address that would otherwise hide trailing metadata',
  coordinates: { latitude: 3.139, longitude: 101.6869 },
  distanceMeters: 5600,
  rating: 4.6,
  reviewCount: 320,
  priceLevel: 2,
  categories: ['Restaurant'],
};

describe('CompactPlaceRow', () => {
  it('shows distance beside the semantic Google price level', () => {
    render(
      <CompactPlaceRow
        onPress={jest.fn()}
        place={place}
      />,
    );

    expect(screen.getByText(place.subtitle)).toBeTruthy();
    expect(screen.getByText('Moderate price')).toBeTruthy();
    expect(screen.getByText('5.6 km')).toBeTruthy();
  });

  it('prefers an actual Google price range when one is returned', () => {
    render(
      <CompactPlaceRow
        onPress={jest.fn()}
        place={{
          ...place,
          priceRange: {
            currencyCode: 'MYR',
            start: 18,
            endExclusive: 36,
          },
        }}
      />,
    );

    expect(screen.getByText('RM18–36')).toBeTruthy();
    expect(screen.queryByText('Moderate price')).toBeNull();
  });
});
