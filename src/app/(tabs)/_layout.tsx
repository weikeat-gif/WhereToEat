import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useAppTheme } from '@/theme/theme-provider';

const ICONS = {
  index: ['home-outline', 'home'],
  map: ['map-outline', 'map'],
  saved: ['bookmark-outline', 'bookmark'],
  profile: ['person-outline', 'person'],
} as const;

export default function TabsLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={({ route }) => {
        const icons = ICONS[route.name as keyof typeof ICONS] ?? ICONS.index;
        return {
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.navBackground,
            borderTopColor: colors.border,
            height: 74,
            paddingTop: 8,
            paddingBottom: 10,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
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
