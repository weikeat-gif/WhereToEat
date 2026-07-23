import { themeColors } from '@/theme/tokens';

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
});
