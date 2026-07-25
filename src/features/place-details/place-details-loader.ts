import type { ImageSource } from 'expo-image';

import { env } from '@/config/env';
import {
  demoImageForPlace,
  DISCOVERY_PLACES,
  type DiscoveryPlace,
} from '@/features/home/discovery-data';
import { placesService } from '@/services/places';
import type { PlacesService } from '@/services/places/places-service';

function pickImages(photoUrls: string[]) {
  const images: ImageSource[] = photoUrls
    .slice(0, 3)
    .map((uri) => ({ uri }));
  return images.map((image, index) => ({
    name: index === 0 ? 'Signature dish' : `Popular pick ${index + 1}`,
    image,
  }));
}

export async function loadDisplayPlace(
  id: string | undefined,
  service: PlacesService = placesService,
): Promise<DiscoveryPlace> {
  if (!id) throw new Error('Place ID is missing.');

  const fixture =
    env.EXPO_PUBLIC_DATA_MODE === 'mock'
      ? DISCOVERY_PLACES.find((candidate) => candidate.id === id)
      : undefined;
  if (fixture) return fixture;

  const details = await service.getPlaceDetails(id);
  const photoUrl = details.photoUrl ?? details.photoUrls[0];
  const image: ImageSource | undefined = photoUrl
    ? { uri: photoUrl }
    : demoImageForPlace(details.id, details.categories);

  return {
    ...details,
    image,
    address: details.address,
    description:
      details.description ??
      'Restaurant information supplied by Google Places.',
    openingNote: details.openingHours[0] ?? 'Hours unavailable',
    popularPicks: pickImages(details.photoUrls),
  };
}
