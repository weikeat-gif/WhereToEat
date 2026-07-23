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
    background: '#090B0A',
    surface: '#111412',
    surfaceElevated: '#181C19',
    navBackground: '#101311',
    text: '#F7F8F3',
    textMuted: '#A8AEA8',
    border: '#303630',
    accent: '#C6FF00',
    accentForeground: '#C6FF00',
    accentText: '#111500',
    success: '#7DE36B',
    warning: '#FFB020',
    halal: '#55C96F',
    supper: '#FF6B1A',
    cafe: '#27B7A5',
    price: '#F4BE35',
    mapWater: '#182126',
  },
  light: {
    background: '#FFF8E8',
    surface: '#FFFFFF',
    surfaceElevated: '#F6EFDF',
    navBackground: '#FFFCF5',
    text: '#171A18',
    textMuted: '#606760',
    border: '#DDD5C4',
    accent: '#B7EC00',
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
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;
