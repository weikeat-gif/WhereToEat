import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Coordinates } from '@/contracts/place';
import type { AreaSuggestion } from '@/contracts/search';

const RECENT_AREAS_STORAGE_PREFIX = 'makanmana.recent-areas.v2';
const MAX_RECENT_AREAS = 5;
const MAX_STORED_BYTES = 20_000;
const HISTORY_RETENTION_MS = 30 * 24 * 60 * 60_000;

type RecentAreaStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'setItem' | 'removeItem'
>;

type StoredRecentArea = {
  selectedAt: string;
  area: AreaSuggestion;
};

export function recentAreasStorageKey(scope: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(scope)) {
    throw new Error('Recent area history scope is invalid.');
  }
  return `${RECENT_AREAS_STORAGE_PREFIX}.${scope}`;
}

function coordinates(value: unknown): Coordinates | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('latitude' in value) ||
    !('longitude' in value) ||
    typeof value.latitude !== 'number' ||
    !Number.isFinite(value.latitude) ||
    value.latitude < -90 ||
    value.latitude > 90 ||
    typeof value.longitude !== 'number' ||
    !Number.isFinite(value.longitude) ||
    value.longitude < -180 ||
    value.longitude > 180
  ) {
    return undefined;
  }
  return {
    latitude: value.latitude,
    longitude: value.longitude,
  };
}

function areaSuggestion(value: unknown): AreaSuggestion | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    value.id.length < 1 ||
    value.id.length > 255 ||
    !('label' in value) ||
    typeof value.label !== 'string' ||
    value.label.length < 1 ||
    value.label.length > 160
  ) {
    return undefined;
  }
  const center =
    'coordinates' in value ? coordinates(value.coordinates) : undefined;
  if (!center) return undefined;
  return {
    id: value.id,
    label: value.label,
    ...('secondaryLabel' in value &&
    typeof value.secondaryLabel === 'string' &&
    value.secondaryLabel.length <= 200
      ? { secondaryLabel: value.secondaryLabel }
      : {}),
    coordinates: center,
    ...('viewport' in value &&
    typeof value.viewport === 'object' &&
    value.viewport !== null &&
    'northEast' in value.viewport &&
    'southWest' in value.viewport
      ? {
          viewport: {
            northEast: coordinates(value.viewport.northEast) ?? center,
            southWest: coordinates(value.viewport.southWest) ?? center,
          },
        }
      : {}),
  };
}

function storedRecentArea(
  value: unknown,
  now: number,
): StoredRecentArea | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('selectedAt' in value) ||
    typeof value.selectedAt !== 'string' ||
    !('area' in value)
  ) {
    return undefined;
  }
  const selectedAt = Date.parse(value.selectedAt);
  const area = areaSuggestion(value.area);
  if (
    !area ||
    !Number.isFinite(selectedAt) ||
    selectedAt > now + 60_000 ||
    selectedAt < now - HISTORY_RETENTION_MS
  ) {
    return undefined;
  }
  return { selectedAt: value.selectedAt, area };
}

function parseStoredRecentAreas(raw: string | null, now: number) {
  if (!raw || raw.length > MAX_STORED_BYTES) {
    return { entries: [] as StoredRecentArea[], needsRewrite: Boolean(raw) };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { entries: [] as StoredRecentArea[], needsRewrite: true };
    }
    const entries = parsed
      .slice(0, MAX_RECENT_AREAS)
      .map((entry) => storedRecentArea(entry, now))
      .filter((entry): entry is StoredRecentArea => Boolean(entry));
    return {
      entries,
      needsRewrite:
        parsed.length !== entries.length || parsed.length > MAX_RECENT_AREAS,
    };
  } catch {
    return { entries: [] as StoredRecentArea[], needsRewrite: true };
  }
}

export function rememberRecentArea(
  current: AreaSuggestion[],
  area: AreaSuggestion,
): AreaSuggestion[] {
  if (!area.coordinates) return current;
  return [
    area,
    ...current.filter((candidate) => candidate.id !== area.id),
  ].slice(0, MAX_RECENT_AREAS);
}

export async function loadRecentAreas(
  scope: string,
  storage: RecentAreaStorage = AsyncStorage,
  now = Date.now(),
): Promise<AreaSuggestion[]> {
  const key = recentAreasStorageKey(scope);
  try {
    const raw = await storage.getItem(key);
    if (!raw) return [];
    const { entries, needsRewrite } = parseStoredRecentAreas(raw, now);
    if (needsRewrite) {
      if (entries.length === 0) {
        await storage.removeItem(key).catch(() => undefined);
      } else {
        await storage
          .setItem(key, JSON.stringify(entries))
          .catch(() => undefined);
      }
    }
    return entries.map((entry) => entry.area);
  } catch {
    await storage.removeItem(key).catch(() => undefined);
    return [];
  }
}

export async function saveRecentAreas(
  scope: string,
  areas: AreaSuggestion[],
  storage: RecentAreaStorage = AsyncStorage,
  now = new Date(),
) {
  const key = recentAreasStorageKey(scope);
  const existing = await storage
    .getItem(key)
    .then((raw) => parseStoredRecentAreas(raw, now.getTime()).entries)
    .catch(() => [] as StoredRecentArea[]);
  const existingSelectionTimes = new Map(
    existing.map((entry) => [entry.area.id, entry.selectedAt]),
  );
  const stored = areas.slice(0, MAX_RECENT_AREAS).flatMap((area, index) => {
    const minimalArea = areaSuggestion(area);
    return minimalArea
      ? [
          {
            selectedAt:
              index === 0
                ? now.toISOString()
                : existingSelectionTimes.get(minimalArea.id) ??
                  now.toISOString(),
            area: minimalArea,
          },
        ]
      : [];
  });
  await storage
    .setItem(key, JSON.stringify(stored))
    .catch(() => undefined);
}

export async function clearRecentAreaHistory(
  scope: string,
  storage: RecentAreaStorage = AsyncStorage,
) {
  await storage
    .removeItem(recentAreasStorageKey(scope))
    .catch(() => undefined);
}
