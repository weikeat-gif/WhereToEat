import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleMapsAttribution } from '@/components/google-maps-attribution';
import type { PlaceSummary } from '@/contracts/place';
import {
  applyFoodPreferences,
  buildMatchReason,
  type FoodPreferences,
  foodPreferenceKeysFor,
  understandFoodRequest,
} from '@/features/food-agent/food-agent-core';
import { useFoodPreferences } from '@/features/food-preferences/food-preferences-provider';
import { useSearch } from '@/features/search/search-provider';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

const QUICK_PROMPTS = [
  'Find halal food nearby',
  'Cheap Chinese food open now',
  'I feel like nasi lemak',
] as const;

function labelsFor(preferences: FoodPreferences) {
  const labels = [
    ...(preferences.categories ?? []),
    ...(preferences.query ? [preferences.query] : []),
    ...(preferences.halalOnly ? ['Halal only'] : []),
    ...(preferences.openNow ? ['Open now'] : []),
    ...(preferences.budgetApproximation
      ? [preferences.budgetApproximation]
      : preferences.priceLevels?.length
        ? ['Budget-friendly']
        : []),
    ...(preferences.radiusMeters
      ? [`Within ${preferences.radiusMeters / 1000} km`]
      : []),
    ...(preferences.taste
      ? [preferences.taste === 'spicy' ? 'Spicy' : 'Mild']
      : []),
  ];
  return labels.length > 0 ? labels : ['Nearby food'];
}

export function FoodAgentScreen() {
  const { colors } = useAppTheme();
  const { criteria, search } = useSearch();
  const { canPersist, preferenceKeys, rememberConfirmed } =
    useFoodPreferences();
  const [input, setInput] = useState('');
  const [message, setMessage] = useState(
    'Tell me what you feel like eating, your budget, distance, or dietary needs.',
  );
  const [pending, setPending] = useState<FoodPreferences | null>(null);
  const [recommendations, setRecommendations] = useState<PlaceSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRemembering, setIsRemembering] = useState(false);
  const [memoryMessage, setMemoryMessage] = useState<string | null>(null);
  const interactionVersion = useRef(0);
  const preferenceLabels = useMemo(
    () => (pending ? labelsFor(pending) : []),
    [pending],
  );
  const preferenceCandidates = useMemo(
    () =>
      pending
        ? foodPreferenceKeysFor(pending).filter(
            (key) => !preferenceKeys.has(key),
          )
        : [],
    [pending, preferenceKeys],
  );

  useEffect(
    () => () => {
      interactionVersion.current += 1;
    },
    [],
  );

  function interpretRequest(requestText: string) {
    interactionVersion.current += 1;
    setIsSearching(false);
    setMemoryMessage(null);
    const request = understandFoodRequest(requestText);
    setRecommendations([]);
    if (request.kind === 'out-of-scope') {
      setMessage(request.message);
      setPending(null);
      return;
    }
    setMessage('I picked up these preferences. Confirm them before I search.');
    setPending(request.preferences);
  }

  function submitInput() {
    const trimmed = input.trim();
    if (!trimmed) return;
    interpretRequest(trimmed);
    setInput('');
  }

  function choosePrompt(prompt: string) {
    setInput('');
    interpretRequest(prompt);
  }

  async function confirmSearch() {
    if (!pending || isSearching) return;
    const requestVersion = ++interactionVersion.current;
    setIsSearching(true);
    const confirmed = pending;
    let result;
    try {
      result = await search(applyFoodPreferences(criteria, confirmed));
    } catch {
      if (requestVersion !== interactionVersion.current) return;
      setIsSearching(false);
      setMessage('I could not search right now. Please try again.');
      return;
    }
    if (requestVersion !== interactionVersion.current) return;
    setIsSearching(false);
    if (!result) {
      setMessage('I could not search right now. Please try again.');
      return;
    }
    const topMatches = result.places.slice(0, 3);
    setRecommendations(topMatches);
    setMessage(
      topMatches.length > 0
        ? `Here are ${topMatches.length} nearby matches and why they fit.`
        : 'No nearby place matches all of those preferences yet. Try a wider distance or fewer filters.',
    );
  }

  async function rememberPreferences() {
    if (preferenceCandidates.length === 0 || isRemembering) return;
    setIsRemembering(true);
    try {
      const scope = await rememberConfirmed(preferenceCandidates);
      setMemoryMessage(
        scope === 'account'
          ? 'Saved to your food preferences.'
          : 'Remembered for this session. Sign in to save across devices.',
      );
    } catch {
      setMemoryMessage('I could not save those preferences. Please try again.');
    } finally {
      setIsRemembering(false);
    }
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.headerButton}>
            <Ionicons color={colors.text} name="chevron-back" size={25} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Ask MakanMana
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Food discovery only
            </Text>
          </View>
          <View
            accessibilityLabel="Food assistant"
            style={[styles.botMark, { backgroundColor: `${colors.accent}24` }]}>
            <Ionicons
              color={colors.accentForeground}
              name="sparkles"
              size={20}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.assistantRow}>
            <View
              style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Ionicons color={colors.accentText} name="restaurant" size={18} />
            </View>
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.bubble,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}>
              <Text style={[styles.message, { color: colors.text }]}>
                {message}
              </Text>
            </View>
          </View>

          <View style={styles.quickPrompts}>
            {QUICK_PROMPTS.map((prompt) => (
              <Pressable
                accessibilityRole="button"
                key={prompt}
                onPress={() => choosePrompt(prompt)}
                style={({ pressed }) => [
                  styles.quickPrompt,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <Text
                  style={[styles.quickPromptText, { color: colors.text }]}>
                  {prompt}
                </Text>
              </Pressable>
            ))}
          </View>

          {pending ? (
            <View
              style={[
                styles.confirmCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}>
              <Text style={[styles.confirmTitle, { color: colors.text }]}>
                Use these preferences?
              </Text>
              <View style={styles.preferenceList}>
                {preferenceLabels.map((label) => (
                  <View
                    key={label}
                    style={[
                      styles.preferenceChip,
                      { backgroundColor: `${colors.accent}1F` },
                    ]}>
                    <Text
                      style={[
                        styles.preferenceText,
                        { color: colors.accentForeground },
                      ]}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
              <Pressable
                accessibilityLabel="Find matching food"
                accessibilityRole="button"
                disabled={isSearching}
                onPress={() => void confirmSearch()}
                style={({ pressed }) => [
                  styles.confirmButton,
                  {
                    backgroundColor: colors.accent,
                    opacity: pressed || isSearching ? 0.72 : 1,
                  },
                ]}>
                {isSearching ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <Ionicons
                    color={colors.accentText}
                    name="search"
                    size={18}
                  />
                )}
                <Text
                  style={[styles.confirmButtonText, { color: colors.accentText }]}>
                  {isSearching ? 'Finding food…' : 'Find food'}
                </Text>
              </Pressable>
              {preferenceCandidates.length > 0 ? (
                <Pressable
                  accessibilityLabel="Remember these preferences"
                  accessibilityRole="button"
                  disabled={isRemembering}
                  onPress={() => void rememberPreferences()}
                  style={({ pressed }) => [
                    styles.rememberButton,
                    {
                      borderColor: colors.accentForeground,
                      opacity: pressed || isRemembering ? 0.65 : 1,
                    },
                  ]}>
                  <Ionicons
                    color={colors.accentForeground}
                    name="bookmark-outline"
                    size={17}
                  />
                  <Text
                    style={[
                      styles.rememberButtonText,
                      { color: colors.accentForeground },
                    ]}>
                    {isRemembering
                      ? 'Remembering…'
                      : canPersist
                        ? 'Save to my preferences'
                        : 'Remember for this session'}
                  </Text>
                </Pressable>
              ) : null}
              {memoryMessage ? (
                <View accessibilityLiveRegion="polite" style={styles.memoryNotice}>
                  <Text style={[styles.memoryText, { color: colors.textMuted }]}>
                    {memoryMessage}
                  </Text>
                  {!canPersist && memoryMessage.startsWith('Remembered') ? (
                    <Pressable
                      accessibilityLabel="Sign in to save preferences"
                      accessibilityRole="button"
                      onPress={() => router.push('/auth')}>
                      <Text
                        style={[
                          styles.memoryLink,
                          { color: colors.accentForeground },
                        ]}>
                        Sign in to save
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {recommendations.length > 0 ? (
            <View style={styles.results}>
              {recommendations.map((place) => (
                <Pressable
                  accessibilityHint="Opens restaurant details"
                  accessibilityRole="button"
                  key={place.id}
                  onPress={() =>
                    router.push({
                      pathname: '/place/[id]',
                      params: { id: place.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.resultCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}>
                  <View style={styles.resultCopy}>
                    <Text style={[styles.resultTitle, { color: colors.text }]}>
                      {place.name}
                    </Text>
                    <Text
                      style={[styles.resultSubtitle, { color: colors.textMuted }]}>
                      {buildMatchReason(place, pending ?? {})}
                    </Text>
                  </View>
                  <Ionicons
                    color={colors.accentForeground}
                    name="chevron-forward"
                    size={19}
                  />
                </Pressable>
              ))}
              <GoogleMapsAttribution />
            </View>
          ) : null}

          <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
            Chat preferences are not remembered unless you confirm using the
            save button.
          </Text>
        </ScrollView>

        <View
          style={[
            styles.composer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}>
          <TextInput
            accessibilityLabel="Tell MakanMana what food you want"
            maxLength={240}
            multiline
            onChangeText={setInput}
            onSubmitEditing={submitInput}
            placeholder="e.g. Halal Chinese, open now, within 3 km"
            placeholderTextColor={colors.textMuted}
            returnKeyType="send"
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={input}
          />
          <Pressable
            accessibilityLabel="Send food request"
            accessibilityRole="button"
            disabled={!input.trim()}
            onPress={submitInput}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: colors.accent,
                opacity: !input.trim() || pressed ? 0.55 : 1,
              },
            ]}>
            <Ionicons color={colors.accentText} name="arrow-up" size={20} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    minHeight: 66,
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: 18 },
  headerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    marginTop: 1,
  },
  botMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    borderRadius: 13,
    justifyContent: 'center',
  },
  content: { gap: 16, padding: 16, paddingBottom: 24 },
  assistantRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  avatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
  },
  bubble: {
    borderRadius: 16,
    borderTopLeftRadius: 5,
    borderWidth: 1,
    flex: 1,
    padding: 13,
  },
  message: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21 },
  quickPrompts: { gap: 8, paddingLeft: 44 },
  quickPrompt: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  quickPromptText: { fontFamily: fontFamily.medium, fontSize: 13 },
  confirmCard: { borderRadius: 18, borderWidth: 1, gap: 13, padding: 15 },
  confirmTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  preferenceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  preferenceChip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  preferenceText: { fontFamily: fontFamily.semibold, fontSize: 12 },
  confirmButton: {
    minHeight: 48,
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  confirmButtonText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  rememberButton: {
    minHeight: 44,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
  },
  rememberButtonText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  memoryNotice: { alignItems: 'center', gap: 7 },
  memoryText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  memoryLink: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  results: { gap: 9 },
  resultCard: {
    minHeight: 72,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 13,
  },
  resultCopy: { flex: 1 },
  resultTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  resultSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  privacyNote: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 17,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  composer: {
    alignItems: 'flex-end',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 9,
    padding: 12,
  },
  input: {
    maxHeight: 110,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    borderRadius: 16,
    justifyContent: 'center',
  },
});
