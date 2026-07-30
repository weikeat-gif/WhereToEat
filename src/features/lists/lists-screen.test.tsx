import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ListsScreen } from './lists-screen';

const mockPush = jest.fn();
const mockSearchState = {
  results: [
    {
      id: 'late-place',
      name: 'Late Night Noodles',
      subtitle: 'Wok-fried supper',
      coordinates: { latitude: 3.139, longitude: 101.6869 },
      distanceMeters: 400,
      rating: 4.6,
      reviewCount: 300,
      priceLevel: 1 as const,
      isOpen: true,
      categories: ['Supper'],
    },
    {
      id: 'kopitiam-place',
      name: 'Klang Kopitiam',
      subtitle: 'Toast and coffee',
      coordinates: { latitude: 3.14, longitude: 101.69 },
      distanceMeters: 900,
      rating: 4.3,
      reviewCount: 180,
      priceLevel: 2 as const,
      isOpen: true,
      categories: ['Cafe'],
    },
  ],
};

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('expo-image', () => {
  const { Image } = jest.requireActual('react-native');
  return { Image };
});

jest.mock('@/features/search/search-provider', () => ({
  useSearch: () => mockSearchState,
}));

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.dark,
  }),
}));

function renderScreen() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 44, left: 0, right: 0, bottom: 34 },
      }}>
      <ListsScreen />
    </SafeAreaProvider>,
  );
}

describe('ListsScreen meal plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchState.results = [
      {
        id: 'late-place',
        name: 'Late Night Noodles',
        subtitle: 'Wok-fried supper',
        coordinates: { latitude: 3.139, longitude: 101.6869 },
        distanceMeters: 400,
        rating: 4.6,
        reviewCount: 300,
        priceLevel: 1,
        isOpen: true,
        categories: ['Supper'],
      },
      {
        id: 'kopitiam-place',
        name: 'Klang Kopitiam',
        subtitle: 'Toast and coffee',
        coordinates: { latitude: 3.14, longitude: 101.69 },
        distanceMeters: 900,
        rating: 4.3,
        reviewCount: 180,
        priceLevel: 2,
        isOpen: true,
        categories: ['Cafe'],
      },
    ];
  });

  it('turns current nearby results into a concrete meal plan', () => {
    const screen = renderScreen();

    expect(screen.getByText('Make a food plan')).toBeTruthy();
    expect(screen.getByText('YOUR PICK')).toBeTruthy();
    expect(screen.getAllByText('Late Night Noodles').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/400 m/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Budget-friendly/)).toBeTruthy();
  });

  it('starts in-app directions for the selected place', () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Directions' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/directions/[id]',
      params: { id: 'late-place' },
    });
  });

  it('cycles to another nearby choice', () => {
    const screen = renderScreen();

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Pick another nearby restaurant',
      }),
    );

    expect(screen.getAllByText('Klang Kopitiam').length).toBeGreaterThan(0);
  });

  it('lets the user choose tonight', () => {
    const screen = renderScreen();

    const tonight = screen.getByRole('button', { name: 'Tonight' });
    fireEvent.press(tonight);

    expect(tonight).toHaveProp('accessibilityState', { selected: true });
  });

  it('sends an empty plan to restaurant search', () => {
    mockSearchState.results = [];
    const screen = renderScreen();

    expect(screen.getByText('Find nearby food first')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Open search' }));

    expect(mockPush).toHaveBeenCalledWith('/map');
  });
});
