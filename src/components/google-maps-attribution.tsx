import { Text, View } from 'react-native';

import { env } from '@/config/env';
import { useAppTheme } from '@/theme/theme-provider';

export function GoogleMapsAttribution() {
  const { resolvedMode } = useAppTheme();
  if (env.EXPO_PUBLIC_DATA_MODE !== 'live') return null;

  return (
    <View
      accessibilityLabel="Restaurant information provided by Google Maps"
      style={{ alignItems: 'flex-end', paddingHorizontal: 4 }}>
      <Text
        numberOfLines={1}
        style={{
          color: resolvedMode === 'dark' ? '#FFFFFF' : '#1F1F1F',
          fontSize: 12,
          fontWeight: '400',
        }}>
        Google Maps
      </Text>
    </View>
  );
}
