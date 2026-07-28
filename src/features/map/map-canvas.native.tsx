import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type MapStyleElement,
  type Region,
} from 'react-native-maps';

import type { MapCanvasProps } from '@/features/map/map-canvas';
import { i18n } from '@/i18n';
import { useAppTheme } from '@/theme/theme-provider';

const LATITUDE_DELTA = 0.075;
const brandMark = require('../../../assets/images/brand/makanmana-mark-tight.png');
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
  places,
  onCenterChange,
  onMapPress,
  onPlacePress,
  showsUserLocation,
}: MapCanvasProps) {
  const { colors, resolvedMode } = useAppTheme();
  const mapRef = useRef<MapView>(null);
  const lastRegionCenterRef = useRef(center);

  useEffect(() => {
    const previousCenter = lastRegionCenterRef.current;
    const centerChangedExternally =
      Math.abs(previousCenter.latitude - center.latitude) > 0.00001 ||
      Math.abs(previousCenter.longitude - center.longitude) > 0.00001;
    if (!centerChangedExternally) return;

    lastRegionCenterRef.current = center;
    mapRef.current?.animateToRegion(
      {
        ...center,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LATITUDE_DELTA,
      },
      350,
    );
  }, [center]);

  const handleRegionChange = (region: Region) => {
    const nextCenter = {
      latitude: region.latitude,
      longitude: region.longitude,
    };
    const previousCenter = lastRegionCenterRef.current;
    if (
      Math.abs(previousCenter.latitude - nextCenter.latitude) <= 0.00001 &&
      Math.abs(previousCenter.longitude - nextCenter.longitude) <= 0.00001
    ) {
      return;
    }

    lastRegionCenterRef.current = nextCenter;
    onCenterChange(nextCenter);
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
        onPress={onMapPress}
        onRegionChangeComplete={handleRegionChange}
        provider={PROVIDER_GOOGLE}
        showsCompass
        showsMyLocationButton={false}
        showsUserLocation={showsUserLocation}
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
            <Image
              accessibilityIgnoresInvertColors
              contentFit="contain"
              source={brandMark}
              style={styles.marker}
            />
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
});
