import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";

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
      <div className="page-heading">
        <p className="eyebrow">Question Library</p>
        <h2>問題一覧</h2>
      </div>

      <div className="panel filters">
        <input type="search" placeholder="検索" value={search} onChange={(event) => setSearch(event.target.value)} />
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

          return (
            <article key={question.id} className="panel question-card">
              <div className="question-card__meta">
                <span>{question.category}</span>
                <span>{question.type === "binary" ? "〇×" : "N択"}</span>
              </div>
              <h3>{question.questionText}</h3>
              <p>タグ: {question.tags.join(", ")}</p>
              <p>
                正答率 {accuracy}% / 最終学習 {progress?.lastAnsweredAt ? new Date(progress.lastAnsweredAt).toLocaleDateString("ja-JP") : "未学習"}
              </p>
              <div className="card-actions">
                <Link to={`/questions/${question.id}`} className="button-link">
                  編集
                </Link>
                <button type="button" className="button-secondary" onClick={() => toggleStar(question.id)}>
                  {progress?.isStarred ? "お気に入り解除" : "お気に入り"}
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
