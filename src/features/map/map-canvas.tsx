import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { env } from '@/config/env';
import type { Coordinates, PlaceSummary } from '@/contracts/place';
import type { AreaBoundary } from '@/contracts/search';
import { mapBoundsForAreaBoundary } from '@/features/map/area-boundary';
import {
  radiusForMapBounds,
  type MapBounds,
  type MapViewport,
} from '@/features/map/map-viewport';
import { i18n } from '@/i18n';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily, radius, spacing } from '@/theme/tokens';

export type MapCanvasProps = {
  center: Coordinates;
  focusedAreaBounds?: MapBounds;
  focusedAreaBoundary?: AreaBoundary;
  places: PlaceSummary[];
  onViewportChange: (
    viewport: MapViewport,
    source: 'gesture' | 'programmatic',
  ) => void;
  onMapPress: () => void;
  onPlacePress: (placeId: string) => void;
  showsUserLocation: boolean;
  userCoordinates?: Coordinates | null;
};

type MapsListener = { remove(): void };
type MapsLatLng = { lat(): number; lng(): number };
type MapsBounds = {
  getNorthEast(): MapsLatLng;
  getSouthWest(): MapsLatLng;
};
type WebMap = {
  addListener(event: string, listener: () => void): MapsListener;
  getBounds(): MapsBounds | undefined;
  getCenter(): MapsLatLng | undefined;
  fitBounds(
    bounds: { north: number; east: number; south: number; west: number },
    padding?: number,
  ): void;
  setCenter(center: { lat: number; lng: number }): void;
  setOptions?(options: Record<string, unknown>): void;
};
type WebMarker = {
  addListener(event: string, listener: () => void): MapsListener;
  setMap(map: WebMap | null): void;
};
type WebInfoWindow = {
  close(): void;
  open(options: {
    anchor: WebMarker;
    map: WebMap;
    shouldFocus: boolean;
  }): void;
  setContent(content: HTMLElement): void;
};
type WebInfoWindowOptions = {
  disableAutoPan?: boolean;
};
type WebPolygon = {
  setMap(map: WebMap | null): void;
};
type GoogleMapsApi = {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => WebMap;
  Marker: new (options: Record<string, unknown>) => WebMarker;
  InfoWindow: new (options?: WebInfoWindowOptions) => WebInfoWindow;
  Polygon?: new (options: Record<string, unknown>) => WebPolygon;
};

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
    __makanManaGoogleMapsReady?: () => void;
  }
}

let mapsLoader: Promise<GoogleMapsApi> | undefined;
const mapPreview = require('../../../assets/images/makanmana/kl-map-preview.png');
export const FOOD_PIN_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="42" height="54" viewBox="0 0 42 54">
    <path d="M21 52C18.2 45.7 5 34.3 5 21C5 11.6 12.2 4 21 4s16 7.6 16 17c0 13.3-13.2 24.7-16 31z" fill="#E64B3C" stroke="#171C1B" stroke-width="2.5"/>
    <circle cx="21" cy="21" r="11.5" fill="#C6FF00" stroke="#FFFFFF" stroke-width="2"/>
    <path d="M16.5 14v6.5M19 14v6.5M16.5 17h2.5M17.75 20.5V28M25 14v14M25 14c3.2 2.4 3.2 7 0 8.8" fill="none" stroke="#171C1B" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
  </svg>
`)}`;
export const USER_LOCATION_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="15" fill="#4285F4" fill-opacity=".2"/>
    <circle cx="17" cy="17" r="9" fill="#4285F4" stroke="#FFFFFF" stroke-width="3"/>
  </svg>
`)}`;
const PREVIEW_MARKER_POSITIONS = [
  { left: '20%', top: '24%' },
  { left: '65%', top: '31%' },
  { left: '42%', top: '46%' },
  { left: '74%', top: '56%' },
  { left: '28%', top: '66%' },
  { left: '54%', top: '75%' },
  { left: '82%', top: '42%' },
  { left: '13%', top: '50%' },
] as const;
const FOOD_DISCOVERY_MAP_STYLE = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
] as const;
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#171C1B' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A9B0AC' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#171C1B' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2A302F' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#353C39' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#202624' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#101817' }],
  },
];

function mapStyleFor(mode: 'light' | 'dark') {
  return mode === 'dark'
    ? [...DARK_MAP_STYLE, ...FOOD_DISCOVERY_MAP_STYLE]
    : [...FOOD_DISCOVERY_MAP_STYLE];
}

function loadGoogleMaps(apiKey: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Google Maps requires a browser.'));
  }
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsLoader) return mapsLoader;

  const attempt = new Promise<GoogleMapsApi>((resolve, reject) => {
    window.__makanManaGoogleMapsReady = () => {
      const maps = window.google?.maps;
      if (maps) resolve(maps);
      else reject(new Error('Google Maps did not finish loading.'));
    };

    const script = document.createElement('script');
    script.id = 'makanmana-google-maps-js';
    script.async = true;
    script.onerror = () => reject(new Error('Google Maps could not load.'));
    script.src =
      'https://maps.googleapis.com/maps/api/js' +
      `?key=${encodeURIComponent(apiKey)}` +
      '&loading=async&v=weekly&language=en&region=MY' +
      '&auth_referrer_policy=origin&callback=__makanManaGoogleMapsReady';
    document.head.appendChild(script);
  });
  mapsLoader = attempt.catch((error) => {
    mapsLoader = undefined;
    document.getElementById('makanmana-google-maps-js')?.remove();
    delete window.__makanManaGoogleMapsReady;
    throw error;
  });

  return mapsLoader;
}

function coordinatesChanged(left: Coordinates, right: Coordinates) {
  return (
    Math.abs(left.latitude - right.latitude) > 0.00001 ||
    Math.abs(left.longitude - right.longitude) > 0.00001
  );
}

function viewportChanged(left: MapViewport, right: MapViewport) {
  return (
    coordinatesChanged(left.center, right.center) ||
    Math.abs(left.radiusMeters - right.radiusMeters) > 25
  );
}

function webBounds(bounds: MapBounds) {
  return {
    north: bounds.northEast.latitude,
    east: bounds.northEast.longitude,
    south: bounds.southWest.latitude,
    west: bounds.southWest.longitude,
  };
}

function distanceBetween(left: Coordinates, right: Coordinates) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const startLatitude = radians(left.latitude);
  const endLatitude = radians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine)));
}

function formatMarkerDistance(distanceMeters: number) {
  if (distanceMeters < 1000) return `${distanceMeters} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatMarkerTime(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return new Intl.DateTimeFormat('en-MY', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kuala_Lumpur',
  }).format(date);
}

function markerPreviewContent(
  place: PlaceSummary,
  userCoordinates: Coordinates | null | undefined,
  mode: 'light' | 'dark',
) {
  const container = document.createElement('div');
  container.style.cssText = [
    `background:${mode === 'dark' ? '#171C1B' : '#FFFDF7'}`,
    `color:${mode === 'dark' ? '#FFFFFF' : '#171C1B'}`,
    'font-family:Manrope,system-ui,sans-serif',
    'max-width:220px',
    'padding:4px 2px',
  ].join(';');

  const title = document.createElement('strong');
  title.style.cssText = 'display:block;font-size:14px;line-height:19px';
  title.textContent = place.name;
  container.appendChild(title);

  const distanceMeters = userCoordinates
    ? distanceBetween(userCoordinates, place.coordinates)
    : Math.round(place.distanceMeters);
  const meta = document.createElement('span');
  meta.style.cssText = [
    'display:block',
    'font-size:12px',
    'line-height:18px',
    'margin-top:3px',
    `color:${mode === 'dark' ? '#D7DAD5' : '#5F6763'}`,
  ].join(';');
  const distanceLabel = userCoordinates ? 'from you' : 'away';
  const nextClose = formatMarkerTime(place.nextCloseTime);
  const nextOpen = formatMarkerTime(place.nextOpenTime);
  const openingLabel =
    place.isOpen === true
      ? `Open now${nextClose ? ` · Closes ${nextClose}` : ''}`
      : place.isOpen === false
        ? `Closed now${nextOpen ? ` · Opens ${nextOpen}` : ''}`
        : 'Hours unavailable';
  meta.textContent = `${formatMarkerDistance(distanceMeters)} ${distanceLabel} · ${openingLabel}`;
  container.appendChild(meta);
  return container;
}

export function MapCanvas({
  center,
  focusedAreaBounds,
  focusedAreaBoundary,
  places,
  onViewportChange,
  onMapPress,
  onPlacePress,
  showsUserLocation,
  userCoordinates,
}: MapCanvasProps) {
  const { colors, resolvedMode } = useAppTheme();
  const hostRef = useRef<View>(null);
  const mapRef = useRef<WebMap | null>(null);
  const mapListenerRef = useRef<MapsListener | null>(null);
  const mapDragListenerRef = useRef<MapsListener | null>(null);
  const mapPressListenerRef = useRef<MapsListener | null>(null);
  const mapWasDraggedRef = useRef(false);
  const markerRefs = useRef<WebMarker[]>([]);
  const polygonRefs = useRef<WebPolygon[]>([]);
  const lastViewportRef = useRef<MapViewport>({
    center,
    radiusMeters: 0,
  });
  const latestCenterRef = useRef(center);
  const latestResolvedModeRef = useRef(resolvedMode);
  const onViewportChangeRef = useRef(onViewportChange);
  const onMapPressRef = useRef(onMapPress);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const webKey = env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;
  latestCenterRef.current = center;
  latestResolvedModeRef.current = resolvedMode;

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    onMapPressRef.current = onMapPress;
  }, [onMapPress]);

  useEffect(() => {
    if (!webKey) return;
    let active = true;

    void loadGoogleMaps(webKey)
      .then((maps) => {
        if (!active || mapRef.current) return;
        const element = hostRef.current as unknown as HTMLElement | null;
        if (!element) throw new Error('Map container is unavailable.');
        const latestCenter = latestCenterRef.current;
        lastViewportRef.current = {
          ...lastViewportRef.current,
          center: latestCenter,
        };
        const map = new maps.Map(element, {
          center: {
            lat: latestCenter.latitude,
            lng: latestCenter.longitude,
          },
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          styles: mapStyleFor(latestResolvedModeRef.current),
          zoom: 14,
        });
        mapRef.current = map;
        mapDragListenerRef.current = map.addListener('dragstart', () => {
          mapWasDraggedRef.current = true;
        });
        mapListenerRef.current = map.addListener('idle', () => {
          const next = map.getCenter();
          if (!next) return;
          const nextCenter = {
            latitude: next.lat(),
            longitude: next.lng(),
          };
          const bounds = map.getBounds();
          const northEast = bounds?.getNorthEast();
          const southWest = bounds?.getSouthWest();
          const nextViewport = {
            center: nextCenter,
            radiusMeters:
              northEast && southWest
                ? radiusForMapBounds(
                    nextCenter,
                    {
                      latitude: northEast.lat(),
                      longitude: northEast.lng(),
                    },
                    {
                      latitude: southWest.lat(),
                      longitude: southWest.lng(),
                    },
                  )
                : 3000,
            bounds:
              northEast && southWest
                ? {
                    northEast: {
                      latitude: northEast.lat(),
                      longitude: northEast.lng(),
                    },
                    southWest: {
                      latitude: southWest.lat(),
                      longitude: southWest.lng(),
                    },
                  }
                : undefined,
          };
          const source = mapWasDraggedRef.current
            ? 'gesture'
            : 'programmatic';
          mapWasDraggedRef.current = false;
          if (!viewportChanged(lastViewportRef.current, nextViewport)) return;
          lastViewportRef.current = nextViewport;
          onViewportChangeRef.current(nextViewport, source);
        });
        mapPressListenerRef.current = map.addListener('click', () => {
          onMapPressRef.current();
        });
        setMapReady(true);
      })
      .catch(() => {
        if (active) setMapError(i18n.t('mapWebLoadError'));
      });

    return () => {
      active = false;
      mapListenerRef.current?.remove();
      mapListenerRef.current = null;
      mapDragListenerRef.current?.remove();
      mapDragListenerRef.current = null;
      mapPressListenerRef.current?.remove();
      mapPressListenerRef.current = null;
      polygonRefs.current.forEach((polygon) => polygon.setMap(null));
      polygonRefs.current = [];
      mapRef.current = null;
    };
  }, [retryNonce, webKey]);

  useEffect(() => {
    if (!webKey || mapReady || mapError) return;
    const timeout = setTimeout(() => {
      setMapError(i18n.t('mapWebLoadError'));
    }, 4000);
    return () => clearTimeout(timeout);
  }, [mapError, mapReady, retryNonce, webKey]);

  useEffect(() => {
    mapRef.current?.setOptions?.({
      styles: mapStyleFor(resolvedMode),
    });
  }, [resolvedMode]);

  useEffect(() => {
    const fitBounds =
      (focusedAreaBoundary
        ? mapBoundsForAreaBoundary(focusedAreaBoundary)
        : undefined) ?? focusedAreaBounds;
    if (!fitBounds || !mapReady || !mapRef.current) return;

    const bounds = webBounds(fitBounds);
    mapRef.current.fitBounds(bounds, 48);
  }, [focusedAreaBoundary, focusedAreaBounds, mapReady]);

  useEffect(() => {
    polygonRefs.current.forEach((polygon) => polygon.setMap(null));
    polygonRefs.current = [];
    const Polygon = window.google?.maps?.Polygon;
    if (!focusedAreaBoundary || !mapReady || !mapRef.current || !Polygon) {
      return;
    }
    polygonRefs.current = focusedAreaBoundary.polygons.map(
      (polygon) =>
        new Polygon({
          clickable: false,
          fillColor: colors.accent,
          fillOpacity: 0.18,
          map: mapRef.current,
          paths: [polygon.outer, ...polygon.holes].map((ring) =>
            ring.map((point) => ({
              lat: point.latitude,
              lng: point.longitude,
            })),
          ),
          strokeColor: colors.accentForeground,
          strokeOpacity: 0.9,
          strokeWeight: 3,
          zIndex: 1,
        }),
    );
    return () => {
      polygonRefs.current.forEach((polygon) => polygon.setMap(null));
      polygonRefs.current = [];
    };
  }, [
    colors.accent,
    colors.accentForeground,
    focusedAreaBoundary,
    mapReady,
  ]);

  useEffect(() => {
    if (
      !mapRef.current ||
      focusedAreaBounds ||
      focusedAreaBoundary ||
      !coordinatesChanged(lastViewportRef.current.center, center)
    ) {
      return;
    }
    lastViewportRef.current = {
      ...lastViewportRef.current,
      center,
    };
    mapRef.current.setCenter({
      lat: center.latitude,
      lng: center.longitude,
    });
  }, [center, focusedAreaBoundary, focusedAreaBounds]);

  useEffect(() => {
    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = [];
    if (!mapReady || !mapRef.current || !window.google?.maps) return;

    const maps = window.google.maps;
    const infoWindow =
      places.length > 0
        ? new maps.InfoWindow({ disableAutoPan: true })
        : undefined;
    const nextMarkers = places.map((place) => {
      const marker = new maps.Marker({
        map: mapRef.current,
        position: {
          lat: place.coordinates.latitude,
          lng: place.coordinates.longitude,
        },
        icon: FOOD_PIN_ICON_URL,
        title: place.name,
      });
      marker.addListener('mouseover', () => {
        infoWindow?.setContent(
          markerPreviewContent(place, userCoordinates, resolvedMode),
        );
        infoWindow?.open({
          anchor: marker,
          map: mapRef.current!,
          shouldFocus: false,
        });
      });
      marker.addListener('mouseout', () => infoWindow?.close());
      marker.addListener('click', () => {
        infoWindow?.close();
        onPlacePress(place.id);
      });
      return marker;
    });
    if (showsUserLocation && userCoordinates) {
      nextMarkers.push(
        new maps.Marker({
          icon: USER_LOCATION_ICON_URL,
          map: mapRef.current,
          position: {
            lat: userCoordinates.latitude,
            lng: userCoordinates.longitude,
          },
          title: i18n.t('mapCurrentLocation'),
          zIndex: 1000,
        }),
      );
    }
    markerRefs.current = nextMarkers;

    return () => {
      infoWindow?.close();
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];
    };
  }, [
    center.latitude,
    center.longitude,
    mapReady,
    onPlacePress,
    places,
    resolvedMode,
    showsUserLocation,
    userCoordinates,
  ]);

  return (
    <View
      accessibilityLabel={i18n.t('mapAccessibility')}
      style={[styles.container, { backgroundColor: colors.surfaceElevated }]}>
      <Image
        accessibilityIgnoresInvertColors
        contentFit="cover"
        source={mapPreview}
        style={StyleSheet.absoluteFill}
      />
      <View ref={hostRef} style={StyleSheet.absoluteFill} />

      {!webKey || mapError ? (
        <>
          <Pressable
            accessibilityLabel={i18n.t('mapFocusAccessibility')}
            accessibilityRole="button"
            onPress={onMapPress}
            style={StyleSheet.absoluteFill}
          />
          {places.slice(0, PREVIEW_MARKER_POSITIONS.length).map((place, index) => (
            <Pressable
              accessibilityLabel={i18n.t('mapPinAccessibility', {
                name: place.name,
                distance: Math.round(place.distanceMeters),
              })}
              accessibilityRole="button"
              key={place.id}
              onPress={() => onPlacePress(place.id)}
              style={[
                styles.previewMarker,
                PREVIEW_MARKER_POSITIONS[index],
              ]}>
              <View style={styles.previewMarkerHead}>
                <View style={styles.previewMarkerCore}>
                  <Ionicons color="#171C1B" name="restaurant" size={15} />
                </View>
              </View>
              <View style={styles.previewMarkerTail} />
            </Pressable>
          ))}
          <View
            style={[
              styles.webNotice,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <Text
              numberOfLines={1}
              style={[styles.webNoticeTitle, { color: colors.text }]}>
              {i18n.t('mapWebUnavailableTitle')}
            </Text>
            <Text
              numberOfLines={2}
              style={[styles.webNoticeBody, { color: colors.textMuted }]}>
              {mapError ?? i18n.t('mapWebUnavailableBody')}
            </Text>
            {mapError ? (
              <TouchableOpacity
                accessibilityLabel={i18n.t('mapTryAgain')}
                accessibilityRole="button"
                onPress={() => {
                  setMapError(null);
                  setRetryNonce((value) => value + 1);
                }}
                style={[
                  styles.retryButton,
                  { backgroundColor: colors.surfaceElevated },
                ]}>
                <Text style={{ color: colors.text, fontFamily: fontFamily.semibold }}>
                  {i18n.t('mapTryAgain')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webNotice: {
    borderRadius: radius.md,
    borderWidth: 1,
    left: spacing.lg,
    padding: spacing.sm,
    position: 'absolute',
    right: spacing.lg,
    top: 82,
  },
  webNoticeTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  webNoticeBody: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  previewMarker: {
    width: 40,
    height: 54,
    marginLeft: -20,
    marginTop: -27,
    position: 'absolute',
  },
  previewMarkerHead: {
    alignItems: 'center',
    backgroundColor: '#E64B3C',
    borderColor: '#171C1B',
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  previewMarkerCore: {
    alignItems: 'center',
    backgroundColor: '#C6FF00',
    borderColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 2,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  previewMarkerTail: {
    alignSelf: 'center',
    borderLeftColor: 'transparent',
    borderLeftWidth: 7,
    borderRightColor: 'transparent',
    borderRightWidth: 7,
    borderTopColor: '#E64B3C',
    borderTopWidth: 12,
    marginTop: -3,
  },
});
