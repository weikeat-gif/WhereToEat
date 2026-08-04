import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { PlaceSummary } from '@/contracts/place';
import type { FoodPreferenceKey } from '@/contracts/food-preference';
import { FOOD_ONLY_MESSAGE } from '@/features/food-agent/food-agent-core';

import { FoodAgentScreen } from './food-agent-screen';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockSearch = jest.fn();
const mockRememberConfirmed = jest.fn();
const mockFoodPreferenceState = {
  preferenceKeys: new Set<FoodPreferenceKey>(),
  canPersist: true,
  rememberConfirmed: mockRememberConfirmed,
};

const places: PlaceSummary[] = [
  {
    id: 'place-1',
    name: 'Noodle House',
    subtitle: 'Chinese noodles',
    coordinates: { latitude: 3.14, longitude: 101.69 },
    distanceMeters: 820,
    rating: 4.5,
    reviewCount: 120,
    priceLevel: 1,
    isOpen: true,
    categories: ['Chinese', 'Noodles'],
  },
  {
    id: 'place-2',
    name: 'Dim Sum Corner',
    subtitle: 'Chinese dim sum',
    coordinates: { latitude: 3.141, longitude: 101.691 },
    distanceMeters: 1100,
    rating: 4.4,
    reviewCount: 98,
    priceLevel: 1,
    isOpen: true,
    categories: ['Chinese'],
  },
  {
    id: 'place-3',
    name: 'Klang Wok',
    subtitle: 'Chinese favourites',
    coordinates: { latitude: 3.142, longitude: 101.692 },
    distanceMeters: 1600,
    rating: 4.3,
    reviewCount: 75,
    priceLevel: 1,
    isOpen: true,
    categories: ['Chinese'],
  },
  {
    id: 'place-4',
    name: 'Fourth Result',
    subtitle: 'Should be hidden',
    coordinates: { latitude: 3.143, longitude: 101.693 },
    distanceMeters: 1900,
    rating: 4.2,
    reviewCount: 40,
    priceLevel: 1,
    isOpen: true,
    categories: ['Chinese'],
  },
];

jest.mock('expo-router', () => ({
  router: {
    back: (...args: unknown[]) => mockBack(...args),
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

jest.mock('@/features/search/search-provider', () => ({
  useSearch: () => ({
    criteria: {
      center: { latitude: 3.139, longitude: 101.6869 },
      areaLabel: 'Klang Valley',
      radiusMeters: 5000,
      openNow: false,
      priceLevels: [],
      categories: [],
      verifiedHalalOnly: false,
    },
    search: mockSearch,
  }),
}));

jest.mock('@/features/food-preferences/food-preferences-provider', () => ({
  useFoodPreferences: () => mockFoodPreferenceState,
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
      <FoodAgentScreen />
    </SafeAreaProvider>,
  );
}

describe('FoodAgentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFoodPreferenceState.preferenceKeys = new Set();
    mockFoodPreferenceState.canPersist = true;
    mockRememberConfirmed.mockResolvedValue('account');
    mockSearch.mockResolvedValue({ places });
  });

  it('keeps non-food requests inside the supported food flow', () => {
    const screen = renderScreen();

    fireEvent.changeText(
      screen.getByLabelText('Tell MakanMana what food you want'),
      'What is the weather today?',
    );
    fireEvent.press(screen.getByLabelText('Send food request'));

    expect(screen.getByText(FOOD_ONLY_MESSAGE)).toBeTruthy();
    expect(screen.getByText('Find halal food nearby')).toBeTruthy();
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('asks for confirmation before searching with extracted preferences', async () => {
    const screen = renderScreen();

    fireEvent.changeText(
      screen.getByLabelText('Tell MakanMana what food you want'),
      'Chinese food under RM20 within 3 km, open now',
    );
    fireEvent.press(screen.getByLabelText('Send food request'));

    expect(screen.getByText('Chinese')).toBeTruthy();
    expect(
      screen.getByText('Approximate price tier for an RM20 target'),
    ).toBeTruthy();
    expect(screen.getByText('Within 3 km')).toBeTruthy();
    expect(screen.getByText('Open now')).toBeTruthy();
    expect(mockSearch).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Find matching food'));

    await waitFor(() =>
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: ['Chinese'],
          openNow: true,
          priceLevels: [1],
          radiusMeters: 3000,
        }),
      ),
    );
    expect(await screen.findByText('Noodle House')).toBeTruthy();
    expect(screen.getByText('Dim Sum Corner')).toBeTruthy();
    expect(screen.getByText('Klang Wok')).toBeTruthy();
    expect(screen.queryByText('Fourth Result')).toBeNull();
  });

  it('opens a recommended restaurant detail', async () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByText('Find halal food nearby'));
    fireEvent.press(screen.getByLabelText('Find matching food'));
    fireEvent.press(await screen.findByText('Noodle House'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/[id]',
      params: { id: 'place-1' },
    });
  });

  it('does not show stale matches after the user changes preferences', async () => {
    let resolveSearch: ((value: { places: PlaceSummary[] }) => void) | undefined;
    mockSearch.mockReturnValueOnce(
      new Promise<{ places: PlaceSummary[] }>((resolve) => {
        resolveSearch = resolve;
      }),
    );
    const screen = renderScreen();

    fireEvent.changeText(
      screen.getByLabelText('Tell MakanMana what food you want'),
      'Chinese food nearby',
    );
    fireEvent.press(screen.getByLabelText('Send food request'));
    fireEvent.press(screen.getByLabelText('Find matching food'));
    fireEvent.press(screen.getByText('I feel like nasi lemak'));
    await act(async () => resolveSearch?.({ places }));

    expect(screen.getByText('nasi lemak')).toBeTruthy();
    expect(screen.queryByText('Noodle House')).toBeNull();
  });

  it('asks before saving preferences inferred from the conversation', async () => {
    const screen = renderScreen();

    fireEvent.changeText(
      screen.getByLabelText('Tell MakanMana what food you want'),
      'I prefer spicy Chinese food',
    );
    fireEvent.press(screen.getByLabelText('Send food request'));

    expect(mockRememberConfirmed).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Remember these preferences'));

    await waitFor(() =>
      expect(mockRememberConfirmed).toHaveBeenCalledWith([
        'chinese',
        'spicy',
      ]),
    );
    expect(screen.getByText('Saved to your food preferences.')).toBeTruthy();
  });

  it('keeps confirmed guest preferences session-only and offers sign-in', async () => {
    mockFoodPreferenceState.canPersist = false;
    mockRememberConfirmed.mockResolvedValue('session');
    const screen = renderScreen();

    fireEvent.press(screen.getByText('Find halal food nearby'));
    fireEvent.press(screen.getByLabelText('Remember these preferences'));

    expect(
      await screen.findByText(
        'Remembered for this session. Sign in to save across devices.',
      ),
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Sign in to save preferences'));
    expect(mockPush).toHaveBeenCalledWith('/auth');
  });
});
