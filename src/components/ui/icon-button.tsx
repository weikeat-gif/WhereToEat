import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

type IconButtonProps = {
  accessibilityLabel: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  color: string;
  backgroundColor: string;
  testID?: string;
  disabled?: boolean;
};

export function IconButton({
  accessibilityLabel,
  icon,
  onPress,
  color,
  backgroundColor,
  testID,
  disabled = false,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}>
      <Ionicons
        accessibilityElementsHidden
        accessible={false}
        color={color}
        importantForAccessibility="no-hide-descendants"
        name={icon}
        size={22}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    borderRadius: 22,
    justifyContent: 'center',
  },
});
