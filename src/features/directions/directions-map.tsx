import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { env } from '@/config/env';
import type { RoutePlan } from '@/contracts/route';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export type DirectionsMapProps = {
  destinationName: string;
  route: RoutePlan;
};

export function DirectionsMap({
  destinationName,
  route,
}: DirectionsMapProps) {
  const { colors } = useAppTheme();
  const webKey = env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;
  const mapUrl = webKey
    ? `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(webKey)}&origin=${route.origin.latitude},${route.origin.longitude}&destination=${route.destination.latitude},${route.destination.longitude}&mode=driving`
    : undefined;

  return (
    <View
      accessibilityLabel={`Route map to ${destinationName}`}
      style={[styles.root, { backgroundColor: colors.surfaceElevated }]}>
      {mapUrl
        ? createElement('iframe', {
            allowFullScreen: true,
            loading: 'lazy',
            referrerPolicy: 'no-referrer-when-downgrade',
            src: mapUrl,
            style: {
              border: 0,
              height: '100%',
              left: 0,
              position: 'absolute',
              top: 0,
              width: '100%',
            },
            title: `Google Maps directions to ${destinationName}`,
          })
        : null}
      {!mapUrl ? (
        <View
          style={[
            styles.webNotice,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Text style={[styles.webNoticeTitle, { color: colors.text }]}>
            Google route map is ready for your API key
          </Text>
          <Text style={{ color: colors.textMuted }}>
            Add EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY for an embedded Google map in
            this browser preview. The installed iPhone app uses its restricted
            native key.
          </Text>
          {route.provider === 'google' ? (
            <Text style={[styles.attribution, { color: colors.textMuted }]}>
              Route data by Google Maps
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 460, overflow: 'hidden' },
  webNotice: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    left: spacing.lg,
    padding: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: 150,
  },
  webNoticeTitle: { fontSize: 16, fontWeight: '900' },
  attribution: { fontSize: 12, marginTop: spacing.xs },
});
