import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/auth-provider';
import { useAppTheme } from '@/theme/theme-provider';
import type { ThemeMode } from '@/theme/tokens';

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
  const { user } = useAuth();

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
              {user?.email ?? user?.displayName ?? 'Browsing as guest'}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={user ? 'Manage account' : 'Sign in'}
            accessibilityRole="button"
            onPress={() => router.push('/auth')}
            style={({ pressed }) => [
              styles.accountButton,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.78 : 1,
              },
            ]}>
            <Text style={[styles.accountButtonText, { color: colors.accentText }]}>
              {user ? 'Manage' : 'Sign in'}
            </Text>
          </Pressable>
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
  content: { gap: 24, padding: 20, paddingBottom: 36 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  title: { fontSize: 38, fontWeight: '900', letterSpacing: -1.2, marginTop: 2 },
  avatar: {
    width: 52,
    height: 52,
    alignItems: 'center',
    borderRadius: 18,
    justifyContent: 'center',
  },
  account: {
    minHeight: 78,
    alignItems: 'center',
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 13,
  },
  accountIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    borderRadius: 15,
    justifyContent: 'center',
  },
  accountCopy: { flex: 1 },
  accountLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  accountValue: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  accountButton: {
    minHeight: 44,
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  accountButtonText: { fontSize: 13, fontWeight: '900' },
  preview: { borderRadius: 24, borderWidth: 1, gap: 22, padding: 20 },
  previewTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  previewTitle: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  previewChips: { flexDirection: 'row', gap: 8 },
  previewChip: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  previewChipText: { fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 21, fontWeight: '900' },
  sectionDescription: { fontSize: 14, lineHeight: 21, marginTop: 5 },
  options: { gap: 10 },
  option: {
    minHeight: 78,
    alignItems: 'center',
    borderRadius: 19,
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
  optionLabel: { fontSize: 16, fontWeight: '900' },
  optionDescription: { fontSize: 13, marginTop: 3 },
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
  noteText: { flex: 1, fontSize: 13, lineHeight: 19 },
  legal: { borderTopWidth: 1 },
  legalLink: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  legalText: { fontSize: 14, fontWeight: '800' },
});
