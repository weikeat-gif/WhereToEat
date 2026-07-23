import { themeColors } from '@/theme/tokens';

function toRgb(hex: string) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function relativeLuminance(hex: string) {
  const channels = toRgb(hex).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string) {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme tokens', () => {
  it('keeps semantic label colours available in both themes', () => {
    for (const mode of ['light', 'dark'] as const) {
      expect(themeColors[mode].halal).toBeTruthy();
      expect(themeColors[mode].supper).toBeTruthy();
      expect(themeColors[mode].price).toBeTruthy();
      expect(themeColors[mode].cafe).toBeTruthy();
    }
  });

  it('keeps the day and dark surfaces distinct', () => {
    expect(themeColors.light.background).not.toBe(themeColors.dark.background);
    expect(themeColors.light.text).not.toBe(themeColors.dark.text);
  });

  it('keeps every small light-theme label above WCAG AA contrast', () => {
    const colors = themeColors.light;
    expect(contrast(colors.accentForeground, colors.background)).toBeGreaterThanOrEqual(
      4.5,
    );
    for (const semantic of [
      colors.halal,
      colors.supper,
      colors.price,
      colors.cafe,
    ]) {
      expect(contrast(semantic, colors.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
