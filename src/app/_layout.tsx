import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppProviders } from '@/providers/app-providers';
import { useAppTheme } from '@/theme/theme-provider';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { resolvedMode } = useAppTheme();

  return (
    <>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="assistant" options={{ presentation: 'card' }} />
        <Stack.Screen name="place/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="directions/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="privacy" options={{ presentation: 'card' }} />
        <Stack.Screen name="terms" options={{ presentation: 'card' }} />
        <Stack.Screen name="delete-account" options={{ presentation: 'card' }} />
        <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

function AppFrame() {
  const { colors } = useAppTheme();
  const isWeb = Platform.OS === 'web';

  return (
    <View
      style={[
        styles.canvas,
        isWeb && { backgroundColor: colors.surfaceElevated },
      ]}>
      <View
        style={[
          styles.app,
          isWeb && {
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            maxWidth: 430,
            width: '100%',
          },
        ]}>
        <RootNavigator />
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AppProviders>
      <AppFrame />
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  canvas: { alignItems: 'center', flex: 1 },
  app: { flex: 1, width: '100%' },
});
