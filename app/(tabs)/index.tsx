import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, useColorScheme,
  TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList, SafeAreaView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useExamSet } from '../../src/hooks/useExamSet';
import { loadStats, loadBookmarks, loadIncompleteSession, loadSpacedRepStats } from '../../src/storage/store';
import { ExamSet, Stats } from '../../src/models';
import { isDue } from '../../src/algorithms/spacedRepetition';
import { Colors, useTheme } from '../../src/theme';

export default function HomeScreen() {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const router = useRouter();
  const { examSet, examLibrary, loading, switchExam, removeExam } = useExamSet();
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [showLibrary, setShowLibrary] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!examSet) return;
      loadStats(examSet.id).then(setStats);
      loadBookmarks().then((bs) =>
        setBookmarkCount(bs.filter((b) => b.examSetId === examSet.id).length)
      );
      loadSpacedRepStats(examSet.id).then((sr) => {
        if (sr) setDueCount(sr.questions.filter(isDue).length);
        else setDueCount(examSet.questions.length); // all due on first run
      });
    }, [examSet])
  );

  const startMode = async (mode: 'learn' | 'exam' | 'wrong' | 'bookmarks' | 'review') => {
    if (!examSet) return;
    const sessionMode = mode === 'review' ? 'learn' : mode;
    const incomplete = await loadIncompleteSession(examSet.id, sessionMode);
    const params: Record<string, string> = { examSetId: examSet.id };
    if (mode === 'review') params.reviewMode = 'true';

    if (incomplete && mode !== 'review') {
      Alert.alert(
        'Resume Session?',
        `You have an unfinished session (Q${incomplete.currentIndex + 1}/${incomplete.questionIds.length}). Resume it?`,
        [
          { text: 'Start Fresh', onPress: () => router.push({ pathname: `/study/${sessionMode}`, params }) },
          { text: 'Resume', onPress: () => router.push({ pathname: `/study/${sessionMode}`, params: { ...params, sessionId: incomplete.id } }) },
        ]
      );
    } else {
      router.push({ pathname: `/study/${sessionMode}`, params });
    }
  };

  const wrongCount = stats?.wrongQuestionIds.length ?? 0;

  const MODES = [
    { key: 'learn',     title: 'Learn Mode',      icon: '📖', color: Colors.primary,  desc: `${examSet?.questions.length ?? 0} questions · Instant feedback` },
    { key: 'exam',      title: 'Practice Exam',   icon: '⏱️', color: Colors.warning,  desc: 'Timed · Score at the end' },
    { key: 'review',    title: 'Spaced Review',   icon: '🧠', color: '#A855F7',       desc: dueCount > 0 ? `${dueCount} due today · SM-2 algorithm` : 'No cards due today' },
    { key: 'wrong',     title: 'Wrong Answers',   icon: '❌', color: Colors.error,    desc: wrongCount > 0 ? `${wrongCount} questions to retry` : 'No wrong answers yet' },
    { key: 'bookmarks', title: 'Bookmarked',       icon: '🔖', color: Colors.success,  desc: bookmarkCount > 0 ? `${bookmarkCount} saved questions` : 'No bookmarks yet' },
  ] as const;

  return (
    <>
      <ScrollView
        style={[styles.scroll, { backgroundColor: theme.bg }]}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: Colors.primary }]}>
          <Text style={styles.appName}>Learn.GG</Text>
          <Text style={styles.appTagline}>Your personal study companion 🎓</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
        ) : !examSet ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: Colors.primary + '40' }]}>
            <Text style={styles.emptyEmoji}>📂</Text>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No exam loaded</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Import a VCE file or JSON to start studying, or try the built-in sample.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: Colors.primary }]}
              onPress={() => router.push('/(tabs)/import')}
            >
              <Text style={styles.emptyBtnText}>Go to Import →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Exam info card */}
            <View style={[styles.examCard, { backgroundColor: theme.surface }]}>
              <View style={styles.examRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.examTitle, { color: theme.textPrimary }]}>{examSet.title}</Text>
                  <Text style={[styles.examMeta, { color: theme.textSecondary }]}>
                    {examSet.questions.length} questions · v{examSet.version}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  {examSet && (
                    <TouchableOpacity
                      style={[styles.switchBtn, { borderColor: Colors.primary + '60' }]}
                      onPress={() => setShowLibrary(true)}
                    >
                      <Text style={[styles.switchBtnText, { color: Colors.primary }]}>Switch</Text>
                    </TouchableOpacity>
                  )}
                  <View style={[styles.activePill, { backgroundColor: Colors.success + '22' }]}>
                    <Text style={[styles.activePillText, { color: Colors.success }]}>● LOADED</Text>
                  </View>
                </View>
              </View>
              {stats && (
                <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
                  <MiniStat label="Tried" value={stats.totalAttempts} color={Colors.primary} />
                  <MiniStat label="Correct" value={stats.correctCount} color={Colors.success} />
                  <MiniStat label="Wrong" value={wrongCount} color={Colors.error} />
                  <MiniStat label="Saved" value={bookmarkCount} color={Colors.warning} />
                </View>
              )}
            </View>

            {/* Mode cards */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>STUDY MODES</Text>
            {MODES.map((m) => {
              const disabled =
                (m.key === 'wrong' && wrongCount === 0) ||
                (m.key === 'bookmarks' && bookmarkCount === 0) ||
                (m.key === 'review' && dueCount === 0);
              return (
                <ModeCard
                  key={m.key}
                  icon={m.icon}
                  title={m.title}
                  subtitle={m.desc}
                  color={m.color}
                  disabled={disabled}
                  onPress={() => startMode(m.key as Parameters<typeof startMode>[0])}
                  theme={theme}
                />
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Exam Library Modal */}
      <Modal visible={showLibrary} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>My Exam Library</Text>
            <TouchableOpacity onPress={() => setShowLibrary(false)}>
              <Text style={[styles.modalClose, { color: Colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={examLibrary}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            renderItem={({ item }) => (
              <LibraryItem
                examSet={item}
                isActive={item.id === examSet?.id}
                theme={theme}
                onSelect={async () => {
                  await switchExam(item.id);
                  setShowLibrary(false);
                }}
                onDelete={() => {
                  Alert.alert(
                    'Remove Exam',
                    `Remove "${item.title}" from your library?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeExam(item.id) },
                    ]
                  );
                }}
              />
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyLibrary, { color: theme.textSecondary }]}>No exams imported yet.</Text>
            }
          />
          <View style={{ padding: 16 }}>
            <TouchableOpacity
              style={[styles.addExamBtn, { backgroundColor: Colors.primary }]}
              onPress={() => { setShowLibrary(false); router.push('/(tabs)/import'); }}
            >
              <Text style={styles.addExamBtnText}>+ Import Another Exam</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatVal, { color }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function ModeCard({
  icon, title, subtitle, color, disabled, onPress, theme,
}: {
  icon: string; title: string; subtitle: string; color: string;
  disabled: boolean; onPress: () => void;
  theme: ReturnType<typeof import('../../src/theme').useTheme>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.modeCard,
        { backgroundColor: color + (disabled ? '18' : '22'), borderColor: color + (disabled ? '40' : '80') },
        disabled && styles.modeCardDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <View style={[styles.modeIconWrap, { backgroundColor: color + '33' }]}>
        <Text style={styles.modeIcon}>{icon}</Text>
      </View>
      <View style={styles.modeText}>
        <Text style={[styles.modeTitle, { color: disabled ? theme.textSecondary : theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.modeSub, { color: theme.textSecondary }]}>{subtitle}</Text>
      </View>
      {!disabled && <Text style={[styles.modeArrow, { color }]}>›</Text>}
    </TouchableOpacity>
  );
}

function LibraryItem({
  examSet, isActive, theme, onSelect, onDelete,
}: {
  examSet: ExamSet; isActive: boolean;
  theme: ReturnType<typeof import('../../src/theme').useTheme>;
  onSelect: () => void; onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.libraryItem,
        { backgroundColor: theme.surface, borderColor: isActive ? Colors.primary : theme.border },
        isActive && { borderWidth: 2 },
      ]}
      onPress={onSelect}
      activeOpacity={0.75}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.libraryTitle, { color: theme.textPrimary }]}>{examSet.title}</Text>
        <Text style={[styles.libraryMeta, { color: theme.textSecondary }]}>
          {examSet.questions.length} questions · v{examSet.version}
        </Text>
      </View>
      {isActive ? (
        <Text style={[styles.activeTag, { color: Colors.success }]}>✓ Active</Text>
      ) : (
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 18, color: Colors.error }}>🗑</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { paddingBottom: 48 },

  headerCard: {
    paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: 24,
  },
  appName: { fontSize: 38, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  appTagline: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  emptyCard: { margin: 20, borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 2 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  emptyBtn: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  examCard: {
    marginHorizontal: 20, borderRadius: 20, padding: 18, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  examRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  examTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  examMeta: { fontSize: 13 },
  switchBtn: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1.5 },
  switchBtnText: { fontSize: 12, fontWeight: '700' },
  activePill: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  activePillText: { fontSize: 11, fontWeight: '800' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, paddingTop: 14 },
  miniStat: { alignItems: 'center' },
  miniStatVal: { fontSize: 20, fontWeight: '800' },
  miniStatLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 1, fontWeight: '500' },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginHorizontal: 20, marginBottom: 10 },

  modeCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 12, borderRadius: 20, padding: 16, borderWidth: 1.5,
  },
  modeCardDisabled: { opacity: 0.45 },
  modeIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  modeIcon: { fontSize: 26 },
  modeText: { flex: 1 },
  modeTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  modeSub: { fontSize: 12, lineHeight: 17 },
  modeArrow: { fontSize: 26, fontWeight: '300', marginLeft: 4 },

  // Library modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalClose: { fontSize: 16, fontWeight: '600' },
  libraryItem: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  libraryTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  libraryMeta: { fontSize: 12 },
  activeTag: { fontSize: 13, fontWeight: '700' },
  emptyLibrary: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  addExamBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  addExamBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
