import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Option } from '../models';
import { Colors, useTheme } from '../theme';

interface Props {
  items: Option[];
  onOrderChange: (orderedIds: string[]) => void;
  disabled?: boolean;
  correctOrder?: string[];
}

export function DragDropList({ items, onOrderChange, disabled, correctOrder }: Props) {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const [ordered, setOrdered] = useState<Option[]>(items);
  useEffect(() => { setOrdered(items); }, [items]);

  const move = (from: number, to: number) => {
    if (disabled) return;
    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrdered(next);
    onOrderChange(next.map((o) => o.id));
  };

  return (
    <View>
      {ordered.map((item, index) => {
        const isCorrect = correctOrder ? correctOrder[index] === item.id : undefined;
        const borderColor = correctOrder == null
          ? theme.border
          : isCorrect ? Colors.success : Colors.error;
        const bg = correctOrder == null
          ? theme.surface
          : isCorrect ? Colors.success + '22' : Colors.error + '22';
        return (
          <View key={item.id} style={[styles.row, { borderColor, backgroundColor: bg }]}>
            <View style={[styles.badge, { backgroundColor: Colors.primary + '22', borderColor: Colors.primary }]}>
              <Text style={[styles.badgeText, { color: Colors.primary }]}>{index + 1}</Text>
            </View>
            <Text style={[styles.text, { color: theme.textPrimary }]}>{item.text}</Text>
            {!disabled && (
              <View style={styles.buttons}>
                <TouchableOpacity onPress={() => move(index, index - 1)} disabled={index === 0}>
                  <Text style={[styles.arrow, { color: Colors.primary, opacity: index === 0 ? 0.25 : 1 }]}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => move(index, index + 1)} disabled={index === ordered.length - 1}>
                  <Text style={[styles.arrow, { color: Colors.primary, opacity: index === ordered.length - 1 ? 0.25 : 1 }]}>▼</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 10 },
  badge: { width: 30, height: 30, borderRadius: 99, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  text: { flex: 1, fontSize: 15, lineHeight: 22 },
  buttons: { flexDirection: 'column', gap: 4 },
  arrow: { fontSize: 18, paddingHorizontal: 6 },
});
