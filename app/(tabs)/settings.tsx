import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, useColorScheme,
  TouchableOpacity, Switch, TextInput, Alert,
} from 'react-native';
import { Colors, useTheme } from '../../src/theme';
import { loadSettings, saveSettings } from '../../src/storage/store';
import { useExamSet } from '../../src/hooks/useExamSet';
import { UserSettings } from '../../src/models';

const DEFAULT_SETTINGS: UserSettings = { dailyGoal: 20, alwaysShowExplanation: false };

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export default function SettingsScreen() {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const { examSet } = useExamSet();

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [dateInput, setDateInput] = useState('');
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setDateInput(s.examDate ?? '');
    });
  }, []);

  const persist = useCallback(async (updated: UserSettings) => {
    setSettings(updated);
    await saveSettings(updated);
  }, []);

  const handleDateChange = (text: string) => {
    setDateInput(text);
    setDateError('');
    if (!text) {
      persist({ ...settings, examDate: undefined });
      return;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const d = daysUntil(text);
      if (isNaN(d)) { setDateError('Invalid date'); return; }
      persist({ ...settings, examDate: text });
    }
  };

  const daysLeft = settings.examDate ? daysUntil(settings.examDate) : null;
  const totalQ = examSet?.questions.length ?? 0;
  const questionsPerDay = daysLeft && daysLeft > 0 ? Math.ceil(totalQ / daysLeft) : null;

  const handleReset = () => {
    Alert.alert(
      'Reset All Progress',
      'This will delete all study sessions, stats, and bookmarks. Exam sets will remain. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
            const keys = await AsyncStorage.getAllKeys();
            const toDelete = keys.filter((k) =>
              k.startsWith('session:') || k === 'sessionIndex' ||
              k.startsWith('stats:') || k === 'bookmarks' ||
              k.startsWith('spacedRep:')
            );
            await AsyncStorage.multiRemove(toDelete);
            Alert.alert('Done', 'Progress has been reset.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: theme.bg }]} contentContainerStyle={styles.container}>
      <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Settings</Text>
      <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>Customize your study experience</Text>

      {/* Exam Countdown */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>🗓  Exam Countdown</Text>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Exam date (YYYY-MM-DD)</Text>
        <TextInput
          style={[styles.input, { color: theme.textPrimary, borderColor: dateError ? Colors.error : theme.border, backgroundColor: dark ? '#0D0D1A' : '#F9F9FF' }]}
          value={dateInput}
          onChangeText={handleDateChange}
          placeholder="e.g. 2026-06-15"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        {dateError ? <Text style={[styles.errorText, { color: Colors.error }]}>{dateError}</Text> : null}

        {daysLeft !== null && (
          <View style={[styles.countdownCard, { backgroundColor: daysLeft > 0 ? Colors.primary + '18' : Colors.error + '18', borderColor: daysLeft > 0 ? Colors.primary + '50' : Colors.error + '50' }]}>
            {daysLeft > 0 ? (
              <>
                <Text style={[styles.countdownDays, { color: Colors.primary }]}>{daysLeft} days remaining</Text>
                {questionsPerDay !== null && (
                  <Text style={[styles.countdownSub, { color: theme.textSecondary }]}>
                    Study ~{questionsPerDay} question{questionsPerDay !== 1 ? 's' : ''}/day to cover all {totalQ} questions
                  </Text>
                )}
              </>
            ) : daysLeft === 0 ? (
              <Text style={[styles.countdownDays, { color: Colors.warning }]}>Exam is today! Good luck! 🍀</Text>
            ) : (
              <Text style={[styles.countdownDays, { color: Colors.error }]}>Exam date has passed</Text>
            )}
          </View>
        )}
      </View>

      {/* Daily Goal */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>🎯  Daily Goal</Text>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Questions per day target</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepBtn, { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '40' }]}
            onPress={() => persist({ ...settings, dailyGoal: Math.max(1, settings.dailyGoal - 5) })}
          >
            <Text style={[styles.stepBtnText, { color: Colors.primary }]}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.stepValue, { color: theme.textPrimary }]}>{settings.dailyGoal}</Text>
          <TouchableOpacity
            style={[styles.stepBtn, { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '40' }]}
            onPress={() => persist({ ...settings, dailyGoal: Math.min(200, settings.dailyGoal + 5) })}
          >
            <Text style={[styles.stepBtnText, { color: Colors.primary }]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Study Options */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>📖  Study Options</Text>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>Always show explanation</Text>
            <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>Show explanation after every answer, not just wrong ones</Text>
          </View>
          <Switch
            value={settings.alwaysShowExplanation}
            onValueChange={(v) => persist({ ...settings, alwaysShowExplanation: v })}
            trackColor={{ false: theme.border, true: Colors.primary + '60' }}
            thumbColor={settings.alwaysShowExplanation ? Colors.primary : theme.textSecondary}
          />
        </View>
      </View>

      {/* Reset Progress */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>⚠️  Data</Text>
        <TouchableOpacity style={[styles.resetBtn, { borderColor: Colors.error + '60' }]} onPress={handleReset}>
          <Text style={[styles.resetBtnText, { color: Colors.error }]}>Reset All Progress</Text>
        </TouchableOpacity>
        <Text style={[styles.resetNote, { color: theme.textSecondary }]}>
          Clears sessions, stats, and bookmarks. Exam sets are kept.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 20, paddingBottom: 48 },
  pageTitle: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, marginBottom: 28 },
  section: { borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  label: { fontSize: 13, marginBottom: 8 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 15, fontWeight: '600' },
  errorText: { fontSize: 12, marginTop: 6 },
  countdownCard: { borderRadius: 14, padding: 14, borderWidth: 1.5, marginTop: 14 },
  countdownDays: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  countdownSub: { fontSize: 13, lineHeight: 19 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  stepValue: { fontSize: 26, fontWeight: '800', minWidth: 48, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  toggleDesc: { fontSize: 12, lineHeight: 18 },
  resetBtn: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  resetBtnText: { fontSize: 15, fontWeight: '700' },
  resetNote: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
