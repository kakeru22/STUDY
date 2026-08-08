import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AppIcon } from "../components/AppIcon";
import { useAppContext } from "../contexts/AppContext";
import { getQuestionImages } from "../types/question";

type ListRouteState = {
  highlightQuestionId?: string;
  toastMessage?: string;
};

export function QuestionListPage() {
  const { state, deleteQuestion, toggleStar } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state ?? {}) as ListRouteState;
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "binary" | "multiple">("all");
  const [starOnly, setStarOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState(routeState.toastMessage ?? "");

  useEffect(() => {
    if (!routeState.highlightQuestionId) {
      return;
    }

    const timer = window.setTimeout(() => {
      const element = document.getElementById(`question-card-${routeState.highlightQuestionId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [routeState.highlightQuestionId]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const visibleQuestions = useMemo(() => {
    return state.questions
      .filter((question) => !question.archived)
      .filter((question) => (typeFilter === "all" ? true : question.type === typeFilter))
      .filter((question) => {
        const text = `${question.category} ${question.questionText} ${question.tags.join(" ")}`.toLowerCase();
        return text.includes(search.toLowerCase());
      })
      .filter((question) => (starOnly ? state.progress[question.id]?.isStarred : true));
  }, [search, starOnly, state.progress, state.questions, typeFilter]);

  function handleDelete(questionId: string) {
    const confirmed = window.confirm("この問題を削除します。元に戻せません。");
    if (!confirmed) {
      return;
    }

    deleteQuestion(questionId);
    setToastMessage("問題を削除しました。");
    navigate("/questions", { replace: true, state: {} });
  }

  return (
    <section className="page">
      <div className="page-heading page-heading--split">
        <div>
          <p className="eyebrow">Question Library</p>
          <h2>問題一覧</h2>
        </div>
        <div className="page-heading__meta">
          <span>表示件数</span>
          <strong>{visibleQuestions.length}</strong>
        </div>
      </div>

      {toastMessage ? <div className="inline-toast">{toastMessage}</div> : null}

      <div className="panel filters filters--library">
        <div className="filters__search">
          <AppIcon name="search" className="filters__icon" />
          <input type="search" placeholder="検索" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="chip-row">
          <button type="button" className={typeFilter === "all" ? "toggle-chip is-active" : "toggle-chip"} onClick={() => setTypeFilter("all")}>
            すべて
          </button>
          <button type="button" className={typeFilter === "binary" ? "toggle-chip is-active" : "toggle-chip"} onClick={() => setTypeFilter("binary")}>
            ○×
          </button>
          <button type="button" className={typeFilter === "multiple" ? "toggle-chip is-active" : "toggle-chip"} onClick={() => setTypeFilter("multiple")}>
            N択
          </button>
          <button type="button" className={starOnly ? "toggle-chip is-active" : "toggle-chip"} onClick={() => setStarOnly((current) => !current)}>
            スターのみ
          </button>
        </div>
      </div>

      <div className="card-stack">
        {visibleQuestions.map((question) => {
          const progress = state.progress[question.id];
          const accuracy = progress?.attempts ? Math.round((progress.correctCount / progress.attempts) * 100) : 0;
          const images = getQuestionImages(question);
          const isHighlighted = routeState.highlightQuestionId === question.id;

          return (
            <article
              key={question.id}
              id={`question-card-${question.id}`}
              className={isHighlighted ? "panel question-card question-card--highlighted" : "panel question-card"}
            >
              {isHighlighted ? <span className="question-card__badge">NEW</span> : null}
              {images[0] ? (
                <div className="question-card__image-wrap">
                  <img src={images[0].dataUrl} alt="" className="question-card__image" />
                  {images.length > 1 ? <span className="question-card__image-count">+{images.length - 1}</span> : null}
                </div>
              ) : null}
              <div className="question-card__meta">
                <span>{question.category}</span>
                <span>{question.type === "binary" ? "○×" : "N択"}</span>
              </div>
              <h3>{question.questionText}</h3>
              <div className="question-card__chips">
                {question.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="question-chip">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="question-card__stats">
                <span>正答率 {accuracy}%</span>
                <span>{progress?.lastAnsweredAt ? new Date(progress.lastAnsweredAt).toLocaleDateString("ja-JP") : "未回答"}</span>
              </div>
              <div className="card-actions">
                <Link to={`/questions/${question.id}`} className="button-link">
                  編集
                </Link>
                <button type="button" className="button-secondary" onClick={() => toggleStar(question.id)}>
                  {progress?.isStarred ? "スター解除" : "スターにする"}
                </button>
                <button type="button" className="button-secondary button-danger" onClick={() => handleDelete(question.id)}>
                  削除
                </button>
              </div>
            </article>
          );
        })}
        {visibleQuestions.length === 0 ? <div className="panel">条件に一致する問題がありません。</div> : null}
      </div>
    </section>
  );
}
