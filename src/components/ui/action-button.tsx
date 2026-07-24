import type { ComponentProps, ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontFamily } from '@/theme/tokens';

type ActionButtonProps = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  backgroundColor: string;
  color: string;
  borderColor?: string;
  testID?: string;
  trailing?: ReactNode;
};

export function ActionButton({
  label,
  icon,
  onPress,
  backgroundColor,
  color,
  borderColor = 'transparent',
  testID,
  trailing,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}>
      <View
        style={[
          styles.iconTile,
          {
            backgroundColor:
              borderColor === 'transparent'
                ? 'rgba(255,255,255,0.22)'
                : 'rgba(255,255,255,0.10)',
          },
        ]}>
        <Ionicons color={color} name={icon} size={19} />
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 8,
    paddingRight: 20,
  },
  iconTile: {
    width: 38,
    height: 38,
    alignItems: 'center',
    borderRadius: 11,
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    letterSpacing: 0.1,
    lineHeight: 20,
    textAlign: 'center',
  },
  trailing: { marginLeft: 'auto' },
});
