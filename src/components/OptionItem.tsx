import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, useColorScheme } from 'react-native';
import { Colors, useTheme } from '../theme';

export type OptionState = 'default' | 'selected' | 'correct' | 'incorrect';

interface Props {
  label: string;
  text: string;
  state: OptionState;
  onPress: () => void;
  disabled?: boolean;
}

export function OptionItem({ label, text, state, onPress, disabled }: Props) {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);

  const stateColors = {
    default:   { border: theme.border,     bg: theme.surface,                        bubble: theme.border,       bubbleText: theme.textSecondary },
    selected:  { border: Colors.primary,   bg: dark ? '#1E1B4B' : '#EDE9FE',         bubble: Colors.primary,     bubbleText: '#fff' },
    correct:   { border: Colors.success,   bg: dark ? '#064E3B' : '#D1FAE5',         bubble: Colors.success,     bubbleText: '#fff' },
    incorrect: { border: Colors.error,     bg: dark ? '#4C0519' : '#FFE4E6',         bubble: Colors.error,       bubbleText: '#fff' },
  }[state];

  return (
    <TouchableOpacity
      style={[styles.row, { borderColor: stateColors.border, backgroundColor: stateColors.bg }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <View style={[styles.bubble, { backgroundColor: stateColors.bubble, borderColor: stateColors.border }]}>
        <Text style={[styles.bubbleText, { color: stateColors.bubbleText }]}>{label}</Text>
      </View>
      <Text style={[styles.text, { color: theme.textPrimary }]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  bubble: {
    width: 32,
    height: 32,
    borderRadius: 99,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bubbleText: { fontSize: 13, fontWeight: '700' },
  text: { flex: 1, fontSize: 15, lineHeight: 22 },
});
