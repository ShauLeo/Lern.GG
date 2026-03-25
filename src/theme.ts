export const Colors = {
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  accent: '#06B6D4',
  success: '#10B981',
  error: '#F43F5E',
  warning: '#F59E0B',

  bgLight: '#F5F3FF',
  surfaceLight: '#FFFFFF',
  borderLight: '#E5E7EB',
  textPrimaryLight: '#1E1B4B',
  textSecondaryLight: '#6B7280',

  bgDark: '#0D0D1A',
  surfaceDark: '#1A1A2E',
  borderDark: '#2D2D4A',
  textPrimaryDark: '#EEF2FF',
  textSecondaryDark: '#9CA3AF',
};

export function useTheme(dark: boolean) {
  return {
    bg: dark ? Colors.bgDark : Colors.bgLight,
    surface: dark ? Colors.surfaceDark : Colors.surfaceLight,
    border: dark ? Colors.borderDark : Colors.borderLight,
    textPrimary: dark ? Colors.textPrimaryDark : Colors.textPrimaryLight,
    textSecondary: dark ? Colors.textSecondaryDark : Colors.textSecondaryLight,
  };
}
