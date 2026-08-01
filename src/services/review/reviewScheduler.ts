export function calculateNextReviewDate(correctStreak: number, result: "correct" | "wrong", baseDate = new Date()) {
  const next = new Date(baseDate);

  if (result === "wrong") {
    next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  const days =
    correctStreak <= 1 ? 1 :
    correctStreak === 2 ? 3 :
    correctStreak === 3 ? 7 :
    correctStreak === 4 ? 14 :
    30;

  next.setDate(next.getDate() + days);
  return next.toISOString();
}

