import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'MakanMana',
  slug: 'makanmana',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'makanmana',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.makanmana.app',
    icon: './assets/expo.icon',
    config: process.env.GOOGLE_MAPS_IOS_API_KEY
      ? { googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY }
      : undefined,
  },
  android: {
    package: 'com.makanmana.app',
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: '#0B0D0C',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    config: process.env.GOOGLE_MAPS_ANDROID_API_KEY
      ? { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY } }
      : undefined,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-localization',
    'expo-secure-store',
    'expo-apple-authentication',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'MakanMana uses your location to find restaurants nearby.',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0B0D0C',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
