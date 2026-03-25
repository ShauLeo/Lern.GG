import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { loadExamSet } from '../../src/storage/store';
import { ExamSet, Question } from '../../src/models';
import { QuestionCard } from '../../src/components/QuestionCard';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Timer } from '../../src/components/Timer';
import { useSession } from '../../src/hooks/useSession';
import { Colors, useTheme } from '../../src/theme';

const EXAM_QUESTION_COUNT = 100;
const EXAM_TIME_MS = 90 * 60 * 1000;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface RunnerProps { examSet: ExamSet; questionIds: string[] }

function ExamRunner({ examSet, questionIds }: RunnerProps) {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const router = useRouter();
  const [submittedMap, setSubmittedMap] = useState<Record<string, string[]>>({});
  const [finished, setFinished] = useState(false);
  const { session, submitAnswer, advance, tickTimer, complete, currentQuestion } = useSession({
    examSetId: examSet.id, mode: 'exam', questionIds, initialTimeMs: EXAM_TIME_MS,
  });
  const question: Question | undefined = examSet.questions.find((q) => q.id === currentQuestion);

  const finishExam = useCallback(async () => { await complete(); setFinished(true); }, [complete]);

  const handleSubmit = useCallback((selectedIds: string[]) => {
    if (!question) return;
    submitAnswer(question, selectedIds);
    setSubmittedMap((prev) => ({ ...prev, [question.id]: selectedIds }));
  }, [question, submitAnswer]);

  const handleNext = useCallback(() => {
    if (session.currentIndex >= session.questionIds.length - 1) finishExam();
    else advance();
  }, [session.currentIndex, session.questionIds.length, advance, finishExam]);

  const handleExpire = useCallback(() => {
    Alert.alert('Time Up! ⏱', 'Your time has expired. Submitting exam.', [{ text: 'OK', onPress: finishExam }]);
  }, [finishExam]);

  if (finished) {
    const correct = session.attempts.filter((a) => a.isCorrect).length;
    const total = session.attempts.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = pct >= 80;
    return (
      <ScrollView style={[styles.scroll, { backgroundColor: theme.bg }]} contentContainerStyle={styles.resultContainer}>
        <Text style={styles.resultEmoji}>{passed ? '🏆' : '📝'}</Text>
        <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>Exam Complete</Text>
        <Text style={[styles.score, { color: passed ? Colors.success : Colors.error }]}>{pct}%</Text>
        <Text style={[styles.scoreSub, { color: theme.textSecondary }]}>{correct} / {total} correct</Text>
        <View style={[styles.verdictBadge, { backgroundColor: passed ? Colors.success + '22' : Colors.error + '22', borderColor: passed ? Colors.success : Colors.error }]}>
          <Text style={[styles.verdictText, { color: passed ? Colors.success : Colors.error }]}>{passed ? '✓  PASS' : '✗  FAIL'}</Text>
        </View>
        <Text style={[styles.passMark, { color: theme.textSecondary }]}>Pass mark: 80%</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (!question) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator color={Colors.warning} /></View>;
  const submitted = submittedMap[question.id] ?? null;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.topBar, { backgroundColor: theme.bg }]}>
        <ProgressBar current={session.currentIndex} total={session.questionIds.length} color={Colors.warning} />
        {session.timeRemainingMs !== undefined && (
          <Timer remainingMs={session.timeRemainingMs} onTick={tickTimer} onExpire={handleExpire} />
        )}
      </View>
      <Text style={[styles.counter, { color: theme.textSecondary }]}>
        Question {session.currentIndex + 1} of {session.questionIds.length}
      </Text>
      <QuestionCard question={question} submitted={submitted} onSubmit={handleSubmit} showExplanation={false} />
      {submitted !== null && (
        <View style={[styles.nextBar, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: Colors.warning }]} onPress={handleNext}>
            <Text style={styles.nextText}>
              {session.currentIndex >= session.questionIds.length - 1 ? 'Finish Exam' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function ExamScreen() {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const { examSetId } = useLocalSearchParams<{ examSetId: string }>();
  const [examSet, setExamSet] = useState<ExamSet | null>(null);
  const [questionIds, setQuestionIds] = useState<string[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    loadExamSet(examSetId).then((es) => {
      if (!isMounted || !es) return;
      setExamSet(es);
      setQuestionIds(shuffle(es.questions.map((q) => q.id)).slice(0, EXAM_QUESTION_COUNT));
    });
    return () => { isMounted = false; };
  }, [examSetId]);

  if (!examSet || !questionIds) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator size="large" color={Colors.warning} /></View>;
  return <ExamRunner examSet={examSet} questionIds={questionIds} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 8, gap: 12 },
  counter: { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, marginBottom: 4 },
  nextBar: { padding: 16, borderTopWidth: 1 },
  nextBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultContainer: { padding: 32, alignItems: 'center', paddingTop: 60 },
  resultEmoji: { fontSize: 64, marginBottom: 16 },
  resultTitle: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  score: { fontSize: 72, fontWeight: '800', lineHeight: 80 },
  scoreSub: { fontSize: 18, marginBottom: 20 },
  verdictBadge: { borderRadius: 16, borderWidth: 2, paddingHorizontal: 24, paddingVertical: 10, marginBottom: 8 },
  verdictText: { fontSize: 20, fontWeight: '800' },
  passMark: { fontSize: 14, marginBottom: 32 },
  btn: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
