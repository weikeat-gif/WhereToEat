import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { env } from '@/config/env';
import type { Coordinates, PlaceSummary } from '@/contracts/place';
import { i18n } from '@/i18n';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily, radius, spacing } from '@/theme/tokens';

export type MapCanvasProps = {
  center: Coordinates;
  places: PlaceSummary[];
  onCenterChange: (center: Coordinates) => void;
  onMapPress: () => void;
  onPlacePress: (placeId: string) => void;
  showsUserLocation: boolean;
};

type MapsListener = { remove(): void };
type MapsLatLng = { lat(): number; lng(): number };
type WebMap = {
  addListener(event: string, listener: () => void): MapsListener;
  getCenter(): MapsLatLng | undefined;
  setCenter(center: { lat: number; lng: number }): void;
};
type WebMarker = {
  addListener(event: string, listener: () => void): MapsListener;
  setMap(map: WebMap | null): void;
};
type GoogleMapsApi = {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => WebMap;
  Marker: new (options: Record<string, unknown>) => WebMarker;
};

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
    __makanManaGoogleMapsReady?: () => void;
  }
}

let mapsLoader: Promise<GoogleMapsApi> | undefined;

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

export function MapCanvas({
  center,
  places,
  onCenterChange,
  onMapPress,
  onPlacePress,
  showsUserLocation: _showsUserLocation,
}: MapCanvasProps) {
  const { colors } = useAppTheme();
  const hostRef = useRef<View>(null);
  const mapRef = useRef<WebMap | null>(null);
  const mapListenerRef = useRef<MapsListener | null>(null);
  const mapPressListenerRef = useRef<MapsListener | null>(null);
  const markerRefs = useRef<WebMarker[]>([]);
  const lastCenterRef = useRef(center);
  const latestCenterRef = useRef(center);
  const onCenterChangeRef = useRef(onCenterChange);
  const onMapPressRef = useRef(onMapPress);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const webKey = env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;
  latestCenterRef.current = center;

  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

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
        lastCenterRef.current = latestCenter;
        const map = new maps.Map(element, {
          center: {
            lat: latestCenter.latitude,
            lng: latestCenter.longitude,
          },
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          zoom: 14,
        });
        mapRef.current = map;
        mapListenerRef.current = map.addListener('idle', () => {
          const next = map.getCenter();
          if (!next) return;
          const nextCenter = {
            latitude: next.lat(),
            longitude: next.lng(),
          };
          if (!coordinatesChanged(lastCenterRef.current, nextCenter)) return;
          lastCenterRef.current = nextCenter;
          onCenterChangeRef.current(nextCenter);
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
      mapPressListenerRef.current?.remove();
      mapPressListenerRef.current = null;
      mapRef.current = null;
    };
  }, [retryNonce, webKey]);

  useEffect(() => {
    if (!mapRef.current || !coordinatesChanged(lastCenterRef.current, center)) {
      return;
    }
    lastCenterRef.current = center;
    mapRef.current.setCenter({
      lat: center.latitude,
      lng: center.longitude,
    });
  }, [center]);

  useEffect(() => {
    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = [];
    if (!mapReady || !mapRef.current || !window.google?.maps) return;

    const maps = window.google.maps;
    markerRefs.current = places.map((place) => {
      const marker = new maps.Marker({
        map: mapRef.current,
        position: {
          lat: place.coordinates.latitude,
          lng: place.coordinates.longitude,
        },
        title: place.name,
      });
      marker.addListener('click', () => onPlacePress(place.id));
      return marker;
    });

    return () => {
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];
    };
  }, [
    center.latitude,
    center.longitude,
    mapReady,
    onPlacePress,
    places,
  ]);

  return (
    <View
      accessibilityLabel={i18n.t('mapAccessibility')}
      style={[styles.container, { backgroundColor: colors.surfaceElevated }]}>
      <View ref={hostRef} style={StyleSheet.absoluteFill} />

      {!webKey || mapError ? (
        <>
          <Pressable
            accessibilityLabel={i18n.t('mapFocusAccessibility')}
            accessibilityRole="button"
            onPress={onMapPress}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.webNotice,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <Text style={[styles.webNoticeTitle, { color: colors.text }]}>
              {i18n.t('mapWebUnavailableTitle')}
            </Text>
            <Text style={[styles.webNoticeBody, { color: colors.textMuted }]}>
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
    borderRadius: radius.lg,
    borderWidth: 1,
    bottom: spacing.xl + 44,
    left: spacing.lg,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.lg,
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
});
