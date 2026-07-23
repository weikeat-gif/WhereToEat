import type {
  HalalVerification,
  PlaceDetails,
  PlaceSummary,
} from '@/contracts/place';
import type {
  AreaSuggestion,
  SearchCriteria,
  SearchResults,
} from '@/contracts/search';
import type { PlacesService } from '@/services/places/places-service';

const TRUSTED_HALAL_HOSTS = new Set(['halal.gov.my', 'www.halal.gov.my']);

const AREA_SUGGESTIONS: AreaSuggestion[] = [
  {
    id: 'kl-city-centre',
    label: 'Kuala Lumpur City Centre',
    secondaryLabel: 'Kuala Lumpur',
    coordinates: { latitude: 3.1579, longitude: 101.7123 },
  },
  {
    id: 'klang',
    label: 'Klang',
    secondaryLabel: 'Selangor',
    coordinates: { latitude: 3.0449, longitude: 101.4456 },
  },
  {
    id: 'petaling-jaya',
    label: 'Petaling Jaya',
    secondaryLabel: 'Selangor',
    coordinates: { latitude: 3.1073, longitude: 101.6067 },
  },
  {
    id: 'subang-jaya',
    label: 'Subang Jaya',
    secondaryLabel: 'Selangor',
    coordinates: { latitude: 3.0567, longitude: 101.5851 },
  },
  {
    id: 'shah-alam',
    label: 'Shah Alam',
    secondaryLabel: 'Selangor',
    coordinates: { latitude: 3.0733, longitude: 101.5185 },
  },
  {
    id: 'bangsar',
    label: 'Bangsar',
    secondaryLabel: 'Kuala Lumpur',
    coordinates: { latitude: 3.1292, longitude: 101.6784 },
  },
];

const JAKIM_FIXTURE: HalalVerification = {
  sourceName: 'JAKIM Halal Malaysia',
  sourceUrl: 'https://www.halal.gov.my/v4/',
  verifiedAt: '2026-06-01T00:00:00.000Z',
  expiresAt: '2027-06-01T00:00:00.000Z',
};

const MOCK_PLACES: PlaceDetails[] = [
  {
    id: 'mock-seri-klang-kitchen',
    name: 'Seri Klang Kitchen',
    subtitle: 'Malaysian favourites · Demo listing',
    coordinates: { latitude: 3.1468, longitude: 101.6952 },
    distanceMeters: 0,
    rating: 4.6,
    reviewCount: 482,
    priceLevel: 2,
    isOpen: true,
    categories: ['Malaysian', 'Nasi Lemak'],
    halalVerification: JAKIM_FIXTURE,
    address: 'Jalan Sultan Ismail, Kuala Lumpur',
    openingHours: ['Mon–Sun 08:00–22:30'],
    description: 'A mock Klang Valley listing used for local product demos.',
    photoUrls: [],
  },
  {
    id: 'mock-kopi-bukit-bintang',
    name: 'Kopi Bukit Bintang',
    subtitle: 'Coffee and toast · Demo listing',
    coordinates: { latitude: 3.1474, longitude: 101.7114 },
    distanceMeters: 0,
    rating: 4.4,
    reviewCount: 218,
    priceLevel: 1,
    isOpen: true,
    categories: ['Cafe', 'Breakfast'],
    halalVerification: JAKIM_FIXTURE,
    address: 'Bukit Bintang, Kuala Lumpur',
    openingHours: ['Mon–Sun 07:30–18:00'],
    photoUrls: [],
  },
  {
    id: 'mock-bangsar-leaf',
    name: 'Bangsar Leaf',
    subtitle: 'Plant-forward plates · Demo listing',
    coordinates: { latitude: 3.1301, longitude: 101.6736 },
    distanceMeters: 0,
    rating: 4.5,
    reviewCount: 164,
    priceLevel: 3,
    isOpen: false,
    categories: ['Vegetarian', 'Cafe'],
    address: 'Bangsar Baru, Kuala Lumpur',
    openingHours: ['Tue–Sun 10:00–21:00'],
    photoUrls: [],
  },
  {
    id: 'mock-pj-noodle-lab',
    name: 'PJ Noodle Lab',
    subtitle: 'Hand-pulled noodles · Demo listing',
    coordinates: { latitude: 3.1124, longitude: 101.6172 },
    distanceMeters: 0,
    rating: 4.3,
    reviewCount: 306,
    priceLevel: 2,
    isOpen: true,
    categories: ['Chinese', 'Noodles'],
    address: 'SS2, Petaling Jaya',
    openingHours: ['Mon–Sun 11:00–22:00'],
    photoUrls: [],
  },
  {
    id: 'mock-subang-spice-table',
    name: 'Subang Spice Table',
    subtitle: 'Rice and curries · Demo listing',
    coordinates: { latitude: 3.0508, longitude: 101.5802 },
    distanceMeters: 0,
    rating: 4.7,
    reviewCount: 521,
    priceLevel: 2,
    isOpen: true,
    categories: ['Indian', 'Malaysian'],
    halalVerification: JAKIM_FIXTURE,
    address: 'SS15, Subang Jaya',
    openingHours: ['Mon–Sun 10:30–23:00'],
    photoUrls: [],
  },
  {
    id: 'mock-shah-alam-grill',
    name: 'Shah Alam Night Grill',
    subtitle: 'Grilled plates · Demo listing',
    coordinates: { latitude: 3.0768, longitude: 101.5232 },
    distanceMeters: 0,
    rating: 4.2,
    reviewCount: 119,
    priceLevel: 2,
    isOpen: true,
    categories: ['Grill', 'Supper'],
    halalVerification: JAKIM_FIXTURE,
    address: 'Seksyen 9, Shah Alam',
    openingHours: ['Tue–Sun 17:00–01:00'],
    photoUrls: [],
  },
  {
    id: 'mock-klang-seafood-yard',
    name: 'Klang Seafood Yard',
    subtitle: 'Coastal-style seafood · Demo listing',
    coordinates: { latitude: 3.0412, longitude: 101.4488 },
    distanceMeters: 0,
    rating: 4.5,
    reviewCount: 389,
    priceLevel: 3,
    isOpen: false,
    categories: ['Seafood', 'Chinese'],
    address: 'Bandar Klang, Selangor',
    openingHours: ['Wed–Mon 17:30–23:30'],
    photoUrls: [],
  },
  {
    id: 'mock-damansara-bowl',
    name: 'Damansara Bowl Club',
    subtitle: 'Quick rice bowls · Demo listing',
    coordinates: { latitude: 3.1341, longitude: 101.6235 },
    distanceMeters: 0,
    rating: 4.1,
    reviewCount: 94,
    priceLevel: 1,
    isOpen: true,
    categories: ['Japanese', 'Rice Bowls'],
    address: 'Damansara Utama, Petaling Jaya',
    openingHours: ['Mon–Sat 11:00–21:30'],
    photoUrls: [],
  },
];

export function hasTrustedHalalVerification(
  verification: HalalVerification | undefined,
  now = new Date(),
): verification is HalalVerification {
  if (
    !verification?.sourceName.trim() ||
    !verification.sourceUrl.trim() ||
    !verification.verifiedAt.trim() ||
    !verification.expiresAt.trim()
  ) {
    return false;
  }

  try {
    const sourceUrl = new URL(verification.sourceUrl);
    const verifiedAt = new Date(verification.verifiedAt);
    const expiresAt = new Date(verification.expiresAt);

    return (
      sourceUrl.protocol === 'https:' &&
      TRUSTED_HALAL_HOSTS.has(sourceUrl.hostname.toLowerCase()) &&
      verification.sourceName === 'JAKIM Halal Malaysia' &&
      Number.isFinite(verifiedAt.getTime()) &&
      Number.isFinite(expiresAt.getTime()) &&
      verifiedAt.getTime() <= now.getTime() &&
      expiresAt.getTime() >= now.getTime()
    );
  } catch {
    return false;
  }
}

export function distanceInMeters(
  from: SearchCriteria['center'],
  to: SearchCriteria['center'],
) {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return Math.round(
    earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)),
  );
}

function matchesCriteria(place: PlaceSummary, criteria: SearchCriteria) {
  const normalizedCategories = criteria.categories.map((category) =>
    category.toLocaleLowerCase(),
  );
  const categoriesMatch =
    normalizedCategories.length === 0 ||
    place.categories.some((category) =>
      normalizedCategories.includes(category.toLocaleLowerCase()),
    );

  return (
    place.distanceMeters <= criteria.radiusMeters &&
    (!criteria.openNow || place.isOpen === true) &&
    (criteria.priceLevels.length === 0 ||
      (place.priceLevel !== undefined &&
        criteria.priceLevels.includes(place.priceLevel))) &&
    categoriesMatch &&
    (!criteria.verifiedHalalOnly ||
      hasTrustedHalalVerification(place.halalVerification))
  );
}

function toSummary(place: PlaceDetails, criteria: SearchCriteria): PlaceSummary {
  return {
    id: place.id,
    name: place.name,
    subtitle: place.subtitle,
    coordinates: place.coordinates,
    distanceMeters: distanceInMeters(criteria.center, place.coordinates),
    rating: place.rating,
    reviewCount: place.reviewCount,
    priceLevel: place.priceLevel,
    isOpen: place.isOpen,
    photoUrl: place.photoUrl,
    categories: place.categories,
    halalVerification: hasTrustedHalalVerification(place.halalVerification)
      ? place.halalVerification
      : undefined,
  };
}

export class MockPlacesService implements PlacesService {
  async autocompleteArea(input: string, _sessionToken: string) {
    const normalizedInput = input.trim().toLocaleLowerCase();
    if (normalizedInput.length < 2) return [];

    return AREA_SUGGESTIONS.filter((area) =>
      `${area.label} ${area.secondaryLabel ?? ''}`
        .toLocaleLowerCase()
        .includes(normalizedInput),
    ).slice(0, 5);
  }

  async searchNearby(criteria: SearchCriteria): Promise<SearchResults> {
    const places = MOCK_PLACES.map((place) => toSummary(place, criteria))
      .filter((place) => matchesCriteria(place, criteria))
      .sort((left, right) => left.distanceMeters - right.distanceMeters);

    return {
      criteria: {
        ...criteria,
        center: { ...criteria.center },
        priceLevels: [...criteria.priceLevels],
        categories: [...criteria.categories],
      },
      places,
      fetchedAt: new Date().toISOString(),
    };
  }

  async getPlaceDetails(placeId: string) {
    const place = MOCK_PLACES.find((candidate) => candidate.id === placeId);
    if (!place) throw new Error(`Place not found: ${placeId}`);
    return { ...place, photoUrls: [...place.photoUrls] };
  }
}
