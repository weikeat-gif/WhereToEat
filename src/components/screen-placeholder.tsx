import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/theme-provider';

type ScreenPlaceholderProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function ScreenPlaceholder({
  title,
  description,
  children,
}: ScreenPlaceholderProps) {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
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
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 34, fontWeight: '800', marginBottom: 8 },
  description: { fontSize: 16, lineHeight: 24 },
});
