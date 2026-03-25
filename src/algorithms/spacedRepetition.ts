import { SpacedRepQuestion } from '../models';

/** Quality rating 0–5: 0–2 = wrong, 3–5 = correct (5 = perfect). */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export function createInitialSpacedRep(questionId: string): SpacedRepQuestion {
  const today = new Date().toISOString().slice(0, 10);
  return { questionId, easeFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: today };
}

/** SM-2 algorithm — returns updated stats for one question. */
export function sm2Update(q: SpacedRepQuestion, quality: Quality): SpacedRepQuestion {
  let { easeFactor, interval, repetitions } = q;

  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const next = new Date();
  next.setDate(next.getDate() + interval);
  return { ...q, easeFactor, interval, repetitions, nextReviewDate: next.toISOString().slice(0, 10) };
}

export function isDue(q: SpacedRepQuestion): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return q.nextReviewDate <= today;
}

/** Map a boolean correct/wrong to an SM-2 quality score. */
export function qualityFromCorrect(correct: boolean): Quality {
  return correct ? 4 : 1;
}
