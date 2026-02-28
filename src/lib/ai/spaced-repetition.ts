export interface ReviewItem {
  userId: string;
  topic: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: number;
  lastScore: number;
}

/**
 * SM-2 Algorithm — the same algorithm used by Anki.
 * quality: 0-5 (0=complete failure, 5=perfect response)
 */
export function calculateNextReview(
  item: ReviewItem,
  quality: number
): ReviewItem {
  let { easeFactor, interval, repetitions } = item;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;

  return {
    ...item,
    easeFactor,
    interval,
    repetitions,
    nextReviewDate,
    lastScore: quality,
  };
}

export function quizScoreToQuality(scorePercent: number): number {
  if (scorePercent >= 90) return 5;
  if (scorePercent >= 75) return 4;
  if (scorePercent >= 60) return 3;
  if (scorePercent >= 40) return 2;
  if (scorePercent >= 20) return 1;
  return 0;
}

export function createNewReviewItem(userId: string, topic: string): ReviewItem {
  return {
    userId,
    topic,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: Date.now(),
    lastScore: 0,
  };
}
