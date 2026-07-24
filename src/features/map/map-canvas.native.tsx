import { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';

import type { PlaceSummary } from '@/contracts/place';
import type { MapCanvasProps } from '@/features/map/map-canvas';
import { i18n } from '@/i18n';
import { hasTrustedHalalVerification } from '@/services/places/mock-places-service';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

const LATITUDE_DELTA = 0.075;

function pinColor(place: PlaceSummary, colors: ReturnType<typeof useAppTheme>['colors']) {
  if (hasTrustedHalalVerification(place.halalVerification)) return colors.halal;
  if (place.categories.some((category) => category.toLowerCase() === 'cafe')) {
    return colors.cafe;
  }
  return colors.supper;
}

export function MapCanvas({
  center,
  places,
  loading,
  onCenterChange,
  onSearchArea,
  onPlacePress,
  showsUserLocation,
}: MapCanvasProps) {
  const { colors } = useAppTheme();
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
            pinColor={pinColor(place, colors)}
            title={place.name}
          />
        ))}
      </MapView>
      <TouchableOpacity
        accessibilityLabel={i18n.t('mapSearchAreaAccessibility')}
        accessibilityRole="button"
        disabled={loading}
        onPress={onSearchArea}
        style={[styles.searchButton, { backgroundColor: colors.accent }]}>
        <Text style={{ color: colors.accentText, fontWeight: '800' }}>
          {loading ? i18n.t('mapSearching') : i18n.t('mapSearchArea')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  searchButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: radius.pill,
    bottom: spacing.md,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    position: 'absolute',
  },
});
