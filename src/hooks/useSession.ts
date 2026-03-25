import { useState, useCallback } from 'react';
import { Session, Attempt, Question, StudyMode } from '../models';
import { saveSession, updateStatsFromSession } from '../storage/store';
function makeId() { return `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function checkCorrect(question: Question, selectedIds: string[]): boolean {
  if (question.type === 'drag_drop_order' || question.type === 'drag_drop_match') {
    return JSON.stringify(selectedIds) === JSON.stringify(question.correctAnswers);
  }
  const sort = (a: string[]) => [...a].sort().join(',');
  return sort(selectedIds) === sort(question.correctAnswers);
}
interface UseSessionOptions {
  examSetId: string; mode: StudyMode; questionIds: string[];
  initialSession?: Session | null; initialTimeMs?: number;
}
export function useSession({ examSetId, mode, questionIds, initialSession, initialTimeMs }: UseSessionOptions) {
  const [session, setSession] = useState<Session>(() => {
    if (initialSession) return initialSession;
    return { id: makeId(), examSetId, mode, questionIds, attempts: [], startedAt: new Date().toISOString(), currentIndex: 0, timeRemainingMs: initialTimeMs };
  });
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const persist = useCallback((s: Session) => { saveSession(s).catch(console.error); return s; }, []);
  const submitAnswer = useCallback((question: Question, selectedIds: string[]) => {
    const isCorrect = checkCorrect(question, selectedIds);
    const attempt: Attempt = { questionId: question.id, selectedAnswers: selectedIds, isCorrect, timeSpentMs: Date.now() - questionStartTime };
    setSession((prev) => { const next: Session = { ...prev, attempts: [...prev.attempts, attempt] }; persist(next); return next; });
    return isCorrect;
  }, [questionStartTime, persist]);
  const advance = useCallback(() => {
    setQuestionStartTime(Date.now());
    setSession((prev) => { const next: Session = { ...prev, currentIndex: prev.currentIndex + 1 }; persist(next); return next; });
  }, [persist]);
  const tickTimer = useCallback((remainingMs: number) => {
    setSession((prev) => { const next: Session = { ...prev, timeRemainingMs: remainingMs }; persist(next); return next; });
  }, [persist]);
  const complete = useCallback((): Promise<void> => {
    return new Promise<void>((resolve) => {
      setSession((prev) => {
        const next: Session = { ...prev, completedAt: new Date().toISOString() };
        persist(next);
        updateStatsFromSession(next).catch(console.error).finally(resolve);
        return next;
      });
    });
  }, [persist]);
  const currentQuestion = session.questionIds[session.currentIndex];
  const isFinished = session.completedAt != null || session.currentIndex >= session.questionIds.length;
  return { session, submitAnswer, advance, tickTimer, complete, currentQuestion, isFinished };
}
