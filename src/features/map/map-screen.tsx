import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleMapsAttribution } from '@/components/google-maps-attribution';
import { PlaceCard } from '@/components/ui/place-card';
import type { Coordinates, PriceLevel } from '@/contracts/place';
import type { AreaSuggestion } from '@/contracts/search';
import { MapCanvas } from '@/features/map/map-canvas';
import { useSearch } from '@/features/search/search-provider';
import { i18n } from '@/i18n';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

const CATEGORIES = [
  { value: 'Malaysian', labelKey: 'mapCategoryMalaysian' },
  { value: 'Cafe', labelKey: 'mapCategoryCafe' },
  { value: 'Chinese', labelKey: 'mapCategoryChinese' },
  { value: 'Indian', labelKey: 'mapCategoryIndian' },
] as const;
const PRICES: PriceLevel[] = [1, 2, 3, 4];
const RADII = [1000, 3000, 5000, 10_000];

export function MapScreen() {
  const { colors } = useAppTheme();
  const {
    autocompleteArea,
    criteria,
    error,
    locationCanAskAgain,
    locationMessage,
    locationStatus,
    results,
    search,
    searchCurrentLocation,
    selectArea,
    status,
    surprise,
    surpriseMe,
    updateCriteriaAndSearch,
  } = useSearch();
  const [mapCenter, setMapCenter] = useState<Coordinates>(criteria.center);
  const [queryInput, setQueryInput] = useState(criteria.query ?? '');
  const [areaInput, setAreaInput] = useState(criteria.areaLabel);
  const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([]);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const openPlace = (placeId: string) => {
    router.push({ pathname: '/place/[id]', params: { id: placeId } });
  };

  const handleCurrentLocation = async () => {
    setSettingsError(null);
    if (locationCanAskAgain !== false) {
      await searchCurrentLocation();
      return;
    }
    try {
      await Linking.openSettings();
    } catch {
      setSettingsError(
        i18n.t('mapSettingsError'),
      );
    }
  };

  useEffect(() => {
    setMapCenter(criteria.center);
    setAreaInput(criteria.areaLabel);
  }, [criteria.areaLabel, criteria.center]);

  useEffect(() => {
    setQueryInput(criteria.query ?? '');
  }, [criteria.query]);

  useEffect(() => {
    let active = true;
    if (areaInput.trim().length < 2 || areaInput === criteria.areaLabel) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      void autocompleteArea(areaInput)
        .then((areas) => {
          if (active) setSuggestions(areas);
        })
        .catch(() => {
          if (active) setSuggestions([]);
        });
    }, 220);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [areaInput, autocompleteArea, criteria.areaLabel]);

  const submitQuery = () => {
    void updateCriteriaAndSearch({ query: queryInput.trim() });
  };

  const togglePrice = (price: PriceLevel) => {
    const priceLevels = criteria.priceLevels.includes(price)
      ? criteria.priceLevels.filter((item) => item !== price)
      : [...criteria.priceLevels, price];
    void updateCriteriaAndSearch({ priceLevels });
  };

  const toggleCategory = (category: string) => {
    const categories = criteria.categories.includes(category) ? [] : [category];
    void updateCriteriaAndSearch({ categories });
  };

  const cycleRadius = () => {
    const currentIndex = RADII.indexOf(criteria.radiusMeters);
    const radiusMeters = RADII[(currentIndex + 1) % RADII.length];
    void updateCriteriaAndSearch({ radiusMeters });
  };

  const chooseArea = (area: AreaSuggestion) => {
    setSuggestions([]);
    setAreaInput(area.label);
    void selectArea(area);
  };

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.resultHeader}>
        <View style={styles.resultCopy}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {i18n.t('mapResultsTitle')}
          </Text>
          <Text style={{ color: colors.textMuted }}>
            {i18n.t('mapResultCount', {
              count: results.length,
              spotLabel:
                results.length === 1 ? i18n.t('mapSpot') : i18n.t('mapSpots'),
              area: criteria.areaLabel,
            })}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel={i18n.t('mapSurpriseAccessibility')}
          accessibilityRole="button"
          disabled={results.length === 0}
          hitSlop={4}
          onPress={surpriseMe}
          style={[styles.surpriseButton, { backgroundColor: colors.accent }]}>
          <Text style={{ color: colors.accentText, fontWeight: '800' }}>
            {surprise ? i18n.t('mapTryAnother') : i18n.t('mapSurprise')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.filters}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}>
        <FilterChip
          active={criteria.openNow}
          label={i18n.t('mapFilterOpenNow')}
          onPress={() =>
            void updateCriteriaAndSearch({ openNow: !criteria.openNow })
          }
        />
        <FilterChip
          active={criteria.verifiedHalalOnly}
          label={i18n.t('mapFilterVerifiedHalal')}
          onPress={() =>
            void updateCriteriaAndSearch({
              verifiedHalalOnly: !criteria.verifiedHalalOnly,
            })
          }
        />
        <FilterChip
          active
          label={i18n.t('mapRadius', {
            distance: criteria.radiusMeters / 1000,
          })}
          onPress={cycleRadius}
        />
        {PRICES.map((price) => (
          <FilterChip
            key={price}
            active={criteria.priceLevels.includes(price)}
            label={Array.from({ length: price }, () => 'RM').join(' ')}
            onPress={() => togglePrice(price)}
          />
        ))}
        {CATEGORIES.map((category) => (
          <FilterChip
            key={category.value}
            active={criteria.categories.includes(category.value)}
            label={i18n.t(category.labelKey)}
            onPress={() => toggleCategory(category.value)}
          />
        ))}
      </ScrollView>

      {locationStatus === 'granted' ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.halal }}>
          {i18n.t('mapGpsReady')}
        </Text>
      ) : null}
      {locationMessage ? (
        <Text accessibilityRole="alert" style={{ color: colors.warning }}>
          {locationMessage}
        </Text>
      ) : null}
      {settingsError ? (
        <Text accessibilityRole="alert" style={{ color: colors.warning }}>
          {settingsError}
        </Text>
      ) : null}

      {locationStatus !== 'granted' ? (
        <View style={styles.gpsLegal}>
          <Text style={[styles.gpsPrivacy, { color: colors.textMuted }]}>
            {i18n.t('mapGpsPrivacy')}
          </Text>
          <TouchableOpacity
            accessibilityLabel={i18n.t('privacyAccessibility')}
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => router.push('/privacy')}
            style={styles.legalLinkButton}>
            <Text style={[styles.legalLink, { color: colors.accentForeground }]}>
              {i18n.t('privacy')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel={i18n.t('termsAccessibility')}
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => router.push('/terms')}
            style={styles.legalLinkButton}>
            <Text style={[styles.legalLink, { color: colors.accentForeground }]}>
              {i18n.t('terms')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {status === 'loading' ? (
        <ActivityIndicator
          accessibilityLabel={i18n.t('mapLoadingAccessibility')}
          color={colors.accentForeground}
        />
      ) : null}
      {status === 'error' ? (
        <View style={styles.state}>
          <Text accessibilityRole="alert" style={{ color: colors.warning }}>
            {error ?? i18n.t('mapLoadError')}
          </Text>
          <TouchableOpacity
            accessibilityLabel={i18n.t('mapTryAgainAccessibility')}
            accessibilityRole="button"
            onPress={() => void search()}
            style={styles.recoveryButton}>
            <Text style={{ color: colors.text }}>{i18n.t('mapTryAgain')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {status === 'empty' ? (
        <Text style={[styles.state, { color: colors.textMuted }]}>
          {i18n.t('mapEmpty')}
        </Text>
      ) : null}
      {surprise ? (
        <TouchableOpacity
          accessibilityLabel={i18n.t('mapOpenSurpriseAccessibility', {
            name: surprise.name,
          })}
          accessibilityRole="button"
          onPress={() => openPlace(surprise.id)}
          style={[
            styles.surpriseCard,
            { backgroundColor: colors.surfaceElevated },
          ]}>
          <Text style={[styles.cardName, { color: colors.text }]}>
            {i18n.t('mapTodayPick', { name: surprise.name })}
          </Text>
          <Text style={{ color: colors.textMuted }}>{surprise.subtitle}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View testID="map-pane" style={styles.mapPane}>
        <MapCanvas
          center={mapCenter}
          loading={status === 'loading'}
          onCenterChange={setMapCenter}
          onPlacePress={openPlace}
          onSearchArea={() =>
            void search({
              ...criteria,
              center: mapCenter,
              areaLabel: i18n.t('mapAreaLabel'),
            })
          }
          places={results}
          showsUserLocation={locationStatus === 'granted'}
        />

        <View
          style={[
            styles.searchOverlay,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <View style={styles.queryRow}>
            <TextInput
              accessibilityLabel={i18n.t('mapQueryAccessibility')}
              maxLength={120}
              onChangeText={setQueryInput}
              onSubmitEditing={submitQuery}
              placeholder={i18n.t('mapQueryPlaceholder')}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={[styles.queryInput, { color: colors.text }]}
              value={queryInput}
            />
            <TouchableOpacity
              accessibilityLabel={i18n.t('mapQuerySubmitAccessibility')}
              accessibilityRole="button"
              disabled={status === 'loading'}
              onPress={submitQuery}
              style={[styles.submitButton, { backgroundColor: colors.accent }]}>
              <Text style={{ color: colors.accentText, fontWeight: '900' }}>
                {i18n.t('mapQuerySubmit')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.areaRow}>
            <TextInput
              accessibilityLabel={i18n.t('mapAreaAccessibility')}
              onChangeText={setAreaInput}
              placeholder={i18n.t('mapAreaPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.areaInput,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={areaInput}
            />
            <TouchableOpacity
              accessibilityLabel={
                locationCanAskAgain === false
                  ? i18n.t('mapOpenLocationSettings')
                  : i18n.t('mapUseCurrentLocation')
              }
              accessibilityRole="button"
              disabled={locationStatus === 'requesting'}
              onPress={() => void handleCurrentLocation()}
              style={[
                styles.locationButton,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}>
              <Text style={{ color: colors.text, fontSize: 18 }}>
                {locationStatus === 'requesting' ? '…' : '◎'}
              </Text>
            </TouchableOpacity>
          </View>

          {suggestions.length > 0 ? (
            <View
              style={[
                styles.suggestions,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}>
              {suggestions.slice(0, 4).map((area) => (
                <TouchableOpacity
                  key={area.id}
                  accessibilityLabel={i18n.t('mapChooseArea', {
                    area: area.label,
                  })}
                  accessibilityRole="button"
                  onPress={() => chooseArea(area)}
                  style={[styles.suggestion, { borderColor: colors.border }]}>
                  <Text numberOfLines={1} style={{ color: colors.text }}>
                    {area.label}
                  </Text>
                  {area.secondaryLabel ? (
                    <Text
                      numberOfLines={1}
                      style={[styles.suggestionSecondary, { color: colors.textMuted }]}>
                      {area.secondaryLabel}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View testID="results-pane" style={styles.resultsPane}>
        <FlatList
          contentContainerStyle={styles.resultsContent}
          data={results}
          ItemSeparatorComponent={() => <View style={styles.resultGap} />}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(place) => place.id}
          ListFooterComponent={
            <View style={styles.attribution}>
              <GoogleMapsAttribution />
            </View>
          }
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <PlaceCard place={item} onPress={() => openPlace(item.id)} />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

function FilterChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      accessibilityLabel={i18n.t('mapFilterAccessibility', { label })}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={4}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.accent : colors.surface,
          borderColor: active ? colors.accent : colors.border,
        },
      ]}>
      <Text style={{ color: active ? colors.accentText : colors.text }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  mapPane: {
    flex: 47,
    minHeight: 0,
    position: 'relative',
  },
  resultsPane: {
    flex: 53,
    minHeight: 0,
  },
  searchOverlay: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    left: spacing.md,
    padding: spacing.sm,
    position: 'absolute',
    right: spacing.md,
    top: spacing.sm,
    zIndex: 2,
  },
  queryRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  queryInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  submitButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 48,
  },
  areaRow: { flexDirection: 'row', gap: spacing.xs },
  areaInput: {
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  locationButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  suggestions: {
    borderRadius: radius.md,
    borderWidth: 1,
    left: spacing.sm,
    overflow: 'hidden',
    position: 'absolute',
    right: spacing.sm,
    top: 98,
  },
  suggestion: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionSecondary: { fontSize: 12, marginTop: 2 },
  resultsContent: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  listHeader: {
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  resultHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  resultCopy: { flex: 1 },
  resultTitle: { fontSize: 20, fontWeight: '900' },
  surpriseButton: {
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filters: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  gpsLegal: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gpsPrivacy: { flex: 1, fontSize: 12 },
  legalLink: { fontSize: 12, fontWeight: '800' },
  legalLinkButton: { justifyContent: 'center', minHeight: 44 },
  recoveryButton: { justifyContent: 'center', minHeight: 44 },
  state: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  surpriseCard: { borderRadius: radius.md, gap: spacing.xs, padding: spacing.md },
  cardName: { fontSize: 17, fontWeight: '800' },
  resultGap: { height: spacing.md },
  attribution: { paddingTop: spacing.md },
});
