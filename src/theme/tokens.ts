export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>;

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  navBackground: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentForeground: string;
  accentText: string;
  success: string;
  warning: string;
  halal: string;
  supper: string;
  cafe: string;
  price: string;
  mapWater: string;
};

export const themeColors: Record<ResolvedThemeMode, ThemeColors> = {
  dark: {
    background: '#0B0D0C',
    surface: '#141714',
    surfaceElevated: '#1B1F1B',
    navBackground: '#111411',
    text: '#F3F0E8',
    textMuted: '#AAAFA7',
    border: '#31362F',
    accent: '#C5E84A',
    accentForeground: '#C5E84A',
    accentText: '#182000',
    success: '#7DE36B',
    warning: '#FFB020',
    halal: '#55C96F',
    supper: '#FF6B1A',
    cafe: '#27B7A5',
    price: '#F4BE35',
    mapWater: '#182126',
  },
  light: {
    background: '#F6F1E7',
    surface: '#FFFCF6',
    surfaceElevated: '#F0E8DA',
    navBackground: '#FFFCF6',
    text: '#1D201B',
    textMuted: '#62645E',
    border: '#D9D0C2',
    accent: '#BCD94A',
    accentForeground: '#4F6600',
    accentText: '#151A00',
    success: '#2D8E46',
    warning: '#A96300',
    halal: '#126B30',
    supper: '#9B3500',
    cafe: '#006B61',
    price: '#7A5000',
    mapWater: '#CFEAF2',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

export const fontFamily = {
  display: 'Manrope_700Bold',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;
