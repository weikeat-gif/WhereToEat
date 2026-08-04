import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, {
  Marker,
  Polygon,
  PROVIDER_GOOGLE,
  type Details,
  type MapStyleElement,
  type Region,
} from 'react-native-maps';

import type { MapCanvasProps } from '@/features/map/map-canvas';
import { clusterPlaces } from '@/features/map/map-clusters';
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
  focusedAreaBoundary,
  places,
  onViewportChange,
  onMapPress,
  onPlacePress,
  selectedPlaceId,
  showsUserLocation,
  userCoordinates,
}: MapCanvasProps) {
  const { colors, resolvedMode } = useAppTheme();
  const mapRef = useRef<MapView>(null);
  const [mapLaidOut, setMapLaidOut] = useState(false);
  const [visibleRegion, setVisibleRegion] = useState<Region>({
    ...center,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LATITUDE_DELTA,
  });
  const zoom = Math.log2(360 / Math.max(visibleRegion.longitudeDelta, 0.00001));
  const clusters = useMemo(() => clusterPlaces(places, zoom), [places, zoom]);
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
    if (
      !centerChangedExternally ||
      focusedAreaBounds ||
      focusedAreaBoundary
    ) {
      return;
    }

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
  }, [center, focusedAreaBoundary, focusedAreaBounds]);

  useEffect(() => {
    if (!mapLaidOut) return;
    const boundaryCoordinates = focusedAreaBoundary?.polygons.flatMap(
      (polygon) => polygon.outer,
    );
    if (!boundaryCoordinates?.length && !focusedAreaBounds) return;
    mapRef.current?.fitToCoordinates(
      boundaryCoordinates?.length
        ? boundaryCoordinates
        : [
            focusedAreaBounds!.northEast,
            {
              latitude: focusedAreaBounds!.northEast.latitude,
              longitude: focusedAreaBounds!.southWest.longitude,
            },
            focusedAreaBounds!.southWest,
            {
              latitude: focusedAreaBounds!.southWest.latitude,
              longitude: focusedAreaBounds!.northEast.longitude,
            },
          ],
      {
        edgePadding: { top: 104, right: 32, bottom: 152, left: 32 },
        animated: true,
      },
    );
  }, [focusedAreaBoundary, focusedAreaBounds, mapLaidOut]);

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
    setVisibleRegion(region);
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
        {focusedAreaBoundary?.polygons.map((polygon, index) => (
          <Polygon
            key={`${focusedAreaBoundary.sourceUrl}-${index}`}
            coordinates={polygon.outer}
            holes={polygon.holes}
            fillColor={`${colors.accent}2E`}
            strokeColor={colors.accentForeground}
            strokeWidth={3}
          />
        ))}
        {clusters.map((cluster) => {
          if (cluster.places.length > 1) {
            const selected = cluster.placeIds.includes(selectedPlaceId ?? '');
            return (
              <Marker
                key={cluster.id}
                accessibilityLabel={`${cluster.places.length} restaurants${selected ? ', including the selected restaurant' : ''}. Double tap to zoom in.`}
                coordinate={cluster.coordinate}
                stopPropagation
                onPress={() =>
                  mapRef.current?.animateToRegion(
                    {
                      ...cluster.coordinate,
                      latitudeDelta: Math.max(visibleRegion.latitudeDelta / 2.5, 0.002),
                      longitudeDelta: Math.max(visibleRegion.longitudeDelta / 2.5, 0.002),
                    },
                    300,
                  )
                }>
                <View
                  style={[
                    styles.clusterMarker,
                    selected && styles.clusterMarkerSelected,
                  ]}>
                  <Text style={styles.clusterCount}>{cluster.places.length}</Text>
                </View>
              </Marker>
            );
          }
          const place = cluster.places[0];
          const selected = place.id === selectedPlaceId;
          return (
            <Marker
            key={`${place.id}-${selected ? 'selected' : 'default'}`}
            accessibilityLabel={i18n.t('mapPinAccessibility', {
              name: place.name,
              distance: Math.round(place.distanceMeters),
            })}
            coordinate={place.coordinates}
            description={place.subtitle}
            onPress={() => onPlacePress(place.id)}
            stopPropagation
            title={place.name}
            tracksViewChanges={false}>
            <View style={[styles.marker, selected && styles.markerSelected]}>
              <View style={[styles.markerHead, selected && styles.markerHeadSelected]}>
                <View style={styles.markerCore}>
                  <Ionicons color="#171C1B" name="restaurant" size={16} />
                </View>
              </View>
              <View style={styles.markerTail} />
            </View>
          </Marker>
          );
        })}
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
  markerSelected: { transform: [{ scale: 1.16 }] },
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
  markerHeadSelected: { borderColor: '#C6FF00', borderWidth: 4 },
  clusterMarker: {
    alignItems: 'center',
    backgroundColor: '#C6FF00',
    borderColor: '#171C1B',
    borderRadius: 24,
    borderWidth: 3,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  clusterCount: { color: '#171C1B', fontSize: 15, fontWeight: '700' },
  clusterMarkerSelected: { borderColor: '#E64B3C', borderWidth: 5 },
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
