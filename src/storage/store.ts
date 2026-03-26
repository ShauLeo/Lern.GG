import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExamSet, Session, Bookmark, Stats, SpacedRepStats, UserSettings } from '../models';
const KEYS = {
  examSet: (id: string) => `examSet:${id}`,
  examSetIndex: 'examSetIndex',
  activeExamSetId: 'activeExamSetId',
  session: (id: string) => `session:${id}`,
  sessionIndex: 'sessionIndex',
  bookmarks: 'bookmarks',
  stats: (examSetId: string) => `stats:${examSetId}`,
  spacedRep: (examSetId: string) => `spacedRep:${examSetId}`,
  settings: 'userSettings',
};

async function getExamSetIndex(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.examSetIndex);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function saveExamSet(examSet: ExamSet): Promise<void> {
  const index = await getExamSetIndex();
  if (!index.includes(examSet.id)) index.push(examSet.id);
  await AsyncStorage.multiSet([
    [KEYS.examSet(examSet.id), JSON.stringify(examSet)],
    [KEYS.activeExamSetId, examSet.id],
    [KEYS.examSetIndex, JSON.stringify(index)],
  ]);
}

export async function loadAllExamSets(): Promise<ExamSet[]> {
  const index = await getExamSetIndex();
  const sets: ExamSet[] = [];
  for (const id of index) {
    const set = await loadExamSet(id);
    if (set) sets.push(set);
  }
  return sets;
}

export async function setActiveExamSetId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.activeExamSetId, id);
}

export async function removeExamSet(id: string): Promise<void> {
  const index = (await getExamSetIndex()).filter((i) => i !== id);
  await AsyncStorage.multiSet([[KEYS.examSetIndex, JSON.stringify(index)]]);
  await AsyncStorage.removeItem(KEYS.examSet(id));
  const activeId = await AsyncStorage.getItem(KEYS.activeExamSetId);
  if (activeId === id) {
    if (index.length > 0) {
      await AsyncStorage.setItem(KEYS.activeExamSetId, index[0]);
    } else {
      await AsyncStorage.removeItem(KEYS.activeExamSetId);
    }
  }
}
export async function loadActiveExamSet(): Promise<ExamSet | null> {
  const id = await AsyncStorage.getItem(KEYS.activeExamSetId);
  if (!id) return null;
  const raw = await AsyncStorage.getItem(KEYS.examSet(id));
  return raw ? (JSON.parse(raw) as ExamSet) : null;
}
export async function loadExamSet(id: string): Promise<ExamSet | null> {
  const raw = await AsyncStorage.getItem(KEYS.examSet(id));
  return raw ? (JSON.parse(raw) as ExamSet) : null;
}
async function getSessionIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.sessionIndex);
  return raw ? (JSON.parse(raw) as string[]) : [];
}
export async function saveSession(session: Session): Promise<void> {
  const ids = await getSessionIds();
  if (!ids.includes(session.id)) ids.push(session.id);
  await AsyncStorage.multiSet([[KEYS.session(session.id), JSON.stringify(session)], [KEYS.sessionIndex, JSON.stringify(ids)]]);
}
export async function loadSession(id: string): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(KEYS.session(id));
  return raw ? (JSON.parse(raw) as Session) : null;
}
export async function loadIncompleteSession(examSetId: string, mode: Session['mode']): Promise<Session | null> {
  const ids = await getSessionIds();
  for (const id of [...ids].reverse()) {
    const raw = await AsyncStorage.getItem(KEYS.session(id));
    if (!raw) continue;
    const s = JSON.parse(raw) as Session;
    if (s.examSetId === examSetId && s.mode === mode && !s.completedAt) return s;
  }
  return null;
}
export async function deleteSession(id: string): Promise<void> {
  const ids = (await getSessionIds()).filter((i) => i !== id);
  await AsyncStorage.multiSet([[KEYS.sessionIndex, JSON.stringify(ids)]]);
  await AsyncStorage.removeItem(KEYS.session(id));
}
export async function loadBookmarks(): Promise<Bookmark[]> {
  const raw = await AsyncStorage.getItem(KEYS.bookmarks);
  return raw ? (JSON.parse(raw) as Bookmark[]) : [];
}
export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  const list = await loadBookmarks();
  if (!list.find((b) => b.questionId === bookmark.questionId)) {
    list.push(bookmark);
    await AsyncStorage.setItem(KEYS.bookmarks, JSON.stringify(list));
  }
}
export async function removeBookmark(questionId: string): Promise<void> {
  const list = (await loadBookmarks()).filter((b) => b.questionId !== questionId);
  await AsyncStorage.setItem(KEYS.bookmarks, JSON.stringify(list));
}
export async function isBookmarked(questionId: string): Promise<boolean> {
  const list = await loadBookmarks();
  return list.some((b) => b.questionId === questionId);
}
export async function loadStats(examSetId: string): Promise<Stats | null> {
  const raw = await AsyncStorage.getItem(KEYS.stats(examSetId));
  return raw ? (JSON.parse(raw) as Stats) : null;
}
export async function saveStats(stats: Stats): Promise<void> {
  await AsyncStorage.setItem(KEYS.stats(stats.examSetId), JSON.stringify(stats));
}
export async function updateStatsFromSession(session: Session): Promise<void> {
  const existing = await loadStats(session.examSetId);
  const base: Stats = existing ?? { examSetId: session.examSetId, totalAttempts: 0, correctCount: 0, wrongQuestionIds: [], lastStudiedAt: new Date().toISOString() };
  let totalAttempts = base.totalAttempts;
  let correctCount = base.correctCount;
  let wrongQuestionIds = [...base.wrongQuestionIds];
  for (const attempt of session.attempts) {
    totalAttempts += 1;
    if (attempt.isCorrect) { correctCount += 1; wrongQuestionIds = wrongQuestionIds.filter((id) => id !== attempt.questionId); }
    else if (!wrongQuestionIds.includes(attempt.questionId)) { wrongQuestionIds = [...wrongQuestionIds, attempt.questionId]; }
  }
  await saveStats({ ...base, totalAttempts, correctCount, wrongQuestionIds, lastStudiedAt: new Date().toISOString() });
}
export async function loadSpacedRepStats(examSetId: string): Promise<SpacedRepStats | null> {
  const raw = await AsyncStorage.getItem(KEYS.spacedRep(examSetId));
  return raw ? (JSON.parse(raw) as SpacedRepStats) : null;
}
export async function saveSpacedRepStats(stats: SpacedRepStats): Promise<void> {
  await AsyncStorage.setItem(KEYS.spacedRep(stats.examSetId), JSON.stringify(stats));
}
const DEFAULT_SETTINGS: UserSettings = { dailyGoal: 20, alwaysShowExplanation: false };
export async function loadSettings(): Promise<UserSettings> {
  const raw = await AsyncStorage.getItem(KEYS.settings);
  return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<UserSettings>) } : DEFAULT_SETTINGS;
}
export async function saveSettings(s: UserSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(s));
}
export async function loadAllSessions(): Promise<Session[]> {
  const ids = await getSessionIds();
  const sessions: Session[] = [];
  for (const id of ids) {
    const raw = await AsyncStorage.getItem(KEYS.session(id));
    if (raw) sessions.push(JSON.parse(raw) as Session);
  }
  return sessions;
}
