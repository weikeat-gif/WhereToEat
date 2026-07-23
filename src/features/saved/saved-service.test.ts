import {
  AuthRequiredError,
  toggleSavedPlace,
  type SavedPlacesRepository,
} from './saved-service';

jest.mock('@/services/supabase/client', () => ({ supabase: null }));

function repository(): jest.Mocked<SavedPlacesRepository> {
  return {
    list: jest.fn(),
    save: jest.fn().mockResolvedValue({
      userId: 'user-1',
      googlePlaceId: 'place-1',
      createdAt: '2026-07-23T00:00:00Z',
    }),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

describe('toggleSavedPlace', () => {
  it('requires authentication before applying an optimistic save', async () => {
    const update = jest.fn();
    await expect(
      toggleSavedPlace({
        userId: null,
        googlePlaceId: 'place-1',
        current: new Set(),
        repository: repository(),
        update,
      }),
    ).rejects.toBeInstanceOf(AuthRequiredError);
    expect(update).not.toHaveBeenCalled();
  });

  it('rolls an optimistic save back when persistence fails', async () => {
    const repo = repository();
    repo.save.mockRejectedValueOnce(new Error('network failed'));
    const update = jest.fn();

    await expect(
      toggleSavedPlace({
        userId: 'user-1',
        googlePlaceId: 'place-1',
        current: new Set(),
        repository: repo,
        update,
      }),
    ).rejects.toThrow('network failed');

    expect([...update.mock.calls[0][0]]).toEqual(['place-1']);
    expect([...update.mock.calls[1][0]]).toEqual([]);
  });
});
