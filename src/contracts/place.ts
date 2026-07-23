export type PriceLevel = 1 | 2 | 3 | 4;

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type HalalVerification = {
  sourceName: string;
  sourceUrl: string;
  verifiedAt: string;
  expiresAt: string;
};

export type PlaceSummary = {
  id: string;
  name: string;
  subtitle: string;
  coordinates: Coordinates;
  distanceMeters: number;
  rating: number;
  reviewCount: number;
  priceLevel?: PriceLevel;
  isOpen?: boolean;
  photoUrl?: string;
  categories: string[];
  halalVerification?: HalalVerification;
};

export type PlaceDetails = PlaceSummary & {
  address: string;
  phoneNumber?: string;
  websiteUrl?: string;
  openingHours: string[];
  description?: string;
  photoUrls: string[];
};

export type SavedPlace = {
  userId: string;
  googlePlaceId: string;
  createdAt: string;
};
