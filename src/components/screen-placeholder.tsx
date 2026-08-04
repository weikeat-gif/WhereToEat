import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

type ScreenPlaceholderProps = {
  title: string;
  description: string;
  children?: ReactNode;
  closeLabel?: string;
  onClose?: () => void;
};

export function ScreenPlaceholder({
  title,
  description,
  children,
  closeLabel,
  onClose,
}: ScreenPlaceholderProps) {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {onClose && closeLabel ? (
        <View style={styles.header}>
          <Pressable
            accessibilityLabel={closeLabel}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}>
            <Text style={[styles.closeText, { color: colors.text }]}>Close</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {description}
        </Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12 },
  closeButton: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  closeText: { fontFamily: fontFamily.medium, fontSize: 15 },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontFamily: fontFamily.display, fontSize: 38, marginBottom: 8 },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  },
});
