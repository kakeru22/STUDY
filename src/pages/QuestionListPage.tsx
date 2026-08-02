import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppIcon } from "../components/AppIcon";
import { useAppContext } from "../contexts/AppContext";
import { getQuestionImages } from "../types/question";

export function QuestionListPage() {
  const { state, toggleStar } = useAppContext();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "binary" | "multiple">("all");
  const [starOnly, setStarOnly] = useState(false);

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

  return (
    <section className="page">
      <div className="page-heading page-heading--split">
        <div>
          <p className="eyebrow">Question Library</p>
          <h2>問題一覧</h2>
        </div>
        <div className="page-heading__meta">
          <span>Visible</span>
          <strong>{visibleQuestions.length}</strong>
        </div>
      </div>

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
            〇×
          </button>
          <button type="button" className={typeFilter === "multiple" ? "toggle-chip is-active" : "toggle-chip"} onClick={() => setTypeFilter("multiple")}>
            N択
          </button>
          <button type="button" className={starOnly ? "toggle-chip is-active" : "toggle-chip"} onClick={() => setStarOnly((current) => !current)}>
            お気に入りのみ
          </button>
        </div>
      </div>

      <div className="card-stack">
        {visibleQuestions.map((question) => {
          const progress = state.progress[question.id];
          const accuracy = progress?.attempts ? Math.round((progress.correctCount / progress.attempts) * 100) : 0;
          const images = getQuestionImages(question);

          return (
            <article key={question.id} className="panel question-card">
              {images[0] ? (
                <div className="question-card__image-wrap">
                  <img src={images[0].dataUrl} alt="" className="question-card__image" />
                  {images.length > 1 ? <span className="question-card__image-count">+{images.length - 1}</span> : null}
                </div>
              ) : null}
              <div className="question-card__meta">
                <span>{question.category}</span>
                <span>{question.type === "binary" ? "〇×" : "N択"}</span>
              </div>
              <h3>{question.questionText}</h3>
              <div className="question-card__chips">
                {question.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="question-chip">{tag}</span>
                ))}
              </div>
              <div className="question-card__stats">
                <span>正答率 {accuracy}%</span>
                <span>{progress?.lastAnsweredAt ? new Date(progress.lastAnsweredAt).toLocaleDateString("ja-JP") : "未学習"}</span>
              </div>
              <div className="card-actions">
                <Link to={`/questions/${question.id}`} className="button-link">
                  編集
                </Link>
                <button type="button" className="button-secondary" onClick={() => toggleStar(question.id)}>
                  {progress?.isStarred ? "重要を外す" : "重要にする"}
                </button>
              </div>
            </article>
          );
        })}
        {visibleQuestions.length === 0 ? <div className="panel">条件に一致する問題はありません。</div> : null}
      </div>
    </section>
  );
}
