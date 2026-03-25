import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useColorScheme } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useExamSet } from '../../src/hooks/useExamSet';
import { loadStats, loadBookmarks } from '../../src/storage/store';
import { Stats } from '../../src/models';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Colors, useTheme } from '../../src/theme';

export default function ProgressScreen() {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const { examSet } = useExamSet();
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!examSet) return;
      loadStats(examSet.id).then(setStats);
      loadBookmarks().then((bs) => setBookmarkCount(bs.filter((b) => b.examSetId === examSet.id).length));
    }, [examSet])
  );

  if (!examSet) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No data yet</Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Import an exam and start studying to see your progress.</Text>
      </View>
    );
  }

  const total = examSet.questions.length;
  const attempted = stats?.totalAttempts ?? 0;
  const correct = stats?.correctCount ?? 0;
  const wrong = stats?.wrongQuestionIds.length ?? 0;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: theme.bg }]} contentContainerStyle={styles.container}>
      <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Progress</Text>
      <Text style={[styles.examName, { color: theme.textSecondary }]}>{examSet.title}</Text>

      {/* Accuracy Hero */}
      <View style={[styles.heroCard, { backgroundColor: Colors.primary }]}>
        <Text style={styles.heroLabel}>Overall Accuracy</Text>
        <Text style={styles.heroValue}>{accuracy}%</Text>
        <Text style={styles.heroSub}>{correct} of {attempted} correct</Text>
      </View>

      {/* Stat Grid */}
      <View style={styles.grid}>
        <StatCard label="Attempted" value={String(attempted)} color={Colors.primary} dark={dark} theme={theme} />
        <StatCard label="Correct" value={String(correct)} color={Colors.success} dark={dark} theme={theme} />
        <StatCard label="Wrong" value={String(wrong)} color={Colors.error} dark={dark} theme={theme} />
        <StatCard label="Bookmarked" value={String(bookmarkCount)} color={Colors.warning} dark={dark} theme={theme} />
      </View>

      {/* Progress Bar */}
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>Questions Mastered</Text>
        <View style={{ marginVertical: 12 }}>
          <ProgressBar current={correct} total={total} color={Colors.success} />
        </View>
        <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
          {correct} of {total} unique questions answered correctly
        </Text>
      </View>

      {stats?.lastStudiedAt ? (
        <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
          Last studied: {new Date(stats.lastStudiedAt).toLocaleString()}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function StatCard({ label, value, color, theme }: { label: string; value: string; color: string; dark: boolean; theme: ReturnType<typeof import('../../src/theme').useTheme> }) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  pageTitle: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  examName: { fontSize: 14, marginBottom: 24 },
  heroCard: { borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 20 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  heroValue: { color: '#fff', fontSize: 56, fontWeight: '800', lineHeight: 64 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  statValue: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardLabel: { fontSize: 13, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 4 },
  timestamp: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
