import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import type { SavedPlacesRepository } from './saved-service';
import { SavedPlacesProvider, useSavedPlaces } from './use-saved-places';

jest.mock('@/services/supabase/client', () => ({ supabase: null }));

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

function Consumer({ label, toggles = false }: { label: string; toggles?: boolean }) {
  const { savedIds, toggle } = useSavedPlaces();
  return (
    <Pressable onPress={() => (toggles ? void toggle('place-1') : undefined)}>
      <Text>{`${label}:${savedIds.has('place-1') ? 'saved' : 'empty'}`}</Text>
    </Pressable>
  );
}

describe('SavedPlacesProvider', () => {
  it('shares optimistic saves between details and saved consumers', async () => {
    const repository: SavedPlacesRepository = {
      list: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue({
        userId: 'user-1',
        googlePlaceId: 'place-1',
        createdAt: '2026-07-23T00:00:00Z',
      }),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const screen = render(
      <SavedPlacesProvider repository={repository}>
        <Consumer label="details" toggles />
        <Consumer label="saved" />
      </SavedPlacesProvider>,
    );

    await waitFor(() => expect(screen.getByText('saved:empty')).toBeTruthy());
    fireEvent.press(screen.getByText('details:empty'));

    await waitFor(() => expect(screen.getByText('saved:saved')).toBeTruthy());
  });
});
