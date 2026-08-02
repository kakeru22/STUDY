import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppIcon } from "../components/AppIcon";
import { useAppContext } from "../contexts/AppContext";
import { getQuestionImages } from "../types/question";

type ReviewMode = "today" | "random" | "starred";

type ReviewResult = {
  questionId: string;
  selectedChoiceId: string;
  correct: boolean;
  nextReviewAt: string;
};

type ReviewSession = {
  mode: ReviewMode;
  questionIds: string[];
  currentIndex: number;
  result: ReviewResult | null;
  startedAt: string;
};

const REVIEW_SESSION_KEY = "study-review-session";

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

function readSession(): ReviewSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(REVIEW_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ReviewSession;
  } catch {
    window.sessionStorage.removeItem(REVIEW_SESSION_KEY);
    return null;
  }
}

function writeSession(session: ReviewSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.sessionStorage.removeItem(REVIEW_SESSION_KEY);
    return;
  }

  window.sessionStorage.setItem(REVIEW_SESSION_KEY, JSON.stringify(session));
}

export function ReviewPage() {
  const { state, answerQuestion } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const isSessionRoute = location.pathname === "/review/session";
  const isResultRoute = location.pathname === "/review/result";
  const session = readSession();

  const counts = useMemo(
    () => ({
      today: selectQuestions("today", state.questions, state.progress).length,
      random: selectQuestions("random", state.questions, state.progress).length,
      starred: selectQuestions("starred", state.questions, state.progress).length
    }),
    [state.progress, state.questions]
  );

  const questions = useMemo(() => {
    if (!session) {
      return [];
    }

    return session.questionIds
      .map((id) => state.questions.find((question) => question.id === id))
      .filter((question): question is NonNullable<typeof question> => Boolean(question));
  }, [session, state.questions]);

  const currentQuestion = session ? questions[session.currentIndex] ?? null : null;
  const currentImages = currentQuestion ? getQuestionImages(currentQuestion) : [];

  const modeCards: Array<{ mode: ReviewMode; title: string; caption: string; icon: "clock" | "review" | "star"; count: number }> = [
    { mode: "today", title: "今日の復習", caption: "期限が来た問題", icon: "clock", count: counts.today },
    { mode: "random", title: "ランダム", caption: "全体から出題", icon: "review", count: counts.random },
    { mode: "starred", title: "重要", caption: "マークした問題", icon: "star", count: counts.starred }
  ];

  function startSession(mode: ReviewMode) {
    const questionIds = selectQuestions(mode, state.questions, state.progress).map((question) => question.id);
    if (questionIds.length === 0) {
      return;
    }

    writeSession({
      mode,
      questionIds,
      currentIndex: 0,
      result: null,
      startedAt: new Date().toISOString()
    });
    navigate("/review/session");
  }

  function finishSession() {
    writeSession(null);
    navigate("/review");
  }

  function handleAnswer(choiceId: string) {
    if (!session || !currentQuestion) {
      navigate("/review");
      return;
    }

    const result = answerQuestion(currentQuestion.id, choiceId);
    writeSession({
      ...session,
      result: {
        questionId: currentQuestion.id,
        selectedChoiceId: choiceId,
        correct: result.correct,
        nextReviewAt: result.nextReviewAt
      }
    });
    navigate("/review/result");
  }

  function handleNext() {
    if (!session) {
      navigate("/review");
      return;
    }

    if (session.currentIndex + 1 >= session.questionIds.length) {
      finishSession();
      return;
    }

    writeSession({
      ...session,
      currentIndex: session.currentIndex + 1,
      result: null
    });
    navigate("/review/session");
  }

  if (isSessionRoute) {
    if (!session || !currentQuestion) {
      return (
        <section className="page review-scene">
          <article className="panel review-shell review-shell--empty">
            <h2>復習セッションがありません</h2>
            <p>復習メニューから始めてください。</p>
            <button type="button" onClick={() => navigate("/review")}>
              復習メニューへ
            </button>
          </article>
        </section>
      );
    }

    return (
      <section className="page review-scene">
        <article className="panel review-shell">
          <button type="button" className="review-shell__close" onClick={finishSession} aria-label="復習を終了">
            <AppIcon name="close" className="review-shell__close-icon" />
          </button>

          <div className="review-progress review-progress--wide">
            <span>
              {session.currentIndex + 1} / {questions.length}
            </span>
            <span>{session.mode === "today" ? "今日の復習" : session.mode === "random" ? "ランダム" : "重要"}</span>
          </div>

          <div className="review-question">
            <p className="eyebrow">Q</p>
            <h2>{currentQuestion.questionText}</h2>
            {currentImages.length > 0 ? (
              <div className="review-question__image-grid">
                {currentImages.map((image, index) => (
                  <div key={image.id} className="review-question__image-wrap">
                    <img src={image.dataUrl} alt={`問題画像 ${index + 1}`} className="question-image review-question__image" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="review-choices">
            {currentQuestion.choices.map((choice, index) => (
              <button key={choice.id} type="button" className="answer-choice" onClick={() => handleAnswer(choice.id)}>
                <span className="answer-choice__index">{String.fromCharCode(65 + index)}</span>
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
        </article>
      </section>
    );
  }

  if (isResultRoute) {
    if (!session || !currentQuestion || !session.result) {
      return (
        <section className="page review-scene">
          <article className="panel review-shell review-shell--empty">
            <h2>結果がありません</h2>
            <p>問題に回答すると結果が表示されます。</p>
            <button type="button" onClick={() => navigate("/review")}>
              復習メニューへ
            </button>
          </article>
        </section>
      );
    }

    const selectedChoice = currentQuestion.choices.find((choice) => choice.id === session.result?.selectedChoiceId);
    const correctChoice = currentQuestion.choices.find((choice) => choice.id === currentQuestion.correctChoiceId);
    const isLastQuestion = session.currentIndex + 1 >= session.questionIds.length;
    const resultImages = getQuestionImages(currentQuestion);

    return (
      <section className="page review-scene">
        <article className="panel review-shell review-shell--result">
          <button type="button" className="review-shell__close" onClick={finishSession} aria-label="復習を終了">
            <AppIcon name="close" className="review-shell__close-icon" />
          </button>

          <div className="result-hero">
            <div className={session.result.correct ? "result-hero__mark is-correct" : "result-hero__mark is-wrong"} aria-hidden="true">
              <svg viewBox="0 0 120 120">
                {session.result.correct ? (
                  <path d="M30 63L50 82L88 39" />
                ) : (
                  <>
                    <path d="M38 38L82 82" />
                    <path d="M82 38L38 82" />
                  </>
                )}
              </svg>
            </div>
            <div>
              <p className="eyebrow">Result</p>
              <h2>{session.result.correct ? "正解" : "不正解"}</h2>
              <p>{session.result.correct ? "そのまま次へ進めます。" : "解説を確認してください。"}</p>
            </div>
          </div>

          <div className="result-grid">
            <div className="result-card">
              <p className="section-title">あなたの回答</p>
              <strong>{selectedChoice?.label ?? "未回答"}</strong>
            </div>
            <div className="result-card">
              <p className="section-title">正解</p>
              <strong>{correctChoice?.label ?? "-"}</strong>
            </div>
          </div>

          <div className="panel result-note">
            <p className="section-title">解説</p>
            {resultImages.length > 0 ? (
              <div className="review-question__image-grid">
                {resultImages.map((image, index) => (
                  <div key={image.id} className="review-question__image-wrap">
                    <img src={image.dataUrl} alt={`解説画像 ${index + 1}`} className="question-image review-question__image" />
                  </div>
                ))}
              </div>
            ) : null}
            <p>{currentQuestion.explanation || "解説はありません。"}</p>
            <p>次回: {new Date(session.result.nextReviewAt).toLocaleDateString("ja-JP")}</p>
            <p>{state.sync.unsyncedCount > 0 ? "未同期の変更があります" : "同期済みです"}</p>
          </div>

          <div className="review-scene__actions">
            <button type="button" onClick={handleNext}>
              {isLastQuestion ? "終了" : "次へ"}
            </button>
            <button type="button" className="button-secondary" onClick={finishSession}>
              ここで終わる
            </button>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Review</p>
        <h2>復習</h2>
      </div>

      <div className="review-menu">
        {modeCards.map((card) => (
          <button key={card.mode} type="button" className="review-mode-card" onClick={() => startSession(card.mode)} disabled={card.count === 0}>
            <AppIcon name={card.icon} className="review-mode-card__icon" />
            <span className="review-mode-card__count">{card.count}</span>
            <strong>{card.title}</strong>
            <span>{card.caption}</span>
          </button>
        ))}
      </div>

      {modeCards.every((card) => card.count === 0) ? (
        <article className="panel">
          <h3>復習できる問題がありません</h3>
          <p>問題を追加するか、一覧から重要設定をしてください。</p>
        </article>
      ) : null}
    </section>
  );
}
