export type ReviewResult = "correct" | "wrong";

export type QuestionProgress = {
  questionId: string;
  attempts: number;
  correctCount: number;
  wrongCount: number;
  correctStreak: number;
  lastAnsweredAt: string | null;
  lastResult: ReviewResult | null;
  nextReviewAt: string | null;
  isStarred: boolean;
};

