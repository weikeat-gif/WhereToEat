export type PriceLevel = 1 | 2 | 3 | 4;

export type PlacePriceRange = {
  currencyCode: string;
  start?: number;
  endExclusive?: number;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type CoordinateBounds = {
  northEast: Coordinates;
  southWest: Coordinates;
};

export type HalalVerification = {
  sourceName: string;
  sourceUrl: string;
  verifiedAt: string;
  expiresAt: string;
};

export type Promotion = {
  id: string;
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
  priceRange?: PlacePriceRange;
  isOpen?: boolean;
  photoUrl?: string;
  categories: string[];
  halalVerification?: HalalVerification;
  promotion?: Promotion;
};

export type PlaceDetails = PlaceSummary & {
  address: string;
  phoneNumber?: string;
  websiteUrl?: string;
  openingHours: string[];
  description?: string;
  photoUrls: string[];
  viewport?: CoordinateBounds;
};

export type SavedPlace = {
  userId: string;
  googlePlaceId: string;
  createdAt: string;
};
