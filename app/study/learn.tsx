import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { loadExamSet, loadSession, isBookmarked, saveBookmark, removeBookmark, loadSpacedRepStats, saveSpacedRepStats } from '../../src/storage/store';
import { ExamSet, Question, Session, SpacedRepStats } from '../../src/models';
import { QuestionCard } from '../../src/components/QuestionCard';
import { ProgressBar } from '../../src/components/ProgressBar';
import { useSession } from '../../src/hooks/useSession';
import { Colors, useTheme } from '../../src/theme';
import { createInitialSpacedRep, isDue, qualityFromCorrect, sm2Update } from '../../src/algorithms/spacedRepetition';

interface RunnerProps { examSet: ExamSet; questionIds: string[]; resumeSession: Session | null; reviewMode?: boolean }

function LearnRunner({ examSet, questionIds, resumeSession, reviewMode }: RunnerProps) {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const router = useRouter();
  const [submitted, setSubmitted] = useState<string[] | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const { session, submitAnswer, advance, complete, currentQuestion, isFinished } = useSession({
    examSetId: examSet.id, mode: 'learn', questionIds, initialSession: resumeSession ?? undefined,
  });
  const question: Question | undefined = examSet.questions.find((q) => q.id === currentQuestion);

  useEffect(() => {
    if (question) { setSubmitted(null); isBookmarked(question.id).then(setBookmarked); }
  }, [question?.id]);

  const updateSpacedRep = useCallback(async (questionId: string, correct: boolean) => {
    const existing = await loadSpacedRepStats(examSet.id);
    const base: SpacedRepStats = existing ?? { examSetId: examSet.id, questions: [] };
    const idx = base.questions.findIndex((q) => q.questionId === questionId);
    const current = idx >= 0 ? base.questions[idx] : createInitialSpacedRep(questionId);
    const updated = sm2Update(current, qualityFromCorrect(correct));
    const newQuestions = idx >= 0
      ? base.questions.map((q, i) => (i === idx ? updated : q))
      : [...base.questions, updated];
    await saveSpacedRepStats({ ...base, questions: newQuestions });
  }, [examSet.id]);

  const handleSubmit = useCallback((selectedIds: string[]) => {
    if (!question) return;
    submitAnswer(question, selectedIds);
    setSubmitted(selectedIds);
    if (reviewMode) {
      const correct = JSON.stringify([...selectedIds].sort()) === JSON.stringify([...question.correctAnswers].sort());
      updateSpacedRep(question.id, correct);
    }
  }, [question, submitAnswer, reviewMode, updateSpacedRep]);

  const handleNext = useCallback(async () => {
    if (session.currentIndex >= session.questionIds.length - 1) {
      await complete();
      const correct = session.attempts.filter((a) => a.isCorrect).length;
      const title = reviewMode ? 'Review Complete 🧠' : 'Session Complete 🎉';
      Alert.alert(title, `You answered ${correct}/${session.questionIds.length} correctly.`, [{ text: 'Done', onPress: () => router.back() }]);
    } else {
      advance();
    }
  }, [session, advance, complete, router, reviewMode]);

  const toggleBookmark = useCallback(async () => {
    if (!question) return;
    if (bookmarked) { await removeBookmark(question.id); setBookmarked(false); }
    else { await saveBookmark({ questionId: question.id, examSetId: examSet.id, createdAt: new Date().toISOString() }); setBookmarked(true); }
  }, [question, examSet.id, bookmarked]);

  if (isFinished) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={[styles.doneTitle, { color: theme.textPrimary }]}>All done!</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!question) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.topBar, { backgroundColor: theme.bg }]}>
        <ProgressBar current={session.currentIndex} total={session.questionIds.length} />
        <TouchableOpacity onPress={toggleBookmark} style={styles.bookmarkBtn}>
          <Text style={{ fontSize: 22 }}>{bookmarked ? '🔖' : '🏷️'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.counter, { color: theme.textSecondary }]}>
        Question {session.currentIndex + 1} of {session.questionIds.length}
      </Text>
      <QuestionCard question={question} submitted={submitted} onSubmit={handleSubmit} showExplanation />
      {submitted !== null && (
        <View style={[styles.nextBar, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: Colors.primary }]} onPress={handleNext}>
            <Text style={styles.nextText}>
              {session.currentIndex >= session.questionIds.length - 1 ? 'Finish' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function LearnScreen() {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const { examSetId, sessionId, reviewMode: reviewParam } = useLocalSearchParams<{ examSetId: string; sessionId?: string; reviewMode?: string }>();
  const isReview = reviewParam === 'true';
  const [ready, setReady] = useState(false);
  const [examSet, setExamSet] = useState<ExamSet | null>(null);
  const [resumeSession, setResumeSession] = useState<Session | null>(null);
  const [questionIds, setQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const [es, existing] = await Promise.all([
        loadExamSet(examSetId),
        sessionId ? loadSession(sessionId) : Promise.resolve(null),
      ]);
      if (!es) { setReady(true); return; }
      setExamSet(es);
      setResumeSession(existing);

      if (existing) {
        setQuestionIds(existing.questionIds);
      } else if (isReview) {
        const sr = await loadSpacedRepStats(es.id);
        if (sr && sr.questions.length > 0) {
          const due = sr.questions.filter(isDue).map((q) => q.questionId);
          setQuestionIds(due.length > 0 ? due : es.questions.map((q) => q.id));
        } else {
          setQuestionIds(es.questions.map((q) => q.id));
        }
      } else {
        setQuestionIds(es.questions.map((q) => q.id));
      }
      setReady(true);
    }
    load().catch(console.error);
  }, [examSetId, sessionId, isReview]);

  if (!ready) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!examSet) return <View style={[styles.center, { backgroundColor: theme.bg }]}><Text style={{ color: theme.textSecondary }}>Exam not found.</Text></View>;
  return <LearnRunner examSet={examSet} questionIds={questionIds} resumeSession={resumeSession} reviewMode={isReview} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 8, gap: 8 },
  bookmarkBtn: { padding: 4 },
  counter: { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, marginBottom: 4 },
  nextBar: { padding: 16, borderTopWidth: 1 },
  nextBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: { fontSize: 26, fontWeight: '800', marginBottom: 28 },
  btn: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
