import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, useColorScheme, View } from 'react-native';
import { Colors } from '../theme';

interface Props { remainingMs: number; onTick: (remainingMs: number) => void; onExpire: () => void }

export function Timer({ remainingMs, onTick, onExpire }: Props) {
  const dark = useColorScheme() === 'dark';
  const remainingRef = useRef(remainingMs);
  remainingRef.current = remainingMs;
  const onTickRef = useRef(onTick); onTickRef.current = onTick;
  const onExpireRef = useRef(onExpire); onExpireRef.current = onExpire;

  useEffect(() => {
    const id = setInterval(() => {
      const next = remainingRef.current - 1000;
      if (next <= 0) { clearInterval(id); onExpireRef.current(); }
      else { onTickRef.current(next); }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const totalSecs = Math.max(0, Math.ceil(remainingMs / 1000));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const label = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
  const urgent = remainingMs < 5 * 60 * 1000;
  const bg = urgent ? Colors.error : Colors.primary;

  return (
    <View style={[styles.pill, { backgroundColor: bg + '22', borderColor: bg }]}>
      <Text style={[styles.text, { color: bg }]}>⏱ {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 99,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: { fontSize: 14, fontWeight: '700' },
});
