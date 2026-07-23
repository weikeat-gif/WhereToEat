import type { ComponentProps, ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

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
        { backgroundColor, borderColor, opacity: pressed ? 0.78 : 1 },
      ]}>
      <Ionicons color={color} name={icon} size={21} />
      <Text style={[styles.label, { color }]}>{label}</Text>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  label: { fontSize: 17, fontWeight: '800' },
});
