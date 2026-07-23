import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { SavedScreen } from './saved-screen';

const mockPush = jest.fn();
const mockToggle = jest.fn();
const mockUseAuth = jest.fn();
const mockUseSavedPlaces = jest.fn();
const mockGetPlaceDetails = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args) }),
}));

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('./use-saved-places', () => ({
  useSavedPlaces: () => mockUseSavedPlaces(),
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
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockToggle.mockResolvedValue(true);
    mockUseAuth.mockReturnValue({ user: null });
    mockUseSavedPlaces.mockReturnValue({
      savedIds: new Set(),
      isLoading: false,
      error: null,
      toggle: mockToggle,
    });
    mockGetPlaceDetails.mockResolvedValue({
      id: 'place-1',
      name: 'Klang Supper Club',
      subtitle: 'Klang, Selangor',
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('gates a guest and routes Sign in to the auth screen', () => {
    render(<SavedScreen />);

    expect(
      screen.getByText(
        'Sign in to save restaurants and sync them across devices.',
      ),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(mockPush).toHaveBeenCalledWith('/auth');
  });

  it('shows a signed-in persistence error and empty state', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    mockUseSavedPlaces.mockReturnValue({
      savedIds: new Set(),
      isLoading: false,
      error: 'Unable to load saved places.',
      toggle: mockToggle,
    });

    render(<SavedScreen />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unable to load saved places.',
    );
    expect(screen.getByText('No saved restaurants yet.')).toBeTruthy();
  });

  it('labels saved-place loading for assistive technology', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockUseSavedPlaces.mockReturnValue({
      savedIds: new Set(),
      isLoading: true,
      error: null,
      toggle: mockToggle,
    });

    render(<SavedScreen />);

    expect(screen.getByLabelText('Loading saved restaurants')).toBeTruthy();
  });

  it('removes a saved place through the saved repository hook', () => {
    mockGetPlaceDetails.mockReturnValue(new Promise(() => undefined));
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    mockUseSavedPlaces.mockReturnValue({
      savedIds: new Set(['place-1']),
      isLoading: false,
      error: null,
      toggle: mockToggle,
    });

    render(<SavedScreen />);

    fireEvent.press(
      screen.getByRole('button', { name: 'Remove saved place place-1' }),
    );
    expect(mockToggle).toHaveBeenCalledWith('place-1');
  });

  it('resolves saved IDs into restaurants and opens their details', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockUseSavedPlaces.mockReturnValue({
      savedIds: new Set(['place-1']),
      isLoading: false,
      error: null,
      toggle: mockToggle,
    });
    render(<SavedScreen />);

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

  it('uses a virtualized list and only resolves newly saved IDs', async () => {
    const firstState = {
      savedIds: new Set(['place-1']),
      isLoading: false,
      error: null,
      toggle: mockToggle,
    };
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockUseSavedPlaces.mockReturnValue(firstState);
    mockGetPlaceDetails.mockImplementation(async (id: string) => ({
      id,
      name: id === 'place-1' ? 'Klang Supper Club' : 'New Place',
      subtitle: 'Klang, Selangor',
    }));
    const view = render(<SavedScreen />);

    await waitFor(() =>
      expect(screen.getByText('Klang Supper Club')).toBeTruthy(),
    );
    expect(screen.getByTestId('saved-places-list')).toBeTruthy();

    mockUseSavedPlaces.mockReturnValue({
      ...firstState,
      savedIds: new Set(['place-1', 'place-2']),
    });
    view.rerender(<SavedScreen />);

    await waitFor(() => expect(screen.getByText('New Place')).toBeTruthy());
    expect(mockGetPlaceDetails).toHaveBeenCalledTimes(2);
    expect(mockGetPlaceDetails).toHaveBeenNthCalledWith(1, 'place-1');
    expect(mockGetPlaceDetails).toHaveBeenNthCalledWith(2, 'place-2');
  });
});
