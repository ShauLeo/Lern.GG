import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { loadExamSet, loadStats, isBookmarked, saveBookmark, removeBookmark } from '../../src/storage/store';
import { ExamSet, Question } from '../../src/models';
import { QuestionCard } from '../../src/components/QuestionCard';
import { ProgressBar } from '../../src/components/ProgressBar';
import { useSession } from '../../src/hooks/useSession';
import { Colors, useTheme } from '../../src/theme';

interface RunnerProps { examSet: ExamSet; questionIds: string[] }

function WrongRunner({ examSet, questionIds }: RunnerProps) {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const router = useRouter();
  const [submitted, setSubmitted] = useState<string[] | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const { session, submitAnswer, advance, complete, currentQuestion, isFinished } = useSession({
    examSetId: examSet.id, mode: 'wrong', questionIds,
  });
  const question: Question | undefined = examSet.questions.find((q) => q.id === currentQuestion);

  useEffect(() => {
    if (question) { setSubmitted(null); isBookmarked(question.id).then(setBookmarked); }
  }, [question?.id]);

  const handleSubmit = useCallback((selectedIds: string[]) => {
    if (!question) return;
    submitAnswer(question, selectedIds); setSubmitted(selectedIds);
  }, [question, submitAnswer]);

  const handleNext = useCallback(async () => {
    if (session.currentIndex >= session.questionIds.length - 1) {
      await complete();
      Alert.alert('Review Done!', 'Wrong answers review complete.', [{ text: 'OK', onPress: () => router.back() }]);
    } else { advance(); }
  }, [session, advance, complete, router]);

  const toggleBookmark = useCallback(async () => {
    if (!question) return;
    try {
      if (bookmarked) { await removeBookmark(question.id); setBookmarked(false); }
      else { await saveBookmark({ questionId: question.id, examSetId: examSet.id, createdAt: new Date().toISOString() }); setBookmarked(true); }
    } catch (e) { console.error(e); }
  }, [question, examSet.id, bookmarked]);

  if (isFinished || !question) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={styles.doneEmoji}>✅</Text>
        <Text style={[styles.doneTitle, { color: theme.textPrimary }]}>Review complete!</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.topBar, { backgroundColor: theme.bg }]}>
        <ProgressBar current={session.currentIndex} total={session.questionIds.length} color={Colors.error} />
        <TouchableOpacity onPress={toggleBookmark} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22 }}>{bookmarked ? '🔖' : '🏷️'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.counter, { color: theme.textSecondary }]}>
        Question {session.currentIndex + 1} of {session.questionIds.length}
      </Text>
      <QuestionCard question={question} submitted={submitted} onSubmit={handleSubmit} showExplanation />
      {submitted !== null && (
        <View style={[styles.nextBar, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: Colors.error }]} onPress={handleNext}>
            <Text style={styles.nextText}>
              {session.currentIndex >= session.questionIds.length - 1 ? 'Finish' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function WrongAnswersScreen() {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const router = useRouter();
  const { examSetId } = useLocalSearchParams<{ examSetId: string }>();
  const [ready, setReady] = useState(false);
  const [examSet, setExamSet] = useState<ExamSet | null>(null);
  const [wrongIds, setWrongIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([loadExamSet(examSetId), loadStats(examSetId)]).then(([es, stats]) => {
      setExamSet(es); setWrongIds(stats?.wrongQuestionIds ?? []); setReady(true);
    });
  }, [examSetId]);

  if (!ready) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator size="large" color={Colors.error} /></View>;
  if (!examSet || wrongIds.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={styles.doneEmoji}>🎯</Text>
        <Text style={[styles.doneTitle, { color: theme.textPrimary }]}>No wrong answers yet!</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return <WrongRunner examSet={examSet} questionIds={wrongIds} />;
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
  doneTitle: { fontSize: 24, fontWeight: '800', marginBottom: 28 },
  btn: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
