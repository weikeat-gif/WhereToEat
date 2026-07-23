import type { PlaceSummary } from '@/contracts/place';

export function pickSurprise(
  currentResults: readonly PlaceSummary[],
  previousPlaceId?: string,
  random: () => number = Math.random,
) {
  if (currentResults.length === 0) return undefined;
  const candidates =
    currentResults.length > 1 && previousPlaceId
      ? currentResults.filter((place) => place.id !== previousPlaceId)
      : currentResults;
  const index = Math.min(
    candidates.length - 1,
    Math.floor(random() * candidates.length),
  );
  return candidates[index];
}
