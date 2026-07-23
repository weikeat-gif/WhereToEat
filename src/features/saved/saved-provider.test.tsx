import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import type { SavedPlacesRepository } from './saved-service';
import {
  isCurrentSavedLoad,
  savedIdsForUser,
  SavedPlacesProvider,
  useSavedPlaces,
} from './use-saved-places';

jest.mock('@/services/supabase/client', () => ({ supabase: null }));

let mockUserId: string | null = 'user-1';

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({
    user: mockUserId ? { id: mockUserId } : null,
  }),
}));

function Consumer({
  label,
  placeId = 'place-1',
  toggles = false,
}: {
  label: string;
  placeId?: string;
  toggles?: boolean;
}) {
  const { savedIds, toggle } = useSavedPlaces();
  return (
    <Pressable
      onPress={() =>
        toggles ? void toggle(placeId).catch(() => undefined) : undefined
      }>
      <Text>{`${label}:${savedIds.has(placeId) ? 'saved' : 'empty'}`}</Text>
    </Pressable>
  );
}

describe('SavedPlacesProvider', () => {
  beforeEach(() => {
    mockUserId = 'user-1';
  });

  it('never exposes IDs owned by a different account render', () => {
    expect(
      savedIdsForUser(
        'user-1',
        'user-2',
        new Set(['account-a-place']),
        new Set(),
      ),
    ).toEqual(new Set());
  });

  it('rejects a stale list result before passive effect cleanup', () => {
    expect(isCurrentSavedLoad(true, 'user-1', 'user-2')).toBe(false);
    expect(isCurrentSavedLoad(true, 'user-2', 'user-2')).toBe(true);
    expect(isCurrentSavedLoad(false, 'user-2', 'user-2')).toBe(false);
  });

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

  it('keeps an optimistic save when the initial list finishes later', async () => {
    let resolveList!: (value: []) => void;
    const repository: SavedPlacesRepository = {
      list: jest.fn(
        () =>
          new Promise<[]>((resolve) => {
            resolveList = resolve;
          }),
      ),
      save: jest.fn().mockResolvedValue({
        userId: 'user-1',
        googlePlaceId: 'place-1',
        createdAt: '2026-07-23T00:00:00Z',
      }),
      remove: jest.fn(),
    };
    const screen = render(
      <SavedPlacesProvider repository={repository}>
        <Consumer label="details" toggles />
        <Consumer label="saved" />
      </SavedPlacesProvider>,
    );

    fireEvent.press(screen.getByText('details:empty'));
    await waitFor(() => expect(screen.getByText('saved:saved')).toBeTruthy());
    await act(async () => {
      resolveList([]);
      await Promise.resolve();
    });

    expect(screen.getByText('saved:saved')).toBeTruthy();
  });

  it('serializes rapid toggles for the same place', async () => {
    let resolveSave!: () => void;
    const repository: SavedPlacesRepository = {
      list: jest.fn().mockResolvedValue([]),
      save: jest.fn(
        () =>
          new Promise((resolve) => {
            resolveSave = () =>
              resolve({
                userId: 'user-1',
                googlePlaceId: 'place-1',
                createdAt: '2026-07-23T00:00:00Z',
              });
          }),
      ),
      remove: jest.fn(),
    };
    const screen = render(
      <SavedPlacesProvider repository={repository}>
        <Consumer label="details" toggles />
      </SavedPlacesProvider>,
    );
    await waitFor(() => expect(screen.getByText('details:empty')).toBeTruthy());

    fireEvent.press(screen.getByText('details:empty'));
    fireEvent.press(screen.getByText('details:saved'));

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.remove).not.toHaveBeenCalled();
    await act(async () => {
      resolveSave();
      await Promise.resolve();
    });
  });

  it('does not restore the previous account after a failed in-flight save', async () => {
    let rejectSave!: (error: Error) => void;
    const repository: SavedPlacesRepository = {
      list: jest.fn(async (userId: string) =>
        userId === 'user-1'
          ? [
              {
                userId,
                googlePlaceId: 'account-a-place',
                createdAt: '2026-07-23T00:00:00Z',
              },
            ]
          : [],
      ),
      save: jest.fn(
        () =>
          new Promise((_, reject) => {
            rejectSave = reject;
          }),
      ),
      remove: jest.fn(),
    };
    const renderTree = () => (
      <SavedPlacesProvider repository={repository}>
        <Consumer label="old" placeId="account-a-place" />
        <Consumer label="new" placeId="place-1" toggles />
      </SavedPlacesProvider>
    );
    const view = render(renderTree());
    await waitFor(() => expect(view.getByText('old:saved')).toBeTruthy());

    fireEvent.press(view.getByText('new:empty'));
    await waitFor(() => expect(view.getByText('new:saved')).toBeTruthy());
    mockUserId = 'user-2';
    view.rerender(renderTree());
    await waitFor(() => expect(view.getByText('old:empty')).toBeTruthy());

    await act(async () => {
      rejectSave(new Error('save failed'));
      await Promise.resolve();
    });

    expect(view.getByText('old:empty')).toBeTruthy();
    expect(view.getByText('new:empty')).toBeTruthy();
  });

  it('hides the previous account while the next account is loading', async () => {
    let resolveSecondAccount!: (value: []) => void;
    const repository: SavedPlacesRepository = {
      list: jest.fn((userId: string) =>
        userId === 'user-1'
          ? Promise.resolve([
              {
                userId,
                googlePlaceId: 'account-a-place',
                createdAt: '2026-07-23T00:00:00Z',
              },
            ])
          : new Promise<[]>((resolve) => {
              resolveSecondAccount = resolve;
            }),
      ),
      save: jest.fn(),
      remove: jest.fn(),
    };
    const renderTree = () => (
      <SavedPlacesProvider repository={repository}>
        <Consumer label="old" placeId="account-a-place" />
      </SavedPlacesProvider>
    );
    const view = render(renderTree());
    await waitFor(() => expect(view.getByText('old:saved')).toBeTruthy());

    mockUserId = 'user-2';
    view.rerender(renderTree());

    expect(view.getByText('old:empty')).toBeTruthy();
    await act(async () => {
      resolveSecondAccount([]);
      await Promise.resolve();
    });
  });
});
