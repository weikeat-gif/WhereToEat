import type { Coordinates } from '@/contracts/place';

export type RoutePlan = {
  origin: Coordinates;
  destination: Coordinates;
  coordinates: Coordinates[];
  distanceMeters: number;
  durationSeconds: number;
  provider: 'google' | 'mock';
};

export type RouteRequest = {
  origin: Coordinates;
  destination: Coordinates;
  travelMode: 'DRIVE';
};
