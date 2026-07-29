import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type Details,
  type MapStyleElement,
  type Region,
} from 'react-native-maps';

import type { MapCanvasProps } from '@/features/map/map-canvas';
import {
  boundsForMapRegion,
  radiusForMapRegion,
} from '@/features/map/map-viewport';
import { i18n } from '@/i18n';
import { useAppTheme } from '@/theme/theme-provider';

const LATITUDE_DELTA = 0.075;
const FOOD_DISCOVERY_MAP_STYLE: MapStyleElement[] = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
];

const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#171C1B' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A9B0AC' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#171C1B' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#3A4140' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#202624' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#87908B' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2A302F' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#151A19' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#353C39' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#252B2A' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#101817' }],
  },
];

function mapStyleFor(mode: 'light' | 'dark'): MapStyleElement[] {
  return mode === 'dark'
    ? [...DARK_MAP_STYLE, ...FOOD_DISCOVERY_MAP_STYLE]
    : FOOD_DISCOVERY_MAP_STYLE;
}

export function MapCanvas({
  center,
  focusedAreaBounds,
  places,
  onViewportChange,
  onMapPress,
  onPlacePress,
  showsUserLocation,
  userCoordinates,
}: MapCanvasProps) {
  const { colors, resolvedMode } = useAppTheme();
  const mapRef = useRef<MapView>(null);
  const [mapLaidOut, setMapLaidOut] = useState(false);
  const lastRegionRef = useRef<Region>({
    ...center,
    latitudeDelta: 0,
    longitudeDelta: 0,
  });

  useEffect(() => {
    const previousCenter = lastRegionRef.current;
    const centerChangedExternally =
      Math.abs(previousCenter.latitude - center.latitude) > 0.00001 ||
      Math.abs(previousCenter.longitude - center.longitude) > 0.00001;
    if (!centerChangedExternally || focusedAreaBounds) return;

    lastRegionRef.current = {
      ...center,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LATITUDE_DELTA,
    };
    mapRef.current?.animateToRegion(
      {
        ...center,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LATITUDE_DELTA,
      },
      350,
    );
  }, [center, focusedAreaBounds]);

  useEffect(() => {
    if (!mapLaidOut || !focusedAreaBounds) return;
    mapRef.current?.fitToCoordinates(
      [
        focusedAreaBounds.northEast,
        {
          latitude: focusedAreaBounds.northEast.latitude,
          longitude: focusedAreaBounds.southWest.longitude,
        },
        focusedAreaBounds.southWest,
        {
          latitude: focusedAreaBounds.southWest.latitude,
          longitude: focusedAreaBounds.northEast.longitude,
        },
      ],
      {
        edgePadding: { top: 104, right: 32, bottom: 152, left: 32 },
        animated: true,
      },
    );
  }, [focusedAreaBounds, mapLaidOut]);

  const handleRegionChange = (region: Region, details: Details) => {
    const nextCenter = {
      latitude: region.latitude,
      longitude: region.longitude,
    };
    const previousRegion = lastRegionRef.current;
    if (
      Math.abs(previousRegion.latitude - nextCenter.latitude) <= 0.00001 &&
      Math.abs(previousRegion.longitude - nextCenter.longitude) <= 0.00001 &&
      Math.abs(previousRegion.latitudeDelta - region.latitudeDelta) <=
        0.00001 &&
      Math.abs(previousRegion.longitudeDelta - region.longitudeDelta) <=
        0.00001
    ) {
      return;
    }

    lastRegionRef.current = region;
    onViewportChange({
      center: nextCenter,
      radiusMeters: radiusForMapRegion(region),
      bounds: boundsForMapRegion(region),
    }, details.isGesture ? 'gesture' : 'programmatic');
  };

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <MapView
        ref={mapRef}
        accessibilityLabel={i18n.t('mapAccessibility')}
        initialRegion={{
          ...center,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LATITUDE_DELTA,
        }}
        customMapStyle={mapStyleFor(resolvedMode)}
        onLayout={() => setMapLaidOut(true)}
        onPress={onMapPress}
        onRegionChangeComplete={handleRegionChange}
        provider={PROVIDER_GOOGLE}
        showsCompass
        showsMyLocationButton={false}
        showsUserLocation={showsUserLocation && Boolean(userCoordinates)}
        style={StyleSheet.absoluteFill}>
        {places.map((place) => (
          <Marker
            key={place.id}
            accessibilityLabel={i18n.t('mapPinAccessibility', {
              name: place.name,
              distance: Math.round(place.distanceMeters),
            })}
            coordinate={place.coordinates}
            description={place.subtitle}
            onPress={() => onPlacePress(place.id)}
            title={place.name}
            tracksViewChanges={false}>
            <View style={styles.marker}>
              <View style={styles.markerHead}>
                <View style={styles.markerCore}>
                  <Ionicons color="#171C1B" name="restaurant" size={16} />
                </View>
              </View>
              <View style={styles.markerTail} />
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  marker: { height: 52, width: 40 },
  markerHead: {
    alignItems: 'center',
    backgroundColor: '#E64B3C',
    borderColor: '#171C1B',
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  markerCore: {
    alignItems: 'center',
    backgroundColor: '#C6FF00',
    borderColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 2,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  markerTail: {
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
