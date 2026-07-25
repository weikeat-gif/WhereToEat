import type { ConfigContext, ExpoConfig } from 'expo/config';

type BuildEnvironment = Record<string, string | undefined>;

export function assertMapsBuildConfiguration(
  environment: BuildEnvironment,
): void {
  if (environment.EAS_BUILD !== 'true') return;

  const platform = environment.EAS_BUILD_PLATFORM;
  if (
    (platform === 'ios' || !platform) &&
    !environment.GOOGLE_MAPS_IOS_API_KEY
  ) {
    throw new Error(
      'GOOGLE_MAPS_IOS_API_KEY is required for an EAS iOS build.',
    );
  }
  if (
    (platform === 'android' || !platform) &&
    !environment.GOOGLE_MAPS_ANDROID_API_KEY
  ) {
    throw new Error(
      'GOOGLE_MAPS_ANDROID_API_KEY is required for an EAS Android build.',
    );
  }
}

export function assertLiveDataBuildConfiguration(
  environment: BuildEnvironment,
): void {
  const isEasBuild = environment.EAS_BUILD === 'true';
  const isEasUpdateWithEnvironment =
    environment.EXPO_NO_DOTENV === '1' && !isEasBuild;
  if (
    (!isEasBuild && !isEasUpdateWithEnvironment) ||
    (isEasBuild && environment.EAS_BUILD_PROFILE === 'development')
  ) {
    return;
  }
  if (environment.EXPO_PUBLIC_DATA_MODE !== 'live') {
    throw new Error(
      'EXPO_PUBLIC_DATA_MODE=live is required for release EAS builds and updates so demo restaurants cannot ship.',
    );
  }

  const required = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_PLACES_PROXY_URL',
  ] as const;
  const missing = required.filter((name) => !environment[name]);
  if (missing.length > 0) {
    throw new Error(
      `${missing.join(', ')} required for live Google Places discovery.`,
    );
  }
}

export function createMapsPlugin(
  environment: BuildEnvironment,
): NonNullable<ExpoConfig['plugins']>[number] | undefined {
  return environment.GOOGLE_MAPS_IOS_API_KEY ||
    environment.GOOGLE_MAPS_ANDROID_API_KEY
    ? [
        'react-native-maps',
        {
          ...(environment.GOOGLE_MAPS_IOS_API_KEY
            ? { iosGoogleMapsApiKey: environment.GOOGLE_MAPS_IOS_API_KEY }
            : {}),
          ...(environment.GOOGLE_MAPS_ANDROID_API_KEY
            ? {
                androidGoogleMapsApiKey:
                  environment.GOOGLE_MAPS_ANDROID_API_KEY,
              }
            : {}),
        },
      ]
    : undefined;
}

assertMapsBuildConfiguration(process.env);
assertLiveDataBuildConfiguration(process.env);
const mapsPlugin = createMapsPlugin(process.env);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'MakanMana',
  slug: 'makanmana',
  owner: 'holymoly0',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'makanmana',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.makanmana.app',
    icon: './assets/images/icon.png',
  },
  android: {
    package: 'com.makanmana.app',
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: '#FFF8E8',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
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
    ...(mapsPlugin ? [mapsPlugin] : []),
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'MakanMana sends your foreground location through our secure service to Google Maps to find nearby restaurants and build routes. We do not store precise GPS.',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFF8E8',
        dark: {
          backgroundColor: '#0B0D0C',
          image: './assets/images/splash-icon-dark.png',
        },
        image: './assets/images/splash-icon.png',
        imageWidth: 180,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId:
        process.env.EAS_PROJECT_ID ??
        'e6e92b04-c175-4b12-8461-1d60555438da',
    },
  },
});
