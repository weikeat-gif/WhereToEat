import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

const ICONS = {
  index: ['home-outline', 'home'],
  map: ['map-outline', 'map'],
  saved: ['bookmark-outline', 'bookmark'],
  profile: ['person-outline', 'person'],
} as const;

function AccessibleTabScene({ children }: PropsWithChildren) {
  const focused = useIsFocused();
  return (
    <View
      aria-hidden={!focused}
      accessibilityElementsHidden={!focused}
      importantForAccessibility={focused ? 'auto' : 'no-hide-descendants'}
      style={{ flex: 1 }}>
      {children}
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenLayout={({ children }) => (
        <AccessibleTabScene>{children}</AccessibleTabScene>
      )}
      screenOptions={({ route }) => {
        const icons = ICONS[route.name as keyof typeof ICONS] ?? ICONS.index;
        return {
          headerShown: false,
          tabBarActiveTintColor: colors.accentForeground,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.navBackground,
            borderTopColor: colors.border,
            height: 74,
            paddingTop: 8,
            paddingBottom: 10,
          },
          tabBarLabelStyle: { fontFamily: fontFamily.semibold, fontSize: 12 },
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={icons[focused ? 1 : 0]}
              size={size}
            />
          ),
        };
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
