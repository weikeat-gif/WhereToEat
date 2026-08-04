import { type ComponentProps, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/auth-provider';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily, type ThemeMode } from '@/theme/tokens';

type ModeOption = {
  mode: ThemeMode;
  label: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

const MODES: ModeOption[] = [
  {
    mode: 'system',
    label: 'System',
    description: 'Match this device',
    icon: 'phone-portrait-outline',
  },
  {
    mode: 'light',
    label: 'Light',
    description: 'Warm daytime canvas',
    icon: 'sunny-outline',
  },
  {
    mode: 'dark',
    label: 'Dark',
    description: 'Cinematic night hunt',
    icon: 'moon-outline',
  },
];

export function ProfileScreen() {
  const { colors, mode, resolvedMode, setMode } = useAppTheme();
  const { error, isBusy, signOut, updateDisplayName, user } = useAuth();
  const accountName =
    user?.displayName?.trim() ||
    user?.email?.split('@')[0]?.trim() ||
    'MakanMana diner';
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(accountName);
  const normalizedNameDraft = nameDraft.replace(/\s+/g, ' ').trim();
  const validName =
    normalizedNameDraft.length >= 2 && normalizedNameDraft.length <= 40;

  useEffect(() => {
    setNameDraft(accountName);
    setEditingName(false);
  }, [accountName, user?.id]);

  async function saveDisplayName() {
    try {
      await updateDisplayName(normalizedNameDraft);
      setEditingName(false);
    } catch {
      // AuthProvider exposes the user-facing error below the editor.
    }
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.accentForeground }]}>
              Your MakanMana
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Ionicons color={colors.accentText} name="person" size={28} />
          </View>
        </View>

        <View
          style={[
            styles.account,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <View style={styles.accountSummary}>
            <View
              style={[
                styles.accountIcon,
                { backgroundColor: colors.surfaceElevated },
              ]}>
              <Ionicons
                color={colors.accentForeground}
                name="person-outline"
                size={23}
              />
            </View>
            <View style={styles.accountCopy}>
              <Text style={[styles.accountLabel, { color: colors.textMuted }]}>
                ACCOUNT
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.accountValue, { color: colors.text }]}>
                {user ? accountName : 'Browsing as guest'}
              </Text>
              {user?.email ? (
                <Text
                  numberOfLines={1}
                  style={[styles.accountEmail, { color: colors.textMuted }]}>
                  {user.email}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel={user ? 'Edit display name' : 'Sign in'}
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => {
                if (user) {
                  setNameDraft(accountName);
                  setEditingName(true);
                } else {
                  router.push('/auth');
                }
              }}
              style={({ pressed }) => [
                styles.accountButton,
                {
                  backgroundColor: colors.accent,
                  opacity: isBusy ? 0.5 : pressed ? 0.78 : 1,
                },
              ]}>
              <Text
                style={[styles.accountButtonText, { color: colors.accentText }]}>
                {user ? 'Edit' : 'Sign in'}
              </Text>
            </Pressable>
          </View>

          {user && editingName ? (
            <View style={styles.nameEditor}>
              <TextInput
                accessibilityLabel="Display name"
                autoCapitalize="words"
                editable={!isBusy}
                maxLength={40}
                onChangeText={setNameDraft}
                placeholder="Your display name"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.nameInput,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={nameDraft}
              />
              <Text style={[styles.nameHint, { color: colors.textMuted }]}>
                Use 2–40 characters. This is how your account appears in
                MakanMana.
              </Text>
              <View style={styles.nameActions}>
                <Pressable
                  accessibilityLabel="Cancel editing display name"
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => {
                    setNameDraft(accountName);
                    setEditingName(false);
                  }}
                  style={[styles.nameAction, { borderColor: colors.border }]}>
                  <Text style={[styles.nameActionText, { color: colors.text }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Save display name"
                  accessibilityRole="button"
                  disabled={isBusy || !validName}
                  onPress={() => void saveDisplayName()}
                  style={[
                    styles.nameAction,
                    {
                      backgroundColor: colors.accent,
                      borderColor: colors.accent,
                      opacity: isBusy || !validName ? 0.5 : 1,
                    },
                  ]}>
                  <Text
                    style={[styles.nameActionText, { color: colors.accentText }]}>
                    Save name
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {user && error ? (
            <Text
              accessibilityRole="alert"
              style={[styles.accountError, { color: colors.warning }]}>
              {error}
            </Text>
          ) : null}

          {user ? (
            <Pressable
              accessibilityLabel="Sign out"
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => void signOut().catch(() => undefined)}
              style={({ pressed }) => [
                styles.signOutButton,
                {
                  borderColor: colors.border,
                  opacity: isBusy ? 0.5 : pressed ? 0.72 : 1,
                },
              ]}>
              <Ionicons color={colors.textMuted} name="log-out-outline" size={18} />
              <Text style={[styles.signOutText, { color: colors.textMuted }]}>
                Sign out
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View
          style={[
            styles.preview,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <View style={styles.previewTop}>
            <View>
              <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
                CURRENT APPEARANCE
              </Text>
              <Text style={[styles.previewTitle, { color: colors.text }]}>
                {resolvedMode === 'dark' ? 'Night hunt' : 'Day discovery'}
              </Text>
            </View>
            <Ionicons
              color={resolvedMode === 'dark' ? colors.supper : colors.warning}
              name={resolvedMode === 'dark' ? 'moon' : 'sunny'}
              size={29}
            />
          </View>
          <View style={styles.previewChips}>
            <View style={[styles.previewChip, { backgroundColor: `${colors.halal}1F` }]}>
              <Ionicons color={colors.halal} name="restaurant-outline" size={14} />
              <Text style={[styles.previewChipText, { color: colors.halal }]}>
                Halal
              </Text>
            </View>
            <View style={[styles.previewChip, { backgroundColor: `${colors.supper}1F` }]}>
              <Ionicons color={colors.supper} name="moon-outline" size={14} />
              <Text style={[styles.previewChipText, { color: colors.supper }]}>
                Supper
              </Text>
            </View>
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            Choose how the app looks. System follows your phone automatically.
          </Text>
        </View>

        <View
          accessibilityLabel="Theme selection"
          accessibilityRole="radiogroup"
          style={styles.options}>
          {MODES.map((option) => {
            const selected = mode === option.mode;
            return (
              <Pressable
                aria-checked={selected}
                accessibilityLabel={`${option.label} theme`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={option.mode}
                onPress={() => void setMode(option.mode)}
                testID={`theme-${option.mode}`}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: selected
                      ? `${colors.accent}18`
                      : colors.surface,
                    borderColor: selected
                      ? colors.accentForeground
                      : colors.border,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}>
                <View
                  style={[
                    styles.optionIcon,
                    {
                      backgroundColor: selected
                        ? colors.accentForeground
                        : colors.surfaceElevated,
                    },
                  ]}>
                  <Ionicons
                    color={selected ? colors.accentText : colors.text}
                    name={option.icon}
                    size={22}
                  />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                    {option.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? colors.accent : 'transparent',
                    },
                  ]}>
                  {selected && (
                    <Ionicons color={colors.accentText} name="checkmark" size={15} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View
          style={[
            styles.note,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}>
          <Ionicons color={colors.cafe} name="color-palette-outline" size={21} />
          <Text style={[styles.noteText, { color: colors.textMuted }]}>
            Food labels always include text and icons, so meaning never relies on
            colour alone.
          </Text>
        </View>

        <Text style={[styles.legalHeading, { color: colors.textMuted }]}>
          ABOUT &amp; LEGAL
        </Text>
        <View style={[styles.legal, { borderColor: colors.border }]}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/privacy')}
            style={styles.legalLink}>
            <Text style={[styles.legalText, { color: colors.text }]}>
              Privacy notice
            </Text>
            <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/terms')}
            style={styles.legalLink}>
            <Text style={[styles.legalText, { color: colors.text }]}>
              Terms of use
            </Text>
            <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { gap: 18, padding: 18, paddingBottom: 32 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    alignItems: 'center',
    borderRadius: 18,
    justifyContent: 'center',
  },
  account: {
    minHeight: 74,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 13,
  },
  accountSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  accountIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    borderRadius: 15,
    justifyContent: 'center',
  },
  accountCopy: { flex: 1 },
  accountLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    letterSpacing: 1,
  },
  accountValue: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    marginTop: 4,
  },
  accountEmail: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  accountButton: {
    minHeight: 44,
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  accountButtonText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  nameEditor: { gap: 8 },
  nameInput: {
    borderRadius: 13,
    borderWidth: 1,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  nameHint: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  nameActions: { flexDirection: 'row', gap: 8 },
  nameAction: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  nameActionText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  accountError: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18 },
  signOutButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  signOutText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  preview: { borderRadius: 18, borderWidth: 1, gap: 18, padding: 16 },
  previewTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    letterSpacing: 1,
  },
  previewTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    marginTop: 4,
  },
  previewChips: { flexDirection: 'row', gap: 8 },
  previewChip: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  previewChipText: { fontFamily: fontFamily.semibold, fontSize: 12 },
  sectionTitle: { fontFamily: fontFamily.semibold, fontSize: 18 },
  sectionDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },
  options: { gap: 10 },
  option: {
    minHeight: 72,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 13,
  },
  optionIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    borderRadius: 15,
    justifyContent: 'center',
  },
  optionCopy: { flex: 1, marginLeft: 13 },
  optionLabel: { fontFamily: fontFamily.semibold, fontSize: 16 },
  optionDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    marginTop: 3,
  },
  radio: {
    width: 24,
    height: 24,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
  },
  note: {
    alignItems: 'flex-start',
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  noteText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  legalHeading: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: -14,
  },
  legal: { borderTopWidth: 1 },
  legalLink: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  legalText: { fontFamily: fontFamily.semibold, fontSize: 14 },
});
