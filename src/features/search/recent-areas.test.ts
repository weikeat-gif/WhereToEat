import type { AreaSuggestion } from '@/contracts/search';
import {
  clearRecentAreaHistory,
  loadRecentAreas,
  recentAreasStorageKey,
  rememberRecentArea,
  saveRecentAreas,
} from '@/features/search/recent-areas';

function storage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: jest.fn(async () => value),
    setItem: jest.fn(async (_key: string, next: string) => {
      value = next;
    }),
    removeItem: jest.fn(async () => {
      value = null;
    }),
  };
}

const area = (id: string): AreaSuggestion => ({
  id,
  label: `Area ${id}`,
  coordinates: { latitude: 3.01, longitude: 101.47 },
});

describe('recent area history', () => {
  it('keeps the newest five unique selected areas', () => {
    let history: AreaSuggestion[] = [];
    for (let index = 1; index <= 6; index += 1) {
      history = rememberRecentArea(history, area(String(index)));
    }
    history = rememberRecentArea(history, area('3'));

    expect(history.map((entry) => entry.id)).toEqual(['3', '6', '5', '4', '2']);
  });

  it('persists only minimal area data per account and ignores malformed entries', async () => {
    const fakeStorage = storage();
    const selected: AreaSuggestion = {
      ...area('sentosa'),
      boundary: {
        source: 'openstreetmap',
        sourceUrl: 'https://www.openstreetmap.org/relation/18743759',
        label: 'Bandar Sentosa',
        polygons: [
          {
            outer: [
              { latitude: 3, longitude: 101.46 },
              { latitude: 3.02, longitude: 101.46 },
              { latitude: 3.02, longitude: 101.49 },
              { latitude: 3, longitude: 101.46 },
            ],
            holes: [],
          },
        ],
      },
    };

    await saveRecentAreas('account-1', [selected], fakeStorage);
    expect(fakeStorage.setItem).toHaveBeenCalledWith(
      recentAreasStorageKey('account-1'),
      expect.any(String),
    );
    await expect(loadRecentAreas('account-1', fakeStorage)).resolves.toEqual([
      expect.objectContaining({
        id: selected.id,
        label: selected.label,
        coordinates: selected.coordinates,
      }),
    ]);
    expect(
      JSON.parse(fakeStorage.setItem.mock.calls[0][1] as string)[0].area,
    ).not.toHaveProperty('boundary');

    const brokenStorage = storage(JSON.stringify([{ id: 'bad', label: 'Bad' }]));
    await expect(loadRecentAreas('account-1', brokenStorage)).resolves.toEqual(
      [],
    );
    expect(brokenStorage.removeItem).toHaveBeenCalled();
  });

  it('clears the stored history', async () => {
    const fakeStorage = storage(JSON.stringify([area('old')]));
    await clearRecentAreaHistory('account-1', fakeStorage);
    expect(fakeStorage.removeItem).toHaveBeenCalledWith(
      recentAreasStorageKey('account-1'),
    );
  });

  it('keeps account histories separate and expires entries after 30 days', async () => {
    const fakeStorage = storage();
    const selectedAt = new Date('2026-07-29T00:00:00.000Z');
    await saveRecentAreas('account-a', [area('a')], fakeStorage, selectedAt);
    expect(fakeStorage.setItem).toHaveBeenCalledWith(
      recentAreasStorageKey('account-a'),
      expect.any(String),
    );
    await expect(
      loadRecentAreas(
        'account-a',
        fakeStorage,
        new Date('2026-08-29T00:00:01.000Z').getTime(),
      ),
    ).resolves.toEqual([]);
    expect(fakeStorage.removeItem).toHaveBeenCalledWith(
      recentAreasStorageKey('account-a'),
    );
  });

  it('preserves older selection times when a different area is added', async () => {
    const fakeStorage = storage();
    const firstSelection = new Date('2026-07-01T00:00:00.000Z');
    const laterSelection = new Date('2026-07-20T00:00:00.000Z');
    await saveRecentAreas(
      'account-a',
      [area('a'), area('b')],
      fakeStorage,
      firstSelection,
    );
    await saveRecentAreas(
      'account-a',
      [area('c'), area('a'), area('b')],
      fakeStorage,
      laterSelection,
    );

    const serialized = fakeStorage.setItem.mock.calls.at(-1)?.[1] as string;
    const stored = JSON.parse(serialized) as {
      selectedAt: string;
      area: AreaSuggestion;
    }[];
    expect(stored.map((entry) => [entry.area.id, entry.selectedAt])).toEqual([
      ['c', laterSelection.toISOString()],
      ['a', firstSelection.toISOString()],
      ['b', firstSelection.toISOString()],
    ]);
  });
});
