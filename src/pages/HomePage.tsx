import { useNavigate } from "react-router-dom";
import { AppIcon } from "../components/AppIcon";
import { useAppContext } from "../contexts/AppContext";

export function HomePage() {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const activeQuestions = state.questions.filter((question) => !question.archived);
  const totalCount = activeQuestions.length || 1;
  const dueToday = activeQuestions.filter((question) => {
    const nextReviewAt = state.progress[question.id]?.nextReviewAt;
    return nextReviewAt ? new Date(nextReviewAt).getTime() <= Date.now() : true;
  }).length;
  const weakCount = activeQuestions.filter((question) => {
    const progress = state.progress[question.id];
    if (!progress || progress.attempts === 0) {
      return false;
    }
    return progress.correctCount / progress.attempts < 0.6;
  }).length;
  const masteredCount = activeQuestions.filter((question) => {
    const progress = state.progress[question.id];
    if (!progress || progress.attempts < 3) {
      return false;
    }
    return progress.correctCount / progress.attempts >= 0.8;
  }).length;

  const chartBars = [
    { label: "今日", value: dueToday, tone: "due" },
    { label: "苦手", value: weakCount, tone: "weak" },
    { label: "定着", value: masteredCount, tone: "done" }
  ] as const;

  const ringSegments = [
    { value: dueToday, color: "#877af2" },
    { value: weakCount, color: "#b099ff" },
    { value: Math.max(0, activeQuestions.length - dueToday - weakCount), color: "#5d52b3" }
  ];

  const ringCircumference = 2 * Math.PI * 46;
  let offsetCursor = 0;

  const cards = [
    { label: "今日", value: `${dueToday}問`, icon: "clock" },
    { label: "苦手", value: `${weakCount}問`, icon: "review" },
    { label: "ストック", value: `${activeQuestions.length}問`, icon: "library" },
    { label: "定着", value: `${masteredCount}問`, icon: "check" }
  ] as const;

  return (
    <section className="page home-page">
      <div className="home-panels">
        <article className="panel home-panel home-panel--chart">
          <div className="home-chart">
            <div className="home-ring-chart" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="46" className="home-ring-chart__base" />
                {ringSegments.map((segment, index) => {
                  const length = (Math.max(segment.value, 0) / totalCount) * ringCircumference;
                  const strokeDasharray = `${length} ${ringCircumference}`;
                  const strokeDashoffset = -offsetCursor;
                  offsetCursor += length;

                  return (
                    <circle
                      key={`${segment.color}-${index}`}
                      cx="60"
                      cy="60"
                      r="46"
                      className="home-ring-chart__segment"
                      style={{ stroke: segment.color, strokeDasharray, strokeDashoffset }}
                    />
                  );
                })}
              </svg>
              <div className="home-ring-chart__label">
                <strong>{activeQuestions.length}</strong>
                <span>全体</span>
              </div>
            </div>

            <div className="home-bar-chart">
              {chartBars.map((bar) => (
                <div key={bar.label} className="home-bar-chart__row">
                  <div className="home-bar-chart__meta">
                    <span>{bar.label}</span>
                    <strong>{bar.value}</strong>
                  </div>
                  <div className="home-bar-chart__track">
                    <span
                      className={`home-bar-chart__fill home-bar-chart__fill--${bar.tone}`}
                      style={{ width: `${Math.max((bar.value / totalCount) * 100, bar.value > 0 ? 12 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <section className="home-quick-panel">
            <button type="button" className="home-quick-slab" onClick={() => navigate("/review")}>
              <AppIcon name="review" className="home-quick-slab__icon" />
              <strong>復習</strong>
              <span>{dueToday}問</span>
            </button>
            <button type="button" className="home-quick-slab" onClick={() => navigate("/create")}>
              <AppIcon name="add" className="home-quick-slab__icon" />
              <strong>追加</strong>
              <span>新規</span>
            </button>
            <button type="button" className="home-quick-slab" onClick={() => navigate("/questions")}>
              <AppIcon name="library" className="home-quick-slab__icon" />
              <strong>一覧</strong>
              <span>{activeQuestions.length}問</span>
            </button>
          </section>
        </article>
      </div>

      <div className="summary-grid home-summary-grid">
        {cards.map((card) => (
          <article key={card.label} className="summary-card">
            <div className="summary-card__head">
              <span className="summary-card__icon" aria-hidden="true">
                <AppIcon name={card.icon} className="inline-icon" />
              </span>
              <p>{card.label}</p>
            </div>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
