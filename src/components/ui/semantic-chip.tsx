import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontFamily } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

type SemanticChipProps = {
  label: string;
  icon: IconName;
  color: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
};

export function SemanticChip({
  label,
  icon,
  color,
  selected = false,
  onPress,
  testID,
}: SemanticChipProps) {
  const content = (
    <>
      <Ionicons color={color} name={icon} size={15} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </>
  );

  if (!onPress) {
    return (
      <View
        accessibilityLabel={label}
        style={[
          styles.chip,
          { borderColor: color, backgroundColor: `${color}${selected ? '24' : '12'}` },
        ]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: color,
          backgroundColor: `${color}${selected ? '2B' : '10'}`,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: { fontFamily: fontFamily.semibold, fontSize: 13 },
});
