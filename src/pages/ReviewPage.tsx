import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../contexts/AppContext";

type ReviewMode = "today" | "random" | "starred";

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function selectQuestions(
  mode: ReviewMode,
  questions: ReturnType<typeof useAppContext>["state"]["questions"],
  progress: ReturnType<typeof useAppContext>["state"]["progress"]
) {
  const activeQuestions = questions.filter((question) => !question.archived);

  if (mode === "starred") {
    return activeQuestions.filter((question) => progress[question.id]?.isStarred);
  }

  if (mode === "random") {
    return shuffle(activeQuestions);
  }

  return activeQuestions.filter((question) => {
    const nextReviewAt = progress[question.id]?.nextReviewAt;
    return nextReviewAt ? new Date(nextReviewAt).getTime() <= Date.now() : true;
  });
}

export function ReviewPage() {
  const { state, answerQuestion } = useAppContext();
  const [mode, setMode] = useState<ReviewMode>("today");
  const [sessionQuestionIds, setSessionQuestionIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastResult, setLastResult] = useState<{
    correct: boolean;
    selectedChoiceId: string;
    nextReviewAt: string;
  } | null>(null);

  const candidateQuestions = useMemo(() => selectQuestions(mode, state.questions, state.progress), [mode, state.progress, state.questions]);

  useEffect(() => {
    if (sessionQuestionIds.length === 0 && candidateQuestions.length > 0) {
      setSessionQuestionIds(candidateQuestions.map((question) => question.id));
    }
  }, [candidateQuestions, sessionQuestionIds.length]);

  const questions = useMemo(
    () => sessionQuestionIds
      .map((id) => state.questions.find((question) => question.id === id))
      .filter((question): question is NonNullable<typeof question> => Boolean(question)),
    [sessionQuestionIds, state.questions]
  );

  const currentQuestion = questions[currentIndex] ?? null;

  function handleAnswer(choiceId: string) {
    if (!currentQuestion) {
      return;
    }

    const result = answerQuestion(currentQuestion.id, choiceId);
    setLastResult({
      correct: result.correct,
      selectedChoiceId: choiceId,
      nextReviewAt: result.nextReviewAt
    });
  }

  function switchMode(nextMode: ReviewMode) {
    setMode(nextMode);
    setSessionQuestionIds(selectQuestions(nextMode, state.questions, state.progress).map((question) => question.id));
    setCurrentIndex(0);
    setLastResult(null);
  }

  function handleNext() {
    setLastResult(null);
    setCurrentIndex((index) => index + 1);
  }

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Review</p>
        <h2>復習</h2>
      </div>

      <div className="panel">
        <p className="section-title">復習モード</p>
        <div className="action-stack">
          <button type="button" className={mode === "today" ? "" : "button-secondary"} onClick={() => switchMode("today")}>
            今日の復習
          </button>
          <button type="button" className={mode === "random" ? "" : "button-secondary"} onClick={() => switchMode("random")}>
            ランダム
          </button>
          <button type="button" className={mode === "starred" ? "" : "button-secondary"} onClick={() => switchMode("starred")}>
            お気に入り
          </button>
        </div>
      </div>

      {currentQuestion ? (
        <>
          <article className="panel review-card">
            <div className="review-progress">
              <span>
                {currentIndex + 1} / {questions.length}
              </span>
              <span>オフライン可</span>
            </div>
            <h3>{currentQuestion.questionText}</h3>
            <div className="action-stack">
              {currentQuestion.choices.map((choice, index) => (
                <button key={choice.id} type="button" disabled={Boolean(lastResult)} onClick={() => handleAnswer(choice.id)}>
                  {String.fromCharCode(65 + index)}. {choice.label}
                </button>
              ))}
            </div>
          </article>

          {lastResult ? (
            <article className="panel result-panel">
              <h3>{lastResult.correct ? "正解" : "不正解"}</h3>
              <p>
                あなたの回答: {currentQuestion.choices.find((choice) => choice.id === lastResult.selectedChoiceId)?.label}
              </p>
              <p>
                正解: {currentQuestion.choices.find((choice) => choice.id === currentQuestion.correctChoiceId)?.label}
              </p>
              <p>{currentQuestion.explanation}</p>
              <p>次回復習: {new Date(lastResult.nextReviewAt).toLocaleDateString("ja-JP")}</p>
              <p>同期状態: ローカル保存済み / {state.sync.unsyncedCount > 0 ? "未同期" : "同期済み"}</p>
              <button type="button" onClick={handleNext}>
                次の問題へ
              </button>
            </article>
          ) : null}
        </>
      ) : (
        <article className="panel">
          <h3>出題できる問題がありません</h3>
          <p>問題を追加するか、一覧からお気に入りを設定してください。</p>
        </article>
      )}
    </section>
  );
}
