export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'drag_drop_order'
  | 'drag_drop_match'
  | 'image_based';
export interface Option { id: string; text: string; imageUri?: string }
export interface MediaAsset { id: string; uri: string; type: 'image' | 'video'; alt?: string }
export interface Question {
  id: string; type: QuestionType; text: string; options: Option[];
  correctAnswers: string[]; explanation?: string; mediaAssets?: MediaAsset[]; sectionId?: string;
}
export interface Section { id: string; title: string; questionIds: string[] }
export interface ExamSet {
  id: string; title: string; version: string; createdAt: string;
  sections: Section[]; questions: Question[];
}
export interface Attempt {
  questionId: string; selectedAnswers: string[]; isCorrect: boolean; timeSpentMs: number;
}
export type StudyMode = 'learn' | 'exam' | 'wrong' | 'bookmarks';
export interface Session {
  id: string; examSetId: string; mode: StudyMode; questionIds: string[];
  attempts: Attempt[]; startedAt: string; completedAt?: string;
  currentIndex: number; timeRemainingMs?: number;
}
export interface Bookmark { questionId: string; examSetId: string; createdAt: string }
export interface SpacedRepQuestion {
  questionId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string; // ISO date string 'YYYY-MM-DD'
}
export interface SpacedRepStats {
  examSetId: string;
  questions: SpacedRepQuestion[];
}
export interface Stats {
  examSetId: string; totalAttempts: number; correctCount: number;
  wrongQuestionIds: string[]; lastStudiedAt: string;
}
export interface UserSettings {
  examDate?: string;              // ISO date 'YYYY-MM-DD'
  dailyGoal: number;              // questions per day target
  alwaysShowExplanation: boolean;
}
