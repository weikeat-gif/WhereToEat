import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { SavedScreen } from './saved-screen';

const mockPush = jest.fn();
const mockGetPlaceDetails = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args) }),
}));

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('./use-saved-places', () => ({
  useSavedPlaces: () => ({
    savedIds: new Set(['place-1']),
    isLoading: false,
    error: null,
    toggle: jest.fn(),
  }),
}));

jest.mock('@/services/places', () => ({
  placesService: {
    getPlaceDetails: (...args: unknown[]) => mockGetPlaceDetails(...args),
  },
}));

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.dark,
  }),
}));

describe('SavedScreen', () => {
  it('resolves saved IDs into restaurants and opens their details', async () => {
    mockGetPlaceDetails.mockResolvedValue({
      id: 'place-1',
      name: 'Klang Supper Club',
      subtitle: 'Klang, Selangor',
    });
    const screen = render(<SavedScreen />);

    await waitFor(() =>
      expect(screen.getByText('Klang Supper Club')).toBeTruthy(),
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Open Klang Supper Club' }),
    );

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/[id]',
      params: { id: 'place-1' },
    });
  });
});
