import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

const ICONS = {
  index: ['home-outline', 'home'],
  map: ['search-outline', 'search'],
  saved: ['bookmark-outline', 'bookmark'],
  lists: ['calendar-outline', 'calendar'],
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
            height: 70,
            paddingTop: 7,
            paddingBottom: 9,
          },
          tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 10 },
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              accessibilityElementsHidden
              aria-hidden
              accessible={false}
              color={color}
              importantForAccessibility="no-hide-descendants"
              name={icons[focused ? 1 : 0]}
              size={size}
            />
          ),
        };
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="map" options={{ title: 'Search' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="lists" options={{ title: 'Plan' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
