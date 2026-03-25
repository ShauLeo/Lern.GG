import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { loadExamSet, loadBookmarks, removeBookmark } from '../../src/storage/store';
import { ExamSet, Question } from '../../src/models';
import { QuestionCard } from '../../src/components/QuestionCard';
import { ProgressBar } from '../../src/components/ProgressBar';
import { useSession } from '../../src/hooks/useSession';
import { Colors, useTheme } from '../../src/theme';

interface RunnerProps { examSet: ExamSet; questionIds: string[] }

function BookmarksRunner({ examSet, questionIds }: RunnerProps) {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const router = useRouter();
  const [submitted, setSubmitted] = useState<string[] | null>(null);
  const [isCurrentBookmarked, setIsCurrentBookmarked] = useState(true);
  const { session, submitAnswer, advance, complete, currentQuestion, isFinished } = useSession({
    examSetId: examSet.id, mode: 'bookmarks', questionIds,
  });
  const question: Question | undefined = examSet.questions.find((q) => q.id === currentQuestion);

  useEffect(() => {
    if (question) { setSubmitted(null); setIsCurrentBookmarked(true); }
  }, [question?.id]);

  const handleSubmit = useCallback((selectedIds: string[]) => {
    if (!question) return;
    submitAnswer(question, selectedIds); setSubmitted(selectedIds);
  }, [question, submitAnswer]);

  const handleNext = useCallback(async () => {
    if (session.currentIndex >= session.questionIds.length - 1) {
      await complete();
      Alert.alert('Done!', 'Bookmarks review complete.', [{ text: 'OK', onPress: () => router.back() }]);
    } else { advance(); }
  }, [session, advance, complete, router]);

  const unbookmark = useCallback(async () => {
    if (!question) return;
    try { await removeBookmark(question.id); setIsCurrentBookmarked(false); }
    catch (e) { console.error(e); }
  }, [question]);

  if (isFinished || !question) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={styles.doneEmoji}>🔖</Text>
        <Text style={[styles.doneTitle, { color: theme.textPrimary }]}>Bookmarks complete!</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.topBar, { backgroundColor: theme.bg }]}>
        <ProgressBar current={session.currentIndex} total={session.questionIds.length} color={Colors.success} />
        <TouchableOpacity onPress={unbookmark} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22 }}>{isCurrentBookmarked ? '🔖' : '🏷️'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.counter, { color: theme.textSecondary }]}>
        Question {session.currentIndex + 1} of {session.questionIds.length}
      </Text>
      <QuestionCard question={question} submitted={submitted} onSubmit={handleSubmit} showExplanation />
      {submitted !== null && (
        <View style={[styles.nextBar, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: Colors.success }]} onPress={handleNext}>
            <Text style={styles.nextText}>
              {session.currentIndex >= session.questionIds.length - 1 ? 'Finish' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function BookmarksScreen() {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const router = useRouter();
  const { examSetId } = useLocalSearchParams<{ examSetId: string }>();
  const [ready, setReady] = useState(false);
  const [examSet, setExamSet] = useState<ExamSet | null>(null);
  const [bookmarkIds, setBookmarkIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([loadExamSet(examSetId), loadBookmarks()]).then(([es, bs]) => {
      setExamSet(es);
      setBookmarkIds(bs.filter((b) => b.examSetId === examSetId).map((b) => b.questionId));
      setReady(true);
    });
  }, [examSetId]);

  if (!ready) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator size="large" color={Colors.success} /></View>;
  if (!examSet || bookmarkIds.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={styles.doneEmoji}>🏷️</Text>
        <Text style={[styles.doneTitle, { color: theme.textPrimary }]}>No bookmarks yet</Text>
        <Text style={[styles.doneSub, { color: theme.textSecondary }]}>Bookmark questions while studying to review them here.</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return <BookmarksRunner examSet={examSet} questionIds={bookmarkIds} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 8, gap: 8 },
  counter: { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, marginBottom: 4 },
  nextBar: { padding: 16, borderTopWidth: 1 },
  nextBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  doneSub: { fontSize: 15, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  btn: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
