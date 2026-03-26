import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useColorScheme } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useExamSet } from '../../src/hooks/useExamSet';
import { loadStats, loadBookmarks, loadAllSessions, loadSettings } from '../../src/storage/store';
import { Stats, Session, UserSettings } from '../../src/models';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Colors, useTheme } from '../../src/theme';

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function computeStreak(sessions: Session[]): number {
  const completed = sessions.filter((s) => s.completedAt);
  if (completed.length === 0) return 0;

  const dateSet = new Set(completed.map((s) => s.startedAt.slice(0, 10)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const check = new Date(today);
  while (true) {
    const key = check.toISOString().slice(0, 10);
    if (dateSet.has(key)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function sessionAccuracy(s: Session): number {
  if (s.attempts.length === 0) return 0;
  return s.attempts.filter((a) => a.isCorrect).length / s.attempts.length;
}

export default function ProgressScreen() {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const { examSet } = useExamSet();
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!examSet) return;
      loadStats(examSet.id).then(setStats);
      loadBookmarks().then((bs) => setBookmarkCount(bs.filter((b) => b.examSetId === examSet.id).length));
      loadAllSessions().then((all) => {
        const mine = all.filter((s) => s.examSetId === examSet.id && s.completedAt);
        setStreak(computeStreak(mine));
        const last7 = mine.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 7).reverse();
        setRecentSessions(last7);
      });
      loadSettings().then(setSettings);
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

  const daysLeft = settings?.examDate ? daysUntil(settings.examDate) : null;
  const questionsPerDay = daysLeft && daysLeft > 0 ? Math.ceil(total / daysLeft) : null;

  const maxBarHeight = 100;

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: theme.bg }]} contentContainerStyle={styles.container}>
      <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Progress</Text>
      <Text style={[styles.examName, { color: theme.textSecondary }]}>{examSet.title}</Text>

      {/* Accuracy Hero + Streak */}
      <View style={styles.heroRow}>
        <View style={[styles.heroCard, { backgroundColor: Colors.primary, flex: 3 }]}>
          <Text style={styles.heroLabel}>Overall Accuracy</Text>
          <Text style={styles.heroValue}>{accuracy}%</Text>
          <Text style={styles.heroSub}>{correct} of {attempted} correct</Text>
        </View>
        <View style={[styles.streakCard, { backgroundColor: streak > 0 ? Colors.warning + '18' : theme.surface, borderColor: streak > 0 ? Colors.warning + '60' : theme.border }]}>
          <Text style={styles.streakEmoji}>{streak > 0 ? '🔥' : '📅'}</Text>
          <Text style={[styles.streakNum, { color: streak > 0 ? Colors.warning : theme.textSecondary }]}>{streak}</Text>
          <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>day streak</Text>
        </View>
      </View>

      {/* Exam Countdown Card */}
      {daysLeft !== null && daysLeft > 0 && (
        <View style={[styles.card, { backgroundColor: Colors.primary + '14', borderWidth: 1.5, borderColor: Colors.primary + '40' }]}>
          <Text style={[styles.cardLabel, { color: Colors.primary, fontWeight: '800', fontSize: 14 }]}>🗓  Exam in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</Text>
          {questionsPerDay !== null && (
            <Text style={[styles.cardSub, { color: theme.textSecondary, marginTop: 6 }]}>
              Study ~{questionsPerDay} questions/day to cover all {total} questions
            </Text>
          )}
        </View>
      )}

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

      {/* Last 7 Sessions Bar Chart */}
      {recentSessions.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardLabel, { color: theme.textSecondary, marginBottom: 16 }]}>Last {recentSessions.length} Sessions</Text>
          <View style={styles.chartRow}>
            {recentSessions.map((s, i) => {
              const acc = sessionAccuracy(s);
              const barH = Math.max(8, Math.round(acc * maxBarHeight));
              const barColor = acc >= 0.8 ? Colors.success : acc >= 0.5 ? Colors.warning : Colors.error;
              const dateLabel = s.startedAt.slice(5, 10); // MM-DD
              return (
                <View key={s.id ?? i} style={styles.barWrapper}>
                  <Text style={[styles.barPct, { color: theme.textSecondary }]}>{Math.round(acc * 100)}%</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height: barH, backgroundColor: barColor }]} />
                  </View>
                  <Text style={[styles.barDate, { color: theme.textSecondary }]}>{dateLabel}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.chartLegend}>
            <LegendDot color={Colors.success} label="≥80%" />
            <LegendDot color={Colors.warning} label="50–79%" />
            <LegendDot color={Colors.error} label="<50%" />
          </View>
        </View>
      )}

      {stats?.lastStudiedAt ? (
        <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
          Last studied: {new Date(stats.lastStudiedAt).toLocaleString()}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{label}</Text>
    </View>
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
  heroRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  heroCard: { borderRadius: 24, padding: 20, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  heroValue: { color: '#fff', fontSize: 44, fontWeight: '800', lineHeight: 52 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  streakCard: { flex: 1, borderRadius: 24, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  streakEmoji: { fontSize: 28, marginBottom: 4 },
  streakNum: { fontSize: 28, fontWeight: '800' },
  streakLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  statValue: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardLabel: { fontSize: 13, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 4 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 140, paddingBottom: 4 },
  barWrapper: { flex: 1, alignItems: 'center', gap: 4 },
  barPct: { fontSize: 9, fontWeight: '600' },
  barTrack: { width: '100%', height: 100, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', borderRadius: 6, minHeight: 8 },
  barDate: { fontSize: 9, fontWeight: '500' },
  chartLegend: { flexDirection: 'row', gap: 12, marginTop: 10, justifyContent: 'center' },
  timestamp: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
