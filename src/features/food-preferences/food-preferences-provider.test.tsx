import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

import type { FoodPreferenceKey } from '@/contracts/food-preference';

import type { FoodPreferencesRepository } from './food-preferences-repository';
import {
  FoodPreferencesProvider,
  useFoodPreferences,
} from './food-preferences-provider';

jest.mock('@/services/supabase/client', () => ({ supabase: null }));

let mockUserId: string | null = 'user-1';

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({
    user: mockUserId ? { id: mockUserId } : null,
  }),
}));

function Consumer({ preferenceKey }: { preferenceKey: FoodPreferenceKey }) {
  const {
    add,
    canPersist,
    preferenceKeys,
    rememberConfirmed,
    remove,
  } = useFoodPreferences();
  const selected = preferenceKeys.has(preferenceKey);
  return (
    <View>
      <Text>{`${preferenceKey}:${selected ? 'on' : 'off'}`}</Text>
      {preferenceKey !== 'chinese' ? (
        <Text>{`chinese:${preferenceKeys.has('chinese') ? 'on' : 'off'}`}</Text>
      ) : null}
      {preferenceKey !== 'spicy' ? (
        <Text>{`spicy:${preferenceKeys.has('spicy') ? 'on' : 'off'}`}</Text>
      ) : null}
      <Text>{canPersist ? 'account' : 'session'}</Text>
      <Pressable onPress={() => void add(preferenceKey).catch(() => undefined)}>
        <Text>Add preference</Text>
      </Pressable>
      <Pressable onPress={() => void remove(preferenceKey).catch(() => undefined)}>
        <Text>Remove preference</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          void rememberConfirmed([preferenceKey]).catch(() => undefined)
        }>
        <Text>Remember confirmed</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          void rememberConfirmed(['chinese', 'spicy']).catch(() => undefined)
        }>
        <Text>Remember batch</Text>
      </Pressable>
    </View>
  );
}

function record(userId: string, key: FoodPreferenceKey) {
  return { userId, key, createdAt: '2026-08-04T00:00:00.000Z' };
}

describe('FoodPreferencesProvider', () => {
  beforeEach(() => {
    mockUserId = 'user-1';
  });

  it('loads, adds, and removes persisted preferences for the signed-in user', async () => {
    const repository: jest.Mocked<FoodPreferencesRepository> = {
      list: jest.fn().mockResolvedValue([record('user-1', 'chinese')]),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const screen = render(
      <FoodPreferencesProvider repository={repository}>
        <Consumer preferenceKey="chinese" />
      </FoodPreferencesProvider>,
    );

    await waitFor(() => expect(screen.getByText('chinese:on')).toBeTruthy());
    fireEvent.press(screen.getByText('Remove preference'));
    await waitFor(() =>
      expect(repository.set).toHaveBeenCalledWith('user-1', 'chinese', false),
    );
    expect(screen.getByText('chinese:off')).toBeTruthy();

    fireEvent.press(screen.getByText('Add preference'));
    await waitFor(() =>
      expect(repository.set).toHaveBeenCalledWith('user-1', 'chinese', true),
    );
    expect(screen.getByText('chinese:on')).toBeTruthy();
  });

  it('never exposes the previous account while another account loads', async () => {
    let resolveSecond!: (value: []) => void;
    const repository: FoodPreferencesRepository = {
      list: jest.fn((userId: string) =>
        userId === 'user-1'
          ? Promise.resolve([record(userId, 'chinese')])
          : new Promise<[]>((resolve) => {
              resolveSecond = resolve;
            }),
      ),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const tree = () => (
      <FoodPreferencesProvider repository={repository}>
        <Consumer preferenceKey="chinese" />
      </FoodPreferencesProvider>
    );
    const screen = render(tree());
    await waitFor(() => expect(screen.getByText('chinese:on')).toBeTruthy());

    mockUserId = 'user-2';
    screen.rerender(tree());

    expect(screen.getByText('chinese:off')).toBeTruthy();
    await act(async () => resolveSecond([]));
  });

  it('keeps guest preferences in this session without calling Supabase', async () => {
    mockUserId = null;
    const repository: jest.Mocked<FoodPreferencesRepository> = {
      list: jest.fn(),
      set: jest.fn(),
    };
    const screen = render(
      <FoodPreferencesProvider repository={repository}>
        <Consumer preferenceKey="noodles" />
      </FoodPreferencesProvider>,
    );

    expect(screen.getByText('session')).toBeTruthy();
    fireEvent.press(screen.getByText('Remember confirmed'));

    await waitFor(() => expect(screen.getByText('noodles:on')).toBeTruthy());
    expect(repository.list).not.toHaveBeenCalled();
    expect(repository.set).not.toHaveBeenCalled();
  });

  it('keeps a confirmed preference when the initial account load finishes later', async () => {
    let resolveList!: (value: []) => void;
    const repository: FoodPreferencesRepository = {
      list: jest.fn(
        () =>
          new Promise<[]>((resolve) => {
            resolveList = resolve;
          }),
      ),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const screen = render(
      <FoodPreferencesProvider repository={repository}>
        <Consumer preferenceKey="chinese" />
      </FoodPreferencesProvider>,
    );

    fireEvent.press(screen.getByText('Remember confirmed'));
    await waitFor(() => expect(screen.getByText('chinese:on')).toBeTruthy());
    await act(async () => resolveList([]));

    expect(screen.getByText('chinese:on')).toBeTruthy();
  });

  it('ignores a stale account load after switching users', async () => {
    let resolveFirst!: (value: ReturnType<typeof record>[]) => void;
    const repository: FoodPreferencesRepository = {
      list: jest.fn((userId: string) =>
        userId === 'user-1'
          ? new Promise((resolve) => {
              resolveFirst = resolve;
            })
          : Promise.resolve([]),
      ),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const tree = () => (
      <FoodPreferencesProvider repository={repository}>
        <Consumer preferenceKey="chinese" />
      </FoodPreferencesProvider>
    );
    const screen = render(tree());

    mockUserId = 'user-2';
    screen.rerender(tree());
    await act(async () => resolveFirst([record('user-1', 'chinese')]));

    expect(screen.getByText('chinese:off')).toBeTruthy();
  });

  it('serializes rapid changes to the same preference so the last action wins', async () => {
    let resolveFirst!: () => void;
    const repository: jest.Mocked<FoodPreferencesRepository> = {
      list: jest.fn().mockResolvedValue([]),
      set: jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<void>((resolve) => {
              resolveFirst = resolve;
            }),
        )
        .mockResolvedValue(undefined),
    };
    const screen = render(
      <FoodPreferencesProvider repository={repository}>
        <Consumer preferenceKey="spicy" />
      </FoodPreferencesProvider>,
    );
    await waitFor(() => expect(repository.list).toHaveBeenCalled());

    fireEvent.press(screen.getByText('Add preference'));
    fireEvent.press(screen.getByText('Remove preference'));
    expect(screen.getAllByText('spicy:off').length).toBeGreaterThan(0);
    await waitFor(() => expect(repository.set).toHaveBeenCalledTimes(1));

    await act(async () => resolveFirst());
    await waitFor(() =>
      expect(repository.set).toHaveBeenLastCalledWith(
        'user-1',
        'spicy',
        false,
      ),
    );
    expect(screen.getAllByText('spicy:off').length).toBeGreaterThan(0);
  });

  it('rolls back only the failed key without clobbering hydration or other edits', async () => {
    let resolveList!: (value: ReturnType<typeof record>[]) => void;
    let rejectSave!: (error: Error) => void;
    const repository: FoodPreferencesRepository = {
      list: jest.fn(
        () =>
          new Promise((resolve) => {
            resolveList = resolve;
          }),
      ),
      set: jest.fn(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectSave = reject;
          }),
      ),
    };
    const screen = render(
      <FoodPreferencesProvider repository={repository}>
        <Consumer preferenceKey="spicy" />
      </FoodPreferencesProvider>,
    );

    fireEvent.press(screen.getByText('Add preference'));
    await act(async () => resolveList([record('user-1', 'chinese')]));
    expect(screen.getByText('chinese:on')).toBeTruthy();
    await act(async () => rejectSave(new Error('offline')));

    await waitFor(() => expect(screen.getByText('spicy:off')).toBeTruthy());
    expect(screen.getByText('chinese:on')).toBeTruthy();
  });

  it('cancels the rest of a confirmed batch when the account changes', async () => {
    let resolveFirst!: () => void;
    const repository: jest.Mocked<FoodPreferencesRepository> = {
      list: jest.fn().mockResolvedValue([]),
      set: jest.fn(
        (_userId: string, _key: FoodPreferenceKey, _enabled: boolean) =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      ),
    };
    const tree = () => (
      <FoodPreferencesProvider repository={repository}>
        <Consumer preferenceKey="chinese" />
      </FoodPreferencesProvider>
    );
    const screen = render(tree());
    await waitFor(() => expect(repository.list).toHaveBeenCalledWith('user-1'));

    fireEvent.press(screen.getByText('Remember batch'));
    await waitFor(() => expect(repository.set).toHaveBeenCalledTimes(1));
    mockUserId = 'user-2';
    screen.rerender(tree());
    await waitFor(() => expect(repository.list).toHaveBeenCalledWith('user-2'));
    await act(async () => resolveFirst());

    await waitFor(() => expect(screen.getByText('chinese:off')).toBeTruthy());
    expect(repository.set).toHaveBeenCalledTimes(1);
  });

  it('does not merge an old account save into a new account still hydrating', async () => {
    let resolveOldSave!: () => void;
    let resolveNewList!: (value: []) => void;
    const repository: FoodPreferencesRepository = {
      list: jest.fn((userId: string) =>
        userId === 'user-1'
          ? Promise.resolve([])
          : new Promise<[]>((resolve) => {
              resolveNewList = resolve;
            }),
      ),
      set: jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveOldSave = resolve;
          }),
      ),
    };
    const tree = () => (
      <FoodPreferencesProvider repository={repository}>
        <Consumer preferenceKey="chinese" />
      </FoodPreferencesProvider>
    );
    const screen = render(tree());
    await waitFor(() => expect(repository.list).toHaveBeenCalledWith('user-1'));
    fireEvent.press(screen.getByText('Add preference'));
    await waitFor(() => expect(repository.set).toHaveBeenCalledTimes(1));

    mockUserId = 'user-2';
    screen.rerender(tree());
    await waitFor(() => expect(repository.list).toHaveBeenCalledWith('user-2'));
    await act(async () => resolveOldSave());
    await act(async () => resolveNewList([]));

    expect(screen.getByText('chinese:off')).toBeTruthy();
  });
});
