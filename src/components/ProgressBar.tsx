import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Colors, useTheme } from '../theme';

interface Props { current: number; total: number; color?: string; showLabel?: boolean }

export function ProgressBar({ current, total, color = Colors.primary, showLabel = true }: Props) {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const pct = total > 0 ? Math.min(current / total, 1) : 0;
  return (
    <View style={styles.wrapper}>
      <View style={[styles.track, { backgroundColor: dark ? '#2D2D4A' : '#E5E7EB' }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{current}/{total}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 10, borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
  label: { fontSize: 12, fontWeight: '600', minWidth: 40, textAlign: 'right' },
});
