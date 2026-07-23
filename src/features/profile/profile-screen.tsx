import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenPlaceholder } from '@/components/screen-placeholder';
import { useAppTheme } from '@/theme/theme-provider';
import type { ThemeMode } from '@/theme/tokens';

const MODES: ThemeMode[] = ['system', 'light', 'dark'];

export function ProfileScreen() {
  const { colors, mode, setMode } = useAppTheme();

  return (
    <ScreenPlaceholder
      title="Profile"
      description="Choose how MakanMana looks on this device.">
      <View style={styles.row}>
        {MODES.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === item }}
            key={item}
            onPress={() => setMode(item)}
            style={[
              styles.button,
              {
                backgroundColor:
                  mode === item ? colors.accent : colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}>
            <Text
              style={{
                color: mode === item ? colors.accentText : colors.text,
                fontWeight: '700',
                textTransform: 'capitalize',
              }}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScreenPlaceholder>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginTop: 24 },
  button: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
});
