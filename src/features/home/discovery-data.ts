import type { ImageSource } from 'expo-image';

import type { PlaceSummary } from '@/contracts/place';

export type DiscoveryPlace = PlaceSummary & {
  image?: ImageSource;
  address: string;
  description: string;
  openingNote: string;
  popularPicks: { name: string; image: ImageSource }[];
};

const burgerImage = require('../../../assets/images/makanmana/ramly-burger.png');
const nasiLemakImage = require('../../../assets/images/makanmana/nasi-lemak.png');

export const heroImage = require('../../../assets/images/makanmana/char-kway-teow-hero.png');
export const HERO_SLIDE_INTERVAL_MS = 4500;
export const HERO_SLIDES = [
  {
    source: heroImage,
    label: 'Char kway teow with teh tarik',
  },
  {
    source: nasiLemakImage,
    label: 'Nasi lemak ayam berempah',
  },
  {
    source: burgerImage,
    label: 'Ramly burger special',
  },
] as const;

export function demoImageForPlace(
  placeId: string,
  categories: string[] = [],
): ImageSource | undefined {
  if (!placeId.startsWith('mock-')) return undefined;
  const normalized = categories.map((category) => category.toLowerCase());
  if (
    normalized.some(
      (category) => category.includes('noodle') || category.includes('cafe'),
    )
  ) {
    return heroImage;
  }
  if (
    normalized.some(
      (category) => category.includes('grill') || category.includes('burger'),
    )
  ) {
    return burgerImage;
  }
  return nasiLemakImage;
}

export const DISCOVERY_PLACES: DiscoveryPlace[] = [
  {
    id: 'jalan-21-burger',
    name: 'Jalan 21 Burger',
    subtitle: 'Ramly Special Double',
    coordinates: { latitude: 3.0449, longitude: 101.4456 },
    distanceMeters: 600,
    rating: 4.6,
    reviewCount: 1200,
    priceLevel: 1,
    isOpen: true,
    categories: ['Burger', 'Street food', 'Group-friendly'],
    image: burgerImage,
    address: 'Jalan 21, Taman Berkeley, Klang',
    description:
      'A Klang Valley supper favourite known for juicy double patties, a crisp-edged egg and a generous finish of smoky house sauce.',
    openingNote: 'Closes 2:00 AM',
    popularPicks: [
      { name: 'Special Double', image: burgerImage },
      { name: 'Cheesy Egg', image: burgerImage },
      { name: 'Loaded Set', image: burgerImage },
    ],
  },
  {
    id: 'nasi-lemak-antarabangsa',
    name: 'Nasi Lemak Antarabangsa',
    subtitle: 'Nasi Lemak Ayam Berempah',
    coordinates: { latitude: 3.1598, longitude: 101.7085 },
    distanceMeters: 750,
    rating: 4.5,
    reviewCount: 980,
    priceLevel: 2,
    isOpen: true,
    categories: ['Halal', 'Nasi lemak', 'Local favourite'],
    halalVerification: {
      sourceName: 'JAKIM directory',
      sourceUrl: 'https://www.halal.gov.my',
      verifiedAt: '2026-07-01',
      expiresAt: '2027-07-01',
    },
    image: nasiLemakImage,
    address: 'Kampung Baru, Kuala Lumpur',
    description:
      'Fragrant coconut rice with fiery sambal, crisp ikan bilis and deeply spiced ayam berempah, served well into the night.',
    openingNote: 'Closes 1:00 AM',
    popularPicks: [
      { name: 'Ayam Berempah', image: nasiLemakImage },
      { name: 'Sambal Sotong', image: nasiLemakImage },
      { name: 'Classic Set', image: nasiLemakImage },
    ],
  },
  {
    id: 'wok-and-walk',
    name: 'Wok & Walk',
    subtitle: 'Char Kway Teow',
    coordinates: { latitude: 3.1302, longitude: 101.6842 },
    distanceMeters: 900,
    rating: 4.4,
    reviewCount: 640,
    priceLevel: 1,
    isOpen: true,
    categories: ['Noodles', 'Supper', 'Quick bite'],
    image: nasiLemakImage,
    address: 'Brickfields, Kuala Lumpur',
    description:
      'Smoky wok-fired noodles made to order with a punchy savoury finish and the kind of late-night energy worth travelling for.',
    openingNote: 'Closes 12:30 AM',
    popularPicks: [
      { name: 'Char Kway Teow', image: nasiLemakImage },
      { name: 'Mee Goreng', image: nasiLemakImage },
      { name: 'Wok Special', image: nasiLemakImage },
    ],
  },
];

export function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) return `${distanceMeters} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export function formatReviews(reviewCount: number) {
  if (reviewCount >= 1000) return `${(reviewCount / 1000).toFixed(1)}k`;
  return `${reviewCount}`;
}

export function formatPrice(priceLevel?: number) {
  return priceLevel ? 'RM'.repeat(priceLevel) : 'Price unavailable';
}
