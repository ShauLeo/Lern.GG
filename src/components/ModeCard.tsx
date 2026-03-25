import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, useColorScheme } from 'react-native';
import { Colors, useTheme } from '../theme';

interface Props {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}

export function ModeCard({ title, subtitle, icon, color, onPress, disabled }: Props) {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderLeftColor: color, opacity: disabled ? 0.38 : 1 },
        dark ? styles.cardShadowDark : styles.cardShadowLight,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.72}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      </View>
      <Text style={[styles.arrow, { color: theme.textSecondary }]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderLeftWidth: 5,
  },
  cardShadowLight: {
    shadowColor: Colors.primary,
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardShadowDark: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: { fontSize: 26 },
  textWrap: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  subtitle: { fontSize: 12, lineHeight: 17 },
  arrow: { fontSize: 22, fontWeight: '300', marginLeft: 6 },
});
