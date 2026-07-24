import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RoutePlan } from '@/contracts/route';
import { IconButton } from '@/components/ui/icon-button';
import { DirectionsMap } from '@/features/directions/directions-map';
import {
  DirectionsLocationError,
  loadDirections,
} from '@/features/directions/directions-loader';
import type { DiscoveryPlace } from '@/features/home/discovery-data';
import { formatDistance } from '@/features/home/discovery-data';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining === 0 ? `${hours} hr` : `${hours} hr ${remaining} min`;
}

export function DirectionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [place, setPlace] = useState<DiscoveryPlace>();
  const [route, setRoute] = useState<RoutePlan>();
  const [error, setError] = useState<string | null>(null);
  const [canOpenSettings, setCanOpenSettings] = useState(false);
  const [retryNeedsGps, setRetryNeedsGps] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCanOpenSettings(false);
    setRetryNeedsGps(false);
    try {
      const result = await loadDirections(id);
      setPlace(result.place);
      setRoute(result.route);
    } catch (loadError) {
      setPlace(undefined);
      setRoute(undefined);
      setCanOpenSettings(
        loadError instanceof DirectionsLocationError &&
          loadError.reason === 'denied' &&
          loadError.canAskAgain === false,
      );
      setRetryNeedsGps(loadError instanceof DirectionsLocationError);
      setError(
        loadError instanceof DirectionsLocationError ||
          loadError instanceof Error
          ? loadError.message
          : 'Unable to build this route.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  const openSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      setError(
        'Unable to open app settings. Open Settings on your phone and allow Location for MakanMana.',
      );
    }
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {place && route ? (
        <DirectionsMap destinationName={place.name} route={route} />
      ) : (
        <View style={styles.centerState}>
          {loading ? (
            <>
              <ActivityIndicator
                accessibilityLabel="Building route"
                color={colors.accentForeground}
                size="large"
              />
              <Text style={[styles.stateTitle, { color: colors.text }]}>
                Finding the best route…
              </Text>
              <Text style={[styles.stateCopy, { color: colors.textMuted }]}>
                Allow GPS access so MakanMana can start from your current
                location.
              </Text>
            </>
          ) : error ? (
            <>
              <Ionicons color={colors.warning} name="location-outline" size={38} />
              <Text accessibilityRole="alert" style={[styles.stateTitle, { color: colors.text }]}>
                Route unavailable
              </Text>
              <Text style={[styles.stateCopy, { color: colors.textMuted }]}>
                {error ?? 'Unable to build this route.'}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() =>
                  canOpenSettings
                    ? void openSettings()
                    : void refresh()
                }
                style={[styles.retryButton, { backgroundColor: colors.accent }]}>
                <Text style={{ color: colors.accentText, fontWeight: '900' }}>
                  {canOpenSettings
                    ? 'Open app settings'
                    : retryNeedsGps
                      ? 'Enable GPS and try again'
                      : 'Try again'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons
                color={colors.accentForeground}
                name="navigate-circle-outline"
                size={48}
              />
              <Text style={[styles.stateTitle, { color: colors.text }]}>
                Use GPS for this route
              </Text>
              <Text style={[styles.stateCopy, { color: colors.textMuted }]}>
                Your precise foreground location will be sent through
                MakanMana&apos;s Supabase service to Google Maps to calculate
                this driving route. We do not store your precise GPS location.
              </Text>
              <View style={styles.consentLinks}>
                <TouchableOpacity
                  accessibilityRole="link"
                  onPress={() => router.push('/privacy')}>
                  <Text style={{ color: colors.accentForeground, fontWeight: '800' }}>
                    Privacy notice
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="link"
                  onPress={() => router.push('/terms')}>
                  <Text style={{ color: colors.accentForeground, fontWeight: '800' }}>
                    Terms
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                accessibilityLabel="Allow GPS and build route"
                accessibilityRole="button"
                onPress={() => void refresh()}
                style={[styles.retryButton, { backgroundColor: colors.accent }]}>
                <Text style={{ color: colors.accentText, fontWeight: '900' }}>
                  Allow GPS & build route
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton
          accessibilityLabel="Go back"
          backgroundColor="rgba(8,10,9,0.82)"
          color="#FFFFFF"
          icon="chevron-back"
          onPress={() => router.back()}
        />
        <View style={styles.topCopy}>
          <Text
            style={[
              styles.eyebrow,
              !place && { color: colors.accentForeground },
            ]}>
            DRIVING ROUTE
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.topTitle, !place && { color: colors.text }]}>
            {place?.name ?? 'Directions'}
          </Text>
        </View>
      </View>

      {place && route ? (
        <View
          style={[
            styles.summary,
            {
              backgroundColor: colors.navBackground,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}>
          <View style={styles.metrics}>
            <View>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {formatDuration(route.durationSeconds)}
              </Text>
              <Text style={{ color: colors.textMuted }}>Estimated drive</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {formatDistance(route.distanceMeters)}
              </Text>
              <Text style={{ color: colors.textMuted }}>From your GPS</Text>
            </View>
          </View>
          <View
            style={[
              styles.destinationRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <Ionicons
              color={colors.supper}
              name="location"
              size={22}
            />
            <View style={styles.destinationCopy}>
              <Text style={[styles.destinationName, { color: colors.text }]}>
                {place.name}
              </Text>
              <Text
                numberOfLines={1}
                style={{ color: colors.textMuted }}>
                {place.address}
              </Text>
            </View>
          </View>
          <Text style={[styles.provider, { color: colors.textMuted }]}>
            {route.provider === 'google'
              ? 'Route by Google Maps'
              : 'Demo route · Google Routes activates in live mode'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  stateTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  stateCopy: { lineHeight: 22, maxWidth: 320, textAlign: 'center' },
  retryButton: {
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  consentLinks: { flexDirection: 'row', gap: spacing.lg },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: 0,
  },
  topCopy: { flex: 1 },
  eyebrow: {
    color: '#C6FF00',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  topTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  summary: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    bottom: 0,
    gap: spacing.md,
    left: 0,
    padding: spacing.lg,
    position: 'absolute',
    right: 0,
  },
  metrics: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xl,
  },
  metricValue: { fontSize: 24, fontWeight: '900' },
  divider: { height: 38, width: 1 },
  destinationRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  destinationCopy: { flex: 1 },
  destinationName: { fontSize: 16, fontWeight: '900' },
  provider: { fontSize: 12, textAlign: 'center' },
});
