import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from 'react-native-maps';

import type { DirectionsMapProps } from '@/features/directions/directions-map';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

const EDGE_PADDING = { top: 110, right: 44, bottom: 250, left: 44 };

export function DirectionsMap({
  destinationName,
  route,
}: DirectionsMapProps) {
  const { colors } = useAppTheme();
  const mapRef = useRef<MapView>(null);

  const fitRoute = useCallback(() => {
    if (route.coordinates.length < 2) return;
    mapRef.current?.fitToCoordinates(route.coordinates, {
      edgePadding: EDGE_PADDING,
      animated: true,
    });
  }, [route.coordinates]);

  useEffect(() => {
    const timeout = setTimeout(fitRoute, 250);
    return () => clearTimeout(timeout);
  }, [fitRoute]);

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        accessibilityLabel={`Google route map to ${destinationName}`}
        initialRegion={{
          ...route.origin,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        onMapReady={fitRoute}
        provider={PROVIDER_GOOGLE}
        showsCompass
        showsMyLocationButton={false}
        showsUserLocation
        style={StyleSheet.absoluteFill}>
        <Marker
          coordinate={route.origin}
          pinColor={colors.cafe}
          title="Your location"
        />
        <Marker
          coordinate={route.destination}
          pinColor={colors.supper}
          title={destinationName}
        />
        <Polyline
          coordinates={route.coordinates}
          lineCap="round"
          lineJoin="round"
          strokeColor={colors.accentForeground}
          strokeWidth={6}
        />
      </MapView>
      <TouchableOpacity
        accessibilityLabel="Fit the full route on the map"
        accessibilityRole="button"
        onPress={fitRoute}
        style={[
          styles.fitButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>Route</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fitButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    position: 'absolute',
    right: spacing.lg,
    top: 76,
  },
});
